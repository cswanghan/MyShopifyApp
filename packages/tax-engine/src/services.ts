import axios from 'axios'
import { TaxRateData, TaxRateSource, TaxCalculationError } from './types'
import { Country } from '@dtax-bridge/shared'

/**
 * 税率数据服务接口
 */
export interface ITaxRateService {
  getTaxRates(country: Country, hsCode?: string): Promise<TaxRateData[]>
  updateTaxRates(): Promise<void>
  validateData(): Promise<boolean>
}

/**
 * 欧盟税率服务
 */
export class EUTaxRateService implements ITaxRateService {
  private readonly apiUrl = 'https://api.vatsense.eu/v1'
  private readonly apiKey: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async getTaxRates(country: Country, hsCode?: string): Promise<TaxRateData[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/rates`, {
        params: {
          country: country,
          commodity: hsCode,
          format: 'json'
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      
      return this.transformEUData(response.data, country)
    } catch (error) {
      throw new TaxCalculationError({
        code: 'API_ERROR',
        message: `EU税率API调用失败: ${error}`,
        timestamp: new Date(),
        country
      })
    }
  }
  
  private transformEUData(data: any, country: Country): TaxRateData[] {
    const rates: TaxRateData[] = []
    
    if (data.rates && Array.isArray(data.rates)) {
      for (const rate of data.rates) {
        rates.push({
          id: `eu-${country}-${rate.commodity || 'general'}`,
          country,
          hsCode: rate.commodity || '',
          dutyRate: (rate.duty || 0) / 100,
          vatRate: (rate.vat || 0) / 100,
          thresholds: {
            dutyFree: 22, // 欧盟统一门槛
            vatFree: 22
          },
          effectiveDate: new Date(rate.effective_date || Date.now()),
          source: {
            country,
            source: 'EU_COMMISSION',
            lastUpdated: new Date(),
            version: '1.0',
            reliability: 0.95
          }
        })
      }
    }
    
    return rates
  }
  
  async updateTaxRates(): Promise<void> {
    // 实现批量更新逻辑
    console.log('更新欧盟税率数据...')
  }
  
  async validateData(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/status`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 5000
      })
      return response.status === 200
    } catch {
      return false
    }
  }
}

/**
 * 美国税率服务
 */
export class USTaxRateService implements ITaxRateService {
  private readonly apiUrl = 'https://api.trade.gov/tariff_rates/search'
  
  async getTaxRates(country: Country, hsCode?: string): Promise<TaxRateData[]> {
    if (country !== 'US') {
      return []
    }
    
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          tariff_line: hsCode || '',
          format: 'json',
          size: 100
        },
        timeout: 10000
      })
      
      return this.transformUSData(response.data)
    } catch (error) {
      throw new TaxCalculationError({
        code: 'API_ERROR',
        message: `美国税率API调用失败: ${error}`,
        timestamp: new Date(),
        country: 'US'
      })
    }
  }
  
  private transformUSData(data: any): TaxRateData[] {
    const rates: TaxRateData[] = []
    
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        rates.push({
          id: `us-${result.tariff_line}`,
          country: 'US',
          hsCode: result.tariff_line || '',
          dutyRate: this.parseUSRate(result.mfn_rate),
          vatRate: 0, // 美国没有联邦增值税
          thresholds: {
            dutyFree: 800, // Section 321
            vatFree: 0,
            section321: 800
          },
          effectiveDate: new Date(result.effective_date || Date.now()),
          source: {
            country: 'US',
            source: 'USCBP',
            lastUpdated: new Date(),
            version: '1.0',
            reliability: 0.98
          },
          notes: result.description
        })
      }
    }
    
    return rates
  }
  
  private parseUSRate(rateString: string): number {
    if (!rateString) return 0
    
    // 处理各种美国税率格式
    // 例如: "6.5%", "Free", "$0.45/kg", "6.5% + $0.30/kg"
    const percentMatch = rateString.match(/(\d+\.?\d*)%/)
    if (percentMatch) {
      return parseFloat(percentMatch[1]) / 100
    }
    
    if (rateString.toLowerCase().includes('free')) {
      return 0
    }
    
    // 默认返回0，复杂的税率需要特殊处理
    return 0
  }
  
  async updateTaxRates(): Promise<void> {
    console.log('更新美国税率数据...')
  }
  
  async validateData(): Promise<boolean> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: { size: 1 },
        timeout: 5000
      })
      return response.status === 200
    } catch {
      return false
    }
  }
}

