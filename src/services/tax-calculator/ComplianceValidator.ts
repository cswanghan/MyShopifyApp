/**
 * DTax-Bridge 合规验证器
 * 
 * 功能：
 * - 验证订单是否符合各国合规要求
 * - 检查IOSS、Section 321、UK VAT等政策合规性
 * - 提供合规建议和风险预警
 * - 生成合规报告和文档要求
 */

import { TaxCalculationRequest } from './models/TaxCalculationRequest'
import { ComplianceInfo, CompliancePolicy } from './models/TaxCalculationResult'
import { TaxRateProvider } from './TaxRateProvider'

export interface ComplianceValidationResult {
  /** 是否合规 */
  isCompliant: boolean
  
  /** 合规等级 */
  complianceLevel: 'FULL' | 'PARTIAL' | 'NON_COMPLIANT' | 'UNKNOWN'
  
  /** 验证的政策 */
  validatedPolicies: PolicyValidationResult[]
  
  /** 合规建议 */
  recommendations: ComplianceRecommendation[]
  
  /** 风险评估 */
  riskAssessment: RiskAssessment
  
  /** 需要的文档 */
  requiredDocuments: RequiredDocument[]
  
  /** 验证摘要 */
  summary: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
    warningChecks: number
  }
}

export interface PolicyValidationResult {
  /** 政策信息 */
  policy: CompliancePolicy
  
  /** 验证状态 */
  status: 'PASS' | 'FAIL' | 'WARNING' | 'N/A'
  
  /** 验证详情 */
  details: string
  
  /** 相关数据 */
  data?: {
    orderValue?: number
    thresholdValue?: number
    currentAccumulated?: number
    remainingQuota?: number
  }
}

export interface ComplianceRecommendation {
  /** 建议类型 */
  type: 'OPTIMIZATION' | 'RISK_MITIGATION' | 'DOCUMENTATION' | 'PROCESS_IMPROVEMENT'
  
  /** 优先级 */
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  
  /** 建议标题 */
  title: string
  
  /** 建议内容 */
  description: string
  
  /** 实施步骤 */
  actionSteps?: string[]
  
  /** 预期效果 */
  expectedOutcome?: string
}

export interface RiskAssessment {
  /** 总体风险等级 */
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  
  /** 风险因素 */
  riskFactors: RiskFactor[]
  
  /** 风险评分 (0-100) */
  riskScore: number
  
  /** 风险说明 */
  riskExplanation: string
}

export interface RiskFactor {
  /** 风险类型 */
  type: 'TAX_LIABILITY' | 'CUSTOMS_DELAY' | 'DOCUMENTATION' | 'REGULATORY_CHANGE' | 'FINANCIAL'
  
  /** 风险等级 */
  level: 'LOW' | 'MEDIUM' | 'HIGH'
  
  /** 风险描述 */
  description: string
  
  /** 影响程度 */
  impact: string
  
  /** 缓解措施 */
  mitigation?: string
}

export interface RequiredDocument {
  /** 文档类型 */
  type: 'COMMERCIAL_INVOICE' | 'PACKING_LIST' | 'CERTIFICATE_OF_ORIGIN' | 'VAT_REGISTRATION' | 'IOSS_NUMBER' | 'CUSTOMS_DECLARATION'
  
  /** 文档名称 */
  name: string
  
  /** 是否必需 */
  required: boolean
  
  /** 文档描述 */
  description: string
  
  /** 所需信息 */
  requiredInfo?: string[]
}

export class ComplianceValidator {
  private readonly taxRateProvider: TaxRateProvider

  constructor(taxRateProvider: TaxRateProvider) {
    this.taxRateProvider = taxRateProvider
  }

