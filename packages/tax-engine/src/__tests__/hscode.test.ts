import { HSCodeAnalyzer, HSCODE_DATABASE, PRODUCT_CATEGORIES } from '../hscode'

describe('HSCodeAnalyzer', () => {
  describe('商品标题分析', () => {
    test('应该正确识别电子产品', () => {
      const testCases = [
        '苹果iPhone 15 Pro 手机',
        '小米笔记本电脑',
        '索尼无线耳机',
        'Samsung Galaxy 平板电脑'
      ]

      testCases.forEach(title => {
        const result = HSCodeAnalyzer.analyzeProductTitle(title)
        expect(result.category).toBe('electronics')
        expect(result.confidence).toBeGreaterThan(0)
        expect(result.matchedKeywords.length).toBeGreaterThan(0)
      })
    })

    test('应该正确识别服装', () => {
      const testCases = [
        '男士牛仔裤',
        '女士T恤衫',
        '针织毛衣',
        '运动外套'
      ]

      testCases.forEach(title => {
        const result = HSCodeAnalyzer.analyzeProductTitle(title)
        expect(result.category).toBe('clothing')
        expect(result.confidence).toBeGreaterThan(0)
      })
    })

    test('应该正确识别配饰', () => {
      const testCases = [
        'LV手提包',
        '劳力士手表',
        '太阳眼镜',
        '银首饰项链'
      ]

      testCases.forEach(title => {
        const result = HSCodeAnalyzer.analyzeProductTitle(title)
        expect(result.category).toBe('accessories')
        expect(result.confidence).toBeGreaterThan(0)
      })
    })

    test('应该正确识别家居用品', () => {
      const testCases = [
        '床上用品四件套',
        '陶瓷餐具',
        '实木家具',
        '厨房用品'
      ]

      testCases.forEach(title => {
        const result = HSCodeAnalyzer.analyzeProductTitle(title)
        expect(result.category).toBe('home')
        expect(result.confidence).toBeGreaterThan(0)
      })
    })

    test('应该处理未识别的商品', () => {
      const result = HSCodeAnalyzer.analyzeProductTitle('神秘商品XYZ123')
      
      expect(result.confidence).toBe(0)
      expect(result.matchedKeywords).toHaveLength(0)
      expect(result.category).toBeUndefined()
      expect(result.suggestedHSCode).toBeUndefined()
    })

    test('应该返回建议的HSCode', () => {
      const result = HSCodeAnalyzer.analyzeProductTitle('iPhone手机')
      
      expect(result.suggestedHSCode).toBeDefined()
      expect(result.suggestedHSCode).toMatch(/^\d{6,10}$/)
    })
  })

  describe('HSCode验证', () => {
    test('应该验证有效的HSCode格式', () => {
      const validCodes = [
        '851712',      // 6位
        '85171200',    // 8位  
        '8517120000',  // 10位
        '123456',      // 6位数字
        '1234567890'   // 10位数字
      ]

      validCodes.forEach(code => {
        expect(HSCodeAnalyzer.validateHSCode(code)).toBe(true)
      })
    })

    test('应该拒绝无效的HSCode格式', () => {
      const invalidCodes = [
        '12345',        // 太短
        '12345678901',  // 太长
        'abc123',       // 包含字母
        '123-456',      // 包含特殊字符
        '',             // 空字符串
        '123.456'       // 包含小数点
      ]

      invalidCodes.forEach(code => {
        expect(HSCodeAnalyzer.validateHSCode(code)).toBe(false)
      })
    })
  })

  describe('HSCode信息获取', () => {
    test('应该能够获取已知HSCode的信息', () => {
      const hsCode = '8517120000' // 手机
      const info = HSCodeAnalyzer.getHSCodeInfo(hsCode)
      
      expect(info).toBeDefined()
      expect(info?.code).toBe(hsCode)
      expect(info?.description).toContain('手机')
      expect(info?.category).toBe('electronics')
      expect(info?.dutyRate).toBeGreaterThanOrEqual(0)
    })

    test('应该能够基于章节号推测分类', () => {
      const hsCode = '8517999999' // 同一章节的未知HSCode
      const info = HSCodeAnalyzer.getHSCodeInfo(hsCode)
      
      expect(info).toBeDefined()
      expect(info?.code).toBe(hsCode)
      expect(info?.description).toContain('推测')
      expect(info?.notes).toContain('章节号推测')
    })

    test('应该处理完全未知的HSCode', () => {
      const hsCode = '9999999999'
      const info = HSCodeAnalyzer.getHSCodeInfo(hsCode)
      
      expect(info).toBeNull()
    })
  })

  describe('分类税率', () => {
    test('应该能够获取各分类的默认税率', () => {
      const categories = ['electronics', 'clothing', 'accessories', 'home', 'beauty', 'sports', 'toys', 'books']
      
      categories.forEach(category => {
        const rate = HSCodeAnalyzer.getCategoryDutyRate(category)
        expect(rate).toBeGreaterThanOrEqual(0)
        expect(rate).toBeLessThanOrEqual(1)
      })
    })

    test('应该为未知分类返回默认税率', () => {
      const rate = HSCodeAnalyzer.getCategoryDutyRate('unknown-category')
      expect(rate).toBe(0.05) // 默认5%
    })
  })

  describe('HSCode搜索', () => {
    test('应该能够搜索相关HSCode', () => {
      const results = HSCodeAnalyzer.searchHSCodes('手机')
      
      expect(results.length).toBeGreaterThan(0)
      results.forEach(hsCode => {
        expect(
          hsCode.description.toLowerCase().includes('手机') ||
          hsCode.category.toLowerCase().includes('electronics')
        ).toBe(true)
      })
    })

    test('应该能够按分类搜索', () => {
      const results = HSCodeAnalyzer.searchHSCodes('electronics')
      
      expect(results.length).toBeGreaterThan(0)
      results.forEach(hsCode => {
        expect(hsCode.category).toBe('electronics')
      })
    })

    test('应该处理无结果的搜索', () => {
      const results = HSCodeAnalyzer.searchHSCodes('不存在的商品分类')
      expect(results).toHaveLength(0)
    })
  })

  describe('章节HSCode', () => {
    test('应该能够获取指定章节的所有HSCode', () => {
      const chapter = '85' // 电子设备章节
      const results = HSCodeAnalyzer.getHSCodesByChapter(chapter)
      
      expect(results.length).toBeGreaterThan(0)
      results.forEach(hsCode => {
        expect(hsCode.chapter).toBe(chapter)
      })
    })

    test('应该处理不存在的章节', () => {
      const results = HSCodeAnalyzer.getHSCodesByChapter('99')
      expect(results).toHaveLength(0)
    })
  })
})

