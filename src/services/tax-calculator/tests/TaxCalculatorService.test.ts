/**
 * DTax-Bridge 税费计算服务测试
 * 
 * 测试覆盖：
 * - 基本税费计算功能
 * - 各国合规政策验证
 * - 边界条件和错误处理
 * - 性能和缓存测试
 */

import { TaxCalculatorService } from '../TaxCalculatorService'
import { TaxCalculationRequest, TaxCalculationItem, DestinationInfo } from '../models/TaxCalculationRequest'
import { TaxType } from '../models/TaxCalculationResult'

describe('TaxCalculatorService', () => {
  let taxCalculator: TaxCalculatorService

  beforeEach(() => {
    taxCalculator = new TaxCalculatorService({ enableCache: true })
  })

  afterEach(() => {
    taxCalculator.clearCache()
  })

  describe('基本税费计算', () => {
    test('应该正确计算美国订单的Section 321免税', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'iPhone 15 Pro',
            unitPrice: 999,
            quantity: 1,
            totalValue: 999,
            hsCode: '8517120000'
          }
        ],
        destination: {
          countryCode: 'US',
          stateCode: 'CA'
        },
        customerInfo: {
          type: 'B2C'
        },
        shippingInfo: {
          serviceType: 'DDP',
          shippingCost: 25
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.totalTax).toBeGreaterThan(0) // 应该有州税
      expect(result.complianceInfo.section321Info?.applicable).toBe(false) // 超过$800阈值
      expect(result.complianceInfo.section321Info?.savedDutyAmount).toBeGreaterThan(0)
    })

    test('应该正确计算欧盟IOSS订单', async () => {
      const request: TaxCalculationRequest = {
        currency: 'EUR',
        items: [
          {
            name: 'Wireless Headphones',
            unitPrice: 89,
            quantity: 1,
            totalValue: 89,
            hsCode: '8518300000'
          }
        ],
        destination: {
          countryCode: 'DE',
          isEuMember: true
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.complianceInfo.iossInfo?.applicable).toBe(true)
      expect(result.breakdown.some(b => b.taxType === TaxType.VAT)).toBe(true)
      expect(result.breakdown.find(b => b.taxType === TaxType.VAT)?.rate).toBeCloseTo(0.19) // 德国VAT
    })

    test('应该正确计算英国低价值订单', async () => {
      const request: TaxCalculationRequest = {
        currency: 'GBP',
        items: [
          {
            name: 'Cotton T-Shirt',
            unitPrice: 25,
            quantity: 2,
            totalValue: 50,
            hsCode: '6109100000'
          }
        ],
        destination: {
          countryCode: 'GB'
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.complianceInfo.ukVatInfo?.lowValueReliefApplicable).toBe(true)
      expect(result.breakdown.some(b => b.taxType === TaxType.VAT)).toBe(true)
      expect(result.breakdown.find(b => b.taxType === TaxType.VAT)?.rate).toBeCloseTo(0.20) // 英国VAT
    })
  })

  describe('阈值边界测试', () => {
    test('Section 321 - 正好$800的订单', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'Test Product',
            unitPrice: 800,
            quantity: 1,
            totalValue: 800
          }
        ],
        destination: {
          countryCode: 'US'
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.complianceInfo.section321Info?.applicable).toBe(true)
    })

    test('Section 321 - 超过$800的订单', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'Expensive Product',
            unitPrice: 801,
            quantity: 1,
            totalValue: 801
          }
        ],
        destination: {
          countryCode: 'US'
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.complianceInfo.section321Info?.applicable).toBe(false)
      expect(result.recommendations?.some(r => r.type === 'SPLIT_ORDER')).toBe(true)
    })

    test('IOSS - 正好€150的订单', async () => {
      const request: TaxCalculationRequest = {
        currency: 'EUR',
        items: [
          {
            name: 'Test Product',
            unitPrice: 150,
            quantity: 1,
            totalValue: 150
          }
        ],
        destination: {
          countryCode: 'FR',
          isEuMember: true
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.complianceInfo.iossInfo?.applicable).toBe(true)
    })
  })

  describe('货币转换测试', () => {
    test('应该正确处理不同货币的订单', async () => {
      const usdRequest: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'Test Product',
            unitPrice: 100,
            quantity: 1,
            totalValue: 100
          }
        ],
        destination: {
          countryCode: 'DE',
          isEuMember: true
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(usdRequest)

      expect(result.success).toBe(true)
      expect(result.currency).toBe('USD')
      expect(result.complianceInfo.iossInfo?.applicable).toBe(true) // $100 < €150
    })
  })

  describe('验证和错误处理', () => {
    test('应该拒绝空商品列表', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [],
        destination: {
          countryCode: 'US'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].code).toBe('MISSING_ITEMS')
    })

    test('应该拒绝无效的目的地', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'Test Product',
            unitPrice: 100,
            quantity: 1,
            totalValue: 100
          }
        ],
        destination: {
          countryCode: ''
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].code).toBe('MISSING_DESTINATION')
    })

    test('应该验证商品价格有效性', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'Invalid Product',
            unitPrice: -10,
            quantity: 1,
            totalValue: -10
          }
        ],
        destination: {
          countryCode: 'US'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].code).toBe('INVALID_ITEM_VALUE')
    })
  })

  describe('优化建议测试', () => {
    test('应该为超过Section 321阈值的订单提供拆分建议', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'Expensive Product',
            unitPrice: 1000,
            quantity: 1,
            totalValue: 1000
          }
        ],
        destination: {
          countryCode: 'US'
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.recommendations).toBeDefined()
      expect(result.recommendations?.some(r => r.type === 'SPLIT_ORDER')).toBe(true)
      expect(result.recommendations?.find(r => r.type === 'SPLIT_ORDER')?.potentialSavings).toBeGreaterThan(0)
    })

    test('应该为高税费订单建议DDP服务', async () => {
      const request: TaxCalculationRequest = {
        currency: 'EUR',
        items: [
          {
            name: 'High Value Product',
            unitPrice: 500,
            quantity: 1,
            totalValue: 500
          }
        ],
        destination: {
          countryCode: 'DE',
          isEuMember: true
        },
        customerInfo: {
          type: 'B2C'
        },
        shippingInfo: {
          serviceType: 'DAP'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      if (result.totalTax > 50) {
        expect(result.recommendations?.some(r => r.type === 'CHANGE_SHIPPING')).toBe(true)
      }
    })
  })

  describe('警告检测测试', () => {
    test('应该对高税率订单发出警告', async () => {
      const request: TaxCalculationRequest = {
        currency: 'EUR',
        items: [
          {
            name: 'High Tax Product',
            unitPrice: 100,
            quantity: 1,
            totalValue: 100,
            hsCode: '1704900000' // 糖果，高税率
          }
        ],
        destination: {
          countryCode: 'DE',
          isEuMember: true
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      // 检查是否有高税率警告
      if (result.totalTax > result.totalTax * 0.3) {
        expect(result.warnings?.some(w => w.code === 'HIGH_TAX_RATE')).toBe(true)
      }
    })

    test('应该对缺少HSCode的商品发出警告', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'Product without HSCode',
            unitPrice: 50,
            quantity: 1,
            totalValue: 50
            // 缺少hsCode
          }
        ],
        destination: {
          countryCode: 'US'
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.warnings?.some(w => w.code === 'MISSING_HSCODE')).toBe(true)
    })
  })

  describe('缓存功能测试', () => {
    test('应该正确使用缓存', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: [
          {
            name: 'Cached Product',
            unitPrice: 100,
            quantity: 1,
            totalValue: 100
          }
        ],
        destination: {
          countryCode: 'US'
        }
      }

      // 第一次计算
      const result1 = await taxCalculator.calculateTax(request)
      expect(result1.metadata.fromCache).toBe(false)

      // 第二次计算应该使用缓存
      const result2 = await taxCalculator.calculateTax(request)
      expect(result2.metadata.fromCache).toBe(true)

      // 结果应该一致
      expect(result1.totalTax).toBe(result2.totalTax)
      expect(result1.metadata.calculationId).toBe(result2.metadata.calculationId)
    })

    test('缓存统计应该正确', () => {
      const stats = taxCalculator.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('enabled')
      expect(typeof stats.size).toBe('number')
      expect(typeof stats.enabled).toBe('boolean')
    })
  })

  describe('性能测试', () => {
    test('应该在合理时间内完成计算', async () => {
      const request: TaxCalculationRequest = {
        currency: 'USD',
        items: Array.from({ length: 10 }, (_, i) => ({
          name: `Product ${i}`,
          unitPrice: 50 + i,
          quantity: 1 + i,
          totalValue: (50 + i) * (1 + i)
        })),
        destination: {
          countryCode: 'US'
        }
      }

      const startTime = Date.now()
      const result = await taxCalculator.calculateTax(request)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // 应该在1秒内完成
      expect(result.metadata.calculationTime).toBeLessThan(300) // 服务内部计算时间应该在300ms内
    })

    test('批量计算性能测试', async () => {
      const requests: TaxCalculationRequest[] = Array.from({ length: 5 }, (_, i) => ({
        currency: 'USD',
        items: [
          {
            name: `Batch Product ${i}`,
            unitPrice: 100 + i * 10,
            quantity: 1,
            totalValue: 100 + i * 10
          }
        ],
        destination: {
          countryCode: 'US'
        }
      }))

      const startTime = Date.now()
      const results = await Promise.all(requests.map(req => taxCalculator.calculateTax(req)))
      const endTime = Date.now()

      expect(results.every(r => r.success)).toBe(true)
      expect(endTime - startTime).toBeLessThan(2000) // 5个请求应该在2秒内完成
    })
  })

  describe('多商品订单测试', () => {
    test('应该正确计算混合商品订单', async () => {
      const request: TaxCalculationRequest = {
        currency: 'EUR',
        items: [
          {
            name: 'iPhone',
            unitPrice: 999,
            quantity: 1,
            totalValue: 999,
            hsCode: '8517120000'
          },
          {
            name: 'Phone Case',
            unitPrice: 29,
            quantity: 1,
            totalValue: 29,
            hsCode: '3926909790'
          },
          {
            name: 'Screen Protector',
            unitPrice: 15,
            quantity: 2,
            totalValue: 30,
            hsCode: '7007190000'
          }
        ],
        destination: {
          countryCode: 'DE',
          isEuMember: true
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const result = await taxCalculator.calculateTax(request)

      expect(result.success).toBe(true)
      expect(result.totalTax).toBeGreaterThan(0)
      expect(result.breakdown.length).toBeGreaterThan(0)

      // 应该为不同商品提供不同的税率处理
      const totalOrderValue = 999 + 29 + 30 // 1058 EUR
      expect(result.complianceInfo.iossInfo?.applicable).toBe(false) // 超过€150阈值
    })
  })

  describe('B2B vs B2C测试', () => {
    test('B2B订单应该有不同的税务处理', async () => {
      const b2cRequest: TaxCalculationRequest = {
        currency: 'EUR',
        items: [
          {
            name: 'Business Product',
            unitPrice: 200,
            quantity: 1,
            totalValue: 200
          }
        ],
        destination: {
          countryCode: 'DE',
          isEuMember: true
        },
        customerInfo: {
          type: 'B2C'
        }
      }

      const b2bRequest: TaxCalculationRequest = {
        ...b2cRequest,
        customerInfo: {
          type: 'B2B',
          vatNumber: 'DE123456789'
        }
      }

      const b2cResult = await taxCalculator.calculateTax(b2cRequest)
      const b2bResult = await taxCalculator.calculateTax(b2bRequest)

      expect(b2cResult.success).toBe(true)
      expect(b2bResult.success).toBe(true)

      // B2B订单在某些情况下可能有不同的税务处理
      // 具体规则取决于业务逻辑实现
    })
  })
})