// YunExpress (云途物流) 物流服务提供商实现

import {
  BaseLogisticsProvider,
  ILogisticsProvider,
  LogisticsProviderError,
  APIError,
  LogisticsUtils
} from './BaseLogisticsProvider'
import {
  LogisticsRequest,
  LogisticsResponse,
  LogisticsQuote,
  LogisticsOrder,
  LogisticsProviderConfig,
  TrackingEvent,
  LogisticsStatus,
  ServiceType,
  DeliveryMode
} from '../models/LogisticsModels'

export class YunExpressProvider extends BaseLogisticsProvider {
  private customerCode: string = ''
  private apiKey: string = ''
  private baseUrl: string = ''
  
  constructor() {
    super('yunexpress', 'YunExpress')
  }
  
  async initialize(config: LogisticsProviderConfig): Promise<void> {
    this.config = config
    
    // 验证必需的配置
    if (!config.authentication.credentials.customerCode) {
      throw new Error('YunExpress Customer Code is required')
    }
    if (!config.authentication.credentials.apiKey) {
      throw new Error('YunExpress API Key is required')
    }
    
    this.customerCode = config.authentication.credentials.customerCode
    this.apiKey = config.authentication.credentials.apiKey
    this.baseUrl = config.apiEndpoint || 'https://open.yunexpress.com/api'
    
    // 测试连接
    const connectionTest = await this.testConnection()
    if (!connectionTest) {
      throw new Error('Failed to connect to YunExpress API')
    }
    
    this.initialized = true
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeAPICall('POST', '/Common/GetCountryList', {})
      return response.Success === true
    } catch (error) {
      console.error('YunExpress connection test failed:', error)
      return false
    }
  }
  
  async getQuotes(request: LogisticsRequest): Promise<LogisticsResponse> {
    const startTime = Date.now()
    
    try {
      // 构建YunExpress API请求
      const yunRequest = this.buildYunExpressRequest(request)
      
      // 调用YunExpress API
      const response = await this.makeAPICall('POST', '/ShippingService/GetShippingFee', yunRequest)
      
      // 解析响应
      const quotes = this.parseYunExpressResponse(response, request)
      
      return {
        requestId: `yunexpress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        providerId: this.providerId,
        providerName: this.providerName,
        quotes,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      throw new LogisticsProviderError(
        `Failed to get quotes from YunExpress: ${error.message}`,
        this.providerId,
        'QUOTE_ERROR',
        error
      )
    }
  }
  
  async createShipment(quote: LogisticsQuote, order: LogisticsRequest): Promise<LogisticsOrder> {
    try {
      // 构建YunExpress发货请求
      const shipmentRequest = this.buildShipmentRequest(quote, order)
      
      // 创建发货
      const response = await this.makeAPICall('POST', '/OrderService/CreateOrder', shipmentRequest)
      
      // 解析响应
      return this.parseShipmentResponse(response, quote, order)
    } catch (error) {
      throw new LogisticsProviderError(
        `Failed to create shipment with YunExpress: ${error.message}`,
        this.providerId,
        'SHIPMENT_ERROR',
        error
      )
    }
  }
  
  async trackShipment(trackingNumber: string): Promise<TrackingEvent[]> {
    try {
      const response = await this.makeAPICall('POST', '/TrackingService/GetTrackingNumber', {
        TrackingNumber: trackingNumber
      })
      return this.parseTrackingResponse(response)
    } catch (error) {
      throw new LogisticsProviderError(
        `Failed to track shipment: ${error.message}`,
        this.providerId,
        'TRACKING_ERROR',
        error
      )
    }
  }
  
  async generateLabel(orderId: string): Promise<string> {
    try {
      const response = await this.makeAPICall('POST', '/LabelService/GetLabel', {
        OrderNumber: orderId,
        Format: 'PDF'
      })
      return response.Data.LabelUrl
    } catch (error) {
      throw new LogisticsProviderError(
        `Failed to generate label: ${error.message}`,
        this.providerId,
        'LABEL_ERROR',
        error
      )
    }
  }
  
  async validateAddress(address: any): Promise<boolean> {
    try {
      const response = await this.makeAPICall('POST', '/AddressService/ValidateAddress', {
        CountryCode: address.countryCode,
        PostalCode: address.postalCode,
        City: address.city,
        Address: address.addressLine1
      })
      return response.Success === true && response.Data.IsValid === true
    } catch (error) {
      console.error('Address validation failed:', error)
      return false
    }
  }
  
  async getAvailableServices(countryCode: string): Promise<string[]> {
    try {
      const response = await this.makeAPICall('POST', '/ShippingService/GetShippingMethod', {
        CountryCode: countryCode
      })
      
      if (response.Success && response.Data) {
        return response.Data.map((service: any) => service.ShippingMethodCode)
      }
      return []
    } catch (error) {
      console.error('Failed to get available services:', error)
      return []
    }
  }
  
  // 私有方法
  private async makeAPICall(method: string, endpoint: string, data: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    // YunExpress需要特定的请求格式
    const requestData = {
      CustomerCode: this.customerCode,
      ...data
    }
    
    // 生成签名
    const signature = this.generateSignature(requestData)
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-YunExpress-Signature': signature
    }
    
    const options: RequestInit = {
      method: 'POST', // YunExpress主要使用POST
      headers,
      body: JSON.stringify(requestData)
    }
    
    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new APIError(
          this.providerId,
          errorData.Message || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      }
      
      const result = await response.json()
      
      // YunExpress API通常返回包含Success字段的响应
      if (result.Success === false) {
        throw new APIError(
          this.providerId,
          result.Message || 'API call failed',
          result.Code
        )
      }
      
      return result
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      throw new APIError(this.providerId, `Network error: ${error.message}`)
    }
  }
  
  private generateSignature(data: any): string {
    // 简化的签名实现
    // 实际项目中应该使用正确的HMAC-SHA256算法
    const sortedKeys = Object.keys(data).sort()
    const queryString = sortedKeys.map(key => `${key}=${data[key]}`).join('&')
    return Buffer.from(queryString + this.apiKey).toString('base64')
  }
  
  private buildYunExpressRequest(request: LogisticsRequest): any {
    const totalWeight = request.packages.reduce((sum, pkg) => 
      sum + LogisticsUtils.convertWeight(pkg.weight.value, pkg.weight.unit, 'KG'), 0
    )
    
    return {
      OriginCountryCode: request.origin.countryCode,
      DestinationCountryCode: request.destination.countryCode,
      Weight: totalWeight,
      Length: Math.max(...request.packages.map(pkg => 
        LogisticsUtils.convertDimension(pkg.dimensions.length, pkg.dimensions.unit, 'CM')
      )),
      Width: Math.max(...request.packages.map(pkg => 
        LogisticsUtils.convertDimension(pkg.dimensions.width, pkg.dimensions.unit, 'CM')
      )),
      Height: Math.max(...request.packages.map(pkg => 
        LogisticsUtils.convertDimension(pkg.dimensions.height, pkg.dimensions.unit, 'CM')
      )),
      DeclaredValue: request.shipmentValue.amount,
      Currency: request.shipmentValue.currency,
      IsDutiable: request.preferredMode === 'DDP',
      PostalCode: request.destination.postalCode
    }
  }
  
  private parseYunExpressResponse(response: any, originalRequest: LogisticsRequest): LogisticsQuote[] {
    if (!response.Success || !response.Data || !Array.isArray(response.Data)) {
      return []
    }
    
    return response.Data.map((rate: any) => {
      const serviceType = this.mapServiceType(rate.ShippingMethodCode)
      const deliveryMode: DeliveryMode = rate.IsDDP ? 'DDP' : 'DAP'
      
      return {
        quoteId: `yunexpress_${rate.ShippingMethodCode}_${Date.now()}`,
        serviceCode: rate.ShippingMethodCode,
        serviceName: rate.ShippingMethodName,
        serviceType,
        deliveryMode,
        
        pricing: {
          baseCost: { amount: rate.ShippingFee, currency: rate.Currency },
          fuelSurcharge: rate.FuelSurcharge ? { amount: rate.FuelSurcharge, currency: rate.Currency } : undefined,
          remoteAreaSurcharge: rate.RemoteAreaFee ? { amount: rate.RemoteAreaFee, currency: rate.Currency } : undefined,
          dutiesAndTaxes: rate.TaxFee ? { amount: rate.TaxFee, currency: rate.Currency } : undefined,
          totalCost: { amount: rate.TotalFee, currency: rate.Currency },
          netCost: { amount: rate.TotalFee, currency: rate.Currency }
        },
        
        deliveryTime: {
          estimatedDays: rate.TransitTime || this.getEstimatedDays(rate.ShippingMethodCode),
          minDays: rate.MinTransitTime,
          maxDays: rate.MaxTransitTime,
          businessDaysOnly: true,
          guaranteedDelivery: false
        },
        
        features: this.mapFeatures(rate.Features || []),
        restrictions: this.mapRestrictions(rate.Restrictions || []),
        
        tracking: {
          available: true,
          realTimeUpdates: true,
          smsNotification: false,
          emailNotification: true
        },
        
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时有效期
        
        metadata: {
          yunExpressMethodCode: rate.ShippingMethodCode,
          originalResponse: rate
        }
      }
    })
  }
  
  private buildShipmentRequest(quote: LogisticsQuote, order: LogisticsRequest): any {
    return {
      ReferenceNumber: order.orderId || `REF_${Date.now()}`,
      ShippingMethodCode: quote.serviceCode,
      
      Sender: {
        Name: order.origin.contactName || order.origin.company || 'Sender',
        Company: order.origin.company || '',
        Address: order.origin.addressLine1,
        City: order.origin.city,
        StateCode: order.origin.stateCode || '',
        PostalCode: order.origin.postalCode,
        CountryCode: order.origin.countryCode,
        Phone: order.origin.phone || '',
        Email: order.origin.email || ''
      },
      
      Recipient: {
        Name: order.destination.contactName || order.destination.company || 'Recipient',
        Company: order.destination.company || '',
        Address: order.destination.addressLine1,
        City: order.destination.city,
        StateCode: order.destination.stateCode || '',
        PostalCode: order.destination.postalCode,
        CountryCode: order.destination.countryCode,
        Phone: order.destination.phone || '',
        Email: order.destination.email || ''
      },
      
      Packages: order.packages.map((pkg, index) => ({
        PackageNumber: index + 1,
        Weight: LogisticsUtils.convertWeight(pkg.weight.value, pkg.weight.unit, 'KG'),
        Length: LogisticsUtils.convertDimension(pkg.dimensions.length, pkg.dimensions.unit, 'CM'),
        Width: LogisticsUtils.convertDimension(pkg.dimensions.width, pkg.dimensions.unit, 'CM'),
        Height: LogisticsUtils.convertDimension(pkg.dimensions.height, pkg.dimensions.unit, 'CM'),
        DeclaredValue: pkg.value.amount,
        Currency: pkg.value.currency,
        Description: pkg.description,
        HSCode: pkg.hsCode || '',
        Quantity: pkg.quantity
      })),
      
      TotalValue: order.shipmentValue.amount,
      Currency: order.shipmentValue.currency,
      IsDutiable: quote.deliveryMode === 'DDP'
    }
  }
  
  private parseShipmentResponse(response: any, quote: LogisticsQuote, order: LogisticsRequest): LogisticsOrder {
    const orderData = response.Data
    
    return {
      orderId: orderData.OrderNumber,
      quoteId: quote.quoteId,
      providerId: this.providerId,
      serviceCode: quote.serviceCode,
      
      shipment: {
        trackingNumber: orderData.TrackingNumber,
        labelUrl: orderData.LabelUrl,
        shipmentDate: new Date(),
        estimatedDeliveryDate: new Date(Date.now() + quote.deliveryTime.estimatedDays * 24 * 60 * 60 * 1000)
      },
      
      status: 'CREATED',
      statusHistory: [{
        status: 'CREATED',
        timestamp: new Date(),
        description: 'Shipment created with YunExpress',
        updatedBy: 'SYSTEM'
      }],
      
      documents: [{
        type: 'LABEL',
        url: orderData.LabelUrl,
        filename: `yunexpress_label_${orderData.TrackingNumber}.pdf`,
        format: 'PDF',
        generatedAt: new Date()
      }],
      
      events: [],
      
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
  
  private parseTrackingResponse(response: any): TrackingEvent[] {
    if (!response.Success || !response.Data || !Array.isArray(response.Data.TrackingDetails)) {
      return []
    }
    
    return response.Data.TrackingDetails.map((event: any, index: number) => ({
      eventId: `yunexpress_${index}_${Date.now()}`,
      timestamp: new Date(event.Date),
      status: this.mapEventStatus(event.StatusCode),
      location: event.Location || '',
      description: event.Description || '',
      eventCode: event.StatusCode,
      providerEvent: event
    }))
  }
  
  private mapServiceType(serviceCode: string): ServiceType {
    const mapping: Record<string, ServiceType> = {
      'DHL_ECOMMERCE': 'STANDARD',
      'YANWEN_ECONOMIC': 'ECONOMY',
      'YANWEN_SPECIAL': 'STANDARD',
      'YUN_EXPRESS': 'EXPRESS',
      'YUN_ECONOMIC': 'ECONOMY',
      'SF_EXPRESS': 'EXPRESS'
    }
    return mapping[serviceCode] || 'STANDARD'
  }
  
  private getEstimatedDays(serviceCode: string): number {
    const mapping: Record<string, number> = {
      'DHL_ECOMMERCE': 7,
      'YANWEN_ECONOMIC': 15,
      'YANWEN_SPECIAL': 10,
      'YUN_EXPRESS': 5,
      'YUN_ECONOMIC': 12,
      'SF_EXPRESS': 3
    }
    return mapping[serviceCode] || 10
  }
  
  private mapFeatures(features: string[]): any[] {
    const featureMapping: Record<string, { name: string, description: string }> = {
      'TRACKING': {
        name: 'Package Tracking',
        description: 'Real-time package tracking'
      },
      'INSURANCE': {
        name: 'Package Insurance',
        description: 'Insurance coverage for package value'
      },
      'SIGNATURE': {
        name: 'Signature Required',
        description: 'Requires recipient signature'
      }
    }
    
    return features.map(code => ({
      code,
      name: featureMapping[code]?.name || code,
      description: featureMapping[code]?.description || '',
      included: true
    }))
  }
  
  private mapRestrictions(restrictions: any[]): any[] {
    return restrictions.map((restriction: any) => ({
      type: restriction.Type || 'GENERAL',
      description: restriction.Description || '',
      maxValue: restriction.MaxValue,
      minValue: restriction.MinValue,
      prohibitedItems: restriction.ProhibitedItems || []
    }))
  }
  
  private mapEventStatus(statusCode: string): LogisticsStatus {
    const mapping: Record<string, LogisticsStatus> = {
      '10': 'CREATED',          // 已创建
      '20': 'PICKED_UP',        // 已揽收
      '30': 'IN_TRANSIT',       // 运输中
      '40': 'IN_TRANSIT',       // 到达中转
      '50': 'IN_TRANSIT',       // 离开中转
      '60': 'OUT_FOR_DELIVERY', // 派送中
      '70': 'DELIVERED',        // 已签收
      '80': 'FAILED_DELIVERY',  // 投递失败
      '90': 'RETURNED',         // 退回
      '99': 'EXCEPTION'         // 异常
    }
    return mapping[statusCode] || 'IN_TRANSIT'
  }
}

// 注册YunExpress提供商
import { LogisticsProviderFactory } from './BaseLogisticsProvider'
LogisticsProviderFactory.register('yunexpress', YunExpressProvider)