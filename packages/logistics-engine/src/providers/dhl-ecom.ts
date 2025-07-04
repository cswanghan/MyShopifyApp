import { BaseLogisticsProvider } from './base'
import { 
  ShippingRateRequest, 
  ShippingRate, 
  ShipmentCreateRequest, 
  Shipment, 
  TrackingInfo,
  LogisticsError,
  ProviderConfig,
  ShippingMethod,
  Address
} from '../types'
import { generateId } from '@dtax-bridge/shared'

/**
 * DHL eCommerce 服务提供商
 */
export class DHLECommerceProvider extends BaseLogisticsProvider {
  
  constructor(config: ProviderConfig) {
    super(config)
  }
  
  protected getAuthHeaders(): Record<string, string> {
    return {
      'DHL-API-Key': this.config.credentials.apiKey || '',
      'Authorization': `Basic ${Buffer.from(
        `${this.config.credentials.username}:${this.config.credentials.password}`
      ).toString('base64')}`
    }
  }
  
  async getRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
    this.validateRequest(request, ShippingRateRequestSchema)
    
    if (!this.validateServiceAvailability(request.from.country, request.to.country)) {
      throw new LogisticsError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'DHL eCommerce不支持该路线',
        provider: 'DHL_ECOM',
        timestamp: new Date()
      })
    }
    
    const rateRequest = this.buildDHLRateRequest(request)
    
    try {
      const response = await this.withRetry(async () => {
        return await this.makeRequest<any>(
          `${this.config.endpoints.baseUrl}/rates`,
          {
            method: 'POST',
            body: rateRequest
          }
        )
      })
      
      return this.parseDHLRateResponse(response, request)
    } catch (error) {
      throw new LogisticsError({
        code: 'RATE_NOT_FOUND',
        message: `获取DHL费率失败: ${error.message}`,
        provider: 'DHL_ECOM',
        timestamp: new Date()
      })
    }
  }
  
  async createShipment(request: ShipmentCreateRequest): Promise<Shipment> {
    this.validateRequest(request, ShipmentCreateRequestSchema)
    
    const shipmentRequest = this.buildDHLShipmentRequest(request)
    
    try {
      const response = await this.withRetry(async () => {
        return await this.makeRequest<any>(
          `${this.config.endpoints.baseUrl}/shipments`,
          {
            method: 'POST',
            body: shipmentRequest
          }
        )
      })
      
      return this.parseDHLShipmentResponse(response, request)
    } catch (error) {
      throw new LogisticsError({
        code: 'LABEL_GENERATION_FAILED',
        message: `创建DHL运单失败: ${error.message}`,
        provider: 'DHL_ECOM',
        timestamp: new Date()
      })
    }
  }
  
  async getTracking(trackingNumber: string): Promise<TrackingInfo> {
    if (!trackingNumber) {
      throw new LogisticsError({
        code: 'INVALID_TRACKING_NUMBER',
        message: '追踪号不能为空',
        provider: 'DHL_ECOM',
        timestamp: new Date()
      })
    }
    
    try {
      const response = await this.withRetry(async () => {
        return await this.makeRequest<any>(
          `${this.config.endpoints.baseUrl}/tracking/${trackingNumber}`
        )
      })
      
      return this.parseDHLTrackingResponse(response, trackingNumber)
    } catch (error) {
      throw new LogisticsError({
        code: 'SHIPMENT_NOT_FOUND',
        message: `获取DHL追踪信息失败: ${error.message}`,
        provider: 'DHL_ECOM',
        timestamp: new Date()
      })
    }
  }
  
  async cancelShipment(shipmentId: string): Promise<boolean> {
    try {
      await this.withRetry(async () => {
        return await this.makeRequest<any>(
          `${this.config.endpoints.baseUrl}/shipments/${shipmentId}/cancel`,
          { method: 'DELETE' }
        )
      })
      
      return true
    } catch (error) {
      throw new LogisticsError({
        code: 'SHIPMENT_NOT_FOUND',
        message: `取消DHL运单失败: ${error.message}`,
        provider: 'DHL_ECOM',
        timestamp: new Date()
      })
    }
  }
  
  async validateAddress(address: Address): Promise<{ valid: boolean; normalized?: Address; errors?: string[] }> {
    try {
      const response = await this.makeRequest<any>(
        `${this.config.endpoints.baseUrl}/address/validate`,
        {
          method: 'POST',
          body: address
        }
      )
      
      return {
        valid: response.valid,
        normalized: response.normalized_address,
        errors: response.errors
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error.message]
      }
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest(`${this.config.endpoints.baseUrl}/auth/test`)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * 构建DHL费率请求
   */
  private buildDHLRateRequest(request: ShippingRateRequest): any {
    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight, 0)
    const totalValue = request.packages.reduce((sum, pkg) => sum + pkg.value, 0)
    
    return {
      customerDetails: {
        shipperDetails: {
          postalAddress: this.convertToDHLAddress(request.from),
          contactInformation: {
            email: request.from.email,
            phone: request.from.phone
          }
        },
        receiverDetails: {
          postalAddress: this.convertToDHLAddress(request.to),
          contactInformation: {
            email: request.to.email,
            phone: request.to.phone
          }
        }
      },
      accounts: [{
        typeCode: "shipper",
        number: this.config.credentials.accountNumber
      }],
      productCode: "N", // DHL eCommerce 产品代码
      localProductCode: "N",
      valueAddedServices: request.options?.insurance ? [{ serviceCode: "II" }] : [],
      productsAndServices: [{
        productCode: "N"
      }],
      packages: request.packages.map((pkg, index) => ({
        weight: pkg.weight / 1000, // 转换为千克
        dimensions: {
          length: pkg.dimensions.length,
          width: pkg.dimensions.width,
          height: pkg.dimensions.height
        },
        customerReferences: [{
          value: `PKG-${index + 1}`,
          typeCode: "CU"
        }]
      })),
      shipTimestamp: new Date().toISOString(),
      unitOfMeasurement: "metric",
      isCustomsDeclarable: request.from.country !== request.to.country,
      monetaryAmount: [{
        typeCode: "declared",
        value: totalValue,
        currency: request.packages[0]?.currency || "USD"
      }],
      requestAllValueAddedServices: false,
      returnStandardProductsOnly: false,
      nextBusinessDay: false
    }
  }
  
  /**
   * 解析DHL费率响应
   */
  private parseDHLRateResponse(response: any, request: ShippingRateRequest): ShippingRate[] {
    const rates: ShippingRate[] = []
    
    if (response.products && Array.isArray(response.products)) {
      for (const product of response.products) {
        rates.push({
          id: generateId('dhl-rate-'),
          provider: 'DHL_ECOM',
          serviceName: product.productName || 'DHL eCommerce',
          serviceCode: product.productCode || 'N',
          method: this.mapDHLMethod(product.productCode),
          incoterms: request.options?.incoterms || 'DAP',
          price: {
            amount: parseFloat(product.totalPrice?.[0]?.price || '0'),
            currency: product.totalPrice?.[0]?.currencyType || 'USD',
            breakdown: {
              shipping: parseFloat(product.totalPrice?.[0]?.price || '0'),
              fuel: product.breakdown?.fuel ? parseFloat(product.breakdown.fuel) : 0
            }
          },
          transit: {
            min: parseInt(product.deliveryCapabilities?.deliveryTypeCode === 'QDDC' ? '1' : '3'),
            max: parseInt(product.deliveryCapabilities?.deliveryTypeCode === 'QDDC' ? '2' : '7'),
            estimated: parseInt(product.deliveryCapabilities?.estimatedDeliveryDateAndTime?.estimatedDeliveryDate ? '5' : '5')
          },
          features: {
            tracking: true,
            insurance: product.valueAddedServices?.some((s: any) => s.serviceCode === 'II') || false,
            signature: product.valueAddedServices?.some((s: any) => s.serviceCode === 'SIG') || false,
            ddp: false // DHL eCommerce 通常是DAP
          },
          restrictions: {
            maxWeight: 31500, // DHL eCommerce 最大31.5kg
            maxValue: 2500    // 一般限制
          },
          validity: {
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时有效
            timezone: 'UTC'
          },
          metadata: {
            productCode: product.productCode,
            serviceType: product.deliveryCapabilities?.deliveryTypeCode
          }
        })
      }
    }
    
    return rates
  }
  
  /**
   * 构建DHL运单请求
   */
  private buildDHLShipmentRequest(request: ShipmentCreateRequest): any {
    return {
      plannedShippingDateAndTime: new Date().toISOString(),
      pickup: {
        isRequested: false
      },
      productCode: request.rateId.includes('express') ? 'U' : 'N',
      accounts: [{
        typeCode: "shipper",
        number: this.config.credentials.accountNumber
      }],
      customerDetails: {
        shipperDetails: {
          postalAddress: this.convertToDHLAddress(request.from),
          contactInformation: {
            email: request.from.email,
            phone: request.from.phone,
            companyName: request.from.company || request.from.name,
            fullName: request.from.name
          }
        },
        receiverDetails: {
          postalAddress: this.convertToDHLAddress(request.to),
          contactInformation: {
            email: request.to.email,
            phone: request.to.phone,
            companyName: request.to.company || request.to.name,
            fullName: request.to.name
          }
        }
      },
      content: {
        packages: request.packages.map((pkg, index) => ({
          weight: pkg.weight / 1000,
          dimensions: {
            length: pkg.dimensions.length,
            width: pkg.dimensions.width,
            height: pkg.dimensions.height
          },
          customerReferences: [{
            value: `${request.reference || 'PKG'}-${index + 1}`,
            typeCode: "CU"
          }]
        })),
        isCustomsDeclarable: request.from.country !== request.to.country,
        declaredValue: request.packages.reduce((sum, pkg) => sum + pkg.value, 0),
        declaredValueCurrency: request.packages[0]?.currency || "USD",
        exportDeclaration: request.from.country !== request.to.country ? {
          lineItems: request.packages.flatMap(pkg => 
            pkg.items.map(item => ({
              number: 1,
              description: item.description || item.name,
              price: item.value,
              quantity: {
                value: item.quantity,
                unitOfMeasurement: "PCS"
              },
              commodityCodes: [{
                typeCode: "outbound",
                value: item.hsCode || "9999999999"
              }],
              exportReasonType: "permanent",
              manufacturerCountry: request.from.country,
              weight: {
                netValue: item.weight / 1000,
                grossValue: item.weight / 1000
              }
            }))
          ),
          invoice: {
            number: request.customsInfo?.invoice || `INV-${Date.now()}`,
            date: new Date().toISOString().split('T')[0]
          },
          exportReason: request.customsInfo?.contentType || "MERCHANDISE"
        } : undefined,
        incoterm: request.options?.incoterms || "DAP",
        unitOfMeasurement: "metric"
      },
      outputImageProperties: {
        outputImageType: "PDF",
        encodingFormat: "base64"
      }
    }
  }
  
  /**
   * 解析DHL运单响应
   */
  private parseDHLShipmentResponse(response: any, request: ShipmentCreateRequest): Shipment {
    const shipment = response.shipments?.[0]
    if (!shipment) {
      throw new Error('无效的运单响应')
    }
    
    return {
      id: shipment.shipmentTrackingNumber,
      trackingNumber: shipment.shipmentTrackingNumber,
      provider: 'DHL_ECOM',
      status: 'CREATED',
      from: request.from,
      to: request.to,
      packages: request.packages,
      service: {
        name: 'DHL eCommerce',
        code: request.rateId,
        method: 'AIR_STANDARD' as ShippingMethod,
        incoterms: request.options?.incoterms || 'DAP'
      },
      price: {
        amount: 0, // 需要从费率中获取
        currency: 'USD'
      },
      labels: shipment.documents?.map((doc: any) => ({
        url: `data:application/pdf;base64,${doc.content}`,
        format: 'PDF' as const,
        size: '4x6' as const
      })) || [],
      dates: {
        created: new Date(),
        estimated: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5天后
      },
      customs: request.from.country !== request.to.country ? {
        forms: shipment.documents?.filter((d: any) => d.typeCode !== 'label').map((doc: any) => ({
          type: doc.typeCode,
          url: `data:application/pdf;base64,${doc.content}`
        })) || [],
        invoice: request.customsInfo?.invoice
      } : undefined
    }
  }
  
  /**
   * 解析DHL追踪响应
   */
  private parseDHLTrackingResponse(response: any, trackingNumber: string): TrackingInfo {
    const shipment = response.shipments?.[0]
    if (!shipment) {
      throw new Error('未找到追踪信息')
    }
    
    return {
      trackingNumber,
      provider: 'DHL_ECOM',
      status: shipment.status?.description || 'UNKNOWN',
      estimatedDelivery: shipment.estimatedDeliveryDate ? 
        new Date(shipment.estimatedDeliveryDate) : undefined,
      events: shipment.events?.map((event: any) => ({
        timestamp: new Date(event.timestamp),
        status: event.description,
        location: {
          city: event.location?.address?.addressLocality,
          state: event.location?.address?.addressRegion,
          country: event.location?.address?.countryCode
        },
        description: event.description
      })) || [],
      currentLocation: shipment.events?.[0] ? {
        city: shipment.events[0].location?.address?.addressLocality,
        state: shipment.events[0].location?.address?.addressRegion,
        country: shipment.events[0].location?.address?.countryCode
      } : undefined,
      lastUpdate: new Date()
    }
  }
  
  /**
   * 转换为DHL地址格式
   */
  private convertToDHLAddress(address: Address): any {
    return {
      postalCode: address.zip,
      cityName: address.city,
      countryCode: address.country,
      addressLine1: address.address1,
      addressLine2: address.address2,
      provinceCode: address.state
    }
  }
  
  /**
   * 映射DHL服务方式
   */
  private mapDHLMethod(productCode: string): ShippingMethod {
    switch (productCode) {
      case 'U':
      case 'X':
        return 'AIR_EXPRESS'
      case 'T':
        return 'AIR_ECONOMY'
      default:
        return 'AIR_STANDARD'
    }
  }
}