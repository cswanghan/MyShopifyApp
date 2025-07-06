/**
 * DTax-Bridge HSCode 商品分类识别系统
 * 
 * 功能：
 * - 根据商品名称和描述自动识别HSCode
 * - 支持模糊匹配和机器学习优化
 * - 集成常见电商商品分类数据库
 * - 提供分类置信度评分
 */

export interface HSCodeClassification {
  /** HSCode编码 */
  hsCode: string
  
  /** 商品分类描述 */
  description: string
  
  /** 匹配置信度 (0-1) */
  confidence: number
  
  /** 适用的税率信息 */
  taxInfo?: {
    dutyRate?: number
    vatRate?: number
    restrictedCountries?: string[]
  }
  
  /** 匹配来源 */
  source: 'EXACT_MATCH' | 'FUZZY_MATCH' | 'CATEGORY_MATCH' | 'ML_PREDICTION'
  
  /** 相关关键词 */
  matchedKeywords?: string[]
}

export interface ProductInfo {
  /** 商品名称 */
  name: string
  
  /** 商品描述 */
  description?: string
  
  /** 商品类别 */
  category?: string
  
  /** 品牌 */
  brand?: string
  
  /** 材质 */
  material?: string
  
  /** 用途 */
  usage?: string
}

export class HSCodeClassifier {
  private readonly hsCodeDatabase: Map<string, HSCodeClassification> = new Map()
  private readonly keywordIndex: Map<string, string[]> = new Map()
  private readonly categoryMappings: Map<string, string> = new Map()

  constructor() {
    this.initializeDatabase()
    this.buildKeywordIndex()
    this.initializeCategoryMappings()
  }

  /**
   * 分类商品HSCode
   */
  async classifyProduct(product: ProductInfo): Promise<HSCodeClassification[]> {
    const classifications: HSCodeClassification[] = []

    // 1. 精确匹配
    const exactMatch = this.findExactMatch(product)
    if (exactMatch) {
      classifications.push(exactMatch)
    }

    // 2. 模糊匹配
    const fuzzyMatches = this.findFuzzyMatches(product)
    classifications.push(...fuzzyMatches)

    // 3. 类别匹配
    const categoryMatch = this.findCategoryMatch(product)
    if (categoryMatch) {
      classifications.push(categoryMatch)
    }

    // 4. 机器学习预测 (简化版)
    const mlPrediction = this.predictUsingML(product)
    if (mlPrediction) {
      classifications.push(mlPrediction)
    }

    // 排序并去重
    return this.rankAndDeduplicateResults(classifications)
  }

  /**
   * 获取推荐HSCode
   */
  async getRecommendedHSCode(product: ProductInfo): Promise<HSCodeClassification | null> {
    const classifications = await this.classifyProduct(product)
    return classifications.length > 0 ? classifications[0] : null
  }

  /**
   * 验证HSCode有效性
   */
  validateHSCode(hsCode: string): { isValid: boolean; message?: string } {
    // HSCode基本格式验证
    if (!/^\d{4,10}$/.test(hsCode)) {
      return {
        isValid: false,
        message: 'HSCode必须是4-10位数字'
      }
    }

    // 检查是否在数据库中
    if (this.hsCodeDatabase.has(hsCode)) {
      return { isValid: true }
    }

    // 基本结构验证
    if (hsCode.length >= 6) {
      const chapter = hsCode.substring(0, 2)
      if (this.isValidChapter(chapter)) {
        return { isValid: true }
      }
    }

    return {
      isValid: false,
      message: '无法验证的HSCode，请检查是否正确'
    }
  }

