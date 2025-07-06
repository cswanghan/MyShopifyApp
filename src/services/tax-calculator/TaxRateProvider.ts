/**
 * DTax-Bridge 税率数据提供商
 * 
 * 功能：
 * - 集成多国税率数据源
 * - 实时税率更新和缓存
 * - 支持EU IOSS, UK VAT, US Section 321等政策
 * - 提供税率查询和验证服务
 */

export interface TaxRate {
  /** 国家代码 */
  countryCode: string
  
  /** 州/省代码 */
  stateCode?: string
  
  /** 税种类型 */
  taxType: 'VAT' | 'DUTY' | 'CONSUMPTION_TAX' | 'HANDLING_FEE'
  
  /** 税率值 (小数形式, 如0.19表示19%) */
  rate: number
  
  /** 适用阈值 */
  threshold?: {
    amount: number
    currency: string
  }
  
  /** 商品类别或HSCode */
  category?: string
  hsCode?: string
  
  /** 生效日期 */
  effectiveDate: string
  
  /** 失效日期 */
  expiryDate?: string
  
  /** 税率来源 */
  source: string
  
  /** 最后更新时间 */
  lastUpdated: string
  
  /** 特殊条件 */
  conditions?: {
    minValue?: number
    maxValue?: number
    businessType?: 'B2B' | 'B2C'
    isEUMember?: boolean
    specialPolicy?: string
  }
}

export interface CompliancePolicy {
  /** 政策ID */
  id: string
  
  /** 政策名称 */
  name: string
  
  /** 政策类型 */
  type: 'IOSS' | 'Section321' | 'UkVat' | 'CanadaGST' | 'AustraliaGST'
  
  /** 适用国家/地区 */
  applicableCountries: string[]
  
  /** 阈值设置 */
  thresholds: {
    amount: number
    currency: string
    period?: 'DAILY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    perRecipient?: boolean
  }[]
  
  /** 税率减免 */
  exemptions?: {
    taxType: string
    conditions: string[]
  }[]
  
  /** 特殊规则 */
  specialRules?: {
    description: string
    condition: string
    effect: string
  }[]
  
  /** 有效期 */
  validFrom: string
  validTo?: string
}

export class TaxRateProvider {
  private readonly taxRateCache: Map<string, TaxRate[]> = new Map()
  private readonly policyCache: Map<string, CompliancePolicy> = new Map()
  private readonly cacheExpiry: Map<string, number> = new Map()
  private readonly cacheTTL = 1 * 60 * 60 * 1000 // 1小时缓存
  
  constructor() {
    this.initializeStaticData()
  }

  /**
   * 获取指定国家的税率信息
   */
  async getTaxRates(countryCode: string, options?: {
    stateCode?: string
    hsCode?: string
    category?: string
    businessType?: 'B2B' | 'B2C'
    orderValue?: number
  }): Promise<TaxRate[]> {
    const cacheKey = this.generateCacheKey(countryCode, options)
    
    // 检查缓存
    if (this.isCacheValid(cacheKey)) {
      return this.taxRateCache.get(cacheKey) || []
    }

    // 获取最新税率数据
    const taxRates = await this.fetchTaxRates(countryCode, options)
    
    // 更新缓存
    this.updateCache(cacheKey, taxRates)
    
    return taxRates
  }

  /**
   * 获取合规政策信息
   */
  async getCompliancePolicy(policyType: string, countryCode?: string): Promise<CompliancePolicy | null> {
    const cacheKey = `policy_${policyType}_${countryCode || 'global'}`
    
    if (this.isCacheValid(cacheKey)) {
      return this.policyCache.get(cacheKey) || null
    }

    const policy = await this.fetchCompliancePolicy(policyType, countryCode)
    
    if (policy) {
      this.policyCache.set(cacheKey, policy)
      this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL)
    }
    