  /**
   * 执行完整的合规验证
   */
  async validateCompliance(request: TaxCalculationRequest): Promise<ComplianceValidationResult> {
    const validatedPolicies: PolicyValidationResult[] = []
    const recommendations: ComplianceRecommendation[] = []
    const riskFactors: RiskFactor[] = []
    const requiredDocuments: RequiredDocument[] = []

    const totalValue = request.items.reduce((sum, item) => sum + item.totalValue, 0)
    const destination = request.destination

    // 1. IOSS合规验证 (欧盟)
    if (this.isEUCountry(destination.countryCode)) {
      const iossValidation = await this.validateIOSS(request, totalValue)
      validatedPolicies.push(iossValidation)
      this.generateIOSSRecommendations(iossValidation, recommendations, riskFactors)
    }

    // 2. Section 321合规验证 (美国)
    if (destination.countryCode === 'US') {
      const section321Validation = await this.validateSection321(request, totalValue)
      validatedPolicies.push(section321Validation)
      this.generateSection321Recommendations(section321Validation, recommendations, riskFactors)
    }

    // 3. UK VAT合规验证 (英国)
    if (destination.countryCode === 'GB') {
      const ukVatValidation = await this.validateUKVAT(request, totalValue)
      validatedPolicies.push(ukVatValidation)
      this.generateUKVATRecommendations(ukVatValidation, recommendations, riskFactors)
    }

    // 4. 通用合规检查
    const generalValidation = await this.validateGeneralCompliance(request)
    validatedPolicies.push(...generalValidation)

    // 5. 生成文档要求
    requiredDocuments.push(...this.generateDocumentRequirements(request, validatedPolicies))

    // 6. 风险评估
    const riskAssessment = this.assessRisk(validatedPolicies, riskFactors, totalValue)

    // 7. 计算合规摘要
    const summary = this.calculateComplianceSummary(validatedPolicies)

    const complianceLevel = this.determineComplianceLevel(validatedPolicies, riskAssessment)

    return {
      isCompliant: summary.failedChecks === 0,
      complianceLevel,
      validatedPolicies,
      recommendations,
      riskAssessment,
      requiredDocuments,
      summary
    }
  }

  /**
   * IOSS合规验证
   */
  private async validateIOSS(request: TaxCalculationRequest, totalValue: number): Promise<PolicyValidationResult> {
    const iossPolicy = await this.taxRateProvider.getCompliancePolicy('IOSS', request.destination.countryCode)
    
    if (!iossPolicy) {
      return {
        policy: {} as CompliancePolicy,
        status: 'N/A',
        details: 'IOSS policy not applicable for this destination'
      }
    }

    const iossThreshold = 150 // EUR
    const convertedValue = await this.convertToEUR(totalValue, request.currency)

    if (convertedValue <= iossThreshold) {
      return {
        policy: iossPolicy,
        status: 'PASS',
        details: `订单金额 €${convertedValue} 符合IOSS阈值要求 (≤ €${iossThreshold})`,
        data: {
          orderValue: convertedValue,
          thresholdValue: iossThreshold,
          remainingQuota: iossThreshold - convertedValue
        }
      }
    } else {
      return {
        policy: iossPolicy,
        status: 'WARNING',
        details: `订单金额 €${convertedValue} 超过IOSS阈值 €${iossThreshold}，需要标准清关流程`,
        data: {
          orderValue: convertedValue,
          thresholdValue: iossThreshold
        }
      }
    }
  }

  /**
   * Section 321合规验证
   */
  private async validateSection321(request: TaxCalculationRequest, totalValue: number): Promise<PolicyValidationResult> {
    const section321Policy = await this.taxRateProvider.getCompliancePolicy('Section321', 'US')
    
    if (!section321Policy) {
      return {
        policy: {} as CompliancePolicy,
        status: 'N/A',
        details: 'Section 321 policy not found'
      }
    }

    const section321Threshold = 800 // USD
    const convertedValue = await this.convertToUSD(totalValue, request.currency)

    // 检查单日限额
    const dailyAccumulated = await this.getDailyAccumulated(request.destination, request.customerInfo?.customerId)

    if (convertedValue <= section321Threshold && (dailyAccumulated + convertedValue) <= section321Threshold) {
      return {
        policy: section321Policy,
        status: 'PASS',
        details: `订单金额 $${convertedValue} 符合Section 321要求，可享受免税优惠`,
        data: {
          orderValue: convertedValue,
          thresholdValue: section321Threshold,
          currentAccumulated: dailyAccumulated,
          remainingQuota: section321Threshold - dailyAccumulated - convertedValue
        }
      }
    } else if (convertedValue > section321Threshold) {
      return {
        policy: section321Policy,
        status: 'FAIL',
        details: `单个订单金额 $${convertedValue} 超过Section 321阈值 $${section321Threshold}`,
        data: {
          orderValue: convertedValue,
          thresholdValue: section321Threshold
        }
      }
    } else {
      return {
        policy: section321Policy,
        status: 'WARNING',
        details: `当日累计金额将超过Section 321限额，建议延后发货或拆分订单`,
        data: {
          orderValue: convertedValue,
          thresholdValue: section321Threshold,
          currentAccumulated: dailyAccumulated
        }
      }
    }
  }

