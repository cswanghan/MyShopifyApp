import { 
  ShippingRateRequest,
  ShippingRate,
  ShippingComparison,
  ProviderConfig,
  LogisticsError,
  ShippingProvider
} from '../types'
import { ILogisticsProvider, LogisticsProviderFactory } from '../providers/base'
import { DHLECommerceProvider } from '../providers/dhl-ecom'
import { YunExpressProvider } from '../providers/yunexpress'
import { generateId } from '@dtax-bridge/shared'

/**
 * 物流费率比较服务
 */
export class LogisticsComparisonService {
  private providers: Map<ShippingProvider, ILogisticsProvider> = new Map()
  private cache: Map<string, ShippingComparison> = new Map()
  private cacheTimeout = 1800000 // 30分钟缓存
  
  constructor(configs: ProviderConfig[]) {
    this.initializeProviders(configs)
  }
  
  /**
   * 初始化物流服务提供商
   */
  private initializeProviders(configs: ProviderConfig[]): void {
    // 注册提供商类
    LogisticsProviderFactory.register('DHL_ECOM', DHLECommerceProvider)
    LogisticsProviderFactory.register('YUNEXPRESS', YunExpressProvider)
    
    // 创建提供商实例
    for (const config of configs) {
      if (config.enabled) {
        try {
          const provider = LogisticsProviderFactory.create(config)
          this.providers.set(config.provider, provider)
        } catch (error) {
          console.error(`初始化物流提供商 ${config.provider} 失败:`, error)
        }
      }
    }
  }
  
