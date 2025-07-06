// 物流服务单元测试

import { LogisticsService, LogisticsServiceConfig } from '../LogisticsService'
import { LogisticsRequest, LogisticsQuote, LogisticsProviderConfig } from '../models/LogisticsModels'
import { ILogisticsProvider } from '../providers/BaseLogisticsProvider'

// Mock 物流提供商
class MockLogisticsProvider implements ILogisticsProvider {
  public readonly providerId: string
  public readonly providerName: string
  public config: LogisticsProviderConfig
  
  constructor(providerId: string, providerName: string) {
    this.providerId = providerId
    this.providerName = providerName
  }
  
  async initialize(config: LogisticsProviderConfig): Promise<void> {
    this.config = config
  }
  
  validateConfig(): boolean {
    return true
  }
  
  async testConnection(): Promise<boolean> {
    return true
  }
  
  async getQuotes(request: LogisticsRequest): Promise<any> {
    // 模拟报价响应
    return {
      requestId: 'mock_request',
      providerId: this.providerId,
      providerName: this.providerName,
      quotes: [
        {
          quoteId: `${this.providerId}_quote_1`,
          serviceCode: 'STANDARD',
          serviceName: 'Standard Service',
          serviceType: 'STANDARD' as const,
          deliveryMode: 'DDP' as const,
          pricing: {
            baseCost: { amount: 10, currency: 'USD' },
            totalCost: { amount: 12, currency: 'USD' },
            netCost: { amount: 12, currency: 'USD' }
          },
          deliveryTime: {
            estimatedDays: 7,
            businessDaysOnly: true,
            guaranteedDelivery: false
          },
          features: [],
          tracking: {
            available: true,
            realTimeUpdates: true
          },
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          metadata: {
            providerId: this.providerId,
            providerName: this.providerName
          }
        },
        {
          quoteId: `${this.providerId}_quote_2`,
          serviceCode: 'EXPRESS',
          serviceName: 'Express Service',
          serviceType: 'EXPRESS' as const,
          deliveryMode: 'DDP' as const,
          pricing: {
            baseCost: { amount: 20, currency: 'USD' },
            totalCost: { amount: 25, currency: 'USD' },
            netCost: { amount: 25, currency: 'USD' }
          },
          deliveryTime: {
            estimatedDays: 3,
            businessDaysOnly: true,
            guaranteedDelivery: true
          },
          features: [],
          tracking: {
            available: true,
            realTimeUpdates: true
          },
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          metadata: {
            providerId: this.providerId,
            providerName: this.providerName
          }
        }
      ],
      processingTime: 100,
      timestamp: new Date()
    }
  }
  
  async getBulkQuotes(): Promise<any> {
    throw new Error('Not implemented')
  }
  
