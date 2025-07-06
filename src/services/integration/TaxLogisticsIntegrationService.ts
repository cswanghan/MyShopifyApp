// 税费计算与物流服务集成

import { TaxCalculatorService } from '../tax-calculator/TaxCalculatorService'
import { LogisticsService } from '../logistics/LogisticsService'
import {
  TaxCalculationRequest,
  TaxCalculationResult
} from '../tax-calculator/models/TaxCalculationRequest'
import {
  LogisticsRequest,
  LogisticsQuote,
  LogisticsResponse,
  Currency,
  DeliveryMode
} from '../logistics/models/LogisticsModels'

export interface IntegratedQuoteRequest {
  // 订单基础信息
  orderId?: string
  currency: Currency
  
  // 商品信息
  items: IntegratedOrderItem[]
  
  // 地址信息
  origin: AddressInfo
  destination: AddressInfo
  
  // 客户信息
  customerInfo?: CustomerInfo
  
  // 偏好设置
  preferences?: {
    deliveryMode?: DeliveryMode
    maxDeliveryTime?: number
    maxCost?: number
    preferredProviders?: string[]
    includeInsurance?: boolean
  }
  
  // 选项
  options?: {
    includeTaxOptimization?: boolean
    includeComplianceCheck?: boolean
    includeRecommendations?: boolean
    maxQuotes?: number
  }
}

export interface IntegratedOrderItem {
  id: string
  sku: string
  title: string
  description: string
  hsCode?: string
  category?: string
  weight: { value: number, unit: 'KG' | 'LB' | 'G' | 'OZ' }
  dimensions: { length: number, width: number, height: number, unit: 'CM' | 'IN' }
  unitPrice: { amount: number, currency: Currency }
  quantity: number
  originCountry?: string
  isDangerous?: boolean
  requiresSignature?: boolean
}

export interface AddressInfo {
  countryCode: string
  stateCode?: string
  city: string
  postalCode: string
  addressLine1: string
  addressLine2?: string
  phone?: string
  email?: string
  company?: string
  contactName?: string
}

export interface CustomerInfo {
  id?: string
  email?: string
  phone?: string
  type?: 'INDIVIDUAL' | 'BUSINESS'
  taxNumber?: string
  isVATRegistered?: boolean
}

export interface IntegratedQuoteResponse {
  requestId: string
  quotes: IntegratedQuote[]
  analysis: QuoteAnalysis
  recommendations: Recommendation[]
  errors?: IntegrationError[]
  processingTime: number
  timestamp: Date
}

export interface IntegratedQuote {
  quoteId: string
  providerId: string
  providerName: string
  serviceCode: string
  serviceName: string
  deliveryMode: DeliveryMode
  
  // 成本详情
  costs: {
    productValue: MoneyAmount
    shipping: MoneyAmount
    taxes: TaxBreakdown
    insurance?: MoneyAmount
    total: MoneyAmount
  }
  
  // 时效信息
  delivery: {
    estimatedDays: number
    minDays?: number
    maxDays?: number
    guaranteedDelivery: boolean
  }
  
  // 合规信息
  compliance: {
    regime: 'IOSS' | 'UK_VAT' | 'US_SECTION_321' | 'STANDARD' | 'NONE'
    taxNumber?: string
    isCompliant: boolean
    warnings?: string[]
  }
  
  // 特性
  features: string[]
  restrictions?: string[]
  
  // 评分
  score: {
    overall: number
    cost: number
    time: number
    compliance: number
    reliability: number
  }
  
  // 元数据
  metadata: {
    taxCalculationId: string
    logisticsQuoteId: string
    optimizations?: string[]
    originalTaxResult: TaxCalculationResult
    originalLogisticsQuote: LogisticsQuote
  }
}

export interface MoneyAmount {
  amount: number
  currency: Currency
}

export interface TaxBreakdown {
  vat?: MoneyAmount
  duty?: MoneyAmount
  excise?: MoneyAmount
  other?: MoneyAmount
  total: MoneyAmount
  breakdown?: Array<{
    type: string
    rate: number
    amount: MoneyAmount
    description?: string
  }>
}

