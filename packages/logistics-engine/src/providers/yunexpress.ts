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
import crypto from 'crypto'

/**
 * YunExpress 云途物流服务提供商
 */
export class YunExpressProvider extends BaseLogisticsProvider {
  
  constructor(config: ProviderConfig) {
    super(config)
  }
  
  protected getAuthHeaders(): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = Math.random().toString(36).substring(2, 15)
    
    // YunExpress签名算法
    const signString = `${this.config.credentials.customerId}${timestamp}${nonce}${this.config.credentials.apiSecret}`
    const signature = crypto.createHash('md5').update(signString).digest('hex').toUpperCase()
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `YE-HMAC-SHA256 CustomerId=${this.config.credentials.customerId},Timestamp=${timestamp},Nonce=${nonce},Signature=${signature}`
    }
  }
  
  async getRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
    this.validateRequest(request, ShippingRateRequestSchema)
    
    if (!this.validateServiceAvailability(request.from.country, request.to.country)) {
      throw new LogisticsError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'YunExpress不支持该路线',
        provider: 'YUNEXPRESS',
        timestamp: new Date()
      })
    }
    
    const rateRequest = this.buildYunExpressRateRequest(request)
    
    try {
      const response = await this.withRetry(async () => {
        return await this.makeRequest<any>(
          `${this.config.endpoints.baseUrl}/api/WayBill/GetTrackNumber`,
          {
            method: 'POST',
            body: rateRequest
          }
        )
      })
      
      return this.parseYunExpressRateResponse(response, request)
    } catch (error) {
      throw new LogisticsError({
        code: 'RATE_NOT_FOUND',
        message: `获取YunExpress费率失败: ${error.message}`,
        provider: 'YUNEXPRESS',
        timestamp: new Date()
      })
    }
  }
  
  async createShipment(request: ShipmentCreateRequest): Promise<Shipment> {
    this.validateRequest(request, ShipmentCreateRequestSchema)
    
    const shipmentRequest = this.buildYunExpressShipmentRequest(request)
    
    try {
      const response = await this.withRetry(async () => {
        return await this.makeRequest<any>(
          `${this.config.endpoints.baseUrl}/api/WayBill/CreateOrder`,
          {
            method: 'POST',
            body: shipmentRequest
          }
        )
      })
      
      return this.parseYunExpressShipmentResponse(response, request)
    } catch (error) {
      throw new LogisticsError({
        code: 'LABEL_GENERATION_FAILED',
        message: `创建YunExpress运单失败: ${error.message}`,
        provider: 'YUNEXPRESS',
        timestamp: new Date()
      })
    }
  }
  
  async getTracking(trackingNumber: string): Promise<TrackingInfo> {
    if (!trackingNumber) {
      throw new LogisticsError({
        code: 'INVALID_TRACKING_NUMBER',
        message: '追踪号不能为空',
        provider: 'YUNEXPRESS',
        timestamp: new Date()
      })
    }
    
    try {
      const response = await this.withRetry(async () => {
        return await this.makeRequest<any>(
          `${this.config.endpoints.baseUrl}/api/WayBill/GetTrackingNumber`,
          {
            method: 'POST',
            body: { TrackingNumber: trackingNumber }
          }
        )
      })
      
      return this.parseYunExpressTrackingResponse(response, trackingNumber)
    } catch (error) {
      throw new LogisticsError({
        code: 'SHIPMENT_NOT_FOUND',
        message: `获取YunExpress追踪信息失败: ${error.message}`,
        provider: 'YUNEXPRESS',
        timestamp: new Date()
      })
    }
  }
  
  async cancelShipment(shipmentId: string): Promise<boolean> {
    try {
      const response = await this.withRetry(async () => {
        return await this.makeRequest<any>(
          `${this.config.endpoints.baseUrl}/api/WayBill/CancelOrder`,
          {
            method: 'POST',
            body: { OrderNumber: shipmentId }
          }
        )
      })
      
      return response.Result === true
    } catch (error) {
      throw new LogisticsError({
        code: 'SHIPMENT_NOT_FOUND',
        message: `取消YunExpress运单失败: ${error.message}`,
        provider: 'YUNEXPRESS',
        timestamp: new Date()
      })
    }
  }
  
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest(`${this.config.endpoints.baseUrl}/api/System/Ping`)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * 构建YunExpress费率请求
   */
  private buildYunExpressRateRequest(request: ShippingRateRequest): any {
    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight, 0)
    const totalValue = request.packages.reduce((sum, pkg) => sum + pkg.value, 0)
    
    return {
      CountryCode: request.to.country,
      Weight: totalWeight / 1000, // 转换为千克
      Length: Math.max(...request.packages.map(p => p.dimensions.length)),
      Width: Math.max(...request.packages.map(p => p.dimensions.width)),
      Height: request.packages.reduce((sum, p) => sum + p.dimensions.height, 0),
      DeclaredValue: totalValue,
      DeclaredCurrency: request.packages[0]?.currency || 'USD',
      ProductType: request.options?.incoterms === 'DDP' ? 'DDP' : 'DAP'
    }
  }
  
  /**
   * 解析YunExpress费率响应
   */
  private parseYunExpressRateResponse(response: any, request: ShippingRateRequest): ShippingRate[] {
    const rates: ShippingRate[] = []
    
    if (response.Result && response.Data && Array.isArray(response.Data)) {
      for (const service of response.Data) {
        // YunExpress DDP 服务
        if (service.ProductType === 'DDP') {
          rates.push({
            id: generateId('ye-ddp-'),
            provider: 'YUNEXPRESS',
            serviceName: 'YunExpress DDP',
            serviceCode: service.ProductCode || 'YE_DDP',
            method: 'AIR_STANDARD' as ShippingMethod,
            incoterms: 'DDP',
            price: {
              amount: parseFloat(service.TotalFee || '0'),
              currency: service.Currency || 'USD',
              breakdown: {
                shipping: parseFloat(service.ShippingFee || '0'),
                duties: parseFloat(service.DutyFee || '0'),
                vat: parseFloat(service.TaxFee || '0'),
                other: parseFloat(service.ProcessingFee || '0')
              }
            },
            transit: {
              min: parseInt(service.MinDeliveryDays || '7'),
              max: parseInt(service.MaxDeliveryDays || '15'),
              estimated: parseInt(service.EstimatedDays || '10')
            },
            features: {
              tracking: true,
              insurance: service.InsuranceAvailable || false,
              signature: false,
              ddp: true
            },
            restrictions: {
              maxWeight: 30000, // 30kg
              maxValue: 2000
            },
            validity: {
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              timezone: 'UTC'
            },
            metadata: {
              productCode: service.ProductCode,
              serviceType: 'DDP'
            }
          })
        }
        
        // YunExpress DAP 服务
        rates.push({
          id: generateId('ye-dap-'),
          provider: 'YUNEXPRESS',
          serviceName: 'YunExpress DAP',
          serviceCode: service.ProductCode || 'YE_DAP',
          method: 'AIR_STANDARD' as ShippingMethod,
          incoterms: 'DAP',
          price: {
            amount: parseFloat(service.ShippingFee || '0'),
            currency: service.Currency || 'USD',
            breakdown: {
              shipping: parseFloat(service.ShippingFee || '0'),
              fuel: parseFloat(service.FuelSurcharge || '0')
            }
          },
          transit: {
            min: parseInt(service.MinDeliveryDays || '5') - 2,
            max: parseInt(service.MaxDeliveryDays || '12') - 2,
            estimated: parseInt(service.EstimatedDays || '8') - 2
          },
          features: {
            tracking: true,
            insurance: service.InsuranceAvailable || false,
            signature: false,
            ddp: false
          },
          restrictions: {
            maxWeight: 30000,
            maxValue: 2000
          },
          validity: {
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            timezone: 'UTC'
          },
          metadata: {
            productCode: service.ProductCode,
            serviceType: 'DAP'
          }
        })
      }
    }
    
    return rates
  }
  
  /**
   * 构建YunExpress运单请求
   */
  private buildYunExpressShipmentRequest(request: ShipmentCreateRequest): any {
    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight, 0)
    const totalValue = request.packages.reduce((sum, pkg) => sum + pkg.value, 0)
    
    return {
      OrderNumber: `YE-${Date.now()}`,
      ShippingMethodCode: request.rateId.includes('ddp') ? 'YE_DDP' : 'YE_DAP',
      CountryCode: request.to.country,
      Shipper: {
        ShipperName: request.from.name,
        ShipperCompany: request.from.company || '',
        ShipperAddress: request.from.address1,
        ShipperAddress2: request.from.address2 || '',
        ShipperCity: request.from.city,
        ShipperState: request.from.state || '',
        ShipperZip: request.from.zip,
        ShipperCountryCode: request.from.country,
        ShipperPhone: request.from.phone || '',
        ShipperEmail: request.from.email || ''
      },
      Receiver: {
        ReceiverName: request.to.name,
        ReceiverCompany: request.to.company || '',
        ReceiverAddress: request.to.address1,
        ReceiverAddress2: request.to.address2 || '',
        ReceiverCity: request.to.city,
        ReceiverState: request.to.state || '',
        ReceiverZip: request.to.zip,
        ReceiverCountryCode: request.to.country,
        ReceiverPhone: request.to.phone || '',
        ReceiverEmail: request.to.email || ''
      },
      PackageInfo: {
        Length: Math.max(...request.packages.map(p => p.dimensions.length)),
        Width: Math.max(...request.packages.map(p => p.dimensions.width)),
        Height: request.packages.reduce((sum, p) => sum + p.dimensions.height, 0),
        Weight: totalWeight / 1000,
        PackageType: '包裹'
      },
      ApplicationInfo: request.packages.flatMap(pkg => 
        pkg.items.map((item, index) => ({
          ApplicationName: item.name,
          ApplicationNameCN: item.description || item.name,
          Qty: item.quantity,
          UnitWeight: item.weight / 1000,
          UnitValue: item.value,
          HSCode: item.hsCode || '9999999999',
          ItemUrl: '',
          SKU: `SKU-${index + 1}`,
          Remark: ''
        }))
      ),
      ServiceCode: request.rateId.includes('ddp') ? 'DDP' : 'DAP',
      IsInsured: request.options?.insurance || false,
      InsuredValue: request.options?.insurance ? totalValue : 0,
      IsReturn: false,
      CustomerReference: request.reference || ''
    }
  }
  
  /**
   * 解析YunExpress运单响应
   */
  private parseYunExpressShipmentResponse(response: any, request: ShipmentCreateRequest): Shipment {
    if (!response.Result || !response.Data) {
      throw new Error(`运单创建失败: ${response.Message || '未知错误'}`)
    }
    
    const data = response.Data
    
    return {
      id: data.OrderNumber,
      trackingNumber: data.TrackingNumber,
      provider: 'YUNEXPRESS',
      status: 'CREATED',
      from: request.from,
      to: request.to,
      packages: request.packages,
      service: {
        name: data.ShippingMethodName || 'YunExpress',
        code: data.ShippingMethodCode || 'YE',
        method: 'AIR_STANDARD' as ShippingMethod,
        incoterms: request.options?.incoterms || 'DAP'
      },
      price: {
        amount: data.TotalFee || 0,
        currency: data.Currency || 'USD'
      },
      labels: data.LabelUrl ? [{
        url: data.LabelUrl,
        format: 'PDF' as const,
        size: '4x6' as const
      }] : [],
      dates: {
        created: new Date(),
        estimated: data.EstimatedDeliveryDate ? 
          new Date(data.EstimatedDeliveryDate) : 
          new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      },
      customs: request.from.country !== request.to.country ? {
        forms: data.CustomsForms || [],
        invoice: data.InvoiceNumber
      } : undefined,
      metadata: {
        orderNumber: data.OrderNumber,
        waybillNumber: data.WaybillNumber
      }
    }
  }
  
  /**
   * 解析YunExpress追踪响应
   */
  private parseYunExpressTrackingResponse(response: any, trackingNumber: string): TrackingInfo {
    if (!response.Result || !response.Data) {
      throw new Error(`追踪信息获取失败: ${response.Message || '未知错误'}`)
    }
    
    const data = response.Data
    const events = data.TrackingEvents || []
    
    return {
      trackingNumber,
      provider: 'YUNEXPRESS',
      status: data.DeliveryStatus || 'IN_TRANSIT',
      estimatedDelivery: data.EstimatedDeliveryDate ? 
        new Date(data.EstimatedDeliveryDate) : undefined,
      events: events.map((event: any) => ({
        timestamp: new Date(event.ProcessDate),
        status: event.ProcessContent,
        location: {
          city: event.ProcessLocation,
          country: event.ProcessCountry
        },
        description: event.ProcessContent
      })),
      currentLocation: events.length > 0 ? {
        city: events[0].ProcessLocation,
        country: events[0].ProcessCountry
      } : undefined,
      lastUpdate: new Date()
    }
  }
}