// 物流服务整合管理器

import {
  LogisticsRequest,
  LogisticsResponse,
  LogisticsQuote,
  LogisticsOrder,
  LogisticsProviderConfig,
  BulkLogisticsRequest,
  BulkLogisticsResponse,
  TrackingEvent,
  LogisticsStatus,
  CostAnalysis,
  TimeAnalysis,
  ProviderPerformance,
  Currency,
  DeliveryMode
} from './models/LogisticsModels'

import {
  ILogisticsProvider,
  LogisticsProviderFactory,
  LogisticsProviderError,
  LogisticsUtils
} from './providers/BaseLogisticsProvider'

// 导入具体提供商
import './providers/DHLEComProvider'
import './providers/YunExpressProvider'

export interface LogisticsServiceConfig {
  providers: LogisticsProviderConfig[]
  defaultCurrency: Currency
  defaultTimeout: number
  cacheEnabled: boolean
  cacheTTL: number
  maxConcurrentRequests: number
}

export interface QuoteComparisonOptions {
  sortBy?: 'COST' | 'TIME' | 'RELIABILITY' | 'SCORE'
  maxResults?: number
  includeRestricted?: boolean
  preferredProviders?: string[]
  excludeProviders?: string[]
  minDeliveryTime?: number
  maxDeliveryTime?: number
  maxCost?: number
  preferredMode?: DeliveryMode
}

export class LogisticsService {
  private providers: Map<string, ILogisticsProvider> = new Map()
  private config: LogisticsServiceConfig
  private cache: Map<string, { data: any, expires: number }> = new Map()
  private performanceMetrics: Map<string, ProviderPerformance> = new Map()
  
  constructor(config: LogisticsServiceConfig) {
    this.config = config
    this.initializeProviders()
  }
  
  // 初始化所有配置的物流提供商
  private async initializeProviders(): Promise<void> {
    for (const providerConfig of this.config.providers) {
      try {
        const provider = LogisticsProviderFactory.create(providerConfig.providerId)
        if (provider) {
          await provider.initialize(providerConfig)
          this.providers.set(providerConfig.providerId, provider)
          console.log(`Initialized logistics provider: ${providerConfig.providerName}`)
        }
      } catch (error) {
        console.error(`Failed to initialize provider ${providerConfig.providerId}:`, error)
      }
    }
  }
  
  // 获取最优物流方案
  async getBestQuotes(
    request: LogisticsRequest,
    options: QuoteComparisonOptions = {}
  ): Promise<{
    quotes: LogisticsQuote[]
    analysis: {
      cost: CostAnalysis
      time: TimeAnalysis
      recommendation: LogisticsQuote
    }
  }> {
    // 获取所有可用的报价
    const allQuotes = await this.getAllQuotes(request, options)
    
    if (allQuotes.length === 0) {
      throw new Error('No logistics quotes available')
    }
    
    // 应用筛选和排序
    const filteredQuotes = this.filterAndSortQuotes(allQuotes, options)
    
    // 生成分析报告
    const analysis = this.analyzeQuotes(allQuotes, filteredQuotes)
    
    return {
      quotes: filteredQuotes,
      analysis
    }
  }
  