export interface QuoteAnalysis {
  totalQuotes: number
  costRange: { min: MoneyAmount, max: MoneyAmount }
  timeRange: { min: number, max: number }
  bestValue: IntegratedQuote
  fastest: IntegratedQuote
  mostCompliant: IntegratedQuote
  savings: {
    bestVsWorst: MoneyAmount
    percentage: number
  }
  complianceStats: {
    fullyCompliant: number
    partiallyCompliant: number
    nonCompliant: number
  }
}

export interface Recommendation {
  type: 'COST_OPTIMIZATION' | 'COMPLIANCE' | 'TIME_OPTIMIZATION' | 'RISK_MITIGATION'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  action?: string
  savings?: MoneyAmount
  impact?: string
}

export interface IntegrationError {
  code: string
  message: string
  service: 'TAX' | 'LOGISTICS' | 'INTEGRATION'
  details?: any
}

export class TaxLogisticsIntegrationService {
  private taxCalculator: TaxCalculatorService
  private logisticsService: LogisticsService
  
  constructor(taxCalculator: TaxCalculatorService, logisticsService: LogisticsService) {
    this.taxCalculator = taxCalculator
    this.logisticsService = logisticsService
  }
  
  // 获取集成报价
  async getIntegratedQuotes(request: IntegratedQuoteRequest): Promise<IntegratedQuoteResponse> {
    const startTime = Date.now()
    const requestId = this.generateRequestId()
    
    try {
      // 1. 并行获取税费计算和物流报价
      const [taxResults, logisticsQuotes] = await Promise.all([
        this.calculateTaxes(request),
        this.getLogisticsQuotes(request)
      ])
      
      // 2. 整合报价
      const integratedQuotes = await this.integrateQuotes(
        taxResults,
        logisticsQuotes,
        request
      )
      
      // 3. 分析和排序
      const sortedQuotes = this.sortQuotesByScore(integratedQuotes)
      const analysis = this.analyzeQuotes(sortedQuotes)
      
      // 4. 生成建议
      const recommendations = this.generateRecommendations(
        sortedQuotes,
        analysis,
        request
      )
      
      return {
        requestId,
        quotes: sortedQuotes.slice(0, request.options?.maxQuotes || 10),
        analysis,
        recommendations,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      }
    } catch (error) {
      throw new Error(`Integration service failed: ${error.message}`)
    }
  }
  
  // DDP vs DAP 成本对比分析
  async compareDDPvsDAP(request: IntegratedQuoteRequest): Promise<{
    ddp: {
      quotes: IntegratedQuote[]
      averageCost: MoneyAmount
      bestQuote: IntegratedQuote
    }
    dap: {
      quotes: IntegratedQuote[]
      averageCost: MoneyAmount
      bestQuote: IntegratedQuote
    }
    recommendation: {
      preferred: 'DDP' | 'DAP'
      reason: string
      savings: MoneyAmount
      considerations: string[]
    }
  }> {
    // 获取DDP报价
    const ddpRequest = { ...request, preferences: { ...request.preferences, deliveryMode: 'DDP' } }
    const ddpResponse = await this.getIntegratedQuotes(ddpRequest)
    
    // 获取DAP报价
    const dapRequest = { ...request, preferences: { ...request.preferences, deliveryMode: 'DAP' } }
    const dapResponse = await this.getIntegratedQuotes(dapRequest)
    
    // 分析结果
    const ddpQuotes = ddpResponse.quotes
    const dapQuotes = dapResponse.quotes
    
    const ddpAverage = this.calculateAverageCost(ddpQuotes)
    const dapAverage = this.calculateAverageCost(dapQuotes)
    
    const ddpBest = ddpQuotes[0]
    const dapBest = dapQuotes[0]
    
    // 生成推荐
    const recommendation = this.generateDDPDAPRecommendation(
      ddpBest,
      dapBest,
      ddpAverage,
      dapAverage,
      request
    )
    
    return {
      ddp: {
        quotes: ddpQuotes,
        averageCost: ddpAverage,
        bestQuote: ddpBest
      },
      dap: {
        quotes: dapQuotes,
        averageCost: dapAverage,
        bestQuote: dapBest
      },
      recommendation
    }
  }
  
