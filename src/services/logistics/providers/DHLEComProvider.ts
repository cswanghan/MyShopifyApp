// DHL eCommerce 物流服务提供商实现

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

export class DHLEComProvider extends BaseLogisticsProvider {
  private apiKey: string = ''
  private apiSecret: string = ''
  private accountNumber: string = ''
  private baseUrl: string = ''
  
  constructor() {
    super('dhl-ecom', 'DHL eCommerce')
  }
  
  async initialize(config: LogisticsProviderConfig): Promise<void> {
    this.config = config
    
    // 验证必需的配置
    if (!config.authentication.credentials.apiKey) {
      throw new Error('DHL eCommerce API Key is required')
    }
    if (!config.authentication.credentials.apiSecret) {
      throw new Error('DHL eCommerce API Secret is required')
    }
    if (!config.authentication.credentials.accountNumber) {
      throw new Error('DHL eCommerce Account Number is required')
    }
    
    this.apiKey = config.authentication.credentials.apiKey
    this.apiSecret = config.authentication.credentials.apiSecret
    this.accountNumber = config.authentication.credentials.accountNumber
    this.baseUrl = config.apiEndpoint || 'https://api.dhl.com/ecommerce/v1'
    
    // 测试连接
    const connectionTest = await this.testConnection()
    if (!connectionTest) {
      throw new Error('Failed to connect to DHL eCommerce API')
    }
    
    this.initialized = true
  }
  
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeAPICall('GET', '/accounts/validate', {})
      return response.status === 'valid'
    } catch (error) {
      console.error('DHL eCommerce connection test failed:', error)
      return false
    }
  }
  
  async getQuotes(request: LogisticsRequest): Promise<LogisticsResponse> {
    const startTime = Date.now()
    
    try {
      // 构建DHL API请求
      const dhlRequest = this.buildDHLRequest(request)
      
      // 调用DHL API
      const response = await this.makeAPICall('POST', '/rates', dhlRequest)
      
      // 解析响应
      const quotes = this.parseDHLResponse(response, request)
      
      return {
        requestId: `dhl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        providerId: this.providerId,
        providerName: this.providerName,
        quotes,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      throw new LogisticsProviderError(
        `Failed to get quotes from DHL eCommerce: ${error.message}`,
        this.providerId,
        'QUOTE_ERROR',
        error
      )
    }
  }
  
  async createShipment(quote: LogisticsQuote, order: LogisticsRequest): Promise<LogisticsOrder> {
    try {
      // 构建DHL发货请求
      const shipmentRequest = this.buildShipmentRequest(quote, order)
      
      // 创建发货
      const response = await this.makeAPICall('POST', '/shipments', shipmentRequest)
      
      // 解析响应
      return this.parseShipmentResponse(response, quote, order)
    } catch (error) {
      throw new LogisticsProviderError(
        `Failed to create shipment with DHL eCommerce: ${error.message}`,
        this.providerId,
        'SHIPMENT_ERROR',
        error
      )
    }
  }
  
  async trackShipment(trackingNumber: string): Promise<TrackingEvent[]> {
    try {
      const response = await this.makeAPICall('GET', `/tracking/${trackingNumber}`, {})
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
      const response = await this.makeAPICall('GET', `/shipments/${orderId}/label`, {})
      return response.labelUrl
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
      const response = await this.makeAPICall('POST', '/addresses/validate', {
        address: this.formatAddress(address)
      })
      return response.valid === true
    } catch (error) {
      console.error('Address validation failed:', error)
      return false
    }
  }
  
  async getAvailableServices(countryCode: string): Promise<string[]> {
    try {
      const response = await this.makeAPICall('GET', `/services/${countryCode}`, {})
      return response.services.map((s: any) => s.code)
    } catch (error) {
      console.error('Failed to get available services:', error)
      return []
    }
  }
  
  // 私有方法
  private async makeAPICall(method: string, endpoint: string, data: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await this.getAuthToken()}`,
      'DHL-Client-Id': this.apiKey
    }
    
    const options: RequestInit = {
      method,
      headers,
      ...(method !== 'GET' && { body: JSON.stringify(data) })
    }
    
    try {
      const response = await fetch(url, options)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new APIError(
          this.providerId,
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      throw new APIError(this.providerId, `Network error: ${error.message}`)
    }
  }
  
  private async getAuthToken(): Promise<string> {
    // 实现OAuth2认证或API密钥认证
    // 这里简化实现，实际应该从DHL获取实际的认证令牌
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')
    return credentials
  }
  
  private buildDHLRequest(request: LogisticsRequest): any {
    return {
      accountNumber: this.accountNumber,
      origin: this.formatAddress(request.origin),
      destination: this.formatAddress(request.destination),
      packages: request.packages.map(pkg => ({
        weight: {
          value: LogisticsUtils.convertWeight(pkg.weight.value, pkg.weight.unit, 'KG'),
          unit: 'KG'
        },
        dimensions: {
          length: LogisticsUtils.convertDimension(pkg.dimensions.length, pkg.dimensions.unit, 'CM'),
          width: LogisticsUtils.convertDimension(pkg.dimensions.width, pkg.dimensions.unit, 'CM'),
          height: LogisticsUtils.convertDimension(pkg.dimensions.height, pkg.dimensions.unit, 'CM'),
          unit: 'CM'
        },
        value: pkg.value,
        description: pkg.description,
        hsCode: pkg.hsCode
      })),
      shipmentValue: request.shipmentValue,
      preferredMode: request.preferredMode || 'DDP',
      services: request.requiredServices || ['PACKET_PLUS', 'PACKET_STANDARD']
    }
  }
  
  private parseDHLResponse(response: any, originalRequest: LogisticsRequest): LogisticsQuote[] {
    if (!response.rates || !Array.isArray(response.rates)) {
      return []
    }
    
    return response.rates.map((rate: any) => {
      const serviceType = this.mapServiceType(rate.serviceCode)
      const deliveryMode = this.mapDeliveryMode(rate.deliveryMode)
      
      return {
        quoteId: `dhl_${rate.rateId}`,
        serviceCode: rate.serviceCode,
        serviceName: rate.serviceName,
        serviceType,
        deliveryMode,
        
        pricing: {
          baseCost: { amount: rate.baseCost, currency: rate.currency },
          fuelSurcharge: rate.fuelSurcharge ? { amount: rate.fuelSurcharge, currency: rate.currency } : undefined,
          remoteAreaSurcharge: rate.remoteAreaSurcharge ? { amount: rate.remoteAreaSurcharge, currency: rate.currency } : undefined,
          dutiesAndTaxes: rate.dutiesAndTaxes ? { amount: rate.dutiesAndTaxes, currency: rate.currency } : undefined,
          totalCost: { amount: rate.totalCost, currency: rate.currency },
          netCost: { amount: rate.netCost || rate.totalCost, currency: rate.currency }
        },
        
        deliveryTime: {
          estimatedDays: rate.transitTime,
          minDays: rate.minTransitTime,
          maxDays: rate.maxTransitTime,
          businessDaysOnly: true,
          guaranteedDelivery: rate.guaranteed || false
        },
        
        features: this.mapFeatures(rate.features || []),
        restrictions: this.mapRestrictions(rate.restrictions || []),
        
        tracking: {
          available: true,
          realTimeUpdates: true,
          smsNotification: rate.features?.includes('SMS_NOTIFICATION'),
          emailNotification: rate.features?.includes('EMAIL_NOTIFICATION')
        },
        
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时有效期
        
        metadata: {
          dhlRateId: rate.rateId,
          dhlServiceCode: rate.serviceCode,
          originalResponse: rate
        }
      }
    })
  }
  
  private buildShipmentRequest(quote: LogisticsQuote, order: LogisticsRequest): any {
    return {
      accountNumber: this.accountNumber,
      serviceCode: quote.serviceCode,
      origin: this.formatAddress(order.origin),
      destination: this.formatAddress(order.destination),
      packages: order.packages.map((pkg, index) => ({
        sequenceNumber: index + 1,
        weight: {
          value: LogisticsUtils.convertWeight(pkg.weight.value, pkg.weight.unit, 'KG'),
          unit: 'KG'
        },
        dimensions: {
          length: LogisticsUtils.convertDimension(pkg.dimensions.length, pkg.dimensions.unit, 'CM'),
          width: LogisticsUtils.convertDimension(pkg.dimensions.width, pkg.dimensions.unit, 'CM'),
          height: LogisticsUtils.convertDimension(pkg.dimensions.height, pkg.dimensions.unit, 'CM'),
          unit: 'CM'
        },
        value: pkg.value,
        description: pkg.description,
        hsCode: pkg.hsCode,
        contents: [{
          description: pkg.description,
          hsCode: pkg.hsCode,
          quantity: pkg.quantity,
          value: pkg.value
        }]
      })),
      shipmentValue: order.shipmentValue,
      labelFormat: 'PDF',
      requestedServices: quote.features.filter(f => f.included).map(f => f.code)
    }
  }
  
  private parseShipmentResponse(response: any, quote: LogisticsQuote, order: LogisticsRequest): LogisticsOrder {
    return {
      orderId: response.shipmentId,
      quoteId: quote.quoteId,
      providerId: this.providerId,
      serviceCode: quote.serviceCode,
      
      shipment: {
        trackingNumber: response.trackingNumber,
        labelUrl: response.labelUrl,
        shipmentDate: new Date(response.shipmentDate),
        estimatedDeliveryDate: new Date(response.estimatedDeliveryDate)
      },
      
      status: 'CREATED',
      statusHistory: [{
        status: 'CREATED',
        timestamp: new Date(),
        description: 'Shipment created with DHL eCommerce',
        updatedBy: 'SYSTEM'
      }],
      
      documents: [{
        type: 'LABEL',
        url: response.labelUrl,
        filename: `dhl_label_${response.trackingNumber}.pdf`,
        format: 'PDF',
        generatedAt: new Date()
      }],
      
      events: [],
      
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
  
  private parseTrackingResponse(response: any): TrackingEvent[] {
    if (!response.events || !Array.isArray(response.events)) {
      return []
    }
    
    return response.events.map((event: any) => ({
      eventId: event.eventId,
      timestamp: new Date(event.timestamp),
      status: this.mapEventStatus(event.statusCode),
      location: event.location || '',
      description: event.description || '',
      eventCode: event.statusCode,
      providerEvent: event
    }))
  }
  
  private formatAddress(address: any): any {
    return {
      countryCode: address.countryCode,
      stateCode: address.stateCode,
      city: address.city,
      postalCode: address.postalCode,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      contactName: address.contactName || address.company,
      phone: address.phone,
      email: address.email
    }
  }
  
  private mapServiceType(serviceCode: string): ServiceType {
    const mapping: Record<string, ServiceType> = {
      'PACKET_PLUS': 'PACKET',
      'PACKET_STANDARD': 'PACKET',
      'PARCEL_DIRECT': 'STANDARD',
      'PARCEL_EXPEDITED': 'EXPRESS',
      'GLOBALMAIL_BUSINESS': 'ECONOMY'
    }
    return mapping[serviceCode] || 'STANDARD'
  }
  
  private mapDeliveryMode(mode: string): DeliveryMode {
    const mapping: Record<string, DeliveryMode> = {
      'DDP': 'DDP',
      'DAP': 'DAP',
      'DDU': 'DAP'
    }
    return mapping[mode] || 'DAP'
  }
  
  private mapFeatures(features: string[]): any[] {
    const featureMapping: Record<string, { name: string, description: string }> = {
      'SIGNATURE_REQUIRED': {
        name: 'Signature Required',
        description: 'Requires recipient signature upon delivery'
      },
      'SMS_NOTIFICATION': {
        name: 'SMS Notification',
        description: 'SMS notifications for delivery updates'
      },
      'EMAIL_NOTIFICATION': {
        name: 'Email Notification',
        description: 'Email notifications for delivery updates'
      },
      'INSURANCE': {
        name: 'Insurance',
        description: 'Package insurance coverage'
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
      type: restriction.type,
      description: restriction.description,
      maxValue: restriction.maxValue,
      minValue: restriction.minValue,
      prohibitedItems: restriction.prohibitedItems || []
    }))
  }
  
  private mapEventStatus(statusCode: string): LogisticsStatus {
    const mapping: Record<string, LogisticsStatus> = {
      'CREATED': 'CREATED',
      'PICKED_UP': 'PICKED_UP',
      'IN_TRANSIT': 'IN_TRANSIT',
      'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
      'DELIVERED': 'DELIVERED',
      'DELIVERY_ATTEMPTED': 'FAILED_DELIVERY',
      'RETURNED': 'RETURNED',
      'CANCELLED': 'CANCELLED',
      'EXCEPTION': 'EXCEPTION'
    }
    return mapping[statusCode] || 'IN_TRANSIT'
  }
}

// 注册DHL eCommerce提供商
import { LogisticsProviderFactory } from './BaseLogisticsProvider'
LogisticsProviderFactory.register('dhl-ecom', DHLEComProvider)