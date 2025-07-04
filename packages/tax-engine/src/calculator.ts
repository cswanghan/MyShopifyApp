import { Product, Country, TaxCalculation, VAT_RATES, TAX_THRESHOLDS, DEFAULT_DUTY_RATES } from '@dtax-bridge/shared'
import { convertCurrency, isEUCountry, generateId } from '@dtax-bridge/shared'
import { ExtendedTaxCalculation, TaxCalculationDetail, TaxCalculationConfig, BatchCalculationRequest, TaxCalculationError } from './types'
import { HSCodeAnalyzer } from './hscode'
import { TaxRateServiceManager } from './services'

export class TaxCalculator {
  private static rateManager = new TaxRateServiceManager()
  private static config: TaxCalculationConfig = {
    baseCurrency: 'USD',
    exchangeRates: { USD: 1, EUR: 0.85, GBP: 0.75, CNY: 7.2 },
    rounding: { decimals: 2, method: 'ROUND' },
    validation: { maxValue: 100000, minValue: 0, allowZero: true },
    caching: { enabled: true, ttl: 3600 }
  }

  /**
   * 设置计算配置
   */
  static setConfig(config: Partial<TaxCalculationConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 计算商品税费（简化版本，保持向后兼容）
   */
  static async calculateTax(product: Product, destinationCountry: Country): Promise<TaxCalculation> {
    const extended = await this.calculateExtendedTax(product, destinationCountry)
    
    return {
      product: extended.product,
      destinationCountry: extended.destinationCountry,
      duties: extended.calculation.duties,
      vat: extended.calculation.vat,
      totalTax: extended.calculation.totalTax,
      threshold: extended.thresholds,
      calculation: {
        dutyRate: extended.calculation.dutyRate,
        vatRate: extended.calculation.vatRate,
        taxableValue: extended.calculation.taxableValue
      }
    }
  }

  /**
   * 计算商品税费（详细版本）
   */
  static async calculateExtendedTax(product: Product, destinationCountry: Country): Promise<ExtendedTaxCalculation> {
    try {
      // 验证输入
      this.validateInput(product, destinationCountry)
      
      // 转换为基础货币
      const priceUSD = convertCurrency(product.price, product.currency, this.config.baseCurrency)
      
      // 分析HSCode
      let hsCode = product.hsCode
      let category = product.category
      
      if (!hsCode && product.title) {
        const analysis = HSCodeAnalyzer.analyzeProductTitle(product.title)
        hsCode = analysis.suggestedHSCode
        category = analysis.category || category
      }
      
      // 获取税率数据
      const taxRates = await this.rateManager.getTaxRates(destinationCountry, hsCode)
      const applicableRate = this.selectBestTaxRate(taxRates, hsCode, category)
      
      // 计算详细步骤
      const details: TaxCalculationDetail[] = []
      const warnings: string[] = []
      const exemptions: any[] = []
      
      // 计算关税
      const dutyCalculation = this.calculateDutiesDetailed(
        priceUSD, destinationCountry, hsCode, category, applicableRate
      )
      details.push(...dutyCalculation.details)
      exemptions.push(...dutyCalculation.exemptions)
      
      // 计算增值税
      const vatCalculation = this.calculateVATDetailed(
        priceUSD, destinationCountry, dutyCalculation.amount, applicableRate
      )
      details.push(...vatCalculation.details)
      exemptions.push(...vatCalculation.exemptions)
      
      // 汇总结果
      const totalTax = dutyCalculation.amount + vatCalculation.amount
      const totalValue = priceUSD + totalTax
      
      // 添加警告
      if (!hsCode) {
        warnings.push('未提供HSCode，使用估算税率')
      }
      if (!applicableRate) {
        warnings.push('未找到精确税率，使用默认税率')
      }
      
      return {
        id: generateId('tax-calc-'),
        timestamp: new Date(),
        product: {
          id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency,
          weight: product.weight,
          hsCode: hsCode,
          category: category
        },
        destinationCountry,
        calculation: {
          duties: this.roundAmount(dutyCalculation.amount),
          vat: this.roundAmount(vatCalculation.amount),
          totalTax: this.roundAmount(totalTax),
          totalValue: this.roundAmount(totalValue),
          taxableValue: priceUSD,
          dutyRate: applicableRate?.dutyRate || this.getDutyRate(category),
          vatRate: applicableRate?.vatRate || VAT_RATES[destinationCountry] || 0,
          exchangeRate: this.config.exchangeRates[product.currency] || 1,
          currency: this.config.baseCurrency
        },
        details,
        thresholds: applicableRate?.thresholds || TAX_THRESHOLDS[destinationCountry] || { dutyFree: 0, vatFree: 0 },
        exemptions,
        warnings,
        confidence: this.calculateConfidence(hsCode, applicableRate, category),
        source: applicableRate?.source || {
          country: destinationCountry,
          source: 'LOCAL',
          lastUpdated: new Date(),
          version: '1.0',
          reliability: 0.5
        }
      }
    } catch (error) {
      if (error instanceof TaxCalculationError) {
        throw error
      }
      
      throw new TaxCalculationError({
        code: 'CALCULATION_FAILED',
        message: `税费计算失败: ${error}`,
        timestamp: new Date(),
        productId: product.id,
        country: destinationCountry
      })
    }
  }
  
  /**
   * 详细计算关税
   */
  private static calculateDutiesDetailed(
    priceUSD: number,
    country: Country,
    hsCode?: string,
    category?: string,
    taxRate?: any
  ): { amount: number; details: TaxCalculationDetail[]; exemptions: any[] } {
    const details: TaxCalculationDetail[] = []
    const exemptions: any[] = []
    
    const thresholds = taxRate?.thresholds || TAX_THRESHOLDS[country] || { dutyFree: 0, vatFree: 0 }
    
    // 检查免税门槛
    details.push({
      step: 'duty_threshold_check',
      description: '检查关税免税门槛',
      value: thresholds.dutyFree,
      formula: `商品价值 ${priceUSD} USD vs 免税门槛 ${thresholds.dutyFree} USD`,
      variables: { price: priceUSD, threshold: thresholds.dutyFree },
      applied: priceUSD <= thresholds.dutyFree
    })
    
    if (priceUSD <= thresholds.dutyFree) {
      exemptions.push({
        type: 'DUTY_FREE',
        description: `商品价值低于 ${thresholds.dutyFree} USD 免税门槛`,
        amount: 0
      })
      return { amount: 0, details, exemptions }
    }
    
    // 美国Section 321特殊处理
    if (country === 'US' && priceUSD <= 800) {
      details.push({
        step: 'section_321_check',
        description: '美国Section 321免税检查',
        value: 800,
        formula: `商品价值 ${priceUSD} USD vs Section 321门槛 800 USD`,
        variables: { price: priceUSD, section321: 800 },
        applied: true
      })
      
      exemptions.push({
        type: 'SECTION_321',
        description: '适用美国Section 321免税政策',
        amount: 0
      })
      return { amount: 0, details, exemptions }
    }
    
    // 计算关税率
    const dutyRate = taxRate?.dutyRate || this.getDutyRate(category)
    const dutyAmount = priceUSD * dutyRate
    
    details.push({
      step: 'duty_calculation',
      description: '计算关税',
      value: dutyAmount,
      formula: `${priceUSD} USD × ${(dutyRate * 100).toFixed(2)}%`,
      variables: { price: priceUSD, rate: dutyRate, amount: dutyAmount },
      applied: true
    })
    
    return { amount: dutyAmount, details, exemptions }
  }
  
  /**
   * 详细计算增值税
   */
  private static calculateVATDetailed(
    priceUSD: number,
    country: Country,
    dutyAmount: number,
    taxRate?: any
  ): { amount: number; details: TaxCalculationDetail[]; exemptions: any[] } {
    const details: TaxCalculationDetail[] = []
    const exemptions: any[] = []
    
    // 美国没有增值税
    if (country === 'US') {
      details.push({
        step: 'vat_country_check',
        description: '美国无增值税',
        value: 0,
        formula: '美国不征收增值税',
        variables: { country: 'US' },
        applied: true
      })
      return { amount: 0, details, exemptions }
    }
    
    const thresholds = taxRate?.thresholds || TAX_THRESHOLDS[country] || { dutyFree: 0, vatFree: 0 }
    
    // 检查增值税免税门槛
    details.push({
      step: 'vat_threshold_check',
      description: '检查增值税免税门槛',
      value: thresholds.vatFree,
      formula: `商品价值 ${priceUSD} USD vs 免税门槛 ${thresholds.vatFree} USD`,
      variables: { price: priceUSD, threshold: thresholds.vatFree },
      applied: priceUSD <= thresholds.vatFree
    })
    
    if (priceUSD <= thresholds.vatFree) {
      exemptions.push({
        type: 'VAT_FREE',
        description: `商品价值低于 ${thresholds.vatFree} USD 增值税免税门槛`,
        amount: 0
      })
      return { amount: 0, details, exemptions }
    }
    
    // 计算增值税
    const vatRate = taxRate?.vatRate || VAT_RATES[country] || 0
    const taxableValue = priceUSD + dutyAmount
    const vatAmount = taxableValue * vatRate
    
    details.push({
      step: 'vat_calculation',
      description: '计算增值税',
      value: vatAmount,
      formula: `(${priceUSD} USD + ${dutyAmount} USD关税) × ${(vatRate * 100).toFixed(2)}%`,
      variables: { price: priceUSD, duty: dutyAmount, taxableValue, rate: vatRate, amount: vatAmount },
      applied: true
    })
    
    return { amount: vatAmount, details, exemptions }
  }

  /**
   * 计算关税（兼容原方法）
   */
  private static calculateDuties(
    priceUSD: number,
    country: Country,
    category?: string,
    dutyFreeThreshold?: number
  ): number {
    const result = this.calculateDutiesDetailed(priceUSD, country, undefined, category)
    return result.amount
  }
  
  /**
   * 计算增值税（兼容原方法）
   */
  private static calculateVAT(
    priceUSD: number,
    country: Country,
    vatRate: number,
    vatFreeThreshold: number
  ): number {
    const dutyAmount = this.calculateDuties(priceUSD, country, undefined, vatFreeThreshold)
    const result = this.calculateVATDetailed(priceUSD, country, dutyAmount)
    return result.amount
  }
  
  /**
   * 获取关税率
   */
  private static getDutyRate(category?: string): number {
    if (!category) return DEFAULT_DUTY_RATES.default
    return DEFAULT_DUTY_RATES[category.toLowerCase()] || DEFAULT_DUTY_RATES.default
  }
  
  /**
   * 批量计算税费
   */
  static async calculateBatchTax(
    products: Product[],
    destinationCountry: Country
  ): Promise<TaxCalculation[]> {
    const calculations = await Promise.all(
      products.map(product => this.calculateTax(product, destinationCountry))
    )
    
    return calculations
  }
  
  /**
   * 计算总税费
   */
  static calculateTotalTax(calculations: TaxCalculation[]): {
    totalDuties: number
    totalVAT: number
    totalTax: number
    totalValue: number
  } {
    const totalDuties = calculations.reduce((sum, calc) => sum + calc.duties, 0)
    const totalVAT = calculations.reduce((sum, calc) => sum + calc.vat, 0)
    const totalTax = totalDuties + totalVAT
    const totalValue = calculations.reduce((sum, calc) => sum + convertCurrency(calc.product.price, calc.product.currency, 'USD'), 0)
    
    return {
      totalDuties,
      totalVAT,
      totalTax,
      totalValue
    }
  }
  
  /**
   * 输入验证
   */
  private static validateInput(product: Product, country: Country): void {
    if (!product || !product.id) {
      throw new TaxCalculationError({
        code: 'INVALID_PRODUCT',
        message: '商品信息不完整',
        timestamp: new Date()
      })
    }
    
    if (product.price < this.config.validation.minValue || product.price > this.config.validation.maxValue) {
      throw new TaxCalculationError({
        code: 'VALIDATION_ERROR',
        message: `商品价格超出范围: ${product.price}`,
        timestamp: new Date(),
        productId: product.id
      })
    }
    
    if (!country) {
      throw new TaxCalculationError({
        code: 'INVALID_COUNTRY',
        message: '目的地国家不能为空',
        timestamp: new Date(),
        productId: product.id
      })
    }
  }
  
  /**
   * 选择最佳税率
   */
  private static selectBestTaxRate(taxRates: any[], hsCode?: string, category?: string): any | null {
    if (!taxRates || taxRates.length === 0) {
      return null
    }
    
    // 优先选择完全匹配的HSCode
    if (hsCode) {
      const exactMatch = taxRates.find(rate => rate.hsCode === hsCode)
      if (exactMatch) return exactMatch
    }
    
    // 选择可靠性最高的税率
    return taxRates.reduce((best, current) => 
      current.source.reliability > best.source.reliability ? current : best
    )
  }
  
  /**
   * 计算置信度
   */
  private static calculateConfidence(hsCode?: string, taxRate?: any, category?: string): number {
    let confidence = 0.5 // 基础置信度
    
    if (hsCode) {
      confidence += 0.2 // 有HSCode增加置信度
    }
    
    if (taxRate) {
      confidence += taxRate.source.reliability * 0.3 // 根据数据源可靠性调整
    }
    
    if (category) {
      confidence += 0.1 // 有分类信息增加置信度
    }
    
    return Math.min(confidence, 1.0)
  }
  
  /**
   * 金额四舍五入
   */
  private static roundAmount(amount: number): number {
    const factor = Math.pow(10, this.config.rounding.decimals)
    
    switch (this.config.rounding.method) {
      case 'FLOOR':
        return Math.floor(amount * factor) / factor
      case 'CEIL':
        return Math.ceil(amount * factor) / factor
      default:
        return Math.round(amount * factor) / factor
    }
  }
  
  /**
   * 批量计算税费
   */
  static async calculateBatchTax(request: BatchCalculationRequest): Promise<ExtendedTaxCalculation[]> {
    const results: ExtendedTaxCalculation[] = []
    
    for (const product of request.products) {
      try {
        const calculation = await this.calculateExtendedTax(
          {
            id: product.id,
            title: product.title,
            price: product.price,
            currency: product.currency,
            weight: product.weight,
            dimensions: { length: 0, width: 0, height: 0 }, // 默认值
            hsCode: product.hsCode,
            category: product.category,
            originCountry: 'CN'
          },
          request.destinationCountry
        )
        
        results.push(calculation)
      } catch (error) {
        // 单个商品计算失败不影响其他商品
        console.error(`商品 ${product.id} 税费计算失败:`, error)
        
        // 创建错误结果
        const errorResult: ExtendedTaxCalculation = {
          id: generateId('tax-calc-error-'),
          timestamp: new Date(),
          product: {
            id: product.id,
            title: product.title,
            price: product.price,
            currency: product.currency,
            weight: product.weight,
            hsCode: product.hsCode,
            category: product.category
          },
          destinationCountry: request.destinationCountry,
          calculation: {
            duties: 0,
            vat: 0,
            totalTax: 0,
            totalValue: product.price,
            taxableValue: product.price,
            dutyRate: 0,
            vatRate: 0,
            exchangeRate: 1,
            currency: 'USD'
          },
          details: [],
          thresholds: { dutyFree: 0, vatFree: 0 },
          exemptions: [],
          warnings: ['税费计算失败'],
          confidence: 0,
          source: {
            country: request.destinationCountry,
            source: 'LOCAL',
            lastUpdated: new Date(),
            version: '1.0',
            reliability: 0
          }
        }
        
        results.push(errorResult)
      }
    }
    
    return results
  }
  
  /**
   * 验证税费计算是否合理
   */
  static validateCalculation(calculation: TaxCalculation): boolean {
    // 基本验证
    if (calculation.duties < 0 || calculation.vat < 0 || calculation.totalTax < 0) {
      return false
    }
    
    // 检查总税费是否等于关税+增值税
    const expectedTotal = calculation.duties + calculation.vat
    return Math.abs(calculation.totalTax - expectedTotal) < 0.01
  }
  
  /**
   * 验证扩展税费计算
   */
  static validateExtendedCalculation(calculation: ExtendedTaxCalculation): boolean {
    const basic = this.validateCalculation({
      product: calculation.product,
      destinationCountry: calculation.destinationCountry,
      duties: calculation.calculation.duties,
      vat: calculation.calculation.vat,
      totalTax: calculation.calculation.totalTax,
      threshold: calculation.thresholds,
      calculation: {
        dutyRate: calculation.calculation.dutyRate,
        vatRate: calculation.calculation.vatRate,
        taxableValue: calculation.calculation.taxableValue
      }
    })
    
    if (!basic) return false
    
    // 检查置信度范围
    if (calculation.confidence < 0 || calculation.confidence > 1) {
      return false
    }
    
    // 检查必要字段
    if (!calculation.id || !calculation.timestamp || !calculation.source) {
      return false
    }
    
    return true
  }
  
  /**
   * 获取税率管理器统计信息
   */
  static async getServiceStats(): Promise<{
    cacheStats: { size: number; countries: Country[] }
    serviceValidation: Map<Country, boolean>
  }> {
    return {
      cacheStats: this.rateManager.getCacheStats(),
      serviceValidation: await this.rateManager.validateAllServices()
    }
  }
  
  /**
   * 更新所有税率数据
   */
  static async updateTaxRates(): Promise<void> {
    await this.rateManager.updateAllRates()
  }
  
  /**
   * 清除缓存
   */
  static clearCache(): void {
    this.rateManager.clearCache()
  }
}