  // 实时物流优化建议
  async getOptimizationSuggestions(request: IntegratedQuoteRequest): Promise<{
    current: IntegratedQuote
    optimized: IntegratedQuote[]
    savings: MoneyAmount
    optimizations: Array<{
      type: string
      description: string
      impact: string
      savings?: MoneyAmount
    }>
  }> {
    // 获取当前最佳报价
    const response = await this.getIntegratedQuotes(request)
    const current = response.quotes[0]
    
    // 尝试各种优化策略
    const optimizations = await this.tryOptimizations(request, current)
    
    return optimizations
  }
  
  // 私有方法
  private async calculateTaxes(request: IntegratedQuoteRequest): Promise<TaxCalculationResult[]> {
    const taxRequests = this.buildTaxRequests(request)
    const results: TaxCalculationResult[] = []
    
    for (const taxRequest of taxRequests) {
      try {
        const result = await this.taxCalculator.calculateTax(taxRequest)
        results.push(result)
      } catch (error) {
        console.error('Tax calculation failed:', error)
        // 创建错误结果
        results.push(this.createErrorTaxResult(taxRequest, error))
      }
    }
    
    return results
  }
  
  private async getLogisticsQuotes(request: IntegratedQuoteRequest): Promise<LogisticsQuote[]> {
    const logisticsRequest = this.buildLogisticsRequest(request)
    
    try {
      const allQuotes = await this.logisticsService.getAllQuotes(logisticsRequest)
      return allQuotes
    } catch (error) {
      console.error('Logistics quotes failed:', error)
      return []
    }
  }
  
  private buildTaxRequests(request: IntegratedQuoteRequest): TaxCalculationRequest[] {
    const deliveryModes: DeliveryMode[] = request.preferences?.deliveryMode 
      ? [request.preferences.deliveryMode]
      : ['DDP', 'DAP']
    
    return deliveryModes.map(mode => ({
      orderId: request.orderId,
      currency: request.currency,
      items: request.items.map(item => ({
        id: item.id,
        sku: item.sku,
        title: item.title,
        description: item.description,
        hsCode: item.hsCode,
        category: item.category,
        unitPrice: item.unitPrice.amount,
        quantity: item.quantity,
        weight: item.weight.value,
        originCountry: item.originCountry || request.origin.countryCode
      })),
      destination: {
        countryCode: request.destination.countryCode,
        stateCode: request.destination.stateCode,
        postalCode: request.destination.postalCode,
        city: request.destination.city,
        address: request.destination.addressLine1
      },
      customerInfo: request.customerInfo,
      shippingInfo: {
        method: mode,
        carrier: 'TBD'
      },
      options: {
        includeInsurance: request.preferences?.includeInsurance || false,
        optimizeForCompliance: request.options?.includeComplianceCheck !== false
      }
    }))
  }
  
  private buildLogisticsRequest(request: IntegratedQuoteRequest): LogisticsRequest {
    return {
      orderId: request.orderId,
      origin: {
        countryCode: request.origin.countryCode,
        stateCode: request.origin.stateCode,
        city: request.origin.city,
        postalCode: request.origin.postalCode,
        addressLine1: request.origin.addressLine1,
        addressLine2: request.origin.addressLine2,
        phone: request.origin.phone,
        email: request.origin.email,
        company: request.origin.company,
        contactName: request.origin.contactName
      },
      destination: {
        countryCode: request.destination.countryCode,
        stateCode: request.destination.stateCode,
        city: request.destination.city,
        postalCode: request.destination.postalCode,
        addressLine1: request.destination.addressLine1,
        addressLine2: request.destination.addressLine2,
        phone: request.destination.phone,
        email: request.destination.email,
        company: request.destination.company,
        contactName: request.destination.contactName
      },
      packages: request.items.map(item => ({
        weight: {
          value: item.weight.value * item.quantity,
          unit: item.weight.unit
        },
        dimensions: {
          length: item.dimensions.length,
          width: item.dimensions.width,
          height: item.dimensions.height,
          unit: item.dimensions.unit
        },
        value: {
          amount: item.unitPrice.amount * item.quantity,
          currency: item.unitPrice.currency
        },
        hsCode: item.hsCode,
        description: item.description,
        quantity: item.quantity,
        isDangerous: item.isDangerous,
        requiresSignature: item.requiresSignature
      })),
      shipmentValue: {
        amount: request.items.reduce((sum, item) => 
          sum + (item.unitPrice.amount * item.quantity), 0),
        currency: request.currency
      },
      preferredMode: request.preferences?.deliveryMode,
      requiredServices: request.preferences?.includeInsurance ? ['INSURANCE'] : undefined
    }
  }
  
