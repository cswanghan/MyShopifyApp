import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '../utils/logger';
import { CacheManager } from '../cache/CacheManager';

/**
 * 连接池配置
 */
export interface ConnectionPoolConfig {
  master: {
    url: string;
    maxConnections?: number;
  };
  replicas?: {
    urls: string[];
    maxConnections?: number;
  };
  connectionTimeout?: number;
  idleTimeout?: number;
  acquireTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
  enableQueryLogging?: boolean;
  enableMetrics?: boolean;
}

/**
 * 连接池状态
 */
export interface PoolStatus {
  master: {
    healthy: boolean;
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
  };
  replicas: Array<{
    url: string;
    healthy: boolean;
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
  }>;
  totalConnections: number;
  healthyConnections: number;
}

/**
 * 查询类型
 */
export type QueryType = 'read' | 'write';

/**
 * 查询统计
 */
export interface QueryStats {
  totalQueries: number;
  readQueries: number;
  writeQueries: number;
  slowQueries: number;
  failedQueries: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * 数据库连接池管理器
 */
export class ConnectionPool {
  private logger = new Logger('ConnectionPool');
  private config: ConnectionPoolConfig;
  private masterClient: PrismaClient | null = null;
  private replicaClients: Map<string, PrismaClient> = new Map();
  private healthStatus: Map<string, boolean> = new Map();
  private roundRobinIndex = 0;
  private stats: QueryStats = {
    totalQueries: 0,
    readQueries: 0,
    writeQueries: 0,
    slowQueries: 0,
    failedQueries: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  private responseTimes: number[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private cacheManager: CacheManager | null = null;
  private isShuttingDown = false;

  constructor(config: ConnectionPoolConfig, cacheManager?: CacheManager) {
    this.config = {
      connectionTimeout: 10000,
      idleTimeout: 300000, // 5分钟
      acquireTimeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      healthCheckInterval: 30000, // 30秒
      enableQueryLogging: false,
      enableMetrics: true,
      ...config
    };
    
    this.cacheManager = cacheManager || null;
  }

  /**
   * 初始化连接池
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('初始化数据库连接池...');

      // 初始化主库连接
      await this.initializeMaster();

      // 初始化从库连接
      if (this.config.replicas?.urls?.length) {
        await this.initializeReplicas();
      }

      // 启动健康检查
      this.startHealthCheck();

      this.logger.info('数据库连接池初始化完成', {
        master: !!this.masterClient,
        replicas: this.replicaClients.size
      });

    } catch (error) {
      this.logger.error('初始化连接池失败', { error: error.message });
      await this.shutdown();
      throw error;
    }
  }

  /**
   * 初始化主库连接
   */
  private async initializeMaster(): Promise<void> {
    try {
      this.masterClient = new PrismaClient({
        datasources: {
          db: { url: this.config.master.url }
        },
        log: this.config.enableQueryLogging ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
        errorFormat: 'pretty'
      });

      // 设置查询监听器
      this.setupQueryListeners(this.masterClient, 'master');

      // 测试连接
      await this.testConnection(this.masterClient, 'master');
      this.healthStatus.set('master', true);

      this.logger.info('主库连接已建立');

    } catch (error) {
      this.logger.error('主库连接失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 初始化从库连接
   */
  private async initializeReplicas(): Promise<void> {
    const replicaUrls = this.config.replicas?.urls || [];
    
    for (let i = 0; i < replicaUrls.length; i++) {
      const url = replicaUrls[i];
      const replicaId = `replica-${i}`;
      
      try {
        const client = new PrismaClient({
          datasources: {
            db: { url }
          },
          log: this.config.enableQueryLogging ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
          errorFormat: 'pretty'
        });

        // 设置查询监听器
        this.setupQueryListeners(client, replicaId);

        // 测试连接
        await this.testConnection(client, replicaId);
        
        this.replicaClients.set(replicaId, client);
        this.healthStatus.set(replicaId, true);

        this.logger.info('从库连接已建立', { replicaId, url: this.maskUrl(url) });

      } catch (error) {
        this.logger.error('从库连接失败', { 
          replicaId, 
          url: this.maskUrl(url), 
          error: error.message 
        });
        
        // 从库连接失败不阻止整个初始化过程
        this.healthStatus.set(replicaId, false);
      }
    }
  }

  /**
   * 设置查询监听器
   */
  private setupQueryListeners(client: PrismaClient, clientId: string): void {
    if (!this.config.enableMetrics) return;

    client.$on('query', (event: any) => {
      this.stats.totalQueries++;
      
      // 更新响应时间
      this.responseTimes.push(event.duration);
      if (this.responseTimes.length > 1000) {
        this.responseTimes = this.responseTimes.slice(-1000);
      }
      
      // 计算平均响应时间
      this.stats.averageResponseTime = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;

      // 检测慢查询
      if (event.duration > 1000) {
        this.stats.slowQueries++;
        this.logger.warn('检测到慢查询', {
          clientId,
          query: event.query.substring(0, 200),
          duration: event.duration,
          params: event.params
        });
      }

      // 记录查询日志
      if (this.config.enableQueryLogging) {
        this.logger.debug('查询执行', {
          clientId,
          query: event.query.substring(0, 200),
          duration: event.duration
        });
      }
    });

    client.$on('error', (event: any) => {
      this.stats.failedQueries++;
      this.logger.error('数据库查询错误', { clientId, error: event });
    });
  }

  /**
   * 测试数据库连接
   */
  private async testConnection(client: PrismaClient, clientId: string): Promise<void> {
    let retryCount = 0;
    
    while (retryCount < this.config.retryAttempts!) {
      try {
        await client.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        retryCount++;
        
        if (retryCount >= this.config.retryAttempts!) {
          throw new Error(`连接测试失败 (${clientId}): ${error.message}`);
        }
        
        this.logger.warn(`连接测试失败，重试 ${retryCount}/${this.config.retryAttempts}`, {
          clientId,
          error: error.message
        });
        
        await this.delay(this.config.retryDelay!);
      }
    }
  }

  /**
   * 获取客户端（读写分离）
   */
  getClient(queryType: QueryType = 'read'): PrismaClient {
    if (this.isShuttingDown) {
      throw new Error('连接池正在关闭');
    }

    // 写操作总是使用主库
    if (queryType === 'write') {
      this.stats.writeQueries++;
      
      if (!this.masterClient) {
        throw new Error('主库连接不可用');
      }
      
      if (!this.healthStatus.get('master')) {
        throw new Error('主库连接不健康');
      }
      
      return this.masterClient;
    }

    // 读操作优先使用从库
    this.stats.readQueries++;
    
    const healthyReplicas = Array.from(this.replicaClients.entries()).filter(
      ([replicaId]) => this.healthStatus.get(replicaId)
    );

    if (healthyReplicas.length > 0) {
      // 负载均衡选择从库
      const [, client] = healthyReplicas[this.roundRobinIndex % healthyReplicas.length];
      this.roundRobinIndex = (this.roundRobinIndex + 1) % healthyReplicas.length;
      return client;
    }

    // 没有健康的从库，降级到主库
    if (!this.masterClient) {
      throw new Error('没有可用的数据库连接');
    }
    
    if (!this.healthStatus.get('master')) {
      throw new Error('所有数据库连接都不健康');
    }

    this.logger.warn('从库不可用，使用主库处理读操作');
    return this.masterClient;
  }

  /**
   * 执行缓存查询
   */
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = 300,
    queryType: QueryType = 'read'
  ): Promise<T> {
    // 如果没有缓存管理器，直接执行查询
    if (!this.cacheManager) {
      return queryFn();
    }

    try {
      // 尝试从缓存获取
      const cached = await this.cacheManager.get<T>(cacheKey);
      
      if (cached !== null) {
        this.stats.cacheHits++;
        return cached;
      }

      this.stats.cacheMisses++;

      // 缓存未命中，执行查询
      const result = await queryFn();

      // 存储到缓存
      if (result !== undefined && result !== null) {
        await this.cacheManager.set(cacheKey, result, ttl);
      }

      return result;

    } catch (error) {
      this.logger.error('缓存查询失败', { cacheKey, error: error.message });
      
      // 缓存失败时仍执行原查询
      return queryFn();
    }
  }

  /**
   * 事务处理（只能在主库）
   */
  async transaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    if (!this.masterClient) {
      throw new Error('主库连接不可用');
    }

    if (!this.healthStatus.get('master')) {
      throw new Error('主库连接不健康');
    }

    const start = Date.now();
    
    try {
      const result = await this.masterClient.$transaction(
        async (prisma) => fn(prisma),
        {
          maxWait: options?.maxWait || 5000,
          timeout: options?.timeout || 10000,
          isolationLevel: options?.isolationLevel
        }
      );

      const duration = Date.now() - start;
      
      if (duration > 1000) {
        this.logger.warn('检测到慢事务', { duration });
      }

      return result;

    } catch (error) {
      this.stats.failedQueries++;
      this.logger.error('事务执行失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    this.logger.info('健康检查已启动', {
      interval: this.config.healthCheckInterval
    });
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const checks: Promise<void>[] = [];

    // 检查主库
    if (this.masterClient) {
      checks.push(this.checkConnection(this.masterClient, 'master'));
    }

    // 检查从库
    for (const [replicaId, client] of this.replicaClients) {
      checks.push(this.checkConnection(client, replicaId));
    }

    await Promise.all(checks);
  }

  /**
   * 检查单个连接
   */
  private async checkConnection(client: PrismaClient, clientId: string): Promise<void> {
    try {
      await client.$queryRaw`SELECT 1`;
      
      const wasUnhealthy = !this.healthStatus.get(clientId);
      this.healthStatus.set(clientId, true);
      
      if (wasUnhealthy) {
        this.logger.info('连接已恢复', { clientId });
      }

    } catch (error) {
      const wasHealthy = this.healthStatus.get(clientId);
      this.healthStatus.set(clientId, false);
      
      if (wasHealthy) {
        this.logger.error('连接变为不健康', { clientId, error: error.message });
      }
    }
  }

  /**
   * 获取连接池状态
   */
  async getStatus(): Promise<PoolStatus> {
    const status: PoolStatus = {
      master: {
        healthy: this.healthStatus.get('master') || false,
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: this.masterClient ? 1 : 0
      },
      replicas: [],
      totalConnections: 0,
      healthyConnections: 0
    };

    // 统计从库状态
    for (const [replicaId, client] of this.replicaClients) {
      const healthy = this.healthStatus.get(replicaId) || false;
      const replicaStatus = {
        url: this.maskUrl(this.config.replicas?.urls?.[parseInt(replicaId.split('-')[1])] || ''),
        healthy,
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 1
      };
      
      status.replicas.push(replicaStatus);
      status.totalConnections += replicaStatus.totalConnections;
      
      if (healthy) {
        status.healthyConnections++;
      }
    }

    status.totalConnections += status.master.totalConnections;
    
    if (status.master.healthy) {
      status.healthyConnections++;
    }

    return status;
  }

  /**
   * 获取查询统计
   */
  getStats(): QueryStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalQueries: 0,
      readQueries: 0,
      writeQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.responseTimes = [];
    
    this.logger.info('连接池统计已重置');
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    connections: number;
    healthyConnections: number;
    error?: string;
  }> {
    try {
      const status = await this.getStatus();
      
      return {
        healthy: status.healthyConnections > 0,
        connections: status.totalConnections,
        healthyConnections: status.healthyConnections
      };

    } catch (error) {
      return {
        healthy: false,
        connections: 0,
        healthyConnections: 0,
        error: error.message
      };
    }
  }

  /**
   * 关闭连接池
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    
    try {
      this.logger.info('关闭数据库连接池...');

      // 停止健康检查
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      // 关闭所有连接
      const disconnectPromises: Promise<void>[] = [];

      if (this.masterClient) {
        disconnectPromises.push(this.masterClient.$disconnect());
      }

      for (const client of this.replicaClients.values()) {
        disconnectPromises.push(client.$disconnect());
      }

      await Promise.all(disconnectPromises);

      // 清理资源
      this.masterClient = null;
      this.replicaClients.clear();
      this.healthStatus.clear();

      this.logger.info('数据库连接池已关闭');

    } catch (error) {
      this.logger.error('关闭连接池时发生错误', { error: error.message });
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * 掩码URL中的敏感信息
   */
  private maskUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.password) {
        parsedUrl.password = '***';
      }
      return parsedUrl.toString();
    } catch {
      return 'invalid-url';
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}