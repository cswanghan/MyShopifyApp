import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger';

/**
 * 数据库连接配置
 */
export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  logLevel?: 'info' | 'query' | 'warn' | 'error';
  enableLogging?: boolean;
  enableMetrics?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * 数据库连接状态
 */
export interface DatabaseStatus {
  connected: boolean;
  connectionCount: number;
  lastError?: string;
  metrics: {
    totalQueries: number;
    slowQueries: number;
    failedQueries: number;
    averageQueryTime: number;
  };
}

/**
 * 查询指标
 */
interface QueryMetrics {
  totalQueries: number;
  slowQueries: number;
  failedQueries: number;
  totalQueryTime: number;
  startTime: number;
}

/**
 * 数据库管理器
 */
export class DatabaseManager {
  private logger = new Logger('DatabaseManager');
  private prisma: PrismaClient | null = null;
  private config: DatabaseConfig;
  private metrics: QueryMetrics;
  private connectionPromise: Promise<void> | null = null;
  private isShuttingDown = false;

  constructor(config: DatabaseConfig) {
    this.config = {
      maxConnections: 10,
      connectionTimeout: 10000, // 10秒
      queryTimeout: 30000, // 30秒
      logLevel: 'warn',
      enableLogging: true,
      enableMetrics: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      totalQueryTime: 0,
      startTime: Date.now()
    };
  }

