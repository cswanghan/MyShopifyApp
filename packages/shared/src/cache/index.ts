/**
 * 缓存模块导出
 */

export { CacheManager } from './CacheManager';
export type { CacheConfig, CacheMetrics } from './CacheManager';

export { 
  CacheDecoratorFactory,
  Cache,
  CacheEvict,
  CacheKeyGenerators,
  CacheHelper
} from './CacheDecorator';
export type { CacheOptions } from './CacheDecorator';

/**
 * 缓存常量
 */
export const CACHE_CONSTANTS = {
  // 默认TTL（秒）
  DEFAULT_TTL: 300, // 5分钟
  SHORT_TTL: 60,    // 1分钟
  MEDIUM_TTL: 900,  // 15分钟
  LONG_TTL: 3600,   // 1小时
  VERY_LONG_TTL: 86400, // 24小时
  
  // 键前缀
  PREFIXES: {
    SHOP: 'shop:',
    USER: 'user:',
    ORDER: 'order:',
    TAX: 'tax:',
    SHIPPING: 'shipping:',
    COMPLIANCE: 'compliance:',
    STATS: 'stats:',
    SESSION: 'session:',
    RATE_LIMIT: 'rate_limit:',
    LOCK: 'lock:'
  },
  
  // 命名空间
  NAMESPACES: {
    API: 'api',
    WEBHOOK: 'webhook',
    BACKGROUND: 'background',
    AUTH: 'auth'
  }
} as const;

/**
 * 缓存工具函数
 */
export class CacheUtils {
  /**
   * 生成标准化的缓存键
   */
  static generateKey(
    prefix: string,
    identifier: string,
    operation?: string,
    ...params: string[]
  ): string {
    const parts = [prefix, identifier];
    
    if (operation) {
      parts.push(operation);
    }
    
    if (params.length > 0) {
      parts.push(...params);
    }
    
    return parts.join(':');
  }

  /**
   * 生成分页缓存键
   */
  static generatePaginationKey(
    baseKey: string,
    page: number,
    limit: number,
    filters?: Record<string, any>
  ): string {
    const parts = [baseKey, 'page', page.toString(), 'limit', limit.toString()];
    
    if (filters && Object.keys(filters).length > 0) {
      // 将过滤器转换为字符串并排序
      const filterStr = Object.entries(filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      
      parts.push('filters', filterStr);
    }
    
    return parts.join(':');
  }

  /**
   * 生成时间窗口缓存键
   */
  static generateTimeWindowKey(
    baseKey: string,
    windowType: 'minute' | 'hour' | 'day',
    timestamp?: number
  ): string {
    const now = new Date(timestamp || Date.now());
    let timeKey: string;
    
    switch (windowType) {
      case 'minute':
        timeKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
        break;
      case 'hour':
        timeKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
        break;
      case 'day':
        timeKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
        break;
    }
    
    return `${baseKey}:${windowType}:${timeKey}`;
  }

  /**
   * 生成哈希键
   */
  static generateHashKey(input: string): string {
    let hash = 0;
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 验证缓存键格式
   */
  static validateKey(key: string): boolean {
    // 检查键长度
    if (key.length === 0 || key.length > 250) {
      return false;
    }
    
    // 检查是否包含非法字符
    const invalidChars = /[\s\r\n\t]/;
    if (invalidChars.test(key)) {
      return false;
    }
    
    return true;
  }

  /**
   * 清理缓存键
   */
  static sanitizeKey(key: string): string {
    return key
      .replace(/[\s\r\n\t]+/g, '_') // 替换空白字符
      .replace(/[^a-zA-Z0-9:_-]/g, '') // 移除特殊字符
      .substring(0, 250); // 限制长度
  }
}

/**
 * 常用缓存键生成器
 */
export const CacheKeys = {
  // 店铺相关
  shop: {
    info: (shopId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SHOP, shopId, 'info'),
    settings: (shopId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SHOP, shopId, 'settings'),
    stats: (shopId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SHOP, shopId, 'stats'),
    users: (shopId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SHOP, shopId, 'users')
  },
  
  // 用户相关
  user: {
    info: (userId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.USER, userId, 'info'),
    permissions: (userId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.USER, userId, 'permissions'),
    shops: (userId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.USER, userId, 'shops')
  },
  
  // 订单相关
  order: {
    info: (orderId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.ORDER, orderId, 'info'),
    items: (orderId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.ORDER, orderId, 'items'),
    tax: (orderId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.ORDER, orderId, 'tax'),
    shipping: (orderId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.ORDER, orderId, 'shipping')
  },
  
  // 税费相关
  tax: {
    rate: (country: string, hsCode: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.TAX, country, hsCode),
    calculation: (orderId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.TAX, 'calc', orderId),
    rules: (country: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.TAX, 'rules', country)
  },
  
  // 物流相关
  shipping: {
    rate: (carrier: string, from: string, to: string) => 
      CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SHIPPING, carrier, from, to),
    calculation: (orderId: string) => 
      CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SHIPPING, 'calc', orderId),
    carriers: () => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SHIPPING, 'carriers')
  },
  
  // 统计相关
  stats: {
    daily: (shopId: string, date: string) => 
      CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.STATS, shopId, 'daily', date),
    monthly: (shopId: string, month: string) => 
      CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.STATS, shopId, 'monthly', month),
    orders: (shopId: string) => 
      CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.STATS, shopId, 'orders')
  },
  
  // 会话相关
  session: {
    user: (sessionId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SESSION, sessionId),
    shop: (sessionId: string) => CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.SESSION, sessionId, 'shop')
  },
  
  // 速率限制
  rateLimit: {
    api: (userId: string, endpoint: string) => 
      CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.RATE_LIMIT, 'api', userId, endpoint),
    webhook: (shopId: string) => 
      CacheUtils.generateKey(CACHE_CONSTANTS.PREFIXES.RATE_LIMIT, 'webhook', shopId)
  }
} as const;

/**
 * 缓存策略
 */
export const CacheStrategies = {
  // 高频读取，低频更新
  readHeavy: {
    ttl: CACHE_CONSTANTS.LONG_TTL,
    staleWhileRevalidate: true
  },
  
  // 实时数据
  realtime: {
    ttl: CACHE_CONSTANTS.SHORT_TTL,
    staleWhileRevalidate: false
  },
  
  // 静态数据
  static: {
    ttl: CACHE_CONSTANTS.VERY_LONG_TTL,
    staleWhileRevalidate: true
  },
  
  // 会话数据
  session: {
    ttl: 1800, // 30分钟
    staleWhileRevalidate: false
  },
  
  // 计算结果
  computed: {
    ttl: CACHE_CONSTANTS.MEDIUM_TTL,
    staleWhileRevalidate: true
  }
} as const;