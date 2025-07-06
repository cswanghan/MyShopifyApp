// 物流服务提供商基类和接口定义

import {
  LogisticsRequest,
  LogisticsResponse,
  LogisticsQuote,
  LogisticsOrder,
  LogisticsProviderConfig,
  BulkLogisticsRequest,
  BulkLogisticsResponse,
  TrackingEvent,
  LogisticsStatus
} from '../models/LogisticsModels'

// 物流服务提供商接口
export interface ILogisticsProvider {
  // 基本信息
  readonly providerId: string
  readonly providerName: string
  readonly config: LogisticsProviderConfig
  
  // 初始化和配置
  initialize(config: LogisticsProviderConfig): Promise<void>
  validateConfig(): boolean
  testConnection(): Promise<boolean>
  
  // 报价服务
  getQuotes(request: LogisticsRequest): Promise<LogisticsResponse>
  getBulkQuotes(request: BulkLogisticsRequest): Promise<BulkLogisticsResponse>
  
  // 订单管理
  createShipment(quote: LogisticsQuote, order: LogisticsRequest): Promise<LogisticsOrder>
  cancelShipment(orderId: string): Promise<boolean>
  
  // 跟踪服务
  trackShipment(trackingNumber: string): Promise<TrackingEvent[]>
  getShipmentStatus(trackingNumber: string): Promise<LogisticsStatus>
  
  // 标签和文档
  generateLabel(orderId: string): Promise<string> // Returns URL
  generateManifest(orderIds: string[]): Promise<string> // Returns URL
  
  // 地址验证
  validateAddress(address: any): Promise<boolean>
  
  // 服务查询
  getAvailableServices(countryCode: string): Promise<string[]>
  getServiceRestrictions(serviceCode: string): Promise<any>
  
  // 费率查询
  getRealTimeRates?(request: LogisticsRequest): Promise<LogisticsQuote[]>
  
  // 回调处理
  handleWebhook?(payload: any): Promise<TrackingEvent | null>
}

// 抽象基类
export abstract class BaseLogisticsProvider implements ILogisticsProvider {
  public readonly providerId: string
  public readonly providerName: string
  public config: LogisticsProviderConfig
  
  protected initialized: boolean = false
  protected lastError?: Error
  
  constructor(providerId: string, providerName: string) {
    this.providerId = providerId
    this.providerName = providerName
  }
  
  // 抽象方法 - 子类必须实现
  abstract initialize(config: LogisticsProviderConfig): Promise<void>
  abstract getQuotes(request: LogisticsRequest): Promise<LogisticsResponse>
  abstract createShipment(quote: LogisticsQuote, order: LogisticsRequest): Promise<LogisticsOrder>
  abstract trackShipment(trackingNumber: string): Promise<TrackingEvent[]>
  
  // 默认实现
  validateConfig(): boolean {
    if (!this.config) return false
    if (!this.config.apiEndpoint) return false
    if (!this.config.authentication?.credentials) return false
    return true
  }
  
  async testConnection(): Promise<boolean> {
    try {
      // 子类可以重写此方法进行更具体的连接测试
      return this.validateConfig() && this.initialized
    } catch (error) {
      this.lastError = error as Error
      return false
    }
  }
  
  async getBulkQuotes(request: BulkLogisticsRequest): Promise<BulkLogisticsResponse> {
    const responses: LogisticsResponse[] = []
    let successCount = 0
    let totalProcessingTime = 0
    
    for (const req of request.requests) {
      try {
        const response = await this.getQuotes(req)
        responses.push(response)
        successCount++
        totalProcessingTime += response.processingTime
      } catch (error) {
        console.error(`Failed to get quotes for request: ${error}`)
      }
    }
    
    const allQuotes = responses.flatMap(r => r.quotes)
    const bestOptions = this.findBestOptions(allQuotes)
    
    return {
      requestId: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responses,
      summary: {
        totalRequests: request.requests.length,
        successfulResponses: successCount,
        failedResponses: request.requests.length - successCount,
        averageProcessingTime: totalProcessingTime / successCount || 0
      },
      bestOptions
    }
  }
  
  async cancelShipment(orderId: string): Promise<boolean> {
    // 默认实现 - 子类可以重写
    throw new Error('Cancel shipment not implemented')
  }
  
  async getShipmentStatus(trackingNumber: string): Promise<LogisticsStatus> {
    const events = await this.trackShipment(trackingNumber)
    if (events.length === 0) return 'CREATED'
    return events[events.length - 1].status
  }
  
  async generateLabel(orderId: string): Promise<string> {
    throw new Error('Generate label not implemented')
  }
  
  async generateManifest(orderIds: string[]): Promise<string> {
    throw new Error('Generate manifest not implemented')
  }
  
  async validateAddress(address: any): Promise<boolean> {
    // 基本地址验证
    return !!(address.countryCode && address.city && address.postalCode)
  }
  
  async getAvailableServices(countryCode: string): Promise<string[]> {
    return this.config.supportedServices || []
  }
  
  async getServiceRestrictions(serviceCode: string): Promise<any> {
    return {}
  }
  
