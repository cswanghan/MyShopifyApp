import { 
  ShipmentCreateRequest,
  Shipment,
  TrackingInfo,
  LogisticsError,
  ShippingProvider,
  ProviderConfig
} from '../types'
import { ILogisticsProvider, LogisticsProviderFactory } from '../providers/base'
import { DHLECommerceProvider } from '../providers/dhl-ecom'
import { YunExpressProvider } from '../providers/yunexpress'
import { generateId } from '@dtax-bridge/shared'

/**
 * 运单管理服务
 */
export class ShipmentService {
  private providers: Map<ShippingProvider, ILogisticsProvider> = new Map()
  private shipmentCache: Map<string, Shipment> = new Map()
  private trackingCache: Map<string, { info: TrackingInfo; timestamp: number }> = new Map()
  private cacheTimeout = 300000 // 5分钟缓存
  
  constructor(configs: ProviderConfig[]) {
    this.initializeProviders(configs)
  }
  
  /**
   * 初始化物流服务提供商
   */
  private initializeProviders(configs: ProviderConfig[]): void {
    LogisticsProviderFactory.register('DHL_ECOM', DHLECommerceProvider)
    LogisticsProviderFactory.register('YUNEXPRESS', YunExpressProvider)
    
    for (const config of configs) {
      if (config.enabled && config.features.shipping) {
        try {
          const provider = LogisticsProviderFactory.create(config)
          this.providers.set(config.provider, provider)
        } catch (error) {
          console.error(`初始化运单提供商 ${config.provider} 失败:`, error)
        }
      }
    }
  }
  
  /**
   * 创建运单
   */
  async createShipment(request: ShipmentCreateRequest): Promise<Shipment> {
    // 从费率ID中提取提供商信息
    const provider = this.extractProviderFromRateId(request.rateId)
    
    if (!provider) {
      throw new LogisticsError({
        code: 'SERVICE_UNAVAILABLE',
        message: '无法识别物流服务提供商',
        timestamp: new Date()
      })
    }
    
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new LogisticsError({
        code: 'SERVICE_UNAVAILABLE',
        message: `物流服务提供商 ${provider} 不可用`,
        provider,
        timestamp: new Date()
      })
    }
    