  private async integrateQuotes(
    taxResults: TaxCalculationResult[],
    logisticsQuotes: LogisticsQuote[],
    request: IntegratedQuoteRequest
  ): Promise<IntegratedQuote[]> {
    const integratedQuotes: IntegratedQuote[] = []
    
    for (const logisticsQuote of logisticsQuotes) {
      // 找到匹配的税费计算结果
      const matchingTaxResult = this.findMatchingTaxResult(
        taxResults,
        logisticsQuote.deliveryMode
      )
      
      if (matchingTaxResult) {
        const integratedQuote = this.createIntegratedQuote(
          logisticsQuote,
          matchingTaxResult,
          request
        )
        integratedQuotes.push(integratedQuote)
      }
    }
    
    return integratedQuotes
  }
  
  private findMatchingTaxResult(
    taxResults: TaxCalculationResult[],
    deliveryMode: DeliveryMode
  ): TaxCalculationResult | null {
    return taxResults.find(result => 
      result.shippingMethod === deliveryMode
    ) || taxResults[0] || null
  }
  
  private createIntegratedQuote(
    logisticsQuote: LogisticsQuote,
    taxResult: TaxCalculationResult,
    request: IntegratedQuoteRequest
  ): IntegratedQuote {
    const productValue = {
      amount: request.items.reduce((sum, item) => 
        sum + (item.unitPrice.amount * item.quantity), 0),
      currency: request.currency
    }
    
    const totalCost = {
      amount: productValue.amount + 
              logisticsQuote.pricing.netCost.amount + 
              taxResult.totalTax,
      currency: request.currency
    }
    
    const score = this.calculateQuoteScore(logisticsQuote, taxResult, request)
    
    return {
      quoteId: `integrated_${logisticsQuote.quoteId}_${taxResult.calculationId}`,
      providerId: logisticsQuote.metadata?.providerId || 'unknown',
      providerName: logisticsQuote.metadata?.providerName || 'Unknown Provider',
      serviceCode: logisticsQuote.serviceCode,
      serviceName: logisticsQuote.serviceName,
      deliveryMode: logisticsQuote.deliveryMode,
      
      costs: {
        productValue,
        shipping: {
          amount: logisticsQuote.pricing.netCost.amount,
          currency: logisticsQuote.pricing.netCost.currency as Currency
        },
        taxes: this.buildTaxBreakdown(taxResult),
        insurance: logisticsQuote.insurance?.cost ? {
          amount: logisticsQuote.insurance.cost.amount,
          currency: logisticsQuote.insurance.cost.currency as Currency
        } : undefined,
        total: totalCost
      },
      
      delivery: {
        estimatedDays: logisticsQuote.deliveryTime.estimatedDays,
        minDays: logisticsQuote.deliveryTime.minDays,
        maxDays: logisticsQuote.deliveryTime.maxDays,
        guaranteedDelivery: logisticsQuote.deliveryTime.guaranteedDelivery || false
      },
      
      compliance: this.buildComplianceInfo(taxResult),
      
      features: logisticsQuote.features.map(f => f.name),
      restrictions: logisticsQuote.restrictions?.map(r => r.description),
      
      score,
      
      metadata: {
        taxCalculationId: taxResult.calculationId,
        logisticsQuoteId: logisticsQuote.quoteId,
        originalTaxResult: taxResult,
        originalLogisticsQuote: logisticsQuote
      }
    }
  }
  
  private buildTaxBreakdown(taxResult: TaxCalculationResult): TaxBreakdown {
    const breakdown: TaxBreakdown = {
      total: {
        amount: taxResult.totalTax,
        currency: taxResult.currency as Currency
      },
      breakdown: taxResult.breakdown?.map(item => ({
        type: item.type,
        rate: item.rate,
        amount: {
          amount: item.amount,
          currency: taxResult.currency as Currency
        },
        description: item.description
      }))
    }
    
    // 分类税费
    if (taxResult.breakdown) {
      for (const item of taxResult.breakdown) {
        switch (item.type.toLowerCase()) {
          case 'vat':
          case 'sales_tax':
            breakdown.vat = {
              amount: item.amount,
              currency: taxResult.currency as Currency
            }
            break
          case 'duty':
          case 'customs_duty':
            breakdown.duty = {
              amount: item.amount,
              currency: taxResult.currency as Currency
            }
            break
          case 'excise':
            breakdown.excise = {
              amount: item.amount,
              currency: taxResult.currency as Currency
            }
            break
          default:
            if (!breakdown.other) {
              breakdown.other = {
                amount: item.amount,
                currency: taxResult.currency as Currency
              }
            } else {
              breakdown.other.amount += item.amount
            }
        }
      }
    }
    
    return breakdown
  }
  
