import Redis from 'ioredis';
import { Logger } from '../utils/logger';

/**
 * 缓存配置
 */
export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    maxRetriesPerRequest?: number;
    retryDelayOnFailover?: number;
    enableReadyCheck?: boolean;
    lazyConnect?: boolean;
  };
  defaultTtl: number; // 默认过期时间（秒）
  enableMetrics?: boolean;
}

/**
 * 缓存统计
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  operations: number;
  hitRate: number;
}

/**
 * 缓存管理器
 */
export class CacheManager {
  private redis: Redis;
  private logger = new Logger('CacheManager');
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    operations: 0,
    hitRate: 0
  };
  private isConnected = false;

  constructor(config: CacheConfig) {
    this.config = config;
    this.redis = new Redis({
      ...config.redis,
      lazyConnect: true,
      retryDelayOnFailover: config.redis.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest || 3
    });

    this.setupEventHandlers();
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.info('Redis连接已建立');
    });

    this.redis.on('ready', () => {
      this.logger.info('Redis客户端就绪');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      this.metrics.errors++;
      this.logger.error('Redis连接错误', { error: error.message });
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis连接已关闭');
    });

    this.redis.on('reconnecting', () => {
      this.logger.info('Redis正在重连...');
    });
  }

  /**
   * 连接到Redis
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      this.isConnected = true;
      this.logger.info('CacheManager已连接到Redis');
    } catch (error) {
      this.logger.error('连接Redis失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.isConnected = false;
      this.logger.info('CacheManager已断开Redis连接');
    } catch (error) {
      this.logger.error('断开Redis连接失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      this.metrics.operations++;
      const value = await this.redis.get(key);
      
      if (value === null) {
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      this.metrics.hits++;
      this.updateHitRate();
      
      try {
        return JSON.parse(value) as T;
      } catch {
        // 如果不是JSON格式，直接返回字符串
        return value as T;
      }
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('获取缓存失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      this.metrics.operations++;
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      const expireTime = ttl || this.config.defaultTtl;

      if (expireTime > 0) {
        await this.redis.setex(key, expireTime, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      return true;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('设置缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<boolean> {
    try {
      this.metrics.operations++;
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('删除缓存失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 批量删除缓存
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      this.metrics.operations++;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('批量删除缓存失败', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      this.metrics.operations++;
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('检查缓存存在性失败', { key, error: error.message });
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      this.metrics.operations++;
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('设置缓存过期时间失败', { key, ttl, error: error.message });
      return false;
    }
  }

  /**
   * 获取剩余TTL
   */
  async ttl(key: string): Promise<number> {
    try {
      this.metrics.operations++;
      return await this.redis.ttl(key);
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('获取缓存TTL失败', { key, error: error.message });
      return -1;
    }
  }

  /**
   * 增加计数器
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      this.metrics.operations++;
      const result = await this.redis.incr(key);
      
      if (ttl && result === 1) {
        await this.redis.expire(key, ttl);
      }
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('增加计数器失败', { key, error: error.message });
      return 0;
    }
  }

  /**
   * 减少计数器
   */
  async decr(key: string): Promise<number> {
    try {
      this.metrics.operations++;
      return await this.redis.decr(key);
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('减少计数器失败', { key, error: error.message });
      return 0;
    }
  }

  /**
   * 哈希表操作：设置字段
   */
  async hset(key: string, field: string, value: any): Promise<boolean> {
    try {
      this.metrics.operations++;
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      const result = await this.redis.hset(key, field, serializedValue);
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('设置哈希字段失败', { key, field, error: error.message });
      return false;
    }
  }

  /**
   * 哈希表操作：获取字段
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      this.metrics.operations++;
      const value = await this.redis.hget(key, field);
      
      if (value === null) {
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      this.metrics.hits++;
      this.updateHitRate();
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('获取哈希字段失败', { key, field, error: error.message });
      return null;
    }
  }

  /**
   * 哈希表操作：获取所有字段
   */
  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    try {
      this.metrics.operations++;
      const result = await this.redis.hgetall(key);
      
      if (Object.keys(result).length === 0) {
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      this.metrics.hits++;
      this.updateHitRate();
      
      const parsed: Record<string, T> = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value) as T;
        } catch {
          parsed[field] = value as T;
        }
      }
      
      return parsed;
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('获取哈希表失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 哈希表操作：删除字段
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      this.metrics.operations++;
      return await this.redis.hdel(key, ...fields);
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('删除哈希字段失败', { key, fields, error: error.message });
      return 0;
    }
  }

  /**
   * 列表操作：左侧推入
   */
  async lpush(key: string, ...values: any[]): Promise<number> {
    try {
      this.metrics.operations++;
      const serializedValues = values.map(v => 
        typeof v === 'string' ? v : JSON.stringify(v)
      );
      return await this.redis.lpush(key, ...serializedValues);
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('左侧推入列表失败', { key, error: error.message });
      return 0;
    }
  }

  /**
   * 列表操作：右侧推入
   */
  async rpush(key: string, ...values: any[]): Promise<number> {
    try {
      this.metrics.operations++;
      const serializedValues = values.map(v => 
        typeof v === 'string' ? v : JSON.stringify(v)
      );
      return await this.redis.rpush(key, ...serializedValues);
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('右侧推入列表失败', { key, error: error.message });
      return 0;
    }
  }

  /**
   * 列表操作：左侧弹出
   */
  async lpop<T>(key: string): Promise<T | null> {
    try {
      this.metrics.operations++;
      const value = await this.redis.lpop(key);
      
      if (value === null) {
        return null;
      }
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('左侧弹出列表失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 列表操作：右侧弹出
   */
  async rpop<T>(key: string): Promise<T | null> {
    try {
      this.metrics.operations++;
      const value = await this.redis.rpop(key);
      
      if (value === null) {
        return null;
      }
      
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('右侧弹出列表失败', { key, error: error.message });
      return null;
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * 获取缓存统计
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置统计
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0,
      hitRate: 0
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * 获取连接状态
   */
  isHealthy(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }

  /**
   * 获取Redis客户端实例（高级用法）
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 执行Lua脚本
   */
  async eval(script: string, keys: string[] = [], args: any[] = []): Promise<any> {
    try {
      this.metrics.operations++;
      return await this.redis.eval(script, keys.length, ...keys, ...args);
    } catch (error) {
      this.metrics.errors++;
      this.logger.error('执行Lua脚本失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 分布式锁
   */
  async acquireLock(
    key: string, 
    ttl: number = 30, 
    retryCount: number = 3,
    retryDelay: number = 100
  ): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        const result = await this.redis.set(lockKey, lockValue, 'EX', ttl, 'NX');
        
        if (result === 'OK') {
          return lockValue;
        }
        
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        this.logger.error('获取分布式锁失败', { key, error: error.message });
      }
    }
    
    return null;
  }

  /**
   * 释放分布式锁
   */
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    try {
      const result = await this.eval(script, [lockKey], [lockValue]);
      return result === 1;
    } catch (error) {
      this.logger.error('释放分布式锁失败', { key, error: error.message });
      return false;
    }
  }
}