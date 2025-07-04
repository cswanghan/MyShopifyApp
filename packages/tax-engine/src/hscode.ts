import { HSCode, ProductCategory } from './types'

/**
 * HSCode 数据库 - 常用商品的 HSCode 映射
 */
export const HSCODE_DATABASE: Record<string, HSCode> = {
  // 电子产品
  '8517': {
    code: '8517120000',
    description: '手机和智能手机',
    category: 'electronics',
    chapter: '85',
    dutyRate: 0.06
  },
  '8471': {
    code: '8471300000',
    description: '便携式电脑',
    category: 'electronics',
    chapter: '84',
    dutyRate: 0.06
  },
  '8528': {
    code: '8528720000',
    description: '液晶显示器',
    category: 'electronics',
    chapter: '85',
    dutyRate: 0.06
  },
  '8518': {
    code: '8518300000',
    description: '耳机和头戴式耳机',
    category: 'electronics',
    chapter: '85',
    dutyRate: 0.06
  },
  
  // 服装
  '6109': {
    code: '6109100000',
    description: '针织T恤',
    category: 'clothing',
    chapter: '61',
    dutyRate: 0.16
  },
  '6203': {
    code: '6203420000',
    description: '男式牛仔裤',
    category: 'clothing',
    chapter: '62',
    dutyRate: 0.16
  },
  '6204': {
    code: '6204620000',
    description: '女式裤子',
    category: 'clothing',
    chapter: '62',
    dutyRate: 0.16
  },
  '6110': {
    code: '6110200000',
    description: '针织毛衣',
    category: 'clothing',
    chapter: '61',
    dutyRate: 0.16
  },
  
  // 配饰
  '4202': {
    code: '4202220000',
    description: '手提包',
    category: 'accessories',
    chapter: '42',
    dutyRate: 0.08
  },
  '9102': {
    code: '9102190000',
    description: '手表',
    category: 'accessories',
    chapter: '91',
    dutyRate: 0.08
  },
  '7113': {
    code: '7113110000',
    description: '银首饰',
    category: 'accessories',
    chapter: '71',
    dutyRate: 0.08
  },
  
  // 家居用品
  '6302': {
    code: '6302220000',
    description: '床上用品',
    category: 'home',
    chapter: '63',
    dutyRate: 0.04
  },
  '6911': {
    code: '6911100000',
    description: '瓷器餐具',
    category: 'home',
    chapter: '69',
    dutyRate: 0.04
  },
  '9403': {
    code: '9403600000',
    description: '木制家具',
    category: 'home',
    chapter: '94',
    dutyRate: 0.04
  },
  
  // 美妆
  '3304': {
    code: '3304990000',
    description: '化妆品',
    category: 'beauty',
    chapter: '33',
    dutyRate: 0.02
  },
  '3305': {
    code: '3305900000',
    description: '护发产品',
    category: 'beauty',
    chapter: '33',
    dutyRate: 0.02
  },
  '3307': {
    code: '3307900000',
    description: '香水',
    category: 'beauty',
    chapter: '33',
    dutyRate: 0.02
  },
  
  // 运动用品
  '6403': {
    code: '6403910000',
    description: '运动鞋',
    category: 'sports',
    chapter: '64',
    dutyRate: 0.12
  },
  '9506': {
    code: '9506620000',
    description: '健身器材',
    category: 'sports',
    chapter: '95',
    dutyRate: 0.12
  },
  '6211': {
    code: '6211430000',
    description: '运动服装',
    category: 'sports',
    chapter: '62',
    dutyRate: 0.12
  },
  
  // 玩具
  '9503': {
    code: '9503000000',
    description: '玩具',
    category: 'toys',
    chapter: '95',
    dutyRate: 0.00
  },
  '9504': {
    code: '9504500000',
    description: '游戏机',
    category: 'toys',
    chapter: '95',
    dutyRate: 0.00
  },
  
  // 书籍
  '4901': {
    code: '4901990000',
    description: '图书',
    category: 'books',
    chapter: '49',
    dutyRate: 0.00
  }
}

