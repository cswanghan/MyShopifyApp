import { TaxCalculator } from '../calculator'
import { HSCodeAnalyzer } from '../hscode'
import { Product } from '@dtax-bridge/shared'

describe('TaxCalculator', () => {
  const mockProduct: Product = {
    id: 'test-product-1',
    title: '苹果iPhone 15',
    price: 999,
    currency: 'USD',
    weight: 200,
    dimensions: { length: 15, width: 7, height: 1 },
    hsCode: '8517120000',
    category: 'electronics',
    originCountry: 'CN'
  }

  beforeEach(() => {
    // 重置配置
    TaxCalculator.setConfig({
      baseCurrency: 'USD',
      exchangeRates: { USD: 1, EUR: 0.85, GBP: 0.75, CNY: 7.2 },
      rounding: { decimals: 2, method: 'ROUND' },
      validation: { maxValue: 100000, minValue: 0, allowZero: true },
      caching: { enabled: true, ttl: 3600 }
    })
  })

  describe('基础税费计算', () => {
    test('应该正确计算美国税费（Section 321免税）', async () => {
      const result = await TaxCalculator.calculateTax(mockProduct, 'US')
      
      expect(result.duties).toBe(0) // Section 321 免税
      expect(result.vat).toBe(0) // 美国无增值税
      expect(result.totalTax).toBe(0)
      expect(result.destinationCountry).toBe('US')
    })

    test('应该正确计算德国税费', async () => {
      const result = await TaxCalculator.calculateTax(mockProduct, 'DE')
      
      expect(result.duties).toBeGreaterThan(0) // 应该有关税
      expect(result.vat).toBeGreaterThan(0) // 应该有增值税
      expect(result.totalTax).toBe(result.duties + result.vat)
      expect(result.calculation.vatRate).toBe(0.19) // 德国19%增值税
    })

    test('应该正确计算英国税费', async () => {
      const result = await TaxCalculator.calculateTax(mockProduct, 'UK')
      
      expect(result.duties).toBeGreaterThan(0)
      expect(result.vat).toBeGreaterThan(0)
      expect(result.calculation.vatRate).toBe(0.20) // 英国20%增值税
    })
  })

  describe('免税门槛测试', () => {
    test('低价值商品应该免税（欧盟22欧元门槛）', async () => {
      const lowValueProduct: Product = {
        ...mockProduct,
        price: 20,
        currency: 'USD'
      }
      
      const result = await TaxCalculator.calculateTax(lowValueProduct, 'DE')
      
      expect(result.duties).toBe(0)
      expect(result.vat).toBe(0)
      expect(result.totalTax).toBe(0)
    })

    test('美国Section 321门槛测试', async () => {
      const section321Product: Product = {
        ...mockProduct,
        price: 500 // 低于800美元门槛
      }
      
      const result = await TaxCalculator.calculateTax(section321Product, 'US')
      
      expect(result.duties).toBe(0)
      expect(result.vat).toBe(0)
    })
  })

  describe('货币转换测试', () => {
    test('应该正确处理人民币价格', async () => {
      const cnyProduct: Product = {
        ...mockProduct,
        price: 7200, // 7200 CNY ≈ 1000 USD
        currency: 'CNY'
      }
      
      const result = await TaxCalculator.calculateTax(cnyProduct, 'DE')
      
      // 税费应该基于USD计算
      expect(result.calculation.taxableValue).toBeCloseTo(1000, 0)
    })
  })

  describe('HSCode分析测试', () => {
    test('应该能够自动识别商品类别', () => {
      const analysis = HSCodeAnalyzer.analyzeProductTitle('苹果iPhone 15 手机')
      
      expect(analysis.category).toBe('electronics')
      expect(analysis.confidence).toBeGreaterThan(0)
      expect(analysis.matchedKeywords).toContain('手机')
      expect(analysis.suggestedHSCode).toBeDefined()
    })

    test('应该能够识别服装类别', () => {
      const analysis = HSCodeAnalyzer.analyzeProductTitle('男士牛仔裤')
      
      expect(analysis.category).toBe('clothing')
      expect(analysis.matchedKeywords).toContain('牛仔裤')
    })

    test('应该验证HSCode格式', () => {
      expect(HSCodeAnalyzer.validateHSCode('8517120000')).toBe(true)
      expect(HSCodeAnalyzer.validateHSCode('85171200')).toBe(true)
      expect(HSCodeAnalyzer.validateHSCode('8517')).toBe(false)
      expect(HSCodeAnalyzer.validateHSCode('abc123')).toBe(false)
    })
  })

  describe('批量计算测试', () => {
    test('应该能够批量计算多个商品', async () => {
      const products = [
        {
          id: 'product-1',
          title: 'iPhone',
          price: 999,
          currency: 'USD',
          weight: 200,
          category: 'electronics'
        },
        {
          id: 'product-2',
          title: '牛仔裤',
          price: 50,
          currency: 'USD',
          weight: 500,
          category: 'clothing'
        }
      ]

      const request = {
        products,
        destinationCountry: 'DE',
        shippingAddress: {
          country: 'DE',
          state: 'Bayern',
          city: 'Munich',
          zip: '80331'
        },
        options: {
          includeDuties: true,
          includeVAT: true,
          includeDetails: true,
          currency: 'USD'
        }
      }

      const results = await TaxCalculator.calculateBatchTax(request)
      
      expect(results).toHaveLength(2)
      expect(results[0].product.id).toBe('product-1')
      expect(results[1].product.id).toBe('product-2')
      
      // 电子产品和服装应该有不同的税率
      expect(results[0].calculation.dutyRate).not.toBe(results[1].calculation.dutyRate)
    })
  })

  describe('详细计算测试', () => {
    test('应该提供详细的计算步骤', async () => {
      const result = await TaxCalculator.calculateExtendedTax(mockProduct, 'DE')
      
      expect(result.details).toBeDefined()
      expect(result.details.length).toBeGreaterThan(0)
      expect(result.warnings).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    test('应该包含计算公式和变量', async () => {
      const result = await TaxCalculator.calculateExtendedTax(mockProduct, 'DE')
      
      const dutyStep = result.details.find(step => step.step === 'duty_calculation')
      expect(dutyStep).toBeDefined()
      expect(dutyStep?.formula).toContain('USD')
      expect(dutyStep?.variables).toBeDefined()
    })
  })

  describe('验证测试', () => {
    test('应该验证计算结果的正确性', async () => {
      const result = await TaxCalculator.calculateTax(mockProduct, 'DE')
      
      expect(TaxCalculator.validateCalculation(result)).toBe(true)
    })

    test('应该拒绝无效的商品信息', async () => {
      const invalidProduct = {
        ...mockProduct,
        id: '',
        price: -100
      }
      
      await expect(TaxCalculator.calculateTax(invalidProduct, 'DE'))
        .rejects.toThrow('商品信息不完整')
    })

    test('应该拒绝超出范围的价格', async () => {
      const expensiveProduct = {
        ...mockProduct,
        price: 200000 // 超过最大值
      }
      
      await expect(TaxCalculator.calculateTax(expensiveProduct, 'DE'))
        .rejects.toThrow('商品价格超出范围')
    })
  })

  describe('边界条件测试', () => {
    test('应该处理零价格商品', async () => {
      const freeProduct: Product = {
        ...mockProduct,
        price: 0
      }
      
      const result = await TaxCalculator.calculateTax(freeProduct, 'DE')
      
      expect(result.duties).toBe(0)
      expect(result.vat).toBe(0)
      expect(result.totalTax).toBe(0)
    })

    test('应该处理极小价格商品', async () => {
      const tinyProduct: Product = {
        ...mockProduct,
        price: 0.01
      }
      
      const result = await TaxCalculator.calculateTax(tinyProduct, 'DE')
      
      expect(result.totalTax).toBeGreaterThanOrEqual(0)
    })
  })

  describe('配置测试', () => {
    test('应该能够设置自定义配置', () => {
      const customConfig = {
        rounding: { decimals: 4, method: 'CEIL' as const },
        validation: { maxValue: 50000, minValue: 1, allowZero: false }
      }
      
      TaxCalculator.setConfig(customConfig)
      
      // 配置应该被应用（这里只是测试设置不报错）
      expect(() => TaxCalculator.setConfig(customConfig)).not.toThrow()
    })
  })

  describe('缓存和服务管理测试', () => {
    test('应该能够获取服务统计信息', async () => {
      const stats = await TaxCalculator.getServiceStats()
      
      expect(stats).toBeDefined()
      expect(stats.cacheStats).toBeDefined()
      expect(stats.serviceValidation).toBeDefined()
    })

    test('应该能够清除缓存', () => {
      expect(() => TaxCalculator.clearCache()).not.toThrow()
    })
  })
})