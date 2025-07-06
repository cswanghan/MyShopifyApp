/**
 * 数据库模块导出
 */

// 核心数据库服务
export { DatabaseService, getDatabaseService, initializeDatabaseService, shutdownDatabaseService } from './DatabaseService';
export type { DatabaseServiceConfig, DatabaseServiceStatus } from './DatabaseService';

// 连接池
export { ConnectionPool } from './ConnectionPool';
export type { 
  ConnectionPoolConfig, 
  PoolStatus, 
  QueryType, 
  QueryStats 
} from './ConnectionPool';

// 原有数据库管理器（向后兼容）
export { DatabaseManager, getDatabaseManager, initializeDatabase, closeDatabaseConnection } from './DatabaseManager';
export type { DatabaseConfig, DatabaseStatus } from './DatabaseManager';

// 数据模型
export * from './models';

// 仓储模式
export { BaseRepository } from './repositories/BaseRepository';
export type { IBaseRepository, QueryOptions, PaginatedResult } from './repositories/BaseRepository';

export { ShopRepository } from './repositories/ShopRepository';
export { UserRepository } from './repositories/UserRepository';
export { OrderRepository } from './repositories/OrderRepository';

/**
 * 数据库工具函数
 */
export class DatabaseUtils {
  /**
   * 构建分页查询选项
   */
  static buildPaginationOptions(
    page: number = 1,
    limit: number = 20,
    orderBy?: any,
    where?: any
  ): QueryOptions {
    const skip = (page - 1) * limit;
    
    return {
      skip,
      take: limit,
      orderBy: orderBy || { createdAt: 'desc' },
      where
    };
  }

  /**
   * 计算分页信息
   */
  static calculatePagination(
    total: number,
    page: number,
    limit: number
  ): {
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      totalPages,
      hasNext,
      hasPrev
    };
  }

  /**
   * 构建搜索条件
   */
  static buildSearchConditions(
    searchFields: string[],
    searchTerm: string
  ): any {
    if (!searchTerm || searchFields.length === 0) {
      return {};
    }

    return {
      OR: searchFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      }))
    };
  }

  /**
   * 构建日期范围条件
   */
  static buildDateRangeConditions(
    field: string,
    startDate?: Date,
    endDate?: Date
  ): any {
    const conditions: any = {};

    if (startDate || endDate) {
      conditions[field] = {};
      
      if (startDate) {
        conditions[field].gte = startDate;
      }
      
      if (endDate) {
        conditions[field].lte = endDate;
      }
    }

    return conditions;
  }

  /**
   * 合并查询条件
   */
  static mergeConditions(...conditions: any[]): any {
    const validConditions = conditions.filter(
      condition => condition && Object.keys(condition).length > 0
    );

    if (validConditions.length === 0) {
      return {};
    }

    if (validConditions.length === 1) {
      return validConditions[0];
    }

    return {
      AND: validConditions
    };
  }

  /**
   * 构建排序选项
   */
  static buildOrderBy(
    sortField?: string,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): any {
    if (!sortField) {
      return { createdAt: 'desc' };
    }

    // 支持嵌套字段排序，如 'user.name'
    if (sortField.includes('.')) {
      const [relation, field] = sortField.split('.');
      return {
        [relation]: {
          [field]: sortDirection
        }
      };
    }

    return {
      [sortField]: sortDirection
    };
  }

  /**
   * 验证分页参数
   */
  static validatePaginationParams(
    page: number,
    limit: number
  ): { page: number; limit: number } {
    const validatedPage = Math.max(1, Math.floor(page) || 1);
    const validatedLimit = Math.min(Math.max(1, Math.floor(limit) || 20), 100);

    return {
      page: validatedPage,
      limit: validatedLimit
    };
  }

  /**
   * 构建包含关系
   */
  static buildIncludeOptions(
    includes: string[] = []
  ): any {
    if (includes.length === 0) {
      return undefined;
    }

    const includeObj: any = {};

    for (const include of includes) {
      if (include.includes('.')) {
        // 处理嵌套包含，如 'user.shop'
        const parts = include.split('.');
        let current = includeObj;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          
          if (i === parts.length - 1) {
            current[part] = true;
          } else {
            if (!current[part]) {
              current[part] = { include: {} };
            }
            current = current[part].include;
          }
        }
      } else {
        includeObj[include] = true;
      }
    }

    return includeObj;
  }

  /**
   * 构建选择字段
   */
  static buildSelectOptions(
    fields: string[] = []
  ): any {
    if (fields.length === 0) {
      return undefined;
    }

    const selectObj: any = {};

    for (const field of fields) {
      selectObj[field] = true;
    }

    return selectObj;
  }
}