describe('HSCode数据库', () => {
  test('HSCode数据库应该包含有效数据', () => {
    expect(Object.keys(HSCODE_DATABASE).length).toBeGreaterThan(0)
    
    Object.values(HSCODE_DATABASE).forEach(hsCode => {
      expect(hsCode.code).toMatch(/^\d{6,10}$/)
      expect(hsCode.description).toBeTruthy()
      expect(hsCode.category).toBeTruthy()
      expect(hsCode.chapter).toBeTruthy()
      expect(hsCode.dutyRate).toBeGreaterThanOrEqual(0)
      expect(hsCode.dutyRate).toBeLessThanOrEqual(1)
    })
  })

  test('商品分类数据应该包含有效数据', () => {
    expect(PRODUCT_CATEGORIES.length).toBeGreaterThan(0)
    
    PRODUCT_CATEGORIES.forEach(category => {
      expect(category.id).toBeTruthy()
      expect(category.name).toBeTruthy()
      expect(category.hsCodeRanges).toBeInstanceOf(Array)
      expect(category.hsCodeRanges.length).toBeGreaterThan(0)
      expect(category.defaultDutyRate).toBeGreaterThanOrEqual(0)
      expect(category.defaultDutyRate).toBeLessThanOrEqual(1)
      expect(category.keywords).toBeInstanceOf(Array)
      expect(category.keywords.length).toBeGreaterThan(0)
      expect(category.level).toBeGreaterThan(0)
    })
  })

  test('分类ID应该是唯一的', () => {
    const ids = PRODUCT_CATEGORIES.map(cat => cat.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})