  /**
   * 初始化HSCode数据库
   */
  private initializeDatabase(): void {
    // 常见电商商品HSCode数据库
    const commonProducts = [
      // 电子产品
      { hsCode: '8517120000', description: '手机/智能手机', keywords: ['手机', '智能手机', 'phone', 'smartphone', 'mobile', 'iphone', 'android'], dutyRate: 0, vatRate: 0.19 },
      { hsCode: '8471300000', description: '便携式计算机', keywords: ['笔记本', '电脑', 'laptop', 'notebook', 'computer', 'macbook'], dutyRate: 0, vatRate: 0.19 },
      { hsCode: '8518300000', description: '耳机/耳塞', keywords: ['耳机', '耳塞', 'headphone', 'earphone', 'headset', 'airpods'], dutyRate: 0, vatRate: 0.19 },
      { hsCode: '9013200000', description: '激光器件', keywords: ['激光', 'laser', '激光笔', 'laser pointer'], dutyRate: 0.05, vatRate: 0.19 },
      
      // 服装鞋帽
      { hsCode: '6109100000', description: '棉制T恤衫', keywords: ['T恤', 't-shirt', 'tshirt', '短袖', '棉质'], dutyRate: 0.12, vatRate: 0.19 },
      { hsCode: '6203420000', description: '棉制男式长裤', keywords: ['长裤', '男裤', 'pants', 'trousers', '棉裤'], dutyRate: 0.12, vatRate: 0.19 },
      { hsCode: '6402990000', description: '其他鞋类', keywords: ['鞋子', 'shoes', '运动鞋', 'sneakers', '皮鞋'], dutyRate: 0.17, vatRate: 0.19 },
      { hsCode: '6505000000', description: '帽子', keywords: ['帽子', 'hat', 'cap', '棒球帽', '毛线帽'], dutyRate: 0.12, vatRate: 0.19 },
      
      // 家居用品
      { hsCode: '9403300000', description: '木制办公家具', keywords: ['桌子', '椅子', 'desk', 'chair', '办公家具', '木制'], dutyRate: 0, vatRate: 0.19 },
      { hsCode: '6302210000', description: '棉制床单', keywords: ['床单', 'bed sheet', '被套', '枕套', '棉质'], dutyRate: 0.12, vatRate: 0.19 },
      { hsCode: '3924100000', description: '塑料餐具', keywords: ['餐具', 'tableware', '塑料', 'plastic', '盘子', '碗'], dutyRate: 0.07, vatRate: 0.19 },
      
      // 美妆护理
      { hsCode: '3304200000', description: '眼部化妆品', keywords: ['眼影', '睫毛膏', 'eyeshadow', 'mascara', '眼线', '眼妆'], dutyRate: 0, vatRate: 0.19 },
      { hsCode: '3401110000', description: '香皂', keywords: ['香皂', 'soap', '肥皂', '洗手液'], dutyRate: 0, vatRate: 0.19 },
      { hsCode: '3305100000', description: '洗发水', keywords: ['洗发水', 'shampoo', '护发', '洗发'], dutyRate: 0, vatRate: 0.19 },
      
      // 玩具运动
      { hsCode: '9503008900', description: '其他玩具', keywords: ['玩具', 'toy', '儿童玩具', '益智玩具'], dutyRate: 0, vatRate: 0.19 },
      { hsCode: '9506910000', description: '体育锻炼器械', keywords: ['健身器材', 'fitness', '运动器材', '哑铃', '跑步机'], dutyRate: 0, vatRate: 0.19 },
      
      // 书籍文具
      { hsCode: '4901990000', description: '其他书籍', keywords: ['书籍', 'book', '图书', '小说', '教材'], dutyRate: 0, vatRate: 0.07 },
      { hsCode: '9608100000', description: '圆珠笔', keywords: ['圆珠笔', 'pen', '笔', '签字笔', 'ballpoint'], dutyRate: 0, vatRate: 0.19 },
      
      // 食品饮料
      { hsCode: '1704900000', description: '其他糖果', keywords: ['糖果', 'candy', '巧克力', 'chocolate', '甜食'], dutyRate: 0.17, vatRate: 0.07 },
      { hsCode: '2101110000', description: '咖啡浓缩精汁', keywords: ['咖啡', 'coffee', '速溶咖啡', '咖啡粉'], dutyRate: 0.05, vatRate: 0.07 },
      
      // 珠宝配饰
      { hsCode: '7113191000', description: '银制首饰', keywords: ['银饰', 'silver jewelry', '银手镯', '银项链'], dutyRate: 0.025, vatRate: 0.19 },
      { hsCode: '7117190000', description: '贱金属制仿首饰', keywords: ['饰品', 'jewelry', '项链', 'necklace', '手链'], dutyRate: 0.04, vatRate: 0.19 },
    ]

    commonProducts.forEach(product => {
      this.hsCodeDatabase.set(product.hsCode, {
        hsCode: product.hsCode,
        description: product.description,
        confidence: 1.0,
        source: 'EXACT_MATCH',
        taxInfo: {
          dutyRate: product.dutyRate,
          vatRate: product.vatRate
        }
      })

      // 建立关键词索引
      product.keywords.forEach(keyword => {
        if (!this.keywordIndex.has(keyword.toLowerCase())) {
          this.keywordIndex.set(keyword.toLowerCase(), [])
        }
        this.keywordIndex.get(keyword.toLowerCase())!.push(product.hsCode)
      })
    })
  }

