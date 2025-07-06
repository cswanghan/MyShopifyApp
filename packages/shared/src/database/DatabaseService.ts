import { ConnectionPool, ConnectionPoolConfig, QueryType } from './ConnectionPool';
import { CacheManager, CacheConfig } from '../cache/CacheManager';
import { Logger } from '../utils/logger';
import { ShopRepository } from './repositories/ShopRepository';
import { UserRepository } from './repositories/UserRepository';
import { OrderRepository } from './repositories/OrderRepository';

/**
 * 数据库服务配置
 */
export interface DatabaseServiceConfig {
  connectionPool: ConnectionPoolConfig;
  cache?: CacheConfig;
  enableCaching?: boolean;
  enableMetrics?: boolean;
  enableQueryLogging?: boolean;
}

/**
 * 数据库服务状态
 */
export interface DatabaseServiceStatus {
  connectionPool: {
    healthy: boolean;
    totalConnections: number;
    healthyConnections: number;
  };
  cache?: {
    healthy: boolean;
    hitRate: number;
    totalOperations: number;
  };
  repositories: {
    initialized: boolean;
    count: number;
  };
  uptime: number;
}

/**
 * 数据库服务
 * 
 * 这个类整合了连接池、缓存和仓储模式，提供了一个统一的数据访问接口。
 */
export class DatabaseService {
  private logger = new Logger('DatabaseService');
  private config: DatabaseServiceConfig;
  private connectionPool: ConnectionPool | null = null;
  private cacheManager: CacheManager | null = null;
  private startTime = Date.now();
  
  // 仓储实例
  private shopRepository: ShopRepository | null = null;
  private userRepository: UserRepository | null = null;
  private orderRepository: OrderRepository | null = null;
  
  private isInitialized = false;
  private isShuttingDown = false;

  constructor(config: DatabaseServiceConfig) {
    this.config = {
      enableCaching: true,
      enableMetrics: true,
      enableQueryLogging: false,
      ...config
    };
  }

  /**
   * 初始化数据库服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('数据库服务已经初始化');
      return;
    }

    try {
      this.logger.info('初始化数据库服务...');

      // 初始化缓存管理器
      if (this.config.enableCaching && this.config.cache) {
        await this.initializeCache();
      }

      // 初始化连接池
      await this.initializeConnectionPool();

      // 初始化仓储
      this.initializeRepositories();

      this.isInitialized = true;
      this.logger.info('数据库服务初始化完成');

    } catch (error) {
      this.logger.error('数据库服务初始化失败', { error: error.message });
      await this.shutdown();
      throw error;
    }
  }

  /**
   * 初始化缓存管理器
   */
  private async initializeCache(): Promise<void> {
    if (!this.config.cache) return;

    try {
      this.cacheManager = new CacheManager(this.config.cache);
      await this.cacheManager.connect();
      
      this.logger.info('缓存管理器初始化完成');
    } catch (error) {
      this.logger.error('缓存管理器初始化失败', { error: error.message });
      
      // 缓存失败不阻止整个服务启动
      this.cacheManager = null;
    }
  }

  /**
   * 初始化连接池
   */
  private async initializeConnectionPool(): Promise<void> {
    this.connectionPool = new ConnectionPool(
      this.config.connectionPool,
      this.cacheManager || undefined
    );

    await this.connectionPool.initialize();
    this.logger.info('数据库连接池初始化完成');
  }

