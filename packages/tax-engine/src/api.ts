import { TaxCalculator } from './calculator'
import { HSCodeAnalyzer } from './hscode'
import { 
  ExtendedTaxCalculation, 
  BatchCalculationRequest, 
  TaxCalculationError,
  TaxCalculationConfig 
} from './types'
import { Product, Country, ApiResponse } from '@dtax-bridge/shared'

/**
 * 税费计算API类
 * 提供HTTP接口封装和错误处理
 */
export class TaxCalculationAPI {
  
  /**
   * 计算单个商品税费
   */
  static async calculateSingle(
    product: Product, 
    country: Country
  ): Promise<ApiResponse<ExtendedTaxCalculation>> {
    try {
      const result = await TaxCalculator.calculateExtendedTax(product, country)
      
      return {
        success: true,
        data: result,
        message: '税费计算成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 批量计算商品税费
   */
  static async calculateBatch(
    request: BatchCalculationRequest
  ): Promise<ApiResponse<ExtendedTaxCalculation[]>> {
    try {
      const results = await TaxCalculator.calculateBatchTax(request)
      
      const successCount = results.filter(r => r.confidence > 0).length
      const totalCount = results.length
      
      return {
        success: true,
        data: results,
        message: `批量计算完成：${successCount}/${totalCount} 成功`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 分析商品HSCode
   */
  static analyzeHSCode(title: string): ApiResponse<{
    suggestedHSCode?: string
    category?: string
    confidence: number
    matchedKeywords: string[]
  }> {
    try {
      const result = HSCodeAnalyzer.analyzeProductTitle(title)
      
      return {
        success: true,
        data: result,
        message: 'HSCode分析完成'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 搜索HSCode
   */
  static searchHSCodes(query: string): ApiResponse<any[]> {
    try {
      const results = HSCodeAnalyzer.searchHSCodes(query)
      
      return {
        success: true,
        data: results,
        message: `找到 ${results.length} 个相关HSCode`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 验证HSCode格式
   */
  static validateHSCode(hsCode: string): ApiResponse<{ valid: boolean; info?: any }> {
    try {
      const valid = HSCodeAnalyzer.validateHSCode(hsCode)
      const info = valid ? HSCodeAnalyzer.getHSCodeInfo(hsCode) : null
      
      return {
        success: true,
        data: { valid, info },
        message: valid ? 'HSCode格式有效' : 'HSCode格式无效'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 获取支持的国家列表
   */
  static getSupportedCountries(): ApiResponse<{ countries: Country[]; total: number }> {
    try {
      const countries: Country[] = [
        'US', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'CZ', 'DK', 'FI', 'SE'
      ]
      
      return {
        success: true,
        data: { countries, total: countries.length },
        message: `支持 ${countries.length} 个国家`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 获取商品分类列表
   */
  static getProductCategories(): ApiResponse<any[]> {
    try {
      const categories = [
        { id: 'electronics', name: '电子产品', defaultDutyRate: 0.06 },
        { id: 'clothing', name: '服装', defaultDutyRate: 0.16 },
        { id: 'accessories', name: '配饰', defaultDutyRate: 0.08 },
        { id: 'home', name: '家居用品', defaultDutyRate: 0.04 },
        { id: 'beauty', name: '美妆', defaultDutyRate: 0.02 },
        { id: 'sports', name: '运动用品', defaultDutyRate: 0.12 },
        { id: 'toys', name: '玩具', defaultDutyRate: 0.00 },
        { id: 'books', name: '书籍', defaultDutyRate: 0.00 }
      ]
      
      return {
        success: true,
        data: categories,
        message: `获取到 ${categories.length} 个商品分类`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 获取国家税率信息
   */
  static async getCountryTaxRates(country: Country): Promise<ApiResponse<{
    country: Country
    vatRate: number
    dutyFreeThreshold: number
    vatFreeThreshold: number
    specialRules?: string[]
  }>> {
    try {
      // 从常量中获取税率信息
      const { VAT_RATES, TAX_THRESHOLDS } = await import('@dtax-bridge/shared')
      
      const vatRate = VAT_RATES[country] || 0
      const thresholds = TAX_THRESHOLDS[country] || { dutyFree: 0, vatFree: 0 }
      
      const specialRules: string[] = []
      if (country === 'US') {
        specialRules.push('适用Section 321免税政策，800美元以下免征关税')
      }
      if (country === 'UK') {
        specialRules.push('脱欧后独立税率政策')
      }
      
      return {
        success: true,
        data: {
          country,
          vatRate,
          dutyFreeThreshold: thresholds.dutyFree,
          vatFreeThreshold: thresholds.vatFree,
          specialRules: specialRules.length > 0 ? specialRules : undefined
        },
        message: `获取 ${country} 税率信息成功`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 设置计算配置
   */
  static setCalculationConfig(config: Partial<TaxCalculationConfig>): ApiResponse<{ updated: boolean }> {
    try {
      TaxCalculator.setConfig(config)
      
      return {
        success: true,
        data: { updated: true },
        message: '计算配置更新成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 获取服务统计信息
   */
  static async getServiceStats(): Promise<ApiResponse<{
    cacheStats: { size: number; countries: Country[] }
    serviceValidation: Record<string, boolean>
    timestamp: string
  }>> {
    try {
      const stats = await TaxCalculator.getServiceStats()
      
      // 转换Map为普通对象以便序列化
      const serviceValidation: Record<string, boolean> = {}
      stats.serviceValidation.forEach((value, key) => {
        serviceValidation[key] = value
      })
      
      return {
        success: true,
        data: {
          cacheStats: stats.cacheStats,
          serviceValidation,
          timestamp: new Date().toISOString()
        },
        message: '获取服务统计信息成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 清除缓存
   */
  static clearCache(): ApiResponse<{ cleared: boolean }> {
    try {
      TaxCalculator.clearCache()
      
      return {
        success: true,
        data: { cleared: true },
        message: '缓存清除成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 更新税率数据
   */
  static async updateTaxRates(): Promise<ApiResponse<{ updated: boolean }>> {
    try {
      await TaxCalculator.updateTaxRates()
      
      return {
        success: true,
        data: { updated: true },
        message: '税率数据更新成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 健康检查
   */
  static async healthCheck(): Promise<ApiResponse<{
    status: 'healthy' | 'unhealthy'
    timestamp: string
    services: Record<string, boolean>
  }>> {
    try {
      const stats = await TaxCalculator.getServiceStats()
      
      const services: Record<string, boolean> = {}
      stats.serviceValidation.forEach((value, key) => {
        services[key] = value
      })
      
      const allHealthy = Array.from(stats.serviceValidation.values()).every(v => v)
      
      return {
        success: true,
        data: {
          status: allHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          services
        },
        message: allHealthy ? '所有服务运行正常' : '部分服务异常'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * 错误处理
   */
  private static handleError(error: any): ApiResponse {
    console.error('Tax Calculation API Error:', error)
    
    if (error instanceof TaxCalculationError) {
      return {
        success: false,
        error: error.code,
        message: error.message
      }
    }
    
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: error?.message || '未知错误'
    }
  }
}

/**
 * Express路由处理器工厂
 */
export class TaxCalculationRoutes {
  
  /**
   * 创建Express路由处理器
   */
  static createRoutes() {
    return {
      // POST /api/tax/calculate
      calculateSingle: async (req: any, res: any) => {
        const { product, country } = req.body
        const result = await TaxCalculationAPI.calculateSingle(product, country)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // POST /api/tax/calculate/batch
      calculateBatch: async (req: any, res: any) => {
        const request = req.body
        const result = await TaxCalculationAPI.calculateBatch(request)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // POST /api/tax/analyze-hscode
      analyzeHSCode: async (req: any, res: any) => {
        const { title } = req.body
        const result = TaxCalculationAPI.analyzeHSCode(title)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // GET /api/tax/search-hscode?q=query
      searchHSCodes: async (req: any, res: any) => {
        const { q } = req.query
        const result = TaxCalculationAPI.searchHSCodes(q)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // POST /api/tax/validate-hscode
      validateHSCode: async (req: any, res: any) => {
        const { hsCode } = req.body
        const result = TaxCalculationAPI.validateHSCode(hsCode)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // GET /api/tax/countries
      getSupportedCountries: async (req: any, res: any) => {
        const result = TaxCalculationAPI.getSupportedCountries()
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // GET /api/tax/categories
      getProductCategories: async (req: any, res: any) => {
        const result = TaxCalculationAPI.getProductCategories()
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // GET /api/tax/rates/:country
      getCountryTaxRates: async (req: any, res: any) => {
        const { country } = req.params
        const result = await TaxCalculationAPI.getCountryTaxRates(country)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // PUT /api/tax/config
      setCalculationConfig: async (req: any, res: any) => {
        const config = req.body
        const result = TaxCalculationAPI.setCalculationConfig(config)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // GET /api/tax/stats
      getServiceStats: async (req: any, res: any) => {
        const result = await TaxCalculationAPI.getServiceStats()
        res.status(result.success ? 200 : 500).json(result)
      },
      
      // DELETE /api/tax/cache
      clearCache: async (req: any, res: any) => {
        const result = TaxCalculationAPI.clearCache()
        res.status(result.success ? 200 : 500).json(result)
      },
      
      // POST /api/tax/update-rates
      updateTaxRates: async (req: any, res: any) => {
        const result = await TaxCalculationAPI.updateTaxRates()
        res.status(result.success ? 200 : 500).json(result)
      },
      
      // GET /api/tax/health
      healthCheck: async (req: any, res: any) => {
        const result = await TaxCalculationAPI.healthCheck()
        res.status(result.success ? 200 : 500).json(result)
      }
    }
  }
}