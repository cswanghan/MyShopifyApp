/**
 * DTax-Bridge 税费计算工具函数
 * 
 * 提供税费计算相关的通用工具函数
 */

export class TaxCalculatorUtils {
  /**
   * 格式化货币金额
   */
  static formatCurrency(amount: number, currency: string, locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  /**
   * 计算税率百分比显示
   */
  static formatTaxRate(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`
  }

  /**
   * 舍入税费金额
   */
  static roundTaxAmount(amount: number, precision: number = 2): number {
    const factor = Math.pow(10, precision)
    return Math.round(amount * factor) / factor
  }

  /**
   * 验证HSCode格式
   */
  static validateHSCodeFormat(hsCode: string): boolean {
    return /^\d{4,10}$/.test(hsCode)
  }

  /**
   * 验证国家代码格式
   */
  static validateCountryCode(countryCode: string): boolean {
    return /^[A-Z]{2}$/.test(countryCode)
  }

  /**
   * 计算商品总重量
   */
  static calculateTotalWeight(items: Array<{ weight?: number; quantity: number }>): number {
    return items.reduce((total, item) => {
      return total + (item.weight || 0) * item.quantity
    }, 0)
  }

  /**
   * 检查是否为数字商品
   */
  static isDigitalProduct(item: { isDigital?: boolean; category?: string; name: string }): boolean {
    if (item.isDigital) return true
    
    const digitalKeywords = ['software', 'ebook', 'digital', 'download', 'app', '软件', '电子书', '数字']
    const itemText = `${item.name} ${item.category || ''}`.toLowerCase()
    
    return digitalKeywords.some(keyword => itemText.includes(keyword))
  }

  /**
   * 生成税费计算摘要
   */
  static generateCalculationSummary(
    totalValue: number,
    totalTax: number,
    currency: string,
    breakdown: Array<{ taxType: string; amount: number }>
  ): string {
    const taxRate = (totalTax / totalValue) * 100
    const formattedValue = this.formatCurrency(totalValue, currency)
    const formattedTax = this.formatCurrency(totalTax, currency)
    
    let summary = `订单价值: ${formattedValue}, 总税费: ${formattedTax} (${taxRate.toFixed(2)}%)`
    
    if (breakdown.length > 0) {
      summary += '\n税费明细:'
      breakdown.forEach(item => {
        summary += `\n- ${item.taxType}: ${this.formatCurrency(item.amount, currency)}`
      })
    }
    
    return summary
  }

  /**
   * 计算节省金额
   */
  static calculateSavings(
    originalAmount: number,
    optimizedAmount: number,
    currency: string
  ): { amount: number; percentage: number; formatted: string } {
    const savingsAmount = originalAmount - optimizedAmount
    const savingsPercentage = (savingsAmount / originalAmount) * 100
    
    return {
      amount: savingsAmount,
      percentage: savingsPercentage,
      formatted: this.formatCurrency(savingsAmount, currency)
    }
  }

  /**
   * 检查阈值接近程度
   */
  static checkThresholdProximity(
    currentValue: number,
    threshold: number,
    warningPercentage: number = 0.9
  ): { isNear: boolean; percentage: number; remaining: number } {
    const percentage = currentValue / threshold
    const isNear = percentage >= warningPercentage
    const remaining = threshold - currentValue
    
    return {
      isNear,
      percentage,
      remaining: Math.max(0, remaining)
    }
  }

  /**
   * 生成订单拆分建议
   */
  static suggestOrderSplit(
    totalValue: number,
    threshold: number,
    items: Array<{ name: string; totalValue: number; quantity: number }>
  ): Array<{ items: typeof items; totalValue: number }> {
    if (totalValue <= threshold) {
      return [{ items, totalValue }]
    }

    const suggestions: Array<{ items: typeof items; totalValue: number }> = []
    let currentGroup: typeof items = []
    let currentValue = 0

    // 按价值排序，从小到大
    const sortedItems = [...items].sort((a, b) => a.totalValue - b.totalValue)

    for (const item of sortedItems) {
      if (currentValue + item.totalValue <= threshold) {
        currentGroup.push(item)
        currentValue += item.totalValue
      } else {
        // 当前组已满，开始新组
        if (currentGroup.length > 0) {
          suggestions.push({ items: [...currentGroup], totalValue: currentValue })
          currentGroup = []
          currentValue = 0
        }

        // 如果单个商品超过阈值，需要拆分数量
        if (item.totalValue > threshold && item.quantity > 1) {
          const maxQuantityPerGroup = Math.floor(threshold / (item.totalValue / item.quantity))
          let remainingQuantity = item.quantity

          while (remainingQuantity > 0) {
            const groupQuantity = Math.min(remainingQuantity, maxQuantityPerGroup)
            const groupValue = (item.totalValue / item.quantity) * groupQuantity

            suggestions.push({
              items: [{
                ...item,
                quantity: groupQuantity,
                totalValue: groupValue
              }],
              totalValue: groupValue
            })

            remainingQuantity -= groupQuantity
          }
        } else {
          currentGroup.push(item)
          currentValue += item.totalValue
        }
      }
    }

    // 添加最后一组
    if (currentGroup.length > 0) {
      suggestions.push({ items: [...currentGroup], totalValue: currentValue })
    }

    return suggestions
  }

  /**
   * 计算运费分摊
   */
  static allocateShippingCost(
    shippingCost: number,
    items: Array<{ totalValue: number; weight?: number }>
  ): Array<{ itemIndex: number; allocatedShipping: number }> {
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0)
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0)

    return items.map((item, index) => {
      let allocatedShipping: number

      if (totalWeight > 0 && item.weight) {
        // 按重量分摊
        allocatedShipping = (shippingCost * item.weight) / totalWeight
      } else {
        // 按价值分摊
        allocatedShipping = (shippingCost * item.totalValue) / totalValue
      }

      return {
        itemIndex: index,
        allocatedShipping: this.roundTaxAmount(allocatedShipping)
      }
    })
  }

  /**
   * 生成错误代码
   */
  static generateErrorCode(errorType: string, contextInfo?: string): string {
    const timestamp = Date.now().toString(36)
    const context = contextInfo ? `_${contextInfo}` : ''
    return `${errorType}${context}_${timestamp}`
  }

  /**
   * 验证邮政编码格式
   */
  static validatePostalCode(postalCode: string, countryCode: string): boolean {
    const patterns: Record<string, RegExp> = {
      'US': /^\d{5}(-\d{4})?$/,
      'GB': /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/i,
      'DE': /^\d{5}$/,
      'FR': /^\d{5}$/,
      'CA': /^[A-Z]\d[A-Z] \d[A-Z]\d$/i,
      'AU': /^\d{4}$/,
      'CN': /^\d{6}$/
    }

    const pattern = patterns[countryCode]
    return pattern ? pattern.test(postalCode) : true // 如果没有特定规则，默认通过
  }

  /**
   * 计算配送时效
   */
  static estimateDeliveryTime(
    originCountry: string,
    destinationCountry: string,
    serviceType: 'EXPRESS' | 'STANDARD' | 'ECONOMY' = 'STANDARD'
  ): { minDays: number; maxDays: number; businessDays: boolean } {
    const baseDeliveryTimes: Record<string, Record<string, number>> = {
      'CN': {
        'US': 7, 'GB': 5, 'DE': 6, 'FR': 6, 'AU': 8, 'CA': 9
      },
      'US': {
        'CN': 10, 'GB': 3, 'DE': 4, 'FR': 4, 'AU': 6, 'CA': 2
      }
    }

    const baseDays = baseDeliveryTimes[originCountry]?.[destinationCountry] || 14

    const multipliers = {
      'EXPRESS': 0.5,
      'STANDARD': 1.0,
      'ECONOMY': 1.5
    }

    const adjustedDays = baseDays * multipliers[serviceType]

    return {
      minDays: Math.max(1, Math.floor(adjustedDays * 0.8)),
      maxDays: Math.ceil(adjustedDays * 1.2),
      businessDays: true
    }
  }

  /**
   * 检查商品危险性
   */
  static checkProductRestrictions(item: {
    name: string
    description?: string
    category?: string
    isDangerous?: boolean
    isRestricted?: boolean
  }): {
    isDangerous: boolean
    isRestricted: boolean
    restrictions: string[]
    shippingLimitations: string[]
  } {
    if (item.isDangerous || item.isRestricted) {
      return {
        isDangerous: item.isDangerous || false,
        isRestricted: item.isRestricted || false,
        restrictions: ['Manual review required'],
        shippingLimitations: ['Special handling required']
      }
    }

    const dangerousKeywords = ['battery', 'liquid', 'chemical', 'magnetic', '电池', '液体', '化学品']
    const restrictedKeywords = ['tobacco', 'alcohol', 'medicine', 'weapon', '烟草', '酒精', '药品', '武器']

    const itemText = `${item.name} ${item.description || ''} ${item.category || ''}`.toLowerCase()

    const isDangerous = dangerousKeywords.some(keyword => itemText.includes(keyword))
    const isRestricted = restrictedKeywords.some(keyword => itemText.includes(keyword))

    const restrictions: string[] = []
    const shippingLimitations: string[] = []

    if (isDangerous) {
      restrictions.push('Contains dangerous goods')
      shippingLimitations.push('Dangerous goods handling required')
    }

    if (isRestricted) {
      restrictions.push('Contains restricted items')
      shippingLimitations.push('Special permits may be required')
    }

    return {
      isDangerous,
      isRestricted,
      restrictions,
      shippingLimitations
    }
  }
}