  /**
   * 建立关键词索引
   */
  private buildKeywordIndex(): void {
    // 关键词索引已在初始化数据库时建立
  }

  /**
   * 初始化类别映射
   */
  private initializeCategoryMappings(): void {
    const categoryMap = {
      // 电子产品类别
      'electronics': '8517120000',
      'mobile_phones': '8517120000',
      'computers': '8471300000',
      'audio': '8518300000',
      
      // 服装类别
      'clothing': '6109100000',
      'apparel': '6109100000',
      'shoes': '6402990000',
      'footwear': '6402990000',
      'accessories': '6505000000',
      
      // 家居类别
      'home_garden': '9403300000',
      'furniture': '9403300000',
      'kitchen': '3924100000',
      'bedding': '6302210000',
      
      // 美容类别
      'beauty': '3304200000',
      'cosmetics': '3304200000',
      'personal_care': '3401110000',
      
      // 运动玩具
      'toys': '9503008900',
      'sports': '9506910000',
      'fitness': '9506910000',
      
      // 其他
      'books': '4901990000',
      'stationery': '9608100000',
      'food': '1704900000',
      'jewelry': '7117190000'
    }

    Object.entries(categoryMap).forEach(([category, hsCode]) => {
      this.categoryMappings.set(category.toLowerCase(), hsCode)
    })
  }

  /**
   * 精确匹配
   */
  private findExactMatch(product: ProductInfo): HSCodeClassification | null {
    const searchText = `${product.name} ${product.description || ''}`.toLowerCase()

    for (const [keyword, hsCodes] of this.keywordIndex.entries()) {
      if (searchText.includes(keyword)) {
        const hsCode = hsCodes[0] // 取第一个匹配的HSCode
        const classification = this.hsCodeDatabase.get(hsCode)
        if (classification) {
          return {
            ...classification,
            confidence: 0.95,
            source: 'EXACT_MATCH',
            matchedKeywords: [keyword]
          }
        }
      }
    }

    return null
  }

  /**
   * 模糊匹配
   */
  private findFuzzyMatches(product: ProductInfo): HSCodeClassification[] {
    const matches: HSCodeClassification[] = []
    const searchText = `${product.name} ${product.description || ''}`.toLowerCase()
    const words = searchText.split(/\s+/)

    for (const [keyword, hsCodes] of this.keywordIndex.entries()) {
      for (const word of words) {
        const similarity = this.calculateStringSimilarity(word, keyword)
        if (similarity > 0.7) { // 70%相似度阈值
          const hsCode = hsCodes[0]
          const classification = this.hsCodeDatabase.get(hsCode)
          if (classification) {
            matches.push({
              ...classification,
              confidence: similarity * 0.8, // 模糊匹配置信度降低
              source: 'FUZZY_MATCH',
              matchedKeywords: [keyword]
            })
          }
        }
      }
    }

    return matches
  }

  /**
   * 类别匹配
   */
  private findCategoryMatch(product: ProductInfo): HSCodeClassification | null {
    if (!product.category) return null

    const category = product.category.toLowerCase()
    const hsCode = this.categoryMappings.get(category)
    
    if (hsCode) {
      const classification = this.hsCodeDatabase.get(hsCode)
      if (classification) {
        return {
          ...classification,
          confidence: 0.6,
          source: 'CATEGORY_MATCH'
        }
      }
    }

    return null
  }

  /**
   * 机器学习预测 (简化版)
   */
  private predictUsingML(product: ProductInfo): HSCodeClassification | null {
    // 简化的ML预测逻辑
    const features = this.extractFeatures(product)
    const prediction = this.simpleMLModel(features)
    
    if (prediction.confidence > 0.5) {
      const classification = this.hsCodeDatabase.get(prediction.hsCode)
      if (classification) {
        return {
          ...classification,
          confidence: prediction.confidence,
          source: 'ML_PREDICTION'
        }
      }
    }

    return null
  }

