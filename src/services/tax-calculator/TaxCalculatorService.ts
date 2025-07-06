/**
 * DTax-Bridge 税费计算核心服务
 * 
 * 提供实时税费计算功能，支持：
 * - 多国税率和关税计算
 * - IOSS/Section 321/UK VAT 合规检查
 * - 智能税费优化建议
 * - 缓存和性能优化
 */

import { TaxCalculationRequest, TaxCalculationResult, TaxType } from './models/TaxCalculationRequest'
import { ComplianceInfo, TaxOptimizationRecommendation, Warning, TaxCalculationError } from './models/TaxCalculationResult'

export class TaxCalculatorService {
  private readonly cacheEnabled: boolean
  private readonly calculationCache: Map<string, TaxCalculationResult> = new Map()
  private readonly engineVersion = '1.0.0'

  constructor(options?: { enableCache?: boolean }) {
    this.cacheEnabled = options?.enableCache ?? true
  }

  /**
   * 执行税费计算
   */
  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    const startTime = Date.now()
    const calculationId = this.generateCalculationId(request)

    try {
      // 检查缓存
      if (this.cacheEnabled && this.calculationCache.has(calculationId)) {
        const cachedResult = this.calculationCache.get(calculationId)!
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            fromCache: true
          }
        }
      }

      // 验证请求数据
      const validation = this.validateRequest(request)
      if (!validation.isValid) {
        return this.createErrorResult(validation.errors, calculationId, startTime)
      }

      // 执行税费计算
      const result = await this.performCalculation(request, calculationId, startTime)

      // 缓存结果
      if (this.cacheEnabled && result.success) {
        this.calculationCache.set(calculationId, result)
        // 设置缓存过期时间 (5分钟)
        setTimeout(() => {
          this.calculationCache.delete(calculationId)
        }, 5 * 60 * 1000)
      }

      return result

    } catch (error) {
      return this.createErrorResult([{
        code: 'SYSTEM_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'SYSTEM_ERROR',
        details: error
      }], calculationId, startTime)
    }
  }

  /**
   * 执行核心税费计算逻辑
   */
  private async performCalculation(
    request: TaxCalculationRequest,
    calculationId: string,
    startTime: number
  ): Promise<TaxCalculationResult> {
    const warnings: Warning[] = []
    const errors: TaxCalculationError[] = []
    const debugInfo = {
      appliedRules: [] as string[],
      skippedRules: [] as string[],
      calculationSteps: [] as any[]
    }

    // 1. 计算商品总价值
    const totalValue = request.items.reduce((sum, item) => sum + item.totalValue, 0)
    debugInfo.calculationSteps.push({ step: 'total_value_calculation', value: totalValue })

    // 2. 获取目的地税率信息
    const taxRates = await this.getTaxRates(request.destination.countryCode)
    if (!taxRates) {
      errors.push({
        code: 'RATE_NOT_FOUND',
        message: `Tax rates not found for country: ${request.destination.countryCode}`,
        type: 'RATE_NOT_FOUND',
        field: 'destination.countryCode'
      })
    }

    // 3. 执行合规检查
    const complianceInfo = await this.checkCompliance(request, totalValue, debugInfo)

    // 4. 计算各种税费
    const breakdown = await this.calculateTaxBreakdown(request, taxRates, complianceInfo, debugInfo)

    // 5. 计算总税费
    const totalTax = breakdown.reduce((sum, tax) => sum + tax.amount, 0)

    // 6. 生成优化建议
    const recommendations = this.generateOptimizationRecommendations(request, totalTax, complianceInfo)

    // 7. 检查潜在问题
    this.checkForWarnings(request, totalTax, complianceInfo, warnings)

    const calculationTime = Date.now() - startTime

    return {
      success: errors.length === 0,
      totalTax,
      currency: request.currency,
      breakdown,
      complianceInfo,
      recommendations,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        calculationTime,
        engineVersion: this.engineVersion,
        calculationId,
        fromCache: false,
        debugInfo: request.options?.includeBreakdown ? debugInfo : undefined
      }
    }
  }

  /**
   * 验证计算请求
   */
  private validateRequest(request: TaxCalculationRequest): { isValid: boolean; errors: TaxCalculationError[] } {
    const errors: TaxCalculationError[] = []

    // 验证基本字段
    if (!request.items || request.items.length === 0) {
      errors.push({
        code: 'MISSING_ITEMS',
        message: 'At least one item is required',
        type: 'VALIDATION',
        field: 'items'
      })
    }

    if (!request.destination?.countryCode) {
      errors.push({
        code: 'MISSING_DESTINATION',
        message: 'Destination country code is required',
        type: 'VALIDATION',
        field: 'destination.countryCode'
      })
    }

    // 验证商品数据
    request.items?.forEach((item, index) => {
      if (!item.name || item.name.trim() === '') {
        errors.push({
          code: 'MISSING_ITEM_NAME',
          message: `Item name is required for item ${index}`,
          type: 'VALIDATION',
          field: `items[${index}].name`
        })
      }

      if (item.unitPrice <= 0 || item.quantity <= 0 || item.totalValue <= 0) {
        errors.push({
          code: 'INVALID_ITEM_VALUE',
          message: `Invalid pricing for item ${index}`,
          type: 'VALIDATION',
          field: `items[${index}]`
        })
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取税率数据
   */
  private async getTaxRates(countryCode: string): Promise<any> {
    // 模拟税率数据获取
    const taxRatesDatabase: Record<string, any> = {
      'US': {
        duty: { rate: 0.025, threshold: 800 }, // Section 321: $800以下免税
        stateTax: { rate: 0.08, varies: true }
      },
      'GB': {
        vat: { rate: 0.20, threshold: 135 }, // £135以下20% VAT
        duty: { rate: 0.05 }
      },
      'DE': {
        vat: { rate: 0.19, threshold: 150 }, // €150以下IOSS
        duty: { rate: 0.04 }
      },
      'FR': {
        vat: { rate: 0.20, threshold: 150 },
        duty: { rate: 0.04 }
      }
    }

    return taxRatesDatabase[countryCode] || null
  }

  /**
   * 执行合规检查
   */
  private async checkCompliance(
    request: TaxCalculationRequest,
    totalValue: number,
    debugInfo: any
  ): Promise<ComplianceInfo> {
    const applicablePolicies: any[] = []
    let isCompliant = true

    // Section 321 检查 (美国)
    if (request.destination.countryCode === 'US') {
      const section321Applicable = totalValue <= 800
      applicablePolicies.push({
        type: 'Section321',
        name: 'US Section 321 De Minimis',
        applicable: section321Applicable,
        threshold: { amount: 800, currency: 'USD' },
        description: 'Orders under $800 are duty-free'
      })

      if (section321Applicable) {
        debugInfo.appliedRules.push('Section321_duty_exemption')
      }
    }

    // IOSS 检查 (欧盟)
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL']
    if (euCountries.includes(request.destination.countryCode)) {
      const iossApplicable = totalValue <= 150
      applicablePolicies.push({
        type: 'IOSS',
        name: 'EU Import One-Stop Shop',
        applicable: iossApplicable,
        threshold: { amount: 150, currency: 'EUR' },
        description: 'Simplified VAT collection for orders ≤ €150'
      })

      if (iossApplicable) {
        debugInfo.appliedRules.push('IOSS_vat_collection')
      }
    }

    // UK VAT 检查
    if (request.destination.countryCode === 'GB') {
      const ukVatApplicable = totalValue <= 135
      applicablePolicies.push({
        type: 'UkVat',
        name: 'UK Low Value Relief',
        applicable: ukVatApplicable,
        threshold: { amount: 135, currency: 'GBP' },
        description: 'VAT charged on goods ≤ £135'
      })
    }

    return {
      isCompliant,
      applicablePolicies,
      iossInfo: euCountries.includes(request.destination.countryCode) ? {
        applicable: totalValue <= 150,
        monthlyAccumulated: 0, // 需要从数据库获取
        nearThreshold: false
      } : undefined,
      section321Info: request.destination.countryCode === 'US' ? {
        applicable: totalValue <= 800,
        dailyAccumulated: 0, // 需要从数据库获取
        recipientAccumulated: 0,
        savedDutyAmount: totalValue <= 800 ? totalValue * 0.025 : 0
      } : undefined,
      ukVatInfo: request.destination.countryCode === 'GB' ? {
        lowValueReliefApplicable: totalValue <= 135,
        quarterlyAccumulated: 0 // 需要从数据库获取
      } : undefined
    }
  }

  /**
   * 计算税费分解
   */
  private async calculateTaxBreakdown(
    request: TaxCalculationRequest,
    taxRates: any,
    complianceInfo: ComplianceInfo,
    debugInfo: any
  ): Promise<any[]> {
    const breakdown: any[] = []

    if (!taxRates) return breakdown

    const totalValue = request.items.reduce((sum, item) => sum + item.totalValue, 0)
    const includeShipping = request.options?.includeshippingInTax ?? false
    const shippingCost = includeShipping ? (request.shippingInfo?.shippingCost ?? 0) : 0
    const taxBase = totalValue + shippingCost

    // VAT 计算
    if (taxRates.vat) {
      const isVatExempt = complianceInfo.section321Info?.applicable || 
                         (complianceInfo.iossInfo?.applicable && totalValue > 150)
      
      if (!isVatExempt) {
        const vatAmount = taxBase * taxRates.vat.rate
        breakdown.push({
          taxType: TaxType.VAT,
          taxName: 'Value Added Tax',
          rate: taxRates.vat.rate,
          taxBase,
          amount: vatAmount,
          notes: complianceInfo.iossInfo?.applicable ? 'Collected via IOSS' : undefined
        })
        debugInfo.calculationSteps.push({ step: 'vat_calculation', rate: taxRates.vat.rate, amount: vatAmount })
      }
    }

    // 关税计算
    if (taxRates.duty) {
      const isDutyExempt = complianceInfo.section321Info?.applicable
      
      if (!isDutyExempt) {
        const dutyAmount = taxBase * taxRates.duty.rate
        breakdown.push({
          taxType: TaxType.DUTY,
          taxName: 'Import Duty',
          rate: taxRates.duty.rate,
          taxBase,
          amount: dutyAmount
        })
        debugInfo.calculationSteps.push({ step: 'duty_calculation', rate: taxRates.duty.rate, amount: dutyAmount })
      } else {
        debugInfo.skippedRules.push('duty_exemption_section321')
      }
    }

    // 处理费
    if (breakdown.length > 0) {
      const handlingFee = Math.min(totalValue * 0.001, 10) // 最高$10处理费
      breakdown.push({
        taxType: TaxType.HANDLING_FEE,
        taxName: 'Customs Handling Fee',
        rate: 0.001,
        taxBase: totalValue,
        amount: handlingFee
      })
    }

    return breakdown
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationRecommendations(
    request: TaxCalculationRequest,
    totalTax: number,
    complianceInfo: ComplianceInfo
  ): TaxOptimizationRecommendation[] {
    const recommendations: TaxOptimizationRecommendation[] = []
    const totalValue = request.items.reduce((sum, item) => sum + item.totalValue, 0)

    // Section 321 优化建议
    if (request.destination.countryCode === 'US' && totalValue > 800) {
      const potentialSavings = totalValue * 0.025 // 预估关税节省
      recommendations.push({
        type: 'SPLIT_ORDER',
        title: '拆分订单以利用Section 321免税政策',
        description: `当前订单价值$${totalValue}超过$800阈值。建议拆分成多个小订单以享受免税优惠。`,
        potentialSavings,
        difficulty: 'MEDIUM'
      })
    }

    // IOSS 优化建议
    if (['DE', 'FR', 'IT', 'ES'].includes(request.destination.countryCode) && totalValue > 150) {
      recommendations.push({
        type: 'ADJUST_PRICE',
        title: '调整订单价值以符合IOSS政策',
        description: `订单价值€${totalValue}超过€150 IOSS阈值。考虑调整商品定价或分批发货。`,
        potentialSavings: totalValue * 0.19 * 0.1, // 预估VAT简化处理节省
        difficulty: 'EASY'
      })
    }

    // DDP vs DAP 建议
    if (request.shippingInfo?.serviceType !== 'DDP' && totalTax > 50) {
      recommendations.push({
        type: 'CHANGE_SHIPPING',
        title: '建议使用DDP(到门含税)服务',
        description: '当前税费较高，使用DDP服务可以提前支付税费，避免客户额外付费和退货风险。',
        potentialSavings: 0, // 提升客户体验而非直接节省
        difficulty: 'EASY'
      })
    }

    return recommendations
  }

  /**
   * 检查警告信息
   */
  private checkForWarnings(
    request: TaxCalculationRequest,
    totalTax: number,
    complianceInfo: ComplianceInfo,
    warnings: Warning[]
  ): void {
    const totalValue = request.items.reduce((sum, item) => sum + item.totalValue, 0)

    // 高税费警告
    if (totalTax > totalValue * 0.3) {
      warnings.push({
        code: 'HIGH_TAX_RATE',
        message: `税费占订单价值${((totalTax / totalValue) * 100).toFixed(1)}%，可能影响客户购买意愿`,
        severity: 'HIGH'
      })
    }

    // HSCode 缺失警告
    const missingHSCodes = request.items.filter(item => !item.hsCode)
    if (missingHSCodes.length > 0) {
      warnings.push({
        code: 'MISSING_HSCODE',
        message: `${missingHSCodes.length}个商品缺少HSCode，可能影响税率准确性`,
        severity: 'MEDIUM',
        field: 'items.hsCode'
      })
    }

    // 接近阈值警告
    if (complianceInfo.iossInfo?.nearThreshold) {
      warnings.push({
        code: 'APPROACHING_IOSS_THRESHOLD',
        message: '接近IOSS月度阈值，请注意合规申报',
        severity: 'MEDIUM'
      })
    }
  }

  /**
   * 生成计算ID
   */
  private generateCalculationId(request: TaxCalculationRequest): string {
    const keyData = {
      items: request.items.map(item => ({ name: item.name, price: item.unitPrice, qty: item.quantity })),
      destination: request.destination.countryCode,
      customer: request.customerInfo?.type,
      shipping: request.shippingInfo?.serviceType
    }
    
    // 简化的哈希函数
    const str = JSON.stringify(keyData)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转为32位整数
    }
    
    return `calc_${Math.abs(hash).toString(36)}_${Date.now()}`
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(
    errors: TaxCalculationError[],
    calculationId: string,
    startTime: number
  ): TaxCalculationResult {
    return {
      success: false,
      totalTax: 0,
      currency: 'USD',
      breakdown: [],
      complianceInfo: {
        isCompliant: false,
        applicablePolicies: []
      },
      errors,
      metadata: {
        timestamp: new Date().toISOString(),
        calculationTime: Date.now() - startTime,
        engineVersion: this.engineVersion,
        calculationId,
        fromCache: false
      }
    }
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.calculationCache.clear()
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: this.calculationCache.size,
      enabled: this.cacheEnabled
    }
  }
}