  private buildComplianceInfo(taxResult: TaxCalculationResult): IntegratedQuote['compliance'] {
    let regime: IntegratedQuote['compliance']['regime'] = 'NONE'
    
    if (taxResult.complianceInfo?.regime) {
      switch (taxResult.complianceInfo.regime) {
        case 'IOSS':
          regime = 'IOSS'
          break
        case 'UK_VAT':
          regime = 'UK_VAT'
          break
        case 'US_SECTION_321':
          regime = 'US_SECTION_321'
          break
        default:
          regime = 'STANDARD'
      }
    }
    
    return {
      regime,
      taxNumber: taxResult.complianceInfo?.taxNumber,
      isCompliant: taxResult.complianceInfo?.isCompliant || false,
      warnings: taxResult.complianceInfo?.warnings
    }
  }
  
  private calculateQuoteScore(
    logisticsQuote: LogisticsQuote,
    taxResult: TaxCalculationResult,
    request: IntegratedQuoteRequest
  ): IntegratedQuote['score'] {
    // 成本评分 (0-100, 越低越好)
    const costScore = Math.max(0, 100 - (logisticsQuote.pricing.netCost.amount / 100))
    
    // 时效评分 (0-100, 越快越好)
    const timeScore = Math.max(0, 100 - (logisticsQuote.deliveryTime.estimatedDays * 5))
    
    // 合规评分 (0-100)
    const complianceScore = taxResult.complianceInfo?.isCompliant ? 100 : 
                           taxResult.complianceInfo?.regime ? 70 : 30
    
    // 可靠性评分 (0-100)
    const reliabilityScore = logisticsQuote.deliveryTime.guaranteedDelivery ? 90 : 70
    
    // 综合评分
    const overall = (costScore * 0.3 + timeScore * 0.25 + complianceScore * 0.25 + reliabilityScore * 0.2)
    
    return {
      overall: Math.round(overall),
      cost: Math.round(costScore),
      time: Math.round(timeScore),
      compliance: Math.round(complianceScore),
      reliability: Math.round(reliabilityScore)
    }
  }
  
  private sortQuotesByScore(quotes: IntegratedQuote[]): IntegratedQuote[] {
    return quotes.sort((a, b) => b.score.overall - a.score.overall)
  }
  
  private analyzeQuotes(quotes: IntegratedQuote[]): QuoteAnalysis {
    if (quotes.length === 0) {
      throw new Error('No quotes to analyze')
    }
    
    const costs = quotes.map(q => q.costs.total)
    const times = quotes.map(q => q.delivery.estimatedDays)
    
    const minCost = Math.min(...costs.map(c => c.amount))
    const maxCost = Math.max(...costs.map(c => c.amount))
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    const bestValue = quotes.reduce((prev, current) => 
      prev.score.overall > current.score.overall ? prev : current
    )
    
    const fastest = quotes.reduce((prev, current) => 
      prev.delivery.estimatedDays < current.delivery.estimatedDays ? prev : current
    )
    
    const mostCompliant = quotes.reduce((prev, current) => 
      prev.score.compliance > current.score.compliance ? prev : current
    )
    
    return {
      totalQuotes: quotes.length,
      costRange: {
        min: { amount: minCost, currency: quotes[0].costs.total.currency },
        max: { amount: maxCost, currency: quotes[0].costs.total.currency }
      },
      timeRange: { min: minTime, max: maxTime },
      bestValue,
      fastest,
      mostCompliant,
      savings: {
        bestVsWorst: { 
          amount: maxCost - minCost, 
          currency: quotes[0].costs.total.currency 
        },
        percentage: ((maxCost - minCost) / maxCost) * 100
      },
      complianceStats: {
        fullyCompliant: quotes.filter(q => q.compliance.isCompliant).length,
        partiallyCompliant: quotes.filter(q => !q.compliance.isCompliant && q.compliance.regime !== 'NONE').length,
        nonCompliant: quotes.filter(q => q.compliance.regime === 'NONE').length
      }
    }
  }
  