/**
 * 商品分类数据库
 */
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'electronics',
    name: '电子产品',
    hsCodeRanges: ['8471-8548', '9013-9033'],
    defaultDutyRate: 0.06,
    keywords: ['手机', '电脑', '耳机', '平板', '相机', '电视', '显示器', '音响', '充电器'],
    level: 1
  },
  {
    id: 'clothing',
    name: '服装',
    hsCodeRanges: ['6101-6117', '6201-6217'],
    defaultDutyRate: 0.16,
    keywords: ['T恤', '衬衫', '裤子', '裙子', '外套', '毛衣', '内衣', '袜子', '牛仔裤'],
    level: 1
  },
  {
    id: 'accessories',
    name: '配饰',
    hsCodeRanges: ['4202-4206', '7113-7118', '9101-9102'],
    defaultDutyRate: 0.08,
    keywords: ['包包', '手表', '首饰', '眼镜', '帽子', '围巾', '皮带', '钱包'],
    level: 1
  },
  {
    id: 'home',
    name: '家居用品',
    hsCodeRanges: ['6302-6310', '6911-6914', '9403-9406'],
    defaultDutyRate: 0.04,
    keywords: ['床上用品', '餐具', '家具', '装饰品', '厨具', '灯具', '收纳', '清洁用品'],
    level: 1
  },
  {
    id: 'beauty',
    name: '美妆',
    hsCodeRanges: ['3304-3307', '3401-3407'],
    defaultDutyRate: 0.02,
    keywords: ['化妆品', '护肤品', '香水', '洗发水', '沐浴露', '面膜', '口红', '粉底'],
    level: 1
  },
  {
    id: 'sports',
    name: '运动用品',
    hsCodeRanges: ['6403-6405', '9506-9507'],
    defaultDutyRate: 0.12,
    keywords: ['运动鞋', '健身器材', '运动服', '球类', '户外用品', '瑜伽用品'],
    level: 1
  },
  {
    id: 'toys',
    name: '玩具',
    hsCodeRanges: ['9503-9505'],
    defaultDutyRate: 0.00,
    keywords: ['玩具', '游戏', '积木', '娃娃', '模型', '益智玩具', '电子游戏'],
    level: 1
  },
  {
    id: 'books',
    name: '书籍',
    hsCodeRanges: ['4901-4906'],
    defaultDutyRate: 0.00,
    keywords: ['图书', '书籍', '杂志', '教材', '小说', '工具书', '电子书'],
    level: 1
  }
]

/**
 * HSCode 分析器
 */
export class HSCodeAnalyzer {
  
  /**
   * 根据产品标题自动识别 HSCode
   */
  static analyzeProductTitle(title: string): {
    suggestedHSCode?: string
    category?: string
    confidence: number
    matchedKeywords: string[]
  } {
    const normalizedTitle = title.toLowerCase()
    let bestMatch: { category: string; confidence: number; keywords: string[] } | null = null
    
    // 遍历所有分类，计算匹配度
    for (const category of PRODUCT_CATEGORIES) {
      const matchedKeywords = category.keywords.filter(keyword => 
        normalizedTitle.includes(keyword.toLowerCase())
      )
      
      if (matchedKeywords.length > 0) {
        const confidence = matchedKeywords.length / category.keywords.length
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            category: category.id,
            confidence,
            keywords: matchedKeywords
          }
        }
      }
    }
    
    if (!bestMatch) {
      return { confidence: 0, matchedKeywords: [] }
    }
    
    // 查找该分类下最匹配的 HSCode
    const categoryHSCodes = Object.entries(HSCODE_DATABASE)
      .filter(([_, hscode]) => hscode.category === bestMatch.category)
    
    let suggestedHSCode: string | undefined
    if (categoryHSCodes.length > 0) {
      // 简单选择第一个匹配的 HSCode
      suggestedHSCode = categoryHSCodes[0][1].code
    }
    
    return {
      suggestedHSCode,
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      matchedKeywords: bestMatch.keywords
    }
  }
  
  /**
   * 验证 HSCode 格式
   */
  static validateHSCode(hsCode: string): boolean {
    return /^\d{6,10}$/.test(hsCode)
  }
  
  /**
   * 获取 HSCode 信息
   */
  static getHSCodeInfo(hsCode: string): HSCode | null {
    // 尝试完全匹配
    const exactMatch = Object.values(HSCODE_DATABASE).find(
      item => item.code === hsCode
    )
    if (exactMatch) return exactMatch
    
    // 尝试前缀匹配（6位章节号）
    const chapterCode = hsCode.substring(0, 4)
    const chapterMatch = Object.values(HSCODE_DATABASE).find(
      item => item.code.startsWith(chapterCode)
    )
    if (chapterMatch) {
      return {
        ...chapterMatch,
        code: hsCode,
        description: `${chapterMatch.description} (推测)`,
        notes: '基于章节号推测的分类'
      }
    }
    
    return null
  }
  
  /**
   * 获取分类的默认税率
   */
  static getCategoryDutyRate(category: string): number {
    const categoryData = PRODUCT_CATEGORIES.find(cat => cat.id === category)
    return categoryData?.defaultDutyRate ?? 0.05 // 默认5%
  }
  
  /**
   * 搜索相关的 HSCode
   */
  static searchHSCodes(query: string): HSCode[] {
    const normalizedQuery = query.toLowerCase()
    return Object.values(HSCODE_DATABASE).filter(hsCode => 
      hsCode.description.toLowerCase().includes(normalizedQuery) ||
      hsCode.category.toLowerCase().includes(normalizedQuery)
    )
  }
  
  /**
   * 根据章节号获取 HSCode 范围
   */
  static getHSCodesByChapter(chapter: string): HSCode[] {
    return Object.values(HSCODE_DATABASE).filter(hsCode => 
      hsCode.chapter === chapter
    )
  }
}