  /**
   * 提取商品特征
   */
  private extractFeatures(product: ProductInfo): number[] {
    const features: number[] = []
    const text = `${product.name} ${product.description || ''}`.toLowerCase()

    // 特征1: 文本长度
    features.push(text.length / 100)

    // 特征2: 电子产品关键词密度
    const electronicKeywords = ['phone', 'computer', 'electronic', '手机', '电脑']
    features.push(this.calculateKeywordDensity(text, electronicKeywords))

    // 特征3: 服装关键词密度
    const clothingKeywords = ['shirt', 'pants', 'shoes', '衣服', '鞋子']
    features.push(this.calculateKeywordDensity(text, clothingKeywords))

    // 特征4: 家居关键词密度
    const homeKeywords = ['home', 'furniture', 'kitchen', '家具', '厨房']
    features.push(this.calculateKeywordDensity(text, homeKeywords))

    return features
  }

  /**
   * 简化的ML模型
   */
  private simpleMLModel(features: number[]): { hsCode: string; confidence: number } {
    // 简化的决策树逻辑
    if (features[1] > 0.3) { // 电子产品特征强
      return { hsCode: '8517120000', confidence: 0.8 }
    } else if (features[2] > 0.3) { // 服装特征强
      return { hsCode: '6109100000', confidence: 0.75 }
    } else if (features[3] > 0.3) { // 家居特征强
      return { hsCode: '9403300000', confidence: 0.7 }
    }

    return { hsCode: '9999999999', confidence: 0.3 } // 默认分类
  }

  /**
   * 计算关键词密度
   */
  private calculateKeywordDensity(text: string, keywords: string[]): number {
    const words = text.split(/\s+/)
    const matches = words.filter(word => 
      keywords.some(keyword => word.includes(keyword) || keyword.includes(word))
    )
    return matches.length / words.length
  }

  /**
   * 计算字符串相似度
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    // 使用Levenshtein距离计算相似度
    const matrix: number[][] = []
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    const distance = matrix[len2][len1]
    const maxLen = Math.max(len1, len2)
    return (maxLen - distance) / maxLen
  }

  /**
   * 排序和去重结果
   */
  private rankAndDeduplicateResults(classifications: HSCodeClassification[]): HSCodeClassification[] {
    // 去重
    const uniqueMap = new Map<string, HSCodeClassification>()
    classifications.forEach(classification => {
      const existing = uniqueMap.get(classification.hsCode)
      if (!existing || classification.confidence > existing.confidence) {
        uniqueMap.set(classification.hsCode, classification)
      }
    })

    // 按置信度排序
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // 最多返回5个结果
  }

  /**
   * 验证章节代码
   */
  private isValidChapter(chapter: string): boolean {
    const validChapters = [
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
      '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
      '41', '42', '43', '44', '45', '46', '47', '48', '49', '50',
      '51', '52', '53', '54', '55', '56', '57', '58', '59', '60',
      '61', '62', '63', '64', '65', '66', '67', '68', '69', '70',
      '71', '72', '73', '74', '75', '76', '78', '79', '80', '81',
      '82', '83', '84', '85', '86', '87', '88', '89', '90', '91',
      '92', '93', '94', '95', '96', '97'
    ]
    return validChapters.includes(chapter)
  }

  /**
   * 添加自定义HSCode映射
   */
  addCustomMapping(product: ProductInfo, hsCode: string): void {
    const validation = this.validateHSCode(hsCode)
    if (!validation.isValid) {
      throw new Error(`Invalid HSCode: ${validation.message}`)
    }

    // 添加到数据库
    this.hsCodeDatabase.set(hsCode, {
      hsCode,
      description: `Custom: ${product.name}`,
      confidence: 1.0,
      source: 'EXACT_MATCH'
    })

    // 更新关键词索引
    const keywords = product.name.toLowerCase().split(/\s+/)
    keywords.forEach(keyword => {
      if (!this.keywordIndex.has(keyword)) {
        this.keywordIndex.set(keyword, [])
      }
      this.keywordIndex.get(keyword)!.push(hsCode)
    })
  }

  /**
   * 获取分类统计信息
   */
  getClassificationStats(): { totalHSCodes: number; totalKeywords: number; categories: number } {
    return {
      totalHSCodes: this.hsCodeDatabase.size,
      totalKeywords: this.keywordIndex.size,
      categories: this.categoryMappings.size
    }
  }
}