  /**
   * 连接数据库
   */
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.performConnection();
    return this.connectionPromise;
  }

  /**
   * 执行数据库连接
   */
  private async performConnection(): Promise<void> {
    try {
      this.logger.info('连接数据库...', {
        url: this.maskDatabaseUrl(this.config.url),
        maxConnections: this.config.maxConnections
      });

      // 创建Prisma客户端
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: this.config.url
          }
        },
        log: this.buildLogConfig(),
        errorFormat: 'pretty'
      });

      // 设置查询监听器
      if (this.config.enableMetrics) {
        this.setupQueryListeners();
      }

      // 测试连接
      await this.testConnection();

      this.logger.info('数据库连接成功');

    } catch (error) {
      this.logger.error('数据库连接失败', error);
      await this.disconnect();
      throw error;
    }
  }

  /**
   * 测试数据库连接
   */
  private async testConnection(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized');
    }

    let retryCount = 0;
    while (retryCount < this.config.retryAttempts!) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return;
      } catch (error) {
        retryCount++;
        if (retryCount >= this.config.retryAttempts!) {
          throw error;
        }
        
        this.logger.warn(`数据库连接测试失败，重试 ${retryCount}/${this.config.retryAttempts}`, error);
        await this.delay(this.config.retryDelay!);
      }
    }
  }

  /**
   * 设置查询监听器
   */
  private setupQueryListeners(): void {
    if (!this.prisma) return;

    // 监听查询事件
    this.prisma.$on('query', (event: any) => {
      this.metrics.totalQueries++;
      this.metrics.totalQueryTime += event.duration;

      // 检测慢查询（超过1秒）
      if (event.duration > 1000) {
        this.metrics.slowQueries++;
        this.logger.warn('检测到慢查询', {
          query: event.query,
          duration: event.duration,
          params: event.params
        });
      }

      // 记录详细查询日志
      if (this.config.logLevel === 'query') {
        this.logger.debug('查询执行', {
          query: event.query,
          duration: event.duration,
          params: event.params
        });
      }
    });

    // 监听错误事件
    this.prisma.$on('error', (event: any) => {
      this.metrics.failedQueries++;
      this.logger.error('数据库查询错误', event);
    });
  }

  /**
   * 构建日志配置
   */
  private buildLogConfig(): any[] {
    const logConfig: any[] = [];

    if (this.config.enableLogging) {
      switch (this.config.logLevel) {
        case 'info':
          logConfig.push('info', 'warn', 'error');
          break;
        case 'query':
          logConfig.push('query', 'info', 'warn', 'error');
          break;
        case 'warn':
          logConfig.push('warn', 'error');
          break;
        case 'error':
          logConfig.push('error');
          break;
      }
    }

    return logConfig;
  }

  /**
   * 获取Prisma客户端
   */
  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  /**
   * 检查连接状态
   */
  async isConnected(): Promise<boolean> {
    if (!this.prisma) return false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('数据库连接检查失败', error);
      return false;
    }
  }

  /**
   * 获取数据库状态
   */
  async getStatus(): Promise<DatabaseStatus> {
    const connected = await this.isConnected();
    
    return {
      connected,
      connectionCount: this.prisma ? 1 : 0, // Prisma管理连接池
      metrics: {
        totalQueries: this.metrics.totalQueries,
        slowQueries: this.metrics.slowQueries,
        failedQueries: this.metrics.failedQueries,
        averageQueryTime: this.metrics.totalQueries > 0 
          ? this.metrics.totalQueryTime / this.metrics.totalQueries 
          : 0
      }
    };
  }

  /**
   * 执行健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      if (!this.prisma) {
        throw new Error('Database not connected');
      }

      await this.prisma.$queryRaw`SELECT 1`;
      
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      return {
        healthy: false,
        latency,
        error: error.message
      };
    }
  }

  /**
   * 执行数据库迁移
   */
  async migrate(): Promise<void> {
    try {
      this.logger.info('开始执行数据库迁移...');
      
      // 注意：在生产环境中，迁移通常通过CI/CD管道执行
      // 这里仅用于开发环境
      if (process.env.NODE_ENV === 'development') {
        const { execSync } = require('child_process');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      }
      
      this.logger.info('数据库迁移完成');
    } catch (error) {
      this.logger.error('数据库迁移失败', error);
      throw error;
    }
  }

  /**
   * 生成数据库客户端
   */
  async generateClient(): Promise<void> {
    try {
      this.logger.info('生成Prisma客户端...');
      
      const { execSync } = require('child_process');
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      this.logger.info('Prisma客户端生成完成');
    } catch (error) {
      this.logger.error('Prisma客户端生成失败', error);
      throw error;
    }
  }

  /**
   * 执行数据库备份
   */
  async backup(outputPath?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = outputPath || `backup-${timestamp}.sql`;
      
      this.logger.info('开始数据库备份...', { backupFile });
      
      // 这里应该根据数据库类型实现备份逻辑
      // 例如对于PostgreSQL：pg_dump
      // 对于MySQL：mysqldump
      
      const { execSync } = require('child_process');
      const dbUrl = new URL(this.config.url);
      
      if (dbUrl.protocol === 'postgresql:') {
        const command = `pg_dump "${this.config.url}" > ${backupFile}`;
        execSync(command);
      } else {
        throw new Error(`Unsupported database type: ${dbUrl.protocol}`);
      }
      
      this.logger.info('数据库备份完成', { backupFile });
      return backupFile;
    } catch (error) {
      this.logger.error('数据库备份失败', error);
      throw error;
    }
  }

  /**
   * 清理连接
   */
  async disconnect(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    
    try {
      if (this.prisma) {
        this.logger.info('断开数据库连接...');
        await this.prisma.$disconnect();
        this.prisma = null;
      }
      
      this.connectionPromise = null;
      this.logger.info('数据库连接已断开');
    } catch (error) {
      this.logger.error('断开数据库连接时发生错误', error);
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      totalQueryTime: 0,
      startTime: Date.now()
    };
    
    this.logger.info('数据库指标已重置');
  }

  /**
   * 获取运行时间
   */
  getUptime(): number {
    return Date.now() - this.metrics.startTime;
  }

  /**
   * 掩码数据库URL中的敏感信息
   */
  private maskDatabaseUrl(url: string): string {
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

/**
 * 全局数据库管理器实例
 */
let globalDatabaseManager: DatabaseManager | null = null;

/**
 * 获取全局数据库管理器
 */
export function getDatabaseManager(): DatabaseManager {
  if (!globalDatabaseManager) {
    const config: DatabaseConfig = {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/dtax_bridge',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
      logLevel: (process.env.DB_LOG_LEVEL as any) || 'warn',
      enableLogging: process.env.DB_ENABLE_LOGGING !== 'false',
      enableMetrics: process.env.DB_ENABLE_METRICS !== 'false',
      retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000')
    };

    globalDatabaseManager = new DatabaseManager(config);
  }

  return globalDatabaseManager;
}

/**
 * 初始化数据库连接
 */
export async function initializeDatabase(): Promise<DatabaseManager> {
  const dbManager = getDatabaseManager();
  await dbManager.connect();
  return dbManager;
}

/**
 * 关闭数据库连接
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (globalDatabaseManager) {
    await globalDatabaseManager.disconnect();
    globalDatabaseManager = null;
  }
}