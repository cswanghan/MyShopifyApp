import { Product, Country, TaxCalculation, VAT_RATES, TAX_THRESHOLDS, DEFAULT_DUTY_RATES } from '@dtax-bridge/shared'
import { convertCurrency, isEUCountry } from '@dtax-bridge/shared'

export class TaxCalculator {
  /**
   * 计算商品税费
   */
  static async calculateTax(product: Product, destinationCountry: Country): Promise<TaxCalculation> {
    // 转换为USD进行计算
    const priceUSD = convertCurrency(product.price, product.currency, 'USD')
    
    // 获取税率和门槛
    const vatRate = VAT_RATES[destinationCountry] || 0
    const thresholds = TAX_THRESHOLDS[destinationCountry]
    
    // 计算关税
    const duties = this.calculateDuties(priceUSD, destinationCountry, product.category, thresholds.dutyFree)
    
    // 计算增值税
    const vat = this.calculateVAT(priceUSD, destinationCountry, vatRate, thresholds.vatFree)
    
    // 计算总税费
    const totalTax = duties + vat
    
    // 获取关税率
    const dutyRate = this.getDutyRate(product.category)
    
    return {
      product,
      destinationCountry,
      duties,
      vat,
      totalTax,
      threshold: thresholds,
      calculation: {
        dutyRate,
        vatRate,
        taxableValue: priceUSD
      }
    }
  }
  
  /**
   * 计算关税
   */
  private static calculateDuties(
    priceUSD: number,
    country: Country,
    category?: string,
    dutyFreeThreshold?: number
  ): number {
    // 检查是否免税
    if (dutyFreeThreshold && priceUSD <= dutyFreeThreshold) {
      return 0
    }
    
    // 美国Section 321 特殊处理
    if (country === 'US' && priceUSD <= 800) {
      return 0
    }
    
    const dutyRate = this.getDutyRate(category)
    return priceUSD * dutyRate
  }
  
  /**
   * 计算增值税
   */
  private static calculateVAT(
    priceUSD: number,
    country: Country,
    vatRate: number,
    vatFreeThreshold: number
  ): number {
    // 检查是否免税
    if (priceUSD <= vatFreeThreshold) {
      return 0
    }
    
    // 美国没有增值税
    if (country === 'US') {
      return 0
    }
    
    // 增值税基数包含商品价格和关税
    const duties = this.calculateDuties(priceUSD, country, undefined, vatFreeThreshold)
    const taxableValue = priceUSD + duties
    
    return taxableValue * vatRate
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
}