  private generateRecommendations(
    quotes: IntegratedQuote[],
    analysis: QuoteAnalysis,
    request: IntegratedQuoteRequest
  ): Recommendation[] {
    const recommendations: Recommendation[] = []
    
    // 成本优化建议
    if (analysis.savings.percentage > 20) {
      recommendations.push({
        type: 'COST_OPTIMIZATION',
        priority: 'HIGH',
        title: '选择经济型物流可节省大量成本',
        description: `选择最经济的物流方案可节省 ${analysis.savings.bestVsWorst.amount.toFixed(2)} ${analysis.savings.bestVsWorst.currency}`,
        savings: analysis.savings.bestVsWorst
      })
    }
    
    // 合规建议
    if (analysis.complianceStats.nonCompliant > 0) {
      recommendations.push({
        type: 'COMPLIANCE',
        priority: 'HIGH',
        title: '选择合规方案避免清关风险',
        description: '建议选择支持IOSS或相关税务合规的物流方案，避免包裹被海关扣留'
      })
    }
    
    // 时效优化
    if (analysis.timeRange.max - analysis.timeRange.min > 10) {
      recommendations.push({
        type: 'TIME_OPTIMIZATION',
        priority: 'MEDIUM',
        title: '快递服务可显著缩短配送时间',
        description: `选择快递服务可将配送时间从 ${analysis.timeRange.max} 天缩短至 ${analysis.timeRange.min} 天`
      })
    }
    
    return recommendations
  }
  
  private calculateAverageCost(quotes: IntegratedQuote[]): MoneyAmount {
    if (quotes.length === 0) {
      return { amount: 0, currency: 'USD' }
    }
    
    const total = quotes.reduce((sum, quote) => sum + quote.costs.total.amount, 0)
    return {
      amount: total / quotes.length,
      currency: quotes[0].costs.total.currency
    }
  }
  
  private generateDDPDAPRecommendation(
    ddpBest: IntegratedQuote,
    dapBest: IntegratedQuote,
    ddpAverage: MoneyAmount,
    dapAverage: MoneyAmount,
    request: IntegratedQuoteRequest
  ): any {
    const ddpCost = ddpBest.costs.total.amount
    const dapCost = dapBest.costs.total.amount
    
    const preferred = ddpCost < dapCost ? 'DDP' : 'DAP'
    const savings = {
      amount: Math.abs(ddpCost - dapCost),
      currency: ddpBest.costs.total.currency
    }
    
    const considerations = []
    
    if (preferred === 'DDP') {
      considerations.push('客户无需额外缴税，购物体验更好')
      considerations.push('降低包裹被海关扣留的风险')
      if (ddpBest.compliance.isCompliant) {
        considerations.push('享受税务合规优势')
      }
    } else {
      considerations.push('初始成本较低，但客户可能需要承担额外税费')
      considerations.push('存在清关延误风险')
    }
    
    return {
      preferred,
      reason: preferred === 'DDP' 
        ? `DDP方案总成本更低，且客户体验更好`
        : `DAP方案初始成本更低`,
      savings,
      considerations
    }
  }
  
  private async tryOptimizations(
    request: IntegratedQuoteRequest,
    current: IntegratedQuote
  ): Promise<any> {
    // 实现优化逻辑
    // 这里简化实现
    return {
      current,
      optimized: [],
      savings: { amount: 0, currency: current.costs.total.currency },
      optimizations: []
    }
  }
  
  private createErrorTaxResult(request: TaxCalculationRequest, error: any): TaxCalculationResult {
    return {
      calculationId: 'error_' + Date.now(),
      currency: request.currency,
      totalValue: request.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
      totalTax: 0,
      breakdown: [],
      shippingMethod: request.shippingInfo?.method || 'UNKNOWN',
      errors: [{ code: 'CALCULATION_ERROR', message: error.message }],
      processingTime: 0,
      timestamp: new Date(),
      metadata: { error: true }
    }
  }
  
  private generateRequestId(): string {
    return `integrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}