  /**
   * 获取所有物流费率并进行比较
   */
  async compareRates(request: ShippingRateRequest): Promise<ShippingComparison> {
    const cacheKey = this.generateCacheKey(request)
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
        return cached
      }
    }
    
    const requestId = generateId('rate-comp-')
    const allRates: ShippingRate[] = []
    const errors: any[] = []
    
    // 并行查询所有提供商
    const providers = request.services ? 
      Array.from(this.providers.entries()).filter(([provider]) => 
        request.services!.includes(provider)
      ) : 
      Array.from(this.providers.entries())
    
    const ratePromises = providers.map(async ([providerName, provider]) => {
      try {
        const rates = await provider.getRates(request)
        return { provider: providerName, rates, error: null }
      } catch (error) {
        console.error(`获取 ${providerName} 费率失败:`, error)
        return { 
          provider: providerName, 
          rates: [], 
          error: {
            provider: providerName,
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR'
          }
        }
      }
    })
    
    const results = await Promise.allSettled(ratePromises)
    
    // 处理结果
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { rates, error } = result.value
        allRates.push(...rates)
        if (error) {
          errors.push(error)
        }
      } else {
        errors.push({
          provider: 'UNKNOWN',
          error: result.reason?.message || '未知错误',
          code: 'NETWORK_ERROR'
        })
      }
    }
    
    // 生成推荐
    const recommendations = this.generateRecommendations(allRates)
    
    const comparison: ShippingComparison = {
      requestId,
      request,
      rates: allRates,
      recommendations,
      timestamp: new Date(),
      errors: errors.length > 0 ? errors : undefined
    }
    
    // 更新缓存
    this.cache.set(cacheKey, comparison)
    
    return comparison
  }
  
  /**
   * 获取最佳费率推荐
   */
  async getBestRates(request: ShippingRateRequest): Promise<{
    fastest: ShippingRate | null
    cheapest: ShippingRate | null
    bestValue: ShippingRate | null
    ddpOptions: ShippingRate[]
  }> {
    const comparison = await this.compareRates(request)
    const rates = comparison.rates
    
    return {
      fastest: rates.find(r => r.id === comparison.recommendations.fastest) || null,
      cheapest: rates.find(r => r.id === comparison.recommendations.cheapest) || null,
      bestValue: rates.find(r => r.id === comparison.recommendations.bestValue) || null,
      ddpOptions: rates.filter(r => r.features.ddp)
    }
  }
  
  /**
   * 按条件筛选费率
   */
  filterRates(rates: ShippingRate[], filters: {
    maxPrice?: number
    maxDays?: number
    ddpOnly?: boolean
    trackingRequired?: boolean
    insuranceRequired?: boolean
    providers?: ShippingProvider[]
  }): ShippingRate[] {
    return rates.filter(rate => {
      if (filters.maxPrice && rate.price.amount > filters.maxPrice) {
        return false
      }
      
      if (filters.maxDays && rate.transit.max > filters.maxDays) {
        return false
      }
      
      if (filters.ddpOnly && !rate.features.ddp) {
        return false
      }
      
      if (filters.trackingRequired && !rate.features.tracking) {
        return false
      }
      
      if (filters.insuranceRequired && !rate.features.insurance) {
        return false
      }
      
      if (filters.providers && !filters.providers.includes(rate.provider)) {
        return false
      }
      
      return true
    })
  }
  
  /**
   * 计算费率统计信息
   */
  calculateRateStatistics(rates: ShippingRate[]): {
    priceRange: { min: number; max: number; avg: number }
    transitRange: { min: number; max: number; avg: number }
    providerCount: number
    ddpCount: number
    trackingCount: number
  } {
    if (rates.length === 0) {
      return {
        priceRange: { min: 0, max: 0, avg: 0 },
        transitRange: { min: 0, max: 0, avg: 0 },
        providerCount: 0,
        ddpCount: 0,
        trackingCount: 0
      }
    }
    
    const prices = rates.map(r => r.price.amount)
    const transits = rates.map(r => r.transit.estimated)
    
    return {
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((sum, p) => sum + p, 0) / prices.length
      },
      transitRange: {
        min: Math.min(...transits),
        max: Math.max(...transits),
        avg: transits.reduce((sum, t) => sum + t, 0) / transits.length
      },
      providerCount: new Set(rates.map(r => r.provider)).size,
      ddpCount: rates.filter(r => r.features.ddp).length,
      trackingCount: rates.filter(r => r.features.tracking).length
    }
  }
  
  /**
   * 验证费率有效性
   */
  validateRate(rate: ShippingRate): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (rate.price.amount <= 0) {
      errors.push('费率金额必须大于0')
    }
    
    if (rate.transit.min <= 0 || rate.transit.max <= 0) {
      errors.push('运输时间必须大于0')
    }
    
    if (rate.transit.min > rate.transit.max) {
      errors.push('最小运输时间不能大于最大运输时间')
    }
    
    if (rate.validity.expiresAt <= new Date()) {
      errors.push('费率已过期')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * 获取服务商状态
   */
  async getProviderStatus(): Promise<Map<ShippingProvider, { available: boolean; lastCheck: Date }>> {
    const status = new Map()
    
    for (const [provider, instance] of this.providers.entries()) {
      try {
        const available = await instance.testConnection()
        status.set(provider, {
          available,
          lastCheck: new Date()
        })
      } catch (error) {
        status.set(provider, {
          available: false,
          lastCheck: new Date(),
          error: error.message
        })
      }
    }
    
    return status
  }
  
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    }
  }
  
  /**
   * 生成推荐
   */
  private generateRecommendations(rates: ShippingRate[]): {
    fastest?: string
    cheapest?: string
    bestValue?: string
    ddpOption?: string
  } {
    if (rates.length === 0) {
      return {}
    }
    
    // 过滤有效费率
    const validRates = rates.filter(rate => this.validateRate(rate).valid)
    
    if (validRates.length === 0) {
      return {}
    }
    
    // 最快服务
    const fastest = validRates.reduce((min, rate) => 
      rate.transit.min < min.transit.min ? rate : min
    )
    
    // 最便宜服务
    const cheapest = validRates.reduce((min, rate) => 
      rate.price.amount < min.price.amount ? rate : min
    )
    
    // 最佳性价比 (考虑价格和时效)
    const bestValue = validRates.reduce((best, rate) => {
      const currentScore = this.calculateValueScore(rate)
      const bestScore = this.calculateValueScore(best)
      return currentScore > bestScore ? rate : best
    })
    
    // 推荐DDP服务
    const ddpRates = validRates.filter(rate => rate.features.ddp)
    const ddpOption = ddpRates.length > 0 ? 
      ddpRates.reduce((min, rate) => 
        rate.price.amount < min.price.amount ? rate : min
      ) : undefined
    
    return {
      fastest: fastest.id,
      cheapest: cheapest.id,
      bestValue: bestValue.id,
      ddpOption: ddpOption?.id
    }
  }
  
  /**
   * 计算性价比分数
   */
  private calculateValueScore(rate: ShippingRate): number {
    // 价格权重 0.6，时效权重 0.4
    const priceScore = 1000 / rate.price.amount // 价格越低分数越高
    const speedScore = 30 / rate.transit.estimated // 时效越快分数越高
    
    let featureBonus = 0
    if (rate.features.tracking) featureBonus += 0.1
    if (rate.features.insurance) featureBonus += 0.1
    if (rate.features.ddp) featureBonus += 0.2
    
    return (priceScore * 0.6 + speedScore * 0.4) * (1 + featureBonus)
  }
  
  /**
   * 生成缓存键
   */
  private generateCacheKey(request: ShippingRateRequest): string {
    const key = {
      from: `${request.from.country}-${request.from.zip}`,
      to: `${request.to.country}-${request.to.zip}`,
      packages: request.packages.map(p => ({
        weight: p.weight,
        dimensions: p.dimensions,
        value: p.value
      })),
      options: request.options
    }
    
    return Buffer.from(JSON.stringify(key)).toString('base64')
  }
}