  /**
   * UK VAT合规验证
   */
  private async validateUKVAT(request: TaxCalculationRequest, totalValue: number): Promise<PolicyValidationResult> {
    const ukVatPolicy = await this.taxRateProvider.getCompliancePolicy('UkVat', 'GB')
    
    if (!ukVatPolicy) {
      return {
        policy: {} as CompliancePolicy,
        status: 'N/A',
        details: 'UK VAT policy not found'
      }
    }

    const ukVatThreshold = 135 // GBP
    const convertedValue = await this.convertToGBP(totalValue, request.currency)

    if (convertedValue <= ukVatThreshold) {
      return {
        policy: ukVatPolicy,
        status: 'PASS',
        details: `订单金额 £${convertedValue} 符合低价值救济要求，VAT在结账时收取`,
        data: {
          orderValue: convertedValue,
          thresholdValue: ukVatThreshold
        }
      }
    } else {
      return {
        policy: ukVatPolicy,
        status: 'WARNING',
        details: `订单金额 £${convertedValue} 超过低价值救济阈值，需要标准清关和VAT处理`,
        data: {
          orderValue: convertedValue,
          thresholdValue: ukVatThreshold
        }
      }
    }
  }

  /**
   * 通用合规检查
   */
  private async validateGeneralCompliance(request: TaxCalculationRequest): Promise<PolicyValidationResult[]> {
    const results: PolicyValidationResult[] = []

    // 检查HSCode完整性
    const missingHSCodes = request.items.filter(item => !item.hsCode)
    if (missingHSCodes.length > 0) {
      results.push({
        policy: {
          id: 'HSCODE_REQUIREMENT',
          name: 'HSCode分类要求',
          type: 'Other'
        } as CompliancePolicy,
        status: 'WARNING',
        details: `${missingHSCodes.length} 个商品缺少HSCode分类，可能影响清关速度`
      })
    }

    // 检查商品限制
    const restrictedItems = request.items.filter(item => item.isRestricted || item.isDangerous)
    if (restrictedItems.length > 0) {
      results.push({
        policy: {
          id: 'RESTRICTED_GOODS',
          name: '限制商品政策',
          type: 'Other'
        } as CompliancePolicy,
        status: 'FAIL',
        details: `发现 ${restrictedItems.length} 个限制或危险品，需要特殊许可或无法运输`
      })
    }

    // 检查商品价值声明
    const lowValueItems = request.items.filter(item => item.unitPrice < 1)
    if (lowValueItems.length > 0) {
      results.push({
        policy: {
          id: 'VALUE_DECLARATION',
          name: '价值声明合规',
          type: 'Other'
        } as CompliancePolicy,
        status: 'WARNING',
        details: `检测到 ${lowValueItems.length} 个低价值商品，请确保价值声明准确`
      })
    }

    return results
  }

  /**
   * 生成IOSS相关建议
   */
  private generateIOSSRecommendations(
    validation: PolicyValidationResult,
    recommendations: ComplianceRecommendation[],
    riskFactors: RiskFactor[]
  ): void {
    if (validation.status === 'PASS') {
      recommendations.push({
        type: 'OPTIMIZATION',
        priority: 'LOW',
        title: 'IOSS合规优化',
        description: '当前订单符合IOSS要求，建议保持现有策略',
        actionSteps: ['继续使用当前定价策略', '确保IOSS号码正确填写']
      })
    } else if (validation.status === 'WARNING') {
      recommendations.push({
        type: 'RISK_MITIGATION',
        priority: 'MEDIUM',
        title: '超出IOSS阈值处理',
        description: '订单超出IOSS阈值，需要标准清关流程',
        actionSteps: [
          '考虑拆分订单以符合IOSS要求',
          '准备完整的商业发票和装箱单',
          '确保客户了解可能的额外费用'
        ],
        expectedOutcome: '避免清关延误和额外费用'
      })

      riskFactors.push({
        type: 'CUSTOMS_DELAY',
        level: 'MEDIUM',
        description: '超出IOSS阈值可能导致清关延误',
        impact: '配送时间延长3-7天，客户体验下降',
        mitigation: '提前通知客户或拆分订单'
      })
    }
  }

