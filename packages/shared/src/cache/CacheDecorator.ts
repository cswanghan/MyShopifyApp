import { CacheManager } from './CacheManager';
import { Logger } from '../utils/logger';

/**
 * 缓存装饰器选项
 */
export interface CacheOptions {
  key?: string | ((this: any, ...args: any[]) => string);
  ttl?: number;
  namespace?: string;
  condition?: (...args: any[]) => boolean;
  keyGenerator?: (...args: any[]) => string;
}

/**
 * 缓存装饰器工厂
 */
export class CacheDecoratorFactory {
  private static cacheManager: CacheManager;
  private static logger = new Logger('CacheDecorator');

  /**
   * 设置缓存管理器
   */
  static setCacheManager(cacheManager: CacheManager): void {
    this.cacheManager = cacheManager;
  }

  /**
   * 缓存方法结果装饰器
   */
  static Cache(options: CacheOptions = {}) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const className = target.constructor.name;
      const methodName = propertyKey;

      descriptor.value = async function (...args: any[]) {
        if (!CacheDecoratorFactory.cacheManager) {
          CacheDecoratorFactory.logger.warn('缓存管理器未设置，跳过缓存');
          return originalMethod.apply(this, args);
        }

        // 检查缓存条件
        if (options.condition && !options.condition.apply(this, args)) {
          return originalMethod.apply(this, args);
        }

        // 生成缓存键
        let cacheKey: string;
        
        if (typeof options.key === 'function') {
          cacheKey = options.key.apply(this, args);
        } else if (typeof options.key === 'string') {
          cacheKey = options.key;
        } else if (options.keyGenerator) {
          cacheKey = options.keyGenerator.apply(this, args);
        } else {
          // 默认键生成策略
          const argsHash = CacheDecoratorFactory.hashArgs(args);
          cacheKey = `${options.namespace || className}:${methodName}:${argsHash}`;
        }

        try {
          // 尝试从缓存获取
          const cachedResult = await CacheDecoratorFactory.cacheManager.get(cacheKey);
          
          if (cachedResult !== null) {
            CacheDecoratorFactory.logger.debug('缓存命中', { 
              className, 
              methodName, 
              cacheKey 
            });
            return cachedResult;
          }

          // 执行原方法
          const result = await originalMethod.apply(this, args);

          // 存储到缓存
          if (result !== undefined && result !== null) {
            await CacheDecoratorFactory.cacheManager.set(
              cacheKey, 
              result, 
              options.ttl
            );
            
            CacheDecoratorFactory.logger.debug('结果已缓存', { 
              className, 
              methodName, 
              cacheKey 
            });
          }

          return result;
        } catch (error) {
          CacheDecoratorFactory.logger.error('缓存操作失败', {
            className,
            methodName,
            cacheKey,
            error: error.message
          });
          
          // 缓存失败时仍执行原方法
          return originalMethod.apply(this, args);
        }
      };

