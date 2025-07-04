import { 
  ShippingRateRequest, 
  ShippingRate, 
  ShipmentCreateRequest, 
  Shipment, 
  TrackingInfo,
  LogisticsError,
  ProviderConfig
} from '../types'

/**
 * 物流服务提供商基类接口
 */
export interface ILogisticsProvider {
  readonly config: ProviderConfig
  
  /**
   * 获取物流费率
   */
  getRates(request: ShippingRateRequest): Promise<ShippingRate[]>
  
  /**
   * 创建运单
   */
  createShipment(request: ShipmentCreateRequestSchema): Promise<Shipment>
  
  /**
   * 获取追踪信息
   */
  getTracking(trackingNumber: string): Promise<TrackingInfo>
  
  /**
   * 取消运单
   */
  cancelShipment(shipmentId: string): Promise<boolean>
  
  /**
   * 验证地址
   */
  validateAddress?(address: Address): Promise<{ valid: boolean; normalized?: Address; errors?: string[] }>
  
  /**
   * 测试连接
   */
  testConnection(): Promise<boolean>
}

/**
 * 物流服务提供商抽象基类
 */
export abstract class BaseLogisticsProvider implements ILogisticsProvider {
  protected rateLimitTracker: Map<string, number[]> = new Map()
  
  constructor(public readonly config: ProviderConfig) {}
  
  abstract getRates(request: ShippingRateRequest): Promise<ShippingRate[]>
  abstract createShipment(request: ShipmentCreateRequest): Promise<Shipment>
  abstract getTracking(trackingNumber: string): Promise<TrackingInfo>
  abstract cancelShipment(shipmentId: string): Promise<boolean>
  abstract testConnection(): Promise<boolean>
  
  /**
   * 执行HTTP请求
   */
  protected async makeRequest<T>(
    url: string, 
    options: {
      method?: string
      headers?: Record<string, string>
      body?: any
      timeout?: number
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.settings.timeout
    } = options
    
    // 检查速率限制
    await this.checkRateLimit()
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new LogisticsError({
          code: 'NETWORK_ERROR',
          message: '请求超时',
          provider: this.config.provider,
          timestamp: new Date()
        })
      }
      
      throw new LogisticsError({
        code: 'NETWORK_ERROR',
        message: `网络请求失败: ${error.message}`,
        provider: this.config.provider,
        timestamp: new Date()
      })
    }
  }
  
  /**
   * 获取认证头
   */
  protected abstract getAuthHeaders(): Record<string, string>
  
  /**
   * 检查速率限制
   */
  protected async checkRateLimit(): Promise<void> {
    const rateLimit = this.config.settings.rateLimit
    if (!rateLimit) return
    
    const now = Date.now()
    const provider = this.config.provider
    const requests = this.rateLimitTracker.get(provider) || []
    
    // 清理过期的请求记录
    const validRequests = requests.filter(time => now - time < rateLimit.window)
    
    if (validRequests.length >= rateLimit.requests) {
      const waitTime = rateLimit.window - (now - validRequests[0])
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    // 记录当前请求
    validRequests.push(now)
    this.rateLimitTracker.set(provider, validRequests)
  }
  
  /**
   * 重试机制
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.settings.retries
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          break
        }
        
        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
  
  /**
   * 验证请求参数
   */
  protected validateRequest(request: any, schema: any): void {
    try {
      schema.parse(request)
    } catch (error) {
      throw new LogisticsError({
        code: 'INVALID_PACKAGE',
        message: `请求参数验证失败: ${error.message}`,
        provider: this.config.provider,
        timestamp: new Date()
      })
    }
  }
  
  /**
   * 计算体积重量
   */
  protected calculateVolumetricWeight(length: number, width: number, height: number): number {
    // 使用国际标准除数 5000
    return (length * width * height) / 5000
  }
  
  /**
   * 获取计费重量
   */
  protected getBillableWeight(actualWeight: number, dimensions: { length: number; width: number; height: number }): number {
    const volumetricWeight = this.calculateVolumetricWeight(
      dimensions.length, 
      dimensions.width, 
      dimensions.height
    )
    return Math.max(actualWeight, volumetricWeight)
  }
  
  /**
   * 格式化地址
   */
  protected formatAddress(address: any): string {
    const parts = [
      address.address1,
      address.address2,
      address.city,
      address.state,
      address.zip,
      address.country
    ].filter(Boolean)
    
    return parts.join(', ')
  }
  
  /**
   * 生成唯一ID
   */
  protected generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}${timestamp}-${random}`
  }
  
  /**
   * 验证服务可用性
   */
  protected validateServiceAvailability(fromCountry: string, toCountry: string): boolean {
    const supportedCountries = this.config.supportedCountries
    return supportedCountries.includes(fromCountry) && supportedCountries.includes(toCountry)
  }
}

/**
 * 物流服务提供商工厂
 */
export class LogisticsProviderFactory {
  private static providers: Map<string, new (config: ProviderConfig) => ILogisticsProvider> = new Map()
  
  /**
   * 注册服务提供商
   */
  static register(name: string, providerClass: new (config: ProviderConfig) => ILogisticsProvider): void {
    this.providers.set(name, providerClass)
  }
  
  /**
   * 创建服务提供商实例
   */
  static create(config: ProviderConfig): ILogisticsProvider {
    const ProviderClass = this.providers.get(config.provider)
    if (!ProviderClass) {
      throw new LogisticsError({
        code: 'SERVICE_UNAVAILABLE',
        message: `不支持的物流服务提供商: ${config.provider}`,
        timestamp: new Date()
      })
    }
    
    return new ProviderClass(config)
  }
  
  /**
   * 获取所有注册的提供商
   */
  static getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}