  /**
   * 生成Section 321相关建议
   */
  private generateSection321Recommendations(
    validation: PolicyValidationResult,
    recommendations: ComplianceRecommendation[],
    riskFactors: RiskFactor[]
  ): void {
    if (validation.status === 'PASS') {
      recommendations.push({
        type: 'OPTIMIZATION',
        priority: 'LOW',
        title: 'Section 321免税优化',
        description: '当前订单享受Section 321免税优惠',
        actionSteps: ['保持订单金额在$800以下', '监控同一收件人的累计金额']
      })
    } else if (validation.status === 'FAIL' || validation.status === 'WARNING') {
      recommendations.push({
        type: 'RISK_MITIGATION',
        priority: 'HIGH',
        title: 'Section 321合规优化',
        description: '建议拆分订单以享受免税优惠',
        actionSteps: [
          '将订单拆分为多个低于$800的包裹',
          '确保不同包裹间隔至少24小时发货',
          '使用不同的tracking number'
        ],
        expectedOutcome: '节省关税和费用，提高客户满意度'
      })

      riskFactors.push({
        type: 'TAX_LIABILITY',
        level: 'HIGH',
        description: '超出Section 321阈值将产生关税',
        impact: '额外关税成本约为订单价值的2.5-10%',
        mitigation: '拆分订单或调整定价策略'
      })
    }
  }

  /**
   * 生成UK VAT相关建议
   */
  private generateUKVATRecommendations(
    validation: PolicyValidationResult,
    recommendations: ComplianceRecommendation[],
    riskFactors: RiskFactor[]
  ): void {
    if (validation.status === 'PASS') {
      recommendations.push({
        type: 'OPTIMIZATION',
        priority: 'LOW',
        title: 'UK低价值救济优化',
        description: '当前订单符合UK低价值救济要求',
        actionSteps: ['确保VAT在结账时正确收取', '保持订单价值在£135以下']
      })
    } else if (validation.status === 'WARNING') {
      recommendations.push({
        type: 'PROCESS_IMPROVEMENT',
        priority: 'MEDIUM',
        title: 'UK标准清关流程',
        description: '订单需要标准清关流程和VAT处理',
        actionSteps: [
          '准备详细的商业发票',
          '确保VAT注册信息正确',
          '预计额外的清关时间和费用'
        ]
      })
    }
  }

  /**
   * 生成文档要求
   */
  private generateDocumentRequirements(
    request: TaxCalculationRequest,
    validations: PolicyValidationResult[]
  ): RequiredDocument[] {
    const documents: RequiredDocument[] = []

    // 基础文档
    documents.push({
      type: 'COMMERCIAL_INVOICE',
      name: '商业发票',
      required: true,
      description: '详细的商品清单和价值声明',
      requiredInfo: ['商品名称', '数量', '单价', '总价', 'HSCode', '原产地']
    })

    documents.push({
      type: 'PACKING_LIST',
      name: '装箱单',
      required: true,
      description: '包裹内容和重量信息',
      requiredInfo: ['商品清单', '包装方式', '总重量', '尺寸']
    })

    // 根据目的地添加特定文档
    if (this.isEUCountry(request.destination.countryCode)) {
      const iossValidation = validations.find(v => v.policy.type === 'IOSS')
      if (iossValidation?.status === 'PASS') {
        documents.push({
          type: 'IOSS_NUMBER',
          name: 'IOSS号码声明',
          required: true,
          description: 'EU IOSS注册号码',
          requiredInfo: ['有效的IOSS号码', 'VAT收取证明']
        })
      }
    }

    if (request.destination.countryCode === 'GB') {
      documents.push({
        type: 'VAT_REGISTRATION',
        name: 'UK VAT注册信息',
        required: false,
        description: 'UK VAT注册证明 (如适用)',
        requiredInfo: ['VAT号码', '注册证书']
      })
    }

    // 原产地证明 (高价值订单)
    const totalValue = request.items.reduce((sum, item) => sum + item.totalValue, 0)
    if (totalValue > 1000) {
      documents.push({
        type: 'CERTIFICATE_OF_ORIGIN',
        name: '原产地证明',
        required: false,
        description: '商品原产地官方证明',
        requiredInfo: ['官方原产地证书', '制造商信息']
      })
    }

    return documents
  }