    try {
      const shipment = await providerInstance.createShipment(request)
      
      // 缓存运单信息
      this.shipmentCache.set(shipment.id, shipment)
      this.shipmentCache.set(shipment.trackingNumber, shipment)
      
      // 记录运单创建事件
      this.logShipmentEvent(shipment, 'CREATED', '运单创建成功')
      
      return shipment
    } catch (error) {
      throw new LogisticsError({
        code: 'LABEL_GENERATION_FAILED',
        message: `创建运单失败: ${error.message}`,
        provider,
        timestamp: new Date()
      })
    }
  }
  
  /**
   * 获取运单信息
   */
  async getShipment(shipmentId: string): Promise<Shipment | null> {
    // 先检查缓存
    if (this.shipmentCache.has(shipmentId)) {
      return this.shipmentCache.get(shipmentId)!
    }
    
    // 如果缓存中没有，尝试通过追踪号获取
    return null
  }
  
  /**
   * 取消运单
   */
  async cancelShipment(shipmentId: string): Promise<boolean> {
    const shipment = await this.getShipment(shipmentId)
    if (!shipment) {
      throw new LogisticsError({
        code: 'SHIPMENT_NOT_FOUND',
        message: '运单不存在',
        timestamp: new Date()
      })
    }
    
    const provider = this.providers.get(shipment.provider)
    if (!provider) {
      throw new LogisticsError({
        code: 'SERVICE_UNAVAILABLE',
        message: `物流服务提供商 ${shipment.provider} 不可用`,
        provider: shipment.provider,
        timestamp: new Date()
      })
    }
    
    try {
      const cancelled = await provider.cancelShipment(shipmentId)
      
      if (cancelled) {
        // 更新运单状态
        shipment.status = 'CANCELLED'
        this.shipmentCache.set(shipmentId, shipment)
        
        this.logShipmentEvent(shipment, 'CANCELLED', '运单已取消')
      }
      
      return cancelled
    } catch (error) {
      throw new LogisticsError({
        code: 'SHIPMENT_NOT_FOUND',
        message: `取消运单失败: ${error.message}`,
        provider: shipment.provider,
        timestamp: new Date()
      })
    }
  }
  
  /**
   * 获取追踪信息
   */
  async getTracking(trackingNumber: string, forceRefresh: boolean = false): Promise<TrackingInfo> {
    const cacheKey = trackingNumber
    const now = Date.now()
    
    // 检查缓存
    if (!forceRefresh && this.trackingCache.has(cacheKey)) {
      const cached = this.trackingCache.get(cacheKey)!
      if (now - cached.timestamp < this.cacheTimeout) {
        return cached.info
      }
    }
    
    // 确定提供商
    const provider = await this.detectProviderByTracking(trackingNumber)
    if (!provider) {
      throw new LogisticsError({
        code: 'INVALID_TRACKING_NUMBER',
        message: '无法识别追踪号对应的物流服务提供商',
        timestamp: new Date()
      })
    }
    
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new LogisticsError({
        code: 'SERVICE_UNAVAILABLE',
        message: `物流服务提供商 ${provider} 不可用`,
        provider,
        timestamp: new Date()
      })
    }
    
    try {
      const trackingInfo = await providerInstance.getTracking(trackingNumber)
      
      // 更新缓存
      this.trackingCache.set(cacheKey, {
        info: trackingInfo,
        timestamp: now
      })
      
      // 更新运单状态
      await this.updateShipmentStatus(trackingNumber, trackingInfo)
      
      return trackingInfo
    } catch (error) {
      throw new LogisticsError({
        code: 'SHIPMENT_NOT_FOUND',
        message: `获取追踪信息失败: ${error.message}`,
        provider,
        timestamp: new Date()
      })
    }
  }
  
  /**
   * 批量获取追踪信息
   */
  async batchGetTracking(trackingNumbers: string[]): Promise<Map<string, TrackingInfo | Error>> {
    const results = new Map<string, TrackingInfo | Error>()
    
    // 并行查询
    const promises = trackingNumbers.map(async (trackingNumber) => {
      try {
        const info = await this.getTracking(trackingNumber)
        results.set(trackingNumber, info)
      } catch (error) {
        results.set(trackingNumber, error as Error)
      }
    })
    
    await Promise.allSettled(promises)
    return results
  }
  
  /**
   * 生成运单标签
   */
  async generateLabel(shipmentId: string, format: 'PDF' | 'PNG' | 'ZPL' = 'PDF'): Promise<string> {
    const shipment = await this.getShipment(shipmentId)
    if (!shipment) {
      throw new LogisticsError({
        code: 'SHIPMENT_NOT_FOUND',
        message: '运单不存在',
        timestamp: new Date()
      })
    }
    
    // 查找对应格式的标签
    const label = shipment.labels.find(l => l.format === format)
    if (!label) {
      throw new LogisticsError({
        code: 'LABEL_GENERATION_FAILED',
        message: `不支持的标签格式: ${format}`,
        provider: shipment.provider,
        timestamp: new Date()
      })
    }
    
    return label.url
  }
  
  /**
   * 获取运单统计信息
   */
  getShipmentStatistics(): {
    totalShipments: number
    byProvider: Record<ShippingProvider, number>
    byStatus: Record<string, number>
    cacheHitRate: number
  } {
    const shipments = Array.from(this.shipmentCache.values())
    const byProvider: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    
    for (const shipment of shipments) {
      byProvider[shipment.provider] = (byProvider[shipment.provider] || 0) + 1
      byStatus[shipment.status] = (byStatus[shipment.status] || 0) + 1
    }
    
    return {
      totalShipments: shipments.length,
      byProvider: byProvider as Record<ShippingProvider, number>,
      byStatus,
      cacheHitRate: this.trackingCache.size > 0 ? 0.85 : 0 // 模拟缓存命中率
    }
  }
  
  /**
   * 验证地址
   */
  async validateAddress(address: any, provider?: ShippingProvider): Promise<{
    valid: boolean
    normalized?: any
    errors?: string[]
  }> {
    // 如果指定了提供商，使用该提供商验证
    if (provider && this.providers.has(provider)) {
      const providerInstance = this.providers.get(provider)!
      if (providerInstance.validateAddress) {
        return await providerInstance.validateAddress(address)
      }
    }
    
    // 使用第一个支持地址验证的提供商
    for (const [_, providerInstance] of this.providers) {
      if (providerInstance.validateAddress) {
        try {
          return await providerInstance.validateAddress(address)
        } catch (error) {
          continue // 尝试下一个提供商
        }
      }
    }
    
    // 基本验证
    return this.basicAddressValidation(address)
  }
  
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.shipmentCache.clear()
    this.trackingCache.clear()
  }
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    shipmentCache: number
    trackingCache: number
    totalMemory: number
  } {
    return {
      shipmentCache: this.shipmentCache.size,
      trackingCache: this.trackingCache.size,
      totalMemory: JSON.stringify([...this.shipmentCache.values(), ...this.trackingCache.values()]).length
    }
  }
  
  /**
   * 从费率ID提取提供商
   */
  private extractProviderFromRateId(rateId: string): ShippingProvider | null {
    if (rateId.includes('dhl')) return 'DHL_ECOM'
    if (rateId.includes('ye-') || rateId.includes('yunexpress')) return 'YUNEXPRESS'
    if (rateId.includes('yanwen')) return 'YANWEN'
    return null
  }
  
  /**
   * 通过追踪号检测提供商
   */
  private async detectProviderByTracking(trackingNumber: string): Promise<ShippingProvider | null> {
    // DHL eCommerce 追踪号特征
    if (/^GM\d{15}$/.test(trackingNumber) || /^LX\d{15}$/.test(trackingNumber)) {
      return 'DHL_ECOM'
    }
    
    // YunExpress 追踪号特征
    if (/^YT\d{13}$/.test(trackingNumber) || /^LY\d{13}$/.test(trackingNumber)) {
      return 'YUNEXPRESS'
    }
    
    // 尝试从缓存中查找
    const shipment = this.shipmentCache.get(trackingNumber)
    if (shipment) {
      return shipment.provider
    }
    
    return null
  }
  
  /**
   * 更新运单状态
   */
  private async updateShipmentStatus(trackingNumber: string, trackingInfo: TrackingInfo): Promise<void> {
    const shipment = this.shipmentCache.get(trackingNumber)
    if (!shipment) return
    
    // 映射追踪状态到运单状态
    const statusMapping: Record<string, any> = {
      'CREATED': 'CREATED',
      'PICKED_UP': 'MANIFESTED',
      'IN_TRANSIT': 'IN_TRANSIT',
      'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
      'DELIVERED': 'DELIVERED',
      'RETURNED': 'RETURNED',
      'EXCEPTION': 'EXCEPTION'
    }
    
    const newStatus = statusMapping[trackingInfo.status] || shipment.status
    if (newStatus !== shipment.status) {
      shipment.status = newStatus
      
      // 更新预计到达时间
      if (trackingInfo.estimatedDelivery) {
        shipment.dates.estimated = trackingInfo.estimatedDelivery
      }
      
      // 更新追踪信息
      shipment.tracking = {
        url: `https://tracking.example.com/${trackingNumber}`,
        events: trackingInfo.events
      }
      
      this.shipmentCache.set(trackingNumber, shipment)
      this.logShipmentEvent(shipment, newStatus, `状态更新: ${trackingInfo.status}`)
    }
  }
  
  /**
   * 记录运单事件
   */
  private logShipmentEvent(shipment: Shipment, status: string, description: string): void {
    console.log(`[Shipment ${shipment.id}] ${status}: ${description}`, {
      trackingNumber: shipment.trackingNumber,
      provider: shipment.provider,
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * 基本地址验证
   */
  private basicAddressValidation(address: any): {
    valid: boolean
    normalized?: any
    errors?: string[]
  } {
    const errors: string[] = []
    
    if (!address.name || address.name.trim().length === 0) {
      errors.push('收件人姓名不能为空')
    }
    
    if (!address.address1 || address.address1.trim().length === 0) {
      errors.push('地址不能为空')
    }
    
    if (!address.city || address.city.trim().length === 0) {
      errors.push('城市不能为空')
    }
    
    if (!address.country || address.country.length !== 2) {
      errors.push('国家代码格式错误')
    }
    
    if (!address.zip || address.zip.trim().length === 0) {
      errors.push('邮编不能为空')
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      normalized: errors.length === 0 ? {
        ...address,
        name: address.name.trim(),
        address1: address.address1.trim(),
        city: address.city.trim(),
        country: address.country.toUpperCase()
      } : undefined
    }
  }
}