  /**
   * 初始化仓储
   */
  private initializeRepositories(): void {
    if (!this.connectionPool) {
      throw new Error('连接池未初始化');
    }

    try {
      // 获取主库客户端用于写操作
      const writeClient = this.connectionPool.getClient('write');
      
      // 初始化仓储
      this.shopRepository = new ShopRepository(writeClient);
      this.userRepository = new UserRepository(writeClient);
      this.orderRepository = new OrderRepository(writeClient);

      this.logger.info('仓储初始化完成', {
        repositories: ['ShopRepository', 'UserRepository', 'OrderRepository']
      });

    } catch (error) {
      this.logger.error('仓储初始化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取连接池
   */
  getConnectionPool(): ConnectionPool {
    if (!this.connectionPool) {
      throw new Error('连接池未初始化');
    }
    return this.connectionPool;
  }

  /**
   * 获取缓存管理器
   */
  getCacheManager(): CacheManager | null {
    return this.cacheManager;
  }

  /**
   * 获取店铺仓储
   */
  getShopRepository(): ShopRepository {
    if (!this.shopRepository) {
      throw new Error('ShopRepository未初始化');
    }
    return this.shopRepository;
  }

  /**
   * 获取用户仓储
   */
  getUserRepository(): UserRepository {
    if (!this.userRepository) {
      throw new Error('UserRepository未初始化');
    }
    return this.userRepository;
  }

  /**
   * 获取订单仓储
   */
  getOrderRepository(): OrderRepository {
    if (!this.orderRepository) {
      throw new Error('OrderRepository未初始化');
    }
    return this.orderRepository;
  }

  /**
   * 执行缓存查询
   */
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl?: number,
    queryType: QueryType = 'read'
  ): Promise<T> {
    if (!this.connectionPool) {
      throw new Error('连接池未初始化');
    }

    return this.connectionPool.cachedQuery(cacheKey, queryFn, ttl, queryType);
  }

  /**
   * 执行事务
   */
  async transaction<T>(
    fn: (prisma: any) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: any;
    }
  ): Promise<T> {
    if (!this.connectionPool) {
      throw new Error('连接池未初始化');
    }

    return this.connectionPool.transaction(fn, options);
  }

  /**
   * 获取读客户端
   */
  getReadClient() {
    if (!this.connectionPool) {
      throw new Error('连接池未初始化');
    }
    return this.connectionPool.getClient('read');
  }

  /**
   * 获取写客户端
   */
  getWriteClient() {
    if (!this.connectionPool) {
      throw new Error('连接池未初始化');
    }
    return this.connectionPool.getClient('write');
  }

  /**
   * 清除缓存
   */
  async clearCache(pattern?: string): Promise<number> {
    if (!this.cacheManager) {
      this.logger.warn('缓存管理器未启用');
      return 0;
    }

    try {
      if (pattern) {
        return await this.cacheManager.delPattern(pattern);
      } else {
        // 清除所有缓存（谨慎使用）
        return await this.cacheManager.delPattern('*');
      }
    } catch (error) {
      this.logger.error('清除缓存失败', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(): Promise<void> {
    if (!this.cacheManager || !this.connectionPool) {
      this.logger.warn('缓存或连接池未初始化，跳过预热');
      return;
    }

    try {
      this.logger.info('开始缓存预热...');

      // 预热常用查询
      const warmupTasks = [
        this.warmupShopData(),
        this.warmupUserData(),
        this.warmupStaticData()
      ];

      await Promise.all(warmupTasks);
      this.logger.info('缓存预热完成');

    } catch (error) {
      this.logger.error('缓存预热失败', { error: error.message });
    }
  }

  /**
   * 预热店铺数据
   */
  private async warmupShopData(): Promise<void> {
    try {
      // 预热活跃店铺列表
      const client = this.getReadClient();
      const activeShops = await client.shop.findMany({
        where: { isActive: true },
        select: { id: true, domain: true },
        take: 100
      });

      // 缓存每个店铺的基本信息
      for (const shop of activeShops) {
        const cacheKey = `shop:${shop.id}:info`;
        await this.cacheManager!.set(cacheKey, shop, 3600); // 1小时
      }

      this.logger.debug('店铺数据预热完成', { count: activeShops.length });

    } catch (error) {
      this.logger.error('店铺数据预热失败', { error: error.message });
    }
  }

  /**
   * 预热用户数据
   */
  private async warmupUserData(): Promise<void> {
    try {
      // 预热活跃用户的权限信息
      const client = this.getReadClient();
      const activeUsers = await client.user.findMany({
        where: { 
          isActive: true,
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天登录
          }
        },
        select: { id: true },
        take: 500
      });

      // 这里可以预热用户权限等常用数据
      this.logger.debug('用户数据预热完成', { count: activeUsers.length });

    } catch (error) {
      this.logger.error('用户数据预热失败', { error: error.message });
    }
  }

  /**
   * 预热静态数据
   */
  private async warmupStaticData(): Promise<void> {
    try {
      // 预热税率、物流费率等相对静态的数据
      // 这些数据变化频率低，适合长时间缓存
      
      this.logger.debug('静态数据预热完成');

    } catch (error) {
      this.logger.error('静态数据预热失败', { error: error.message });
    }
  }

  /**
   * 获取服务状态
   */
  async getStatus(): Promise<DatabaseServiceStatus> {
    const status: DatabaseServiceStatus = {
      connectionPool: {
        healthy: false,
        totalConnections: 0,
        healthyConnections: 0
      },
      repositories: {
        initialized: this.isInitialized,
        count: 0
      },
      uptime: Date.now() - this.startTime
    };

    // 连接池状态
    if (this.connectionPool) {
      const poolHealth = await this.connectionPool.healthCheck();
      status.connectionPool = {
        healthy: poolHealth.healthy,
        totalConnections: poolHealth.connections,
        healthyConnections: poolHealth.healthyConnections
      };
    }

    // 缓存状态
    if (this.cacheManager) {
      const cacheHealth = await this.cacheManager.healthCheck();
      const metrics = this.cacheManager.getMetrics();
      
      status.cache = {
        healthy: cacheHealth.healthy,
        hitRate: metrics.hitRate,
        totalOperations: metrics.operations
      };
    }

    // 仓储状态
    let repositoryCount = 0;
    if (this.shopRepository) repositoryCount++;
    if (this.userRepository) repositoryCount++;
    if (this.orderRepository) repositoryCount++;
    
    status.repositories.count = repositoryCount;

    return status;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: {
      connectionPool: boolean;
      cache: boolean;
      repositories: boolean;
    };
    details?: any;
  }> {
    const components = {
      connectionPool: false,
      cache: true, // 缓存是可选的
      repositories: false
    };

    let details: any = {};

    try {
      // 检查连接池
      if (this.connectionPool) {
        const poolHealth = await this.connectionPool.healthCheck();
        components.connectionPool = poolHealth.healthy;
        details.connectionPool = poolHealth;
      }

      // 检查缓存
      if (this.cacheManager) {
        const cacheHealth = await this.cacheManager.healthCheck();
        components.cache = cacheHealth.healthy;
        details.cache = cacheHealth;
      }

      // 检查仓储
      components.repositories = this.isInitialized && 
        !!this.shopRepository && 
        !!this.userRepository && 
        !!this.orderRepository;

      const healthy = components.connectionPool && 
                     components.cache && 
                     components.repositories;

      return {
        healthy,
        components,
        details
      };

    } catch (error) {
      this.logger.error('健康检查失败', { error: error.message });
      
      return {
        healthy: false,
        components,
        details: { error: error.message }
      };
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    const metrics: any = {
      uptime: Date.now() - this.startTime,
      initialized: this.isInitialized
    };

    // 连接池指标
    if (this.connectionPool) {
      metrics.connectionPool = this.connectionPool.getStats();
    }

    // 缓存指标
    if (this.cacheManager) {
      metrics.cache = this.cacheManager.getMetrics();
    }

    return metrics;
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    if (this.connectionPool) {
      this.connectionPool.resetStats();
    }

    if (this.cacheManager) {
      this.cacheManager.resetMetrics();
    }

    this.startTime = Date.now();
    this.logger.info('性能指标已重置');
  }

  /**
   * 关闭数据库服务
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;

    try {
      this.logger.info('关闭数据库服务...');

      // 关闭连接池
      if (this.connectionPool) {
        await this.connectionPool.shutdown();
        this.connectionPool = null;
      }

      // 关闭缓存
      if (this.cacheManager) {
        await this.cacheManager.disconnect();
        this.cacheManager = null;
      }

      // 清理仓储引用
      this.shopRepository = null;
      this.userRepository = null;
      this.orderRepository = null;

      this.isInitialized = false;
      this.logger.info('数据库服务已关闭');

    } catch (error) {
      this.logger.error('关闭数据库服务时发生错误', { error: error.message });
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * 获取运行时间
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && !this.isShuttingDown;
  }
}

/**
 * 全局数据库服务实例
 */
let globalDatabaseService: DatabaseService | null = null;

/**
 * 获取全局数据库服务
 */
export function getDatabaseService(): DatabaseService {
  if (!globalDatabaseService) {
    throw new Error('数据库服务未初始化，请先调用 initializeDatabaseService()');
  }
  return globalDatabaseService;
}

/**
 * 初始化全局数据库服务
 */
export async function initializeDatabaseService(config: DatabaseServiceConfig): Promise<DatabaseService> {
  if (globalDatabaseService) {
    throw new Error('数据库服务已经初始化');
  }

  globalDatabaseService = new DatabaseService(config);
  await globalDatabaseService.initialize();
  
  return globalDatabaseService;
}

/**
 * 关闭全局数据库服务
 */
export async function shutdownDatabaseService(): Promise<void> {
  if (globalDatabaseService) {
    await globalDatabaseService.shutdown();
    globalDatabaseService = null;
  }
}