  /**
   * 风险评估
   */
  private assessRisk(
    validations: PolicyValidationResult[],
    riskFactors: RiskFactor[],
    orderValue: number
  ): RiskAssessment {
    let riskScore = 0
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

    // 根据验证结果计算风险分数
    validations.forEach(validation => {
      switch (validation.status) {
        case 'FAIL':
          riskScore += 30
          break
        case 'WARNING':
          riskScore += 15
          break
        case 'PASS':
          riskScore += 0
          break
        case 'N/A':
          riskScore += 5
          break
      }
    })

    // 订单价值风险
    if (orderValue > 5000) {
      riskScore += 20
      riskFactors.push({
        type: 'FINANCIAL',
        level: 'HIGH',
        description: '高价值订单增加海关审查风险',
        impact: '可能面临更严格的检查和文档要求'
      })
    }

    // 确定总体风险等级
    if (riskScore >= 60) {
      overallRisk = 'CRITICAL'
    } else if (riskScore >= 40) {
      overallRisk = 'HIGH'
    } else if (riskScore >= 20) {
      overallRisk = 'MEDIUM'
    }

    const riskExplanation = this.generateRiskExplanation(overallRisk, riskScore, riskFactors)

    return {
      overallRisk,
      riskFactors,
      riskScore,
      riskExplanation
    }
  }

  /**
   * 生成风险说明
   */
  private generateRiskExplanation(
    riskLevel: string,
    score: number,
    factors: RiskFactor[]
  ): string {
    const baseExplanations = {
      'LOW': '当前订单合规风险较低，预计清关顺利',
      'MEDIUM': '存在一些合规风险，建议关注相关政策要求',
      'HIGH': '合规风险较高，需要采取措施降低风险',
      'CRITICAL': '存在严重合规风险，强烈建议调整订单或延期发货'
    }

    let explanation = baseExplanations[riskLevel as keyof typeof baseExplanations]
    
    if (factors.length > 0) {
      explanation += `。主要风险因素包括：${factors.map(f => f.description).join('、')}`
    }

    explanation += `。风险评分：${score}/100`

    return explanation
  }

  /**
   * 计算合规摘要
   */
  private calculateComplianceSummary(validations: PolicyValidationResult[]): {
    totalChecks: number
    passedChecks: number
    failedChecks: number
    warningChecks: number
  } {
    const total = validations.length
    const passed = validations.filter(v => v.status === 'PASS').length
    const failed = validations.filter(v => v.status === 'FAIL').length
    const warnings = validations.filter(v => v.status === 'WARNING').length

    return {
      totalChecks: total,
      passedChecks: passed,
      failedChecks: failed,
      warningChecks: warnings
    }
  }

  /**
   * 确定合规等级
   */
  private determineComplianceLevel(
    validations: PolicyValidationResult[],
    riskAssessment: RiskAssessment
  ): 'FULL' | 'PARTIAL' | 'NON_COMPLIANT' | 'UNKNOWN' {
    const failedCount = validations.filter(v => v.status === 'FAIL').length
    const warningCount = validations.filter(v => v.status === 'WARNING').length

    if (failedCount > 0) {
      return 'NON_COMPLIANT'
    } else if (warningCount > 0 || riskAssessment.overallRisk === 'HIGH') {
      return 'PARTIAL'
    } else if (validations.length > 0) {
      return 'FULL'
    } else {
      return 'UNKNOWN'
    }
  }

  // 辅助方法
  private isEUCountry(countryCode: string): boolean {
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'RO', 'GR', 'CY', 'MT', 'LV', 'LT', 'EE', 'LU', 'PT', 'FI', 'SE', 'DK', 'IE']
    return euCountries.includes(countryCode)
  }

  private async convertToEUR(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === 'EUR') return amount
    const conversion = await this.taxRateProvider.convertCurrency(amount, fromCurrency, 'EUR')
    return conversion.convertedAmount
  }

  private async convertToUSD(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === 'USD') return amount
    const conversion = await this.taxRateProvider.convertCurrency(amount, fromCurrency, 'USD')
    return conversion.convertedAmount
  }

  private async convertToGBP(amount: number, fromCurrency: string): Promise<number> {
    if (fromCurrency === 'GBP') return amount
    const conversion = await this.taxRateProvider.convertCurrency(amount, fromCurrency, 'GBP')
    return conversion.convertedAmount
  }

  private async getDailyAccumulated(destination: any, customerId?: string): Promise<number> {
    // 模拟获取当日累计金额 - 实际项目中应从数据库查询
    return Math.random() * 200 // 随机金额用于演示
  }
}