/**
 * 数据库常量
 */
export const DATABASE_CONSTANTS = {
  // 默认分页大小
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // 连接池配置
  DEFAULT_MAX_CONNECTIONS: 10,
  DEFAULT_CONNECTION_TIMEOUT: 10000,
  DEFAULT_IDLE_TIMEOUT: 300000,
  
  // 查询超时
  DEFAULT_QUERY_TIMEOUT: 30000,
  SLOW_QUERY_THRESHOLD: 1000,
  
  // 重试配置
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY: 1000,
  
  // 健康检查
  DEFAULT_HEALTH_CHECK_INTERVAL: 30000
} as const;

/**
 * 数据库错误类型
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'QUERY_ERROR', details);
    this.name = 'QueryError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

/**
 * 环境配置工厂
 */
export class DatabaseConfigFactory {
  /**
   * 创建开发环境配置
   */
  static createDevelopmentConfig(): DatabaseServiceConfig {
    return {
      connectionPool: {
        master: {
          url: process.env.DATABASE_URL || 'postgresql://localhost:5432/dtax_bridge_dev',
          maxConnections: 5
        },
        connectionTimeout: 10000,
        healthCheckInterval: 30000,
        enableQueryLogging: true,
        enableMetrics: true
      },
      cache: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          keyPrefix: 'dtax:dev:'
        },
        defaultTtl: 300
      },
      enableCaching: true,
      enableMetrics: true,
      enableQueryLogging: true
    };
  }

  /**
   * 创建生产环境配置
   */
  static createProductionConfig(): DatabaseServiceConfig {
    return {
      connectionPool: {
        master: {
          url: process.env.DATABASE_URL!,
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
        },
        replicas: process.env.READ_REPLICA_URLS ? {
          urls: process.env.READ_REPLICA_URLS.split(','),
          maxConnections: parseInt(process.env.DB_REPLICA_MAX_CONNECTIONS || '10')
        } : undefined,
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '300000'),
        healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
        enableQueryLogging: process.env.DB_ENABLE_QUERY_LOGGING === 'true',
        enableMetrics: true
      },
      cache: {
        redis: {
          host: process.env.REDIS_HOST!,
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0'),
          keyPrefix: process.env.REDIS_KEY_PREFIX || 'dtax:prod:'
        },
        defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300')
      },
      enableCaching: process.env.ENABLE_CACHING !== 'false',
      enableMetrics: true,
      enableQueryLogging: process.env.DB_ENABLE_QUERY_LOGGING === 'true'
    };
  }

  /**
   * 创建测试环境配置
   */
  static createTestConfig(): DatabaseServiceConfig {
    return {
      connectionPool: {
        master: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/dtax_bridge_test',
          maxConnections: 2
        },
        connectionTimeout: 5000,
        healthCheckInterval: 60000,
        enableQueryLogging: false,
        enableMetrics: false
      },
      enableCaching: false, // 测试环境通常不需要缓存
      enableMetrics: false,
      enableQueryLogging: false
    };
  }

  /**
   * 根据环境自动创建配置
   */
  static createConfig(): DatabaseServiceConfig {
    const env = process.env.NODE_ENV || 'development';

    switch (env) {
      case 'production':
        return this.createProductionConfig();
      case 'test':
        return this.createTestConfig();
      case 'development':
      default:
        return this.createDevelopmentConfig();
    }
  }
}