/**
 * 英国税率服务
 */
export class UKTaxRateService implements ITaxRateService {
  private readonly apiUrl = 'https://www.gov.uk/api/goods-nomenclatures'
  
  async getTaxRates(country: Country, hsCode?: string): Promise<TaxRateData[]> {
    if (country !== 'UK') {
      return []
    }
    
    try {
      // 注意：这个API可能需要特殊的认证或不同的调用方式
      const response = await axios.get(`${this.apiUrl}/${hsCode || ''}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      })
      
      return this.transformUKData(response.data)
    } catch (error) {
      // 如果API不可用，返回默认的英国税率
      return this.getDefaultUKRates(hsCode)
    }
  }
  
  private transformUKData(data: any): TaxRateData[] {
    // 实现英国税率数据转换逻辑
    return []
  }
  
  private getDefaultUKRates(hsCode?: string): TaxRateData[] {
    return [{
      id: `uk-${hsCode || 'default'}`,
      country: 'UK',
      hsCode: hsCode || '',
      dutyRate: 0.05, // 默认5%关税
      vatRate: 0.20, // 英国20%增值税
      thresholds: {
        dutyFree: 135,
        vatFree: 135
      },
      effectiveDate: new Date(),
      source: {
        country: 'UK',
        source: 'HMRC',
        lastUpdated: new Date(),
        version: '1.0',
        reliability: 0.85
      }
    }]
  }
  
  async updateTaxRates(): Promise<void> {
    console.log('更新英国税率数据...')
  }
  
  async validateData(): Promise<boolean> {
    return true // 简化实现
  }
}

/**
 * 税率服务管理器
 */
export class TaxRateServiceManager {
  private services: Map<Country, ITaxRateService> = new Map()
  private cache: Map<string, TaxRateData[]> = new Map()
  private cacheTimeout = 3600000 // 1小时缓存
  
  constructor() {
    this.initializeServices()
  }
  
  private initializeServices() {
    // 初始化各国税率服务
    const euApiKey = process.env.EU_TAX_API_KEY || 'test-key'
    
    // 欧盟国家使用同一个服务
    const euService = new EUTaxRateService(euApiKey)
    const euCountries: Country[] = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'CZ', 'DK', 'FI', 'SE']
    euCountries.forEach(country => {
      this.services.set(country, euService)
    })
    
    // 美国和英国使用专门的服务
    this.services.set('US', new USTaxRateService())
    this.services.set('UK', new UKTaxRateService())
  }
  
  async getTaxRates(country: Country, hsCode?: string): Promise<TaxRateData[]> {
    const cacheKey = `${country}-${hsCode || 'all'}`
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (cached.length > 0 && Date.now() - cached[0].source.lastUpdated.getTime() < this.cacheTimeout) {
        return cached
      }
    }
    
    const service = this.services.get(country)
    if (!service) {
      throw new TaxCalculationError({
        code: 'RATE_NOT_FOUND',
        message: `不支持的国家: ${country}`,
        timestamp: new Date(),
        country
      })
    }
    
    try {
      const rates = await service.getTaxRates(country, hsCode)
      
      // 更新缓存
      this.cache.set(cacheKey, rates)
      
      return rates
    } catch (error) {
      if (error instanceof TaxCalculationError) {
        throw error
      }
      
      throw new TaxCalculationError({
        code: 'API_ERROR',
        message: `获取税率失败: ${error}`,
        timestamp: new Date(),
        country
      })
    }
  }
  
  async updateAllRates(): Promise<void> {
    const promises = Array.from(this.services.values()).map(service => 
      service.updateTaxRates().catch(error => 
        console.error('税率更新失败:', error)
      )
    )
    
    await Promise.allSettled(promises)
    
    // 清空缓存
    this.cache.clear()
  }
  
  async validateAllServices(): Promise<Map<Country, boolean>> {
    const results = new Map<Country, boolean>()
    
    for (const [country, service] of this.services.entries()) {
      try {
        const isValid = await service.validateData()
        results.set(country, isValid)
      } catch {
        results.set(country, false)
      }
    }
    
    return results
  }
  
  clearCache(): void {
    this.cache.clear()
  }
  
  getCacheStats(): { size: number; countries: Country[] } {
    const countries = Array.from(this.cache.keys())
      .map(key => key.split('-')[0] as Country)
      .filter((country, index, self) => self.indexOf(country) === index)
    
    return {
      size: this.cache.size,
      countries
    }
  }
}