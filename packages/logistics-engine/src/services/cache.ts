import { ShippingRate, ShippingComparison, TrackingInfo } from '../types'

/**
 * 缓存配置
 */
export interface CacheConfig {
  ratesTTL: number      // 费率缓存时间(毫秒)
  trackingTTL: number   // 追踪缓存时间(毫秒)
  maxSize: number       // 最大缓存条目数
  cleanupInterval: number // 清理间隔(毫秒)
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
}

/**
 * 物流服务缓存管理器
 */
export class LogisticsCacheManager {
  private ratesCache = new Map<string, CacheEntry<ShippingComparison>>()
  private trackingCache = new Map<string, CacheEntry<TrackingInfo>>()
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout
  private stats = {
    rateHits: 0,
    rateMisses: 0,
    trackingHits: 0,
    trackingMisses: 0,
    evictions: 0
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ratesTTL: 30 * 60 * 1000,      // 30分钟
      trackingTTL: 5 * 60 * 1000,     // 5分钟
      maxSize: 1000,                  // 1000条记录
      cleanupInterval: 10 * 60 * 1000, // 10分钟清理一次
      ...config
    }
    
    this.startCleanupTimer()
  }

  /**
   * 缓存费率比较结果
   */
  setRatesCache(key: string, data: ShippingComparison): void {
    this.enforceMaxSize(this.ratesCache)
    
    this.ratesCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.ratesTTL,
      accessCount: 0,
      lastAccess: Date.now()
    })
  }

  /**
   * 获取费率缓存
   */
  getRatesCache(key: string): ShippingComparison | null {
    const entry = this.ratesCache.get(key)
    
    if (!entry) {
      this.stats.rateMisses++
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.ratesCache.delete(key)
      this.stats.rateMisses++
      return null
    }

    // 更新访问统计
    entry.accessCount++
    entry.lastAccess = now
    this.stats.rateHits++
    
    return entry.data
  }

  /**
   * 缓存追踪信息
   */
  setTrackingCache(trackingNumber: string, data: TrackingInfo): void {
    this.enforceMaxSize(this.trackingCache)
    
    this.trackingCache.set(trackingNumber, {
      data,
      timestamp: Date.now(),
      ttl: this.config.trackingTTL,
      accessCount: 0,
      lastAccess: Date.now()
    })
  }

  /**
   * 获取追踪缓存
   */
  getTrackingCache(trackingNumber: string): TrackingInfo | null {
    const entry = this.trackingCache.get(trackingNumber)
    
    if (!entry) {
      this.stats.trackingMisses++
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.trackingCache.delete(trackingNumber)
      this.stats.trackingMisses++
      return null
    }

    // 更新访问统计
    entry.accessCount++
    entry.lastAccess = now
    this.stats.trackingHits++
    
    return entry.data
  }

  /**
   * 删除特定缓存
   */
  invalidateRatesCache(key: string): boolean {
    return this.ratesCache.delete(key)
  }

  /**
   * 删除追踪缓存
   */
  invalidateTrackingCache(trackingNumber: string): boolean {
    return this.trackingCache.delete(trackingNumber)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.ratesCache.clear()
    this.trackingCache.clear()
    this.resetStats()
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    rates: {
      size: number
      hits: number
      misses: number
      hitRate: number
    }
    tracking: {
      size: number
      hits: number
      misses: number
      hitRate: number
    }
    memory: {
      totalEntries: number
      evictions: number
      estimatedSize: string
    }
  } {
    const rateTotal = this.stats.rateHits + this.stats.rateMisses
    const trackingTotal = this.stats.trackingHits + this.stats.trackingMisses
    
    return {
      rates: {
        size: this.ratesCache.size,
        hits: this.stats.rateHits,
        misses: this.stats.rateMisses,
        hitRate: rateTotal > 0 ? this.stats.rateHits / rateTotal : 0
      },
      tracking: {
        size: this.trackingCache.size,
        hits: this.stats.trackingHits,
        misses: this.stats.trackingMisses,
        hitRate: trackingTotal > 0 ? this.stats.trackingHits / trackingTotal : 0
      },
      memory: {
        totalEntries: this.ratesCache.size + this.trackingCache.size,
        evictions: this.stats.evictions,
        estimatedSize: this.getEstimatedMemoryUsage()
      }
    }
  }

  /**
   * 获取热门缓存条目
   */
  getHotEntries(limit: number = 10): {
    rates: Array<{ key: string; accessCount: number; lastAccess: Date }>
    tracking: Array<{ key: string; accessCount: number; lastAccess: Date }>
  } {
    const sortByAccess = (a: [string, CacheEntry<any>], b: [string, CacheEntry<any>]) => 
      b[1].accessCount - a[1].accessCount

    const hotRates = Array.from(this.ratesCache.entries())
      .sort(sortByAccess)
      .slice(0, limit)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccess: new Date(entry.lastAccess)
      }))

    const hotTracking = Array.from(this.trackingCache.entries())
      .sort(sortByAccess)
      .slice(0, limit)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccess: new Date(entry.lastAccess)
      }))

    return { rates: hotRates, tracking: hotTracking }
  }

  /**
   * 设置缓存配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 重启清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.startCleanupTimer()
  }

  /**
   * 手动清理过期缓存
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    // 清理费率缓存
    for (const [key, entry] of this.ratesCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.ratesCache.delete(key)
        cleaned++
      }
    }

    // 清理追踪缓存
    for (const [key, entry] of this.trackingCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.trackingCache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 预热缓存
   */
  async warmup(keys: string[], dataProvider: (key: string) => Promise<ShippingComparison | TrackingInfo | null>): Promise<number> {
    let warmed = 0

    for (const key of keys) {
      try {
        const data = await dataProvider(key)
        if (data) {
          if ('rates' in data) {
            // 费率数据
            this.setRatesCache(key, data as ShippingComparison)
          } else {
            // 追踪数据
            this.setTrackingCache(key, data as TrackingInfo)
          }
          warmed++
        }
      } catch (error) {
        console.warn(`预热缓存失败 ${key}:`, error)
      }
    }

    return warmed
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }

  /**
   * 强制执行最大缓存大小限制
   */
  private enforceMaxSize<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size >= this.config.maxSize) {
      // 使用LRU策略删除最少使用的条目
      const entries = Array.from(cache.entries())
      entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess)
      
      const toDelete = Math.ceil(this.config.maxSize * 0.1) // 删除10%
      for (let i = 0; i < toDelete && i < entries.length; i++) {
        cache.delete(entries[i][0])
        this.stats.evictions++
      }
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = {
      rateHits: 0,
      rateMisses: 0,
      trackingHits: 0,
      trackingMisses: 0,
      evictions: 0
    }
  }

  /**
   * 估算内存使用量
   */
  private getEstimatedMemoryUsage(): string {
    const ratesSize = JSON.stringify(Array.from(this.ratesCache.values())).length
    const trackingSize = JSON.stringify(Array.from(this.trackingCache.values())).length
    const totalBytes = ratesSize + trackingSize

    if (totalBytes < 1024) {
      return `${totalBytes} B`
    } else if (totalBytes < 1024 * 1024) {
      return `${(totalBytes / 1024).toFixed(2)} KB`
    } else {
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`
    }
  }
}

/**
 * 全局缓存实例
 */
export const globalLogisticsCache = new LogisticsCacheManager()