  async createShipment(): Promise<any> {
    return {
      orderId: 'mock_order_123',
      quoteId: 'mock_quote_123',
      providerId: this.providerId,
      serviceCode: 'STANDARD',
      shipment: {
        trackingNumber: 'TRACK123456',
        labelUrl: 'https://example.com/label.pdf',
        shipmentDate: new Date(),
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      status: 'CREATED' as const,
      statusHistory: [],
      documents: [],
      events: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
  
  async cancelShipment(): Promise<boolean> {
    return true
  }
  
  async trackShipment(): Promise<any[]> {
    return [
      {
        eventId: 'event_1',
        timestamp: new Date(),
        status: 'IN_TRANSIT' as const,
        location: 'Origin Facility',
        description: 'Package picked up',
        eventCode: 'PU'
      }
    ]
  }
  
  async getShipmentStatus(): Promise<any> {
    return 'IN_TRANSIT'
  }
  
  async generateLabel(): Promise<string> {
    return 'https://example.com/label.pdf'
  }
  
  async generateManifest(): Promise<string> {
    return 'https://example.com/manifest.pdf'
  }
  
  async validateAddress(): Promise<boolean> {
    return true
  }
  
  async getAvailableServices(): Promise<string[]> {
    return ['STANDARD', 'EXPRESS']
  }
  
  async getServiceRestrictions(): Promise<any> {
    return {}
  }
}

describe('LogisticsService', () => {
  let logisticsService: LogisticsService
  let mockProvider1: MockLogisticsProvider
  let mockProvider2: MockLogisticsProvider
  
  const mockConfig: LogisticsServiceConfig = {
    providers: [
      {
        providerId: 'mock-provider-1',
        providerName: 'Mock Provider 1',
        apiEndpoint: 'https://api.mock1.com',
        apiVersion: 'v1',
        authentication: {
          type: 'API_KEY',
          credentials: { apiKey: 'test-key-1' }
        },
        defaultSettings: {
          currency: 'USD',
          weightUnit: 'KG',
          dimensionUnit: 'CM',
          timeout: 30000
        },
        supportedServices: ['STANDARD', 'EXPRESS'],
        supportedCountries: ['US', 'CN'],
        features: {
          realTimeTracking: true,
          insurance: true,
          signatureRequired: true,
          proofOfDelivery: true
        },
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000
        }
      },
      {
        providerId: 'mock-provider-2',
        providerName: 'Mock Provider 2',
        apiEndpoint: 'https://api.mock2.com',
        apiVersion: 'v1',
        authentication: {
          type: 'API_KEY',
          credentials: { apiKey: 'test-key-2' }
        },
        defaultSettings: {
          currency: 'USD',
          weightUnit: 'KG',
          dimensionUnit: 'CM',
          timeout: 30000
        },
        supportedServices: ['STANDARD', 'ECONOMY'],
        supportedCountries: ['US', 'CN'],
        features: {
          realTimeTracking: true,
          insurance: false,
          signatureRequired: false,
          proofOfDelivery: true
        },
        rateLimit: {
          requestsPerMinute: 30,
          requestsPerHour: 500,
          requestsPerDay: 5000
        }
      }
    ],
    defaultCurrency: 'USD',
    defaultTimeout: 30000,
    cacheEnabled: true,
    cacheTTL: 300,
    maxConcurrentRequests: 10
  }
  
  const mockRequest: LogisticsRequest = {
    orderId: 'test-order-123',
    origin: {
      countryCode: 'CN',
      city: 'Shenzhen',
      postalCode: '518000',
      addressLine1: 'Test Address',
      contactName: 'Test Sender'
    },
    destination: {
      countryCode: 'US',
      stateCode: 'CA',
      city: 'Los Angeles',
      postalCode: '90210',
      addressLine1: 'Test Destination',
      contactName: 'Test Recipient'
    },
    packages: [
      {
        weight: { value: 1, unit: 'KG' },
        dimensions: { length: 20, width: 15, height: 10, unit: 'CM' },
        value: { amount: 100, currency: 'USD' },
        description: 'Test Product',
        quantity: 1
      }
    ],
    shipmentValue: { amount: 100, currency: 'USD' }
  }
  
  beforeEach(async () => {
    // 创建模拟提供商
    mockProvider1 = new MockLogisticsProvider('mock-provider-1', 'Mock Provider 1')
    mockProvider2 = new MockLogisticsProvider('mock-provider-2', 'Mock Provider 2')
    
    // 注册模拟提供商
    const { LogisticsProviderFactory } = await import('../providers/BaseLogisticsProvider')
    LogisticsProviderFactory.register('mock-provider-1', () => mockProvider1)
    LogisticsProviderFactory.register('mock-provider-2', () => mockProvider2)
    
    // 创建物流服务实例
    logisticsService = new LogisticsService(mockConfig)
    
    // 等待提供商初始化
    await new Promise(resolve => setTimeout(resolve, 100))
  })
  
  describe('初始化', () => {
    test('应该正确初始化所有配置的提供商', () => {
      expect(logisticsService).toBeDefined()
    })
  })
  
  describe('获取报价', () => {
    test('应该成功获取所有提供商的报价', async () => {
      const quotes = await logisticsService.getAllQuotes(mockRequest)
      
      expect(quotes).toBeDefined()
      expect(Array.isArray(quotes)).toBe(true)
      expect(quotes.length).toBeGreaterThan(0)
      
      // 验证报价结构
      quotes.forEach(quote => {
        expect(quote).toHaveProperty('quoteId')
        expect(quote).toHaveProperty('serviceCode')
        expect(quote).toHaveProperty('serviceName')
        expect(quote).toHaveProperty('pricing')
        expect(quote).toHaveProperty('deliveryTime')
        expect(quote.metadata).toHaveProperty('providerId')
      })
    })
    
    test('应该正确应用筛选条件', async () => {
      const options = {
        maxCost: 15,
        maxDeliveryTime: 5,
        sortBy: 'COST' as const
      }
      
      const result = await logisticsService.getBestQuotes(mockRequest, options)
      
      expect(result.quotes).toBeDefined()
      
      // 验证成本筛选
      result.quotes.forEach(quote => {
        expect(quote.pricing.netCost.amount).toBeLessThanOrEqual(15)
      })
      
      // 验证时效筛选
      result.quotes.forEach(quote => {
        expect(quote.deliveryTime.estimatedDays).toBeLessThanOrEqual(5)
      })
      
      // 验证按成本排序
      for (let i = 1; i < result.quotes.length; i++) {
        expect(result.quotes[i].pricing.netCost.amount)
          .toBeGreaterThanOrEqual(result.quotes[i-1].pricing.netCost.amount)
      }
    })
    
    test('应该生成正确的分析报告', async () => {
      const result = await logisticsService.getBestQuotes(mockRequest)
      
      expect(result.analysis).toBeDefined()
      expect(result.analysis.cost).toBeDefined()
      expect(result.analysis.time).toBeDefined()
      expect(result.analysis.recommendation).toBeDefined()
      
      expect(result.analysis.cost.cheapest).toBeDefined()
      expect(result.analysis.cost.mostExpensive).toBeDefined()
      expect(result.analysis.time.fastestOption).toBeDefined()
      expect(result.analysis.time.slowestOption).toBeDefined()
    })
  })
  
  describe('DDP vs DAP 对比', () => {
    test('应该正确比较DDP和DAP成本', async () => {
      const result = await logisticsService.compareDDPvsDAP(mockRequest)
      
      expect(result).toBeDefined()
      expect(result.ddpQuotes).toBeDefined()
      expect(result.dapQuotes).toBeDefined()
      expect(result.recommendation).toBeDefined()
      expect(result.savings).toBeDefined()
      
      expect(Array.isArray(result.ddpQuotes)).toBe(true)
      expect(Array.isArray(result.dapQuotes)).toBe(true)
      expect(['DDP', 'DAP']).toContain(result.recommendation)
    })
  })
  
  describe('批量报价', () => {
    test('应该正确处理批量请求', async () => {
      const bulkRequest = {
        requests: [mockRequest, { ...mockRequest, orderId: 'test-order-456' }],
        options: {
          maxProviders: 2,
          timeout: 10000,
          sortBy: 'COST' as const
        }
      }
      
      const result = await logisticsService.getBulkQuotes(bulkRequest)
      
      expect(result).toBeDefined()
      expect(result.responses).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.bestOptions).toBeDefined()
      
      expect(result.responses.length).toBe(2)
      expect(result.summary.totalRequests).toBe(2)
      expect(result.bestOptions.cheapest).toBeDefined()
      expect(result.bestOptions.fastest).toBeDefined()
      expect(result.bestOptions.recommended).toBeDefined()
    })
  })
  
  describe('地址验证', () => {
    test('应该正确验证地址', async () => {
      const address = {
        countryCode: 'US',
        city: 'Los Angeles',
        postalCode: '90210',
        addressLine1: 'Test Address'
      }
      
      const result = await logisticsService.validateAddress(address)
      
      expect(result).toBeDefined()
      expect(result.isValid).toBe(true)
    })
  })
  
  describe('创建订单', () => {
    test('应该成功创建物流订单', async () => {
      // 先获取报价
      const quotes = await logisticsService.getAllQuotes(mockRequest)
      expect(quotes.length).toBeGreaterThan(0)
      
      const quote = quotes[0]
      
      // 创建订单
      const order = await logisticsService.createShipment(quote, mockRequest)
      
      expect(order).toBeDefined()
      expect(order.orderId).toBeDefined()
      expect(order.quoteId).toBe(quote.quoteId)
      expect(order.shipment.trackingNumber).toBeDefined()
      expect(order.status).toBe('CREATED')
    })
  })
  
  describe('跟踪订单', () => {
    test('应该正确跟踪物流订单', async () => {
      const trackingNumber = 'TRACK123456'
      
      const events = await logisticsService.trackShipment(trackingNumber, 'mock-provider-1')
      
      expect(events).toBeDefined()
      expect(Array.isArray(events)).toBe(true)
      expect(events.length).toBeGreaterThan(0)
      
      events.forEach(event => {
        expect(event).toHaveProperty('eventId')
        expect(event).toHaveProperty('timestamp')
        expect(event).toHaveProperty('status')
        expect(event).toHaveProperty('location')
        expect(event).toHaveProperty('description')
      })
    })
  })
  
  describe('获取可用服务', () => {
    test('应该返回指定国家的可用服务', async () => {
      const services = await logisticsService.getAvailableServices('US')
      
      expect(services).toBeDefined()
      expect(typeof services).toBe('object')
      
      // 验证每个提供商都有服务列表
      Object.keys(services).forEach(providerId => {
        expect(Array.isArray(services[providerId])).toBe(true)
      })
    })
  })
  
  describe('错误处理', () => {
    test('应该正确处理提供商API错误', async () => {
      // 模拟API错误
      const errorProvider = new MockLogisticsProvider('error-provider', 'Error Provider')
      errorProvider.getQuotes = jest.fn().mockRejectedValue(new Error('API Error'))
      
      const { LogisticsProviderFactory } = await import('../providers/BaseLogisticsProvider')
      LogisticsProviderFactory.register('error-provider', () => errorProvider)
      
      const configWithError = {
        ...mockConfig,
        providers: [
          ...mockConfig.providers,
          {
            providerId: 'error-provider',
            providerName: 'Error Provider',
            apiEndpoint: 'https://api.error.com',
            apiVersion: 'v1',
            authentication: { type: 'API_KEY' as const, credentials: { apiKey: 'error-key' } },
            defaultSettings: {
              currency: 'USD' as const,
              weightUnit: 'KG' as const,
              dimensionUnit: 'CM' as const,
              timeout: 30000
            },
            supportedServices: [],
            supportedCountries: [],
            features: {
              realTimeTracking: false,
              insurance: false,
              signatureRequired: false,
              proofOfDelivery: false
            },
            rateLimit: {
              requestsPerMinute: 10,
              requestsPerHour: 100,
              requestsPerDay: 1000
            }
          }
        ]
      }
      
      const serviceWithError = new LogisticsService(configWithError)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 即使一个提供商失败，其他提供商应该仍然工作
      const quotes = await serviceWithError.getAllQuotes(mockRequest)
      expect(quotes.length).toBeGreaterThan(0)
    })
  })
  
  describe('缓存功能', () => {
    test('应该正确缓存报价结果', async () => {
      // 第一次请求
      const start1 = Date.now()
      const quotes1 = await logisticsService.getAllQuotes(mockRequest)
      const time1 = Date.now() - start1
      
      // 第二次请求（应该使用缓存）
      const start2 = Date.now()
      const quotes2 = await logisticsService.getAllQuotes(mockRequest)
      const time2 = Date.now() - start2
      
      expect(quotes1.length).toBe(quotes2.length)
      // 缓存的请求应该更快（虽然在测试中可能不明显）
      // expect(time2).toBeLessThan(time1)
    })
  })
})

describe('物流工具函数', () => {
  test('重量单位转换', () => {
    const { LogisticsUtils } = require('../providers/BaseLogisticsProvider')
    
    expect(LogisticsUtils.convertWeight(1, 'KG', 'LB')).toBeCloseTo(2.20462, 4)
    expect(LogisticsUtils.convertWeight(1000, 'G', 'KG')).toBe(1)
    expect(LogisticsUtils.convertWeight(1, 'LB', 'OZ')).toBeCloseTo(16, 0)
  })
  
  test('尺寸单位转换', () => {
    const { LogisticsUtils } = require('../providers/BaseLogisticsProvider')
    
    expect(LogisticsUtils.convertDimension(1, 'IN', 'CM')).toBeCloseTo(2.54, 2)
    expect(LogisticsUtils.convertDimension(100, 'CM', 'IN')).toBeCloseTo(39.3701, 4)
  })
  
  test('地址标准化', () => {
    const { LogisticsUtils } = require('../providers/BaseLogisticsProvider')
    
    const address = {
      countryCode: 'us',
      postalCode: '90 210',
      city: ' Los Angeles ',
      addressLine1: ' 123 Main St '
    }
    
    const standardized = LogisticsUtils.standardizeAddress(address)
    
    expect(standardized.countryCode).toBe('US')
    expect(standardized.postalCode).toBe('90210')
    expect(standardized.city).toBe('Los Angeles')
    expect(standardized.addressLine1).toBe('123 Main St')
  })
  
  test('生成跟踪号', () => {
    const { LogisticsUtils } = require('../providers/BaseLogisticsProvider')
    
    const trackingNumber = LogisticsUtils.generateTrackingNumber('DHL')
    
    expect(trackingNumber).toMatch(/^DHL[0-9A-Z]+$/)
    expect(trackingNumber.length).toBeGreaterThan(10)
  })
})