  // 辅助方法
  protected findBestOptions(quotes: LogisticsQuote[]) {
    if (quotes.length === 0) {
      throw new Error('No quotes available')
    }
    
    const cheapest = quotes.reduce((prev, current) => 
      prev.pricing.netCost.amount < current.pricing.netCost.amount ? prev : current
    )
    
    const fastest = quotes.reduce((prev, current) => 
      prev.deliveryTime.estimatedDays < current.deliveryTime.estimatedDays ? prev : current
    )
    
    // 推荐算法: 结合成本和时效
    const recommended = quotes.reduce((prev, current) => {
      const prevScore = this.calculateScore(prev)
      const currentScore = this.calculateScore(current)
      return prevScore > currentScore ? prev : current
    })
    
    return { cheapest, fastest, recommended }
  }
  
  protected calculateScore(quote: LogisticsQuote): number {
    // 评分算法: 成本权重 0.6, 时效权重 0.4
    const costWeight = 0.6
    const timeWeight = 0.4
    
    // 归一化成本 (假设最高成本为 1000)
    const normalizedCost = Math.min(quote.pricing.netCost.amount / 1000, 1)
    
    // 归一化时效 (假设最长时效为 30 天)
    const normalizedTime = Math.min(quote.deliveryTime.estimatedDays / 30, 1)
    
    // 分数越低越好
    return (normalizedCost * costWeight) + (normalizedTime * timeWeight)
  }
  
  protected getLastError(): Error | undefined {
    return this.lastError
  }
  
  protected clearLastError(): void {
    this.lastError = undefined
  }
}

// 物流提供商工厂
export class LogisticsProviderFactory {
  private static providers: Map<string, new() => ILogisticsProvider> = new Map()
  
  static register(providerId: string, providerClass: new() => ILogisticsProvider): void {
    this.providers.set(providerId, providerClass)
  }
  
  static create(providerId: string): ILogisticsProvider | null {
    const ProviderClass = this.providers.get(providerId)
    if (!ProviderClass) {
      throw new Error(`Unknown logistics provider: ${providerId}`)
    }
    return new ProviderClass()
  }
  
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }
  
  static isProviderSupported(providerId: string): boolean {
    return this.providers.has(providerId)
  }
}

// 错误类
export class LogisticsProviderError extends Error {
  constructor(
    message: string,
    public providerId: string,
    public errorCode?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'LogisticsProviderError'
  }
}

export class ConfigurationError extends LogisticsProviderError {
  constructor(providerId: string, message: string) {
    super(message, providerId, 'CONFIG_ERROR')
    this.name = 'ConfigurationError'
  }
}

export class APIError extends LogisticsProviderError {
  constructor(providerId: string, message: string, statusCode?: number) {
    super(message, providerId, 'API_ERROR', { statusCode })
    this.name = 'APIError'
  }
}

export class RateLimitError extends LogisticsProviderError {
  constructor(providerId: string, resetTime?: Date) {
    super('Rate limit exceeded', providerId, 'RATE_LIMIT', { resetTime })
    this.name = 'RateLimitError'
  }
}

// 工具函数
export class LogisticsUtils {
  // 重量单位转换
  static convertWeight(weight: number, fromUnit: string, toUnit: string): number {
    const toKg: Record<string, number> = {
      'KG': 1,
      'G': 0.001,
      'LB': 0.453592,
      'OZ': 0.0283495
    }
    
    const fromKgTo: Record<string, number> = {
      'KG': 1,
      'G': 1000,
      'LB': 2.20462,
      'OZ': 35.274
    }
    
    const kgValue = weight * toKg[fromUnit]
    return kgValue * fromKgTo[toUnit]
  }
  
  // 尺寸单位转换
  static convertDimension(dimension: number, fromUnit: string, toUnit: string): number {
    const toCm: Record<string, number> = {
      'CM': 1,
      'IN': 2.54
    }
    
    const fromCmTo: Record<string, number> = {
      'CM': 1,
      'IN': 0.393701
    }
    
    const cmValue = dimension * toCm[fromUnit]
    return cmValue * fromCmTo[toUnit]
  }
  
  // 货币转换 (简化版本)
  static async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    // 实际项目中应该调用汇率API
    const exchangeRates: Record<string, Record<string, number>> = {
      'USD': { 'EUR': 0.85, 'GBP': 0.73, 'CNY': 6.45 },
      'EUR': { 'USD': 1.18, 'GBP': 0.86, 'CNY': 7.59 },
      'GBP': { 'USD': 1.37, 'EUR': 1.16, 'CNY': 8.83 },
      'CNY': { 'USD': 0.155, 'EUR': 0.132, 'GBP': 0.113 }
    }
    
    if (fromCurrency === toCurrency) return amount
    
    const rate = exchangeRates[fromCurrency]?.[toCurrency] || 1
    return amount * rate
  }
  
  // 地址标准化
  static standardizeAddress(address: any): any {
    return {
      ...address,
      countryCode: address.countryCode.toUpperCase(),
      postalCode: address.postalCode.replace(/\s/g, ''),
      city: address.city.trim(),
      addressLine1: address.addressLine1.trim()
    }
  }
  
  // 生成跟踪号
  static generateTrackingNumber(providerId: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `${providerId.toUpperCase()}${timestamp}${random}`.toUpperCase()
  }
}