    return policy
  }

  /**
   * 检查订单是否符合特定合规政策
   */
  async checkCompliance(
    orderValue: number,
    currency: string,
    countryCode: string,
    customerType: 'B2B' | 'B2C' = 'B2C'
  ): Promise<{
    policies: CompliancePolicy[]
    applicable: { policy: CompliancePolicy; qualifies: boolean; reason: string }[]
    recommendations: string[]
  }> {
    const applicablePolicies: CompliancePolicy[] = []
    const applicabilityResults: { policy: CompliancePolicy; qualifies: boolean; reason: string }[] = []
    const recommendations: string[] = []

    // 检查主要合规政策
    const policyTypes = ['IOSS', 'Section321', 'UkVat']
    
    for (const policyType of policyTypes) {
      const policy = await this.getCompliancePolicy(policyType, countryCode)
      if (policy && policy.applicableCountries.includes(countryCode)) {
        applicablePolicies.push(policy)
        
        // 检查是否符合阈值要求
        const qualificationResult = this.checkPolicyQualification(
          policy, orderValue, currency, customerType
        )
        applicabilityResults.push(qualificationResult)
        
        // 生成建议
        if (qualificationResult.qualifies) {
          recommendations.push(`✅ 符合${policy.name}政策，可享受相关优惠`)
        } else {
          recommendations.push(`⚠️ 不符合${policy.name}政策：${qualificationResult.reason}`)
        }
      }
    }

    return {
      policies: applicablePolicies,
      applicable: applicabilityResults,
      recommendations
    }
  }

  /**
   * 获取实时汇率转换
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ convertedAmount: number; exchangeRate: number; timestamp: string }> {
    // 简化的汇率转换 - 实际项目中应集成真实汇率API
    const exchangeRates: Record<string, Record<string, number>> = {
      'USD': { 'EUR': 0.85, 'GBP': 0.73, 'CNY': 7.2 },
      'EUR': { 'USD': 1.18, 'GBP': 0.86, 'CNY': 8.5 },
      'GBP': { 'USD': 1.37, 'EUR': 1.16, 'CNY': 9.9 },
      'CNY': { 'USD': 0.14, 'EUR': 0.12, 'GBP': 0.10 }
    }

    if (fromCurrency === toCurrency) {
      return {
        convertedAmount: amount,
        exchangeRate: 1,
        timestamp: new Date().toISOString()
      }
    }

    const rate = exchangeRates[fromCurrency]?.[toCurrency] || 1
    return {
      convertedAmount: Math.round(amount * rate * 100) / 100,
      exchangeRate: rate,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 初始化静态数据
   */
  private initializeStaticData(): void {
    // 初始化常用国家税率数据
    this.initializeUSRates()
    this.initializeEUVATRates()
    this.initializeUKRates()
    this.initializeCompliancePolicies()
  }

  /**
   * 初始化美国税率
   */
  private initializeUSRates(): void {
    const usRates: TaxRate[] = [
      {
        countryCode: 'US',
        taxType: 'DUTY',
        rate: 0,
        threshold: { amount: 800, currency: 'USD' },
        effectiveDate: '2016-03-10',
        source: 'US Customs - Section 321',
        lastUpdated: new Date().toISOString(),
        conditions: {
          maxValue: 800,
          specialPolicy: 'Section 321 De Minimis'
        }
      },
      {
        countryCode: 'US',
        stateCode: 'CA',
        taxType: 'CONSUMPTION_TAX',
        rate: 0.08,
        effectiveDate: '2023-01-01',
        source: 'California State Tax',
        lastUpdated: new Date().toISOString()
      },
      {
        countryCode: 'US',
        stateCode: 'NY',
        taxType: 'CONSUMPTION_TAX',
        rate: 0.08,
        effectiveDate: '2023-01-01',
        source: 'New York State Tax',
        lastUpdated: new Date().toISOString()
      }
    ]

    this.taxRateCache.set('US', usRates)
    this.cacheExpiry.set('US', Date.now() + this.cacheTTL)
  }

  /**
   * 初始化欧盟VAT税率
   */
  private initializeEUVATRates(): void {
    const euCountries = [
      { code: 'DE', rate: 0.19, name: 'Germany' },
      { code: 'FR', rate: 0.20, name: 'France' },
      { code: 'IT', rate: 0.22, name: 'Italy' },
      { code: 'ES', rate: 0.21, name: 'Spain' },
      { code: 'NL', rate: 0.21, name: 'Netherlands' },
      { code: 'BE', rate: 0.21, name: 'Belgium' },
      { code: 'AT', rate: 0.20, name: 'Austria' },
      { code: 'PL', rate: 0.23, name: 'Poland' }
    ]

    euCountries.forEach(country => {
      const rates: TaxRate[] = [
        {
          countryCode: country.code,
          taxType: 'VAT',
          rate: country.rate,
          threshold: { amount: 150, currency: 'EUR' },
          effectiveDate: '2021-07-01',
          source: 'EU IOSS Regulation',
          lastUpdated: new Date().toISOString(),
          conditions: {
            maxValue: 150,
            isEUMember: true,
            specialPolicy: 'IOSS'
          }
        },
        {
          countryCode: country.code,
          taxType: 'DUTY',
          rate: 0.04,
          threshold: { amount: 150, currency: 'EUR' },
          effectiveDate: '2021-07-01',
          source: 'EU Customs Union',
          lastUpdated: new Date().toISOString(),
          conditions: {
            minValue: 150,
            isEUMember: true
          }
        }
      ]

      this.taxRateCache.set(country.code, rates)
      this.cacheExpiry.set(country.code, Date.now() + this.cacheTTL)
    })
  }

  /**
   * 初始化英国税率
   */
  private initializeUKRates(): void {
    const ukRates: TaxRate[] = [
      {
        countryCode: 'GB',
        taxType: 'VAT',
        rate: 0.20,
        threshold: { amount: 135, currency: 'GBP' },
        effectiveDate: '2021-01-01',
        source: 'UK HMRC',
        lastUpdated: new Date().toISOString(),
        conditions: {
          maxValue: 135,
          specialPolicy: 'Low Value Relief'
        }
      },
      {
        countryCode: 'GB',
        taxType: 'DUTY',
        rate: 0.05,
        threshold: { amount: 135, currency: 'GBP' },
        effectiveDate: '2021-01-01',
        source: 'UK HMRC',
        lastUpdated: new Date().toISOString(),
        conditions: {
          minValue: 135
        }
      }
    ]

    this.taxRateCache.set('GB', ukRates)
    this.cacheExpiry.set('GB', Date.now() + this.cacheTTL)
  }

  /**
   * 初始化合规政策
   */
  private initializeCompliancePolicies(): void {
    // IOSS政策
    const iossPolicy: CompliancePolicy = {
      id: 'IOSS_EU',
      name: 'EU Import One-Stop Shop',
      type: 'IOSS',
      applicableCountries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'RO', 'GR', 'CY', 'MT', 'LV', 'LT', 'EE', 'LU', 'PT', 'FI', 'SE', 'DK', 'IE'],
      thresholds: [
        { amount: 150, currency: 'EUR' }
      ],
      exemptions: [
        {
          taxType: 'DUTY',
          conditions: ['Order value ≤ €150', 'Goods shipped from third country']
        }
      ],
      specialRules: [
        {
          description: 'Simplified VAT collection',
          condition: 'Order value ≤ €150',
          effect: 'VAT collected at checkout, no additional charges'
        }
      ],
      validFrom: '2021-07-01'
    }

    // Section 321政策
    const section321Policy: CompliancePolicy = {
      id: 'Section321_US',
      name: 'US Section 321 De Minimis',
      type: 'Section321',
      applicableCountries: ['US'],
      thresholds: [
        { amount: 800, currency: 'USD', period: 'DAILY', perRecipient: true }
      ],
      exemptions: [
        {
          taxType: 'DUTY',
          conditions: ['Order value ≤ $800', 'Single recipient per day']
        }
      ],
      specialRules: [
        {
          description: 'Daily limit per recipient',
          condition: 'Single consignee address',
          effect: 'No duty or tax on qualifying shipments'
        }
      ],
      validFrom: '2016-03-10'
    }

    // UK VAT政策
    const ukVatPolicy: CompliancePolicy = {
      id: 'UkVat_GB',
      name: 'UK Low Value Relief',
      type: 'UkVat',
      applicableCountries: ['GB'],
      thresholds: [
        { amount: 135, currency: 'GBP' }
      ],
      exemptions: [
        {
          taxType: 'DUTY',
          conditions: ['Order value ≤ £135']
        }
      ],
      specialRules: [
        {
          description: 'VAT charged on all goods',
          condition: 'Any value',
          effect: '20% VAT applied at checkout for orders ≤ £135'
        }
      ],
      validFrom: '2021-01-01'
    }

    this.policyCache.set('IOSS', iossPolicy)
    this.policyCache.set('Section321', section321Policy)
    this.policyCache.set('UkVat', ukVatPolicy)
  }

  /**
   * 获取税率数据 (模拟API调用)
   */
  private async fetchTaxRates(countryCode: string, options?: any): Promise<TaxRate[]> {
    // 如果缓存中已有数据，直接返回
    if (this.taxRateCache.has(countryCode)) {
      return this.taxRateCache.get(countryCode) || []
    }

    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 100))

    // 返回默认税率 (实际项目中应调用真实API)
    return [
      {
        countryCode,
        taxType: 'VAT',
        rate: 0.20,
        effectiveDate: new Date().toISOString(),
        source: 'Default Rate',
        lastUpdated: new Date().toISOString()
      }
    ]
  }

  /**
   * 获取合规政策数据
   */
  private async fetchCompliancePolicy(policyType: string, countryCode?: string): Promise<CompliancePolicy | null> {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 50))

    return this.policyCache.get(policyType) || null
  }

  /**
   * 检查政策符合性
   */
  private checkPolicyQualification(
    policy: CompliancePolicy,
    orderValue: number,
    currency: string,
    customerType: 'B2B' | 'B2C'
  ): { policy: CompliancePolicy; qualifies: boolean; reason: string } {
    for (const threshold of policy.thresholds) {
      // 简化的货币转换检查
      let adjustedOrderValue = orderValue
      if (threshold.currency !== currency) {
        // 这里应该进行实际的货币转换
        adjustedOrderValue = orderValue // 简化处理
      }

      if (adjustedOrderValue <= threshold.amount) {
        return {
          policy,
          qualifies: true,
          reason: `订单金额 ${adjustedOrderValue} ${threshold.currency} 符合 ${threshold.amount} ${threshold.currency} 阈值要求`
        }
      }
    }

    return {
      policy,
      qualifies: false,
      reason: `订单金额超过政策阈值要求`
    }
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(countryCode: string, options?: any): string {
    const keyParts = [countryCode]
    if (options?.stateCode) keyParts.push(options.stateCode)
    if (options?.hsCode) keyParts.push(options.hsCode)
    if (options?.businessType) keyParts.push(options.businessType)
    return keyParts.join('_')
  }

  /**
   * 检查缓存有效性
   */
  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey)
    return expiry ? Date.now() < expiry : false
  }

  /**
   * 更新缓存
   */
  private updateCache(cacheKey: string, data: TaxRate[]): void {
    this.taxRateCache.set(cacheKey, data)
    this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL)
  }

  /**
   * 清除过期缓存
   */
  public clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.taxRateCache.delete(key)
        this.cacheExpiry.delete(key)
      }
    }
  }

  /**
   * 强制更新税率数据
   */
  public async forceUpdateRates(countryCode: string): Promise<void> {
    const cacheKey = countryCode
    this.taxRateCache.delete(cacheKey)
    this.cacheExpiry.delete(cacheKey)
    await this.getTaxRates(countryCode)
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): {
    taxRateEntries: number
    policyEntries: number
    expiredEntries: number
  } {
    const now = Date.now()
    const expiredEntries = Array.from(this.cacheExpiry.values())
      .filter(expiry => now >= expiry).length

    return {
      taxRateEntries: this.taxRateCache.size,
      policyEntries: this.policyCache.size,
      expiredEntries
    }
  }
}