      return descriptor;
    };
  }

  /**
   * 缓存清除装饰器
   */
  static CacheEvict(keyPattern: string | ((this: any, ...args: any[]) => string)) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const className = target.constructor.name;
      const methodName = propertyKey;

      descriptor.value = async function (...args: any[]) {
        try {
          // 执行原方法
          const result = await originalMethod.apply(this, args);

          if (CacheDecoratorFactory.cacheManager) {
            // 生成要清除的键模式
            let pattern: string;
            
            if (typeof keyPattern === 'function') {
              pattern = keyPattern.apply(this, args);
            } else {
              pattern = keyPattern;
            }

            // 清除缓存
            const deletedCount = await CacheDecoratorFactory.cacheManager.delPattern(pattern);
            
            CacheDecoratorFactory.logger.debug('缓存已清除', {
              className,
              methodName,
              pattern,
              deletedCount
            });
          }

          return result;
        } catch (error) {
          CacheDecoratorFactory.logger.error('缓存清除失败', {
            className,
            methodName,
            error: error.message
          });
          
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * 参数哈希生成
   */
  private static hashArgs(args: any[]): string {
    try {
      const str = JSON.stringify(args);
      let hash = 0;
      
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      
      return Math.abs(hash).toString(36);
    } catch {
      return Date.now().toString(36);
    }
  }
}

/**
 * 缓存装饰器（简化使用）
 */
export const Cache = CacheDecoratorFactory.Cache;
export const CacheEvict = CacheDecoratorFactory.CacheEvict;

/**
 * 常用缓存键生成器
 */
export class CacheKeyGenerators {
  /**
   * 基于用户的缓存键
   */
  static userBased(userId: string, operation: string, ...params: any[]): string {
    const paramsHash = params.length > 0 ? 
      `:${JSON.stringify(params).replace(/[^a-zA-Z0-9]/g, '')}` : '';
    return `user:${userId}:${operation}${paramsHash}`;
  }

  /**
   * 基于店铺的缓存键
   */
  static shopBased(shopId: string, operation: string, ...params: any[]): string {
    const paramsHash = params.length > 0 ? 
      `:${JSON.stringify(params).replace(/[^a-zA-Z0-9]/g, '')}` : '';
    return `shop:${shopId}:${operation}${paramsHash}`;
  }

  /**
   * 基于订单的缓存键
   */
  static orderBased(orderId: string, operation: string): string {
    return `order:${orderId}:${operation}`;
  }

  /**
   * 分页缓存键
   */
  static paginated(baseKey: string, page: number, limit: number, filters?: any): string {
    const filterHash = filters ? 
      `:${JSON.stringify(filters).replace(/[^a-zA-Z0-9]/g, '')}` : '';
    return `${baseKey}:page:${page}:limit:${limit}${filterHash}`;
  }

  /**
   * 时间敏感缓存键
   */
  static timeBased(baseKey: string, timeUnit: 'hour' | 'day' | 'month'): string {
    const now = new Date();
    let timeKey: string;
    
    switch (timeUnit) {
      case 'hour':
        timeKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        break;
      case 'day':
        timeKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        break;
      case 'month':
        timeKey = `${now.getFullYear()}-${now.getMonth()}`;
        break;
    }
    
    return `${baseKey}:${timeUnit}:${timeKey}`;
  }
}

/**
 * 缓存助手类
 */
export class CacheHelper {
  private cacheManager: CacheManager;
  private logger = new Logger('CacheHelper');

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * 缓存或获取
   */
  async cacheOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = await this.cacheManager.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，执行获取函数
    const result = await fetcher();
    
    // 存储到缓存
    if (result !== undefined && result !== null) {
      await this.cacheManager.set(key, result, ttl);
    }

    return result;
  }

  /**
   * 批量缓存或获取
   */
  async batchCacheOrFetch<T>(
    items: { key: string; fetcher: () => Promise<T>; ttl?: number }[]
  ): Promise<T[]> {
    const results: T[] = [];
    const toFetch: typeof items = [];

    // 检查缓存
    for (const item of items) {
      const cached = await this.cacheManager.get<T>(item.key);
      
      if (cached !== null) {
        results.push(cached);
      } else {
        toFetch.push(item);
        results.push(null as T);
      }
    }

    // 并行获取未缓存的项
    if (toFetch.length > 0) {
      const fetchPromises = toFetch.map(async (item, index) => {
        try {
          const result = await item.fetcher();
          
          if (result !== undefined && result !== null) {
            await this.cacheManager.set(item.key, result, item.ttl);
          }
          
          return { index: items.indexOf(item), result };
        } catch (error) {
          this.logger.error('批量获取失败', { key: item.key, error: error.message });
          return { index: items.indexOf(item), result: null };
        }
      });

      const fetchResults = await Promise.all(fetchPromises);
      
      // 填充结果
      for (const { index, result } of fetchResults) {
        results[index] = result;
      }
    }

    return results;
  }

  /**
   * 缓存预热
   */
  async warmup<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const exists = await this.cacheManager.exists(key);
        
        if (!exists) {
          const result = await fetcher(key);
          
          if (result !== undefined && result !== null) {
            await this.cacheManager.set(key, result, ttl);
          }
        }
      } catch (error) {
        this.logger.error('缓存预热失败', { key, error: error.message });
      }
    });

    await Promise.all(promises);
    this.logger.info('缓存预热完成', { keys: keys.length });
  }

  /**
   * 缓存刷新
   */
  async refresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // 先删除现有缓存
    await this.cacheManager.del(key);
    
    // 重新获取并缓存
    const result = await fetcher();
    
    if (result !== undefined && result !== null) {
      await this.cacheManager.set(key, result, ttl);
    }

    return result;
  }

  /**
   * 缓存穿透保护
   */
  async protectFromCachePenetration<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
    nullTtl: number = 60
  ): Promise<T | null> {
    const nullKey = `null:${key}`;
    
    // 检查是否有空值缓存
    const nullCached = await this.cacheManager.exists(nullKey);
    if (nullCached) {
      return null;
    }

    // 正常缓存逻辑
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fetcher();
    
    if (result === null || result === undefined) {
      // 缓存空值，防止穿透
      await this.cacheManager.set(nullKey, 'null', nullTtl);
      return null;
    }

    await this.cacheManager.set(key, result, ttl);
    return result;
  }
}