  // 获取所有提供商的报价
  async getAllQuotes(
    request: LogisticsRequest,
    options: QuoteComparisonOptions = {}
  ): Promise<LogisticsQuote[]> {
    const cacheKey = this.generateCacheKey('quotes', request, options)
    
    // 检查缓存
    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }
    }
    
    const providers = this.getEligibleProviders(request, options)
    const quotePromises: Promise<LogisticsQuote[]>[] = []
    
    // 并发获取所有提供商的报价
    for (const provider of providers) {
      const promise = this.getProviderQuotes(provider, request)
        .catch(error => {
          console.error(`Provider ${provider.providerId} failed:`, error)
          return [] // 返回空数组而不是抛出错误
        })
      quotePromises.push(promise)
    }
    
    // 等待所有报价完成
    const quotesArrays = await Promise.all(quotePromises)
    const allQuotes = quotesArrays.flat()
    
    // 缓存结果
    if (this.config.cacheEnabled && allQuotes.length > 0) {
      this.setToCache(cacheKey, allQuotes)
    }
    
    return allQuotes
  }
  
  // 创建物流订单
  async createShipment(
    quote: LogisticsQuote,
    request: LogisticsRequest
  ): Promise<LogisticsOrder> {
    const provider = this.providers.get(quote.metadata?.providerId || this.extractProviderIdFromQuote(quote))
    
    if (!provider) {
      throw new Error(`Provider not found for quote: ${quote.quoteId}`)
    }
    
    try {
      const order = await provider.createShipment(quote, request)
      
      // 更新性能指标
      this.updateProviderMetrics(provider.providerId, 'shipment_created')
      
      return order
    } catch (error) {
      this.updateProviderMetrics(provider.providerId, 'shipment_failed')
      throw error
    }
  }
  
  // 跟踪物流订单
  async trackShipment(trackingNumber: string, providerId?: string): Promise<TrackingEvent[]> {
    if (providerId) {
      const provider = this.providers.get(providerId)
      if (provider) {
        return await provider.trackShipment(trackingNumber)
      }
    }
    
    // 如果没有指定提供商，尝试所有提供商
    for (const [id, provider] of this.providers) {
      try {
        const events = await provider.trackShipment(trackingNumber)
        if (events.length > 0) {
          return events
        }
      } catch (error) {
        // 继续尝试下一个提供商
        continue
      }
    }
    
    throw new Error(`Unable to track shipment: ${trackingNumber}`)
  }
  
  // 批量获取报价
  async getBulkQuotes(request: BulkLogisticsRequest): Promise<BulkLogisticsResponse> {
    const startTime = Date.now()
    const responses: LogisticsResponse[] = []
    
    // 对每个请求获取最优报价
    for (const req of request.requests) {
      try {
        const quotes = await this.getAllQuotes(req)
        
        const response: LogisticsResponse = {
          requestId: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          providerId: 'logistics-service',
          providerName: 'DTax-Bridge Logistics Service',
          quotes,
          processingTime: Date.now() - startTime,
          timestamp: new Date()
        }
        
        responses.push(response)
      } catch (error) {
        console.error('Failed to get quotes for bulk request:', error)
      }
    }
    
    // 分析所有报价找出最佳选项
    const allQuotes = responses.flatMap(r => r.quotes)
    const bestOptions = this.findBestOptions(allQuotes)
    
    return {
      requestId: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responses,
      summary: {
        totalRequests: request.requests.length,
        successfulResponses: responses.length,
        failedResponses: request.requests.length - responses.length,
        averageProcessingTime: (Date.now() - startTime) / responses.length
      },
      bestOptions
    }
  }
  
  // 地址验证
  async validateAddress(address: any, providerId?: string): Promise<{
    isValid: boolean
    suggestions?: any[]
    errors?: string[]
  }> {
    const results: boolean[] = []
    const errors: string[] = []
    
    const providersToCheck = providerId 
      ? [this.providers.get(providerId)].filter(Boolean)
      : Array.from(this.providers.values())
    
    for (const provider of providersToCheck) {
      try {
        const isValid = await provider.validateAddress(address)
        results.push(isValid)
      } catch (error) {
        errors.push(`${provider.providerId}: ${error.message}`)
      }
    }
    
    // 如果大多数提供商认为地址有效，则认为有效
    const validCount = results.filter(r => r).length
    const isValid = validCount > results.length / 2
    
    return {
      isValid,
      errors: errors.length > 0 ? errors : undefined
    }
  }
  
  // 获取提供商性能指标
  getProviderPerformance(providerId?: string): ProviderPerformance[] {
    if (providerId) {
      const performance = this.performanceMetrics.get(providerId)
      return performance ? [performance] : []
    }
    
    return Array.from(this.performanceMetrics.values())
  }
  
  // 获取可用的物流服务
  async getAvailableServices(countryCode: string): Promise<{
    [providerId: string]: string[]
  }> {
    const services: { [providerId: string]: string[] } = {}
    
    for (const [providerId, provider] of this.providers) {
      try {
        const providerServices = await provider.getAvailableServices(countryCode)
        services[providerId] = providerServices
      } catch (error) {
        console.error(`Failed to get services for ${providerId}:`, error)
        services[providerId] = []
      }
    }
    
    return services
  }
  
  // 计算DDP vs DAP成本差异
  async compareDDPvsDAP(request: LogisticsRequest): Promise<{
    ddpQuotes: LogisticsQuote[]
    dapQuotes: LogisticsQuote[]
    savings: {
      amount: number
      currency: Currency
      percentage: number
    }
    recommendation: 'DDP' | 'DAP'
  }> {
    // 获取DDP报价
    const ddpRequest = { ...request, preferredMode: 'DDP' as DeliveryMode }
    const ddpQuotes = await this.getAllQuotes(ddpRequest)
    
    // 获取DAP报价
    const dapRequest = { ...request, preferredMode: 'DAP' as DeliveryMode }
    const dapQuotes = await this.getAllQuotes(dapRequest)
    
    // 计算平均成本
    const avgDDPCost = ddpQuotes.reduce((sum, q) => sum + q.pricing.netCost.amount, 0) / ddpQuotes.length
    const avgDAPCost = dapQuotes.reduce((sum, q) => sum + q.pricing.netCost.amount, 0) / dapQuotes.length
    
    const savings = {
      amount: Math.abs(avgDDPCost - avgDAPCost),
      currency: request.shipmentValue.currency,
      percentage: Math.abs((avgDDPCost - avgDAPCost) / Math.max(avgDDPCost, avgDAPCost)) * 100
    }
    
    const recommendation = avgDDPCost < avgDAPCost ? 'DDP' : 'DAP'
    
    return {
      ddpQuotes,
      dapQuotes,
      savings,
      recommendation
    }
  }
  
  // 私有方法
  private async getProviderQuotes(
    provider: ILogisticsProvider,
    request: LogisticsRequest
  ): Promise<LogisticsQuote[]> {
    try {
      const response = await provider.getQuotes(request)
      
      // 添加提供商信息到报价元数据
      return response.quotes.map(quote => ({
        ...quote,
        metadata: {
          ...quote.metadata,
          providerId: provider.providerId,
          providerName: provider.providerName
        }
      }))
    } catch (error) {
      this.updateProviderMetrics(provider.providerId, 'quote_failed')
      throw error
    }
  }
  
  private getEligibleProviders(
    request: LogisticsRequest,
    options: QuoteComparisonOptions
  ): ILogisticsProvider[] {
    let providers = Array.from(this.providers.values())
    
    // 应用提供商过滤
    if (options.preferredProviders && options.preferredProviders.length > 0) {
      providers = providers.filter(p => 
        options.preferredProviders!.includes(p.providerId)
      )
    }
    
    if (options.excludeProviders && options.excludeProviders.length > 0) {
      providers = providers.filter(p => 
        !options.excludeProviders!.includes(p.providerId)
      )
    }
    
    return providers
  }
  
  private filterAndSortQuotes(
    quotes: LogisticsQuote[],
    options: QuoteComparisonOptions
  ): LogisticsQuote[] {
    let filtered = [...quotes]
    
    // 应用过滤条件
    if (options.maxCost) {
      filtered = filtered.filter(q => q.pricing.netCost.amount <= options.maxCost!)
    }
    
    if (options.minDeliveryTime) {
      filtered = filtered.filter(q => q.deliveryTime.estimatedDays >= options.minDeliveryTime!)
    }
    
    if (options.maxDeliveryTime) {
      filtered = filtered.filter(q => q.deliveryTime.estimatedDays <= options.maxDeliveryTime!)
    }
    
    if (options.preferredMode) {
      filtered = filtered.filter(q => q.deliveryMode === options.preferredMode)
    }
    
    // 排序
    const sortBy = options.sortBy || 'SCORE'
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'COST':
          return a.pricing.netCost.amount - b.pricing.netCost.amount
        case 'TIME':
          return a.deliveryTime.estimatedDays - b.deliveryTime.estimatedDays
        case 'RELIABILITY':
          return this.getReliabilityScore(b) - this.getReliabilityScore(a)
        case 'SCORE':
        default:
          return this.calculateOverallScore(a) - this.calculateOverallScore(b)
      }
    })
    
    // 限制结果数量
    if (options.maxResults) {
      filtered = filtered.slice(0, options.maxResults)
    }
    
    return filtered
  }
  
  private analyzeQuotes(
    allQuotes: LogisticsQuote[],
    filteredQuotes: LogisticsQuote[]
  ): {
    cost: CostAnalysis
    time: TimeAnalysis
    recommendation: LogisticsQuote
  } {
    const costs = allQuotes.map(q => q.pricing.netCost)
    const cheapest = allQuotes.reduce((prev, current) => 
      prev.pricing.netCost.amount < current.pricing.netCost.amount ? prev : current
    )
    const mostExpensive = allQuotes.reduce((prev, current) => 
      prev.pricing.netCost.amount > current.pricing.netCost.amount ? prev : current
    )
    const averageCost = costs.reduce((sum, cost) => sum + cost.amount, 0) / costs.length
    
    const costAnalysis: CostAnalysis = {
      baseCosts: costs,
      totalCosts: costs,
      savings: {
        amount: mostExpensive.pricing.netCost.amount - cheapest.pricing.netCost.amount,
        currency: cheapest.pricing.netCost.currency
      },
      percentageSavings: ((mostExpensive.pricing.netCost.amount - cheapest.pricing.netCost.amount) / mostExpensive.pricing.netCost.amount) * 100,
      comparison: {
        cheapest,
        mostExpensive,
        average: { amount: averageCost, currency: cheapest.pricing.netCost.currency }
      }
    }
    
    const fastest = allQuotes.reduce((prev, current) => 
      prev.deliveryTime.estimatedDays < current.deliveryTime.estimatedDays ? prev : current
    )
    const slowest = allQuotes.reduce((prev, current) => 
      prev.deliveryTime.estimatedDays > current.deliveryTime.estimatedDays ? prev : current
    )
    const averageTime = allQuotes.reduce((sum, quote) => sum + quote.deliveryTime.estimatedDays, 0) / allQuotes.length
    
    const timeAnalysis: TimeAnalysis = {
      averageDeliveryTime: averageTime,
      fastestOption: fastest,
      slowestOption: slowest,
      timeRange: {
        min: fastest.deliveryTime.estimatedDays,
        max: slowest.deliveryTime.estimatedDays
      }
    }
    
    // 推荐最佳选项
    const recommendation = filteredQuotes.length > 0 ? filteredQuotes[0] : cheapest
    
    return {
      cost: costAnalysis,
      time: timeAnalysis,
      recommendation
    }
  }
  
  private findBestOptions(quotes: LogisticsQuote[]) {
    if (quotes.length === 0) {
      throw new Error('No quotes available')
    }
    
    const cheapest = quotes.reduce((prev, current) => 
      prev.pricing.netCost.amount < current.pricing.netCost.amount ? prev : current
    )
    
    const fastest = quotes.reduce((prev, current) => 
      prev.deliveryTime.estimatedDays < current.deliveryTime.estimatedDays ? prev : current
    )
    
    const recommended = quotes.reduce((prev, current) => {
      const prevScore = this.calculateOverallScore(prev)
      const currentScore = this.calculateOverallScore(current)
      return prevScore < currentScore ? prev : current
    })
    
    return { cheapest, fastest, recommended }
  }
  
  private calculateOverallScore(quote: LogisticsQuote): number {
    // 综合评分算法
    const costWeight = 0.4
    const timeWeight = 0.3
    const reliabilityWeight = 0.3
    
    // 归一化成本 (假设最高成本为 1000)
    const normalizedCost = Math.min(quote.pricing.netCost.amount / 1000, 1)
    
    // 归一化时效 (假设最长时效为 30 天)
    const normalizedTime = Math.min(quote.deliveryTime.estimatedDays / 30, 1)
    
    // 可靠性评分
    const reliability = this.getReliabilityScore(quote)
    
    return (normalizedCost * costWeight) + 
           (normalizedTime * timeWeight) + 
           ((1 - reliability) * reliabilityWeight)
  }
  
  private getReliabilityScore(quote: LogisticsQuote): number {
    // 基于提供商历史表现的可靠性评分
    const providerId = quote.metadata?.providerId
    if (!providerId) return 0.5
    
    const performance = this.performanceMetrics.get(providerId)
    if (!performance) return 0.5
    
    return (performance.metrics.onTimeDeliveryRate + 
            performance.metrics.successRate + 
            performance.metrics.customerSatisfaction) / 3
  }
  
  private updateProviderMetrics(providerId: string, event: string): void {
    // 更新提供商性能指标
    // 简化实现，实际应该从数据库获取历史数据
    if (!this.performanceMetrics.has(providerId)) {
      this.performanceMetrics.set(providerId, {
        providerId,
        metrics: {
          averageCost: { amount: 0, currency: 'USD' },
          averageDeliveryTime: 0,
          onTimeDeliveryRate: 0.95,
          successRate: 0.98,
          customerSatisfaction: 0.9
        },
        ranking: {
          costRank: 1,
          speedRank: 1,
          reliabilityRank: 1,
          overallRank: 1
        },
        lastUpdated: new Date()
      })
    }
  }
  
  private extractProviderIdFromQuote(quote: LogisticsQuote): string {
    return quote.metadata?.providerId || quote.quoteId.split('_')[0]
  }
  
  private generateCacheKey(type: string, request: LogisticsRequest, options?: any): string {
    const key = {
      type,
      origin: request.origin.countryCode,
      destination: request.destination.countryCode,
      weight: request.packages.reduce((sum, pkg) => sum + pkg.weight.value, 0),
      value: request.shipmentValue.amount,
      options: options || {}
    }
    return Buffer.from(JSON.stringify(key)).toString('base64')
  }
  
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  private setToCache(key: string, data: any): void {
    const expires = Date.now() + (this.config.cacheTTL * 1000)
    this.cache.set(key, { data, expires })
  }
}