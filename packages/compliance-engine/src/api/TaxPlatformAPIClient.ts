import { Logger } from '../../shared/src/utils/logger';

/**
 * 税务平台API客户端
 * 统一管理与各国税务平台的API集成
 */
export class TaxPlatformAPIClient {
  private logger = new Logger('TaxPlatformAPIClient');
  private apiKeys: Map<string, string> = new Map();
  private baseUrls: Map<string, string> = new Map();
  private rateLimits: Map<string, { requests: number; window: number; lastReset: number }> = new Map();

  constructor(config: {
    euTaxApi?: { apiKey: string; baseUrl?: string };
    hmrcApi?: { apiKey: string; baseUrl?: string };
    cbpApi?: { apiKey: string; baseUrl?: string };
    vatSenseApi?: { apiKey: string; baseUrl?: string };
  }) {
    this.initializeAPIs(config);
  }

  /**
   * 初始化各API配置
   */
  private initializeAPIs(config: any) {
    // EU税务平台API
    if (config.euTaxApi) {
      this.apiKeys.set('EU_TAX', config.euTaxApi.apiKey);
      this.baseUrls.set('EU_TAX', config.euTaxApi.baseUrl || 'https://api.ec.europa.eu/taxation');
      this.rateLimits.set('EU_TAX', { requests: 0, window: 3600000, lastReset: Date.now() });
    }

    // HMRC (UK) API
    if (config.hmrcApi) {
      this.apiKeys.set('HMRC', config.hmrcApi.apiKey);
      this.baseUrls.set('HMRC', config.hmrcApi.baseUrl || 'https://api.service.hmrc.gov.uk');
      this.rateLimits.set('HMRC', { requests: 0, window: 3600000, lastReset: Date.now() });
    }

    // CBP (US) API
    if (config.cbpApi) {
      this.apiKeys.set('CBP', config.cbpApi.apiKey);
      this.baseUrls.set('CBP', config.cbpApi.baseUrl || 'https://api.cbp.gov');
      this.rateLimits.set('CBP', { requests: 0, window: 3600000, lastReset: Date.now() });
    }

    // VAT Sense (第三方税率API)
    if (config.vatSenseApi) {
      this.apiKeys.set('VAT_SENSE', config.vatSenseApi.apiKey);
      this.baseUrls.set('VAT_SENSE', config.vatSenseApi.baseUrl || 'https://api.vatsense.eu');
      this.rateLimits.set('VAT_SENSE', { requests: 0, window: 3600000, lastReset: Date.now() });
    }
  }

  /**
   * 获取实时VAT税率
   */
  async getVATRates(countryCode: string): Promise<{
    standardRate: number;
    reducedRates: number[];
    zeroRate: boolean;
    lastUpdated: string;
  }> {
    try {
      await this.checkRateLimit('VAT_SENSE');

      const response = await this.makeRequest('VAT_SENSE', {
        endpoint: `/vat-rates/${countryCode}`,
        method: 'GET'
      });

      if (response.success) {
        return {
          standardRate: response.data.standardRate,
          reducedRates: response.data.reducedRates || [],
          zeroRate: response.data.zeroRate || false,
          lastUpdated: response.data.lastUpdated || new Date().toISOString()
        };
      } else {
        throw new Error(`获取VAT税率失败: ${response.error}`);
      }

    } catch (error) {
      this.logger.error(`获取${countryCode} VAT税率失败`, error);
      
      // 返回默认税率作为备用
      return this.getDefaultVATRates(countryCode);
    }
  }

  /**
   * 提交IOSS申报
   */
  async submitIOSSDeclaration(declaration: any): Promise<{
    success: boolean;
    submissionId?: string;
    errors?: string[];
  }> {
    try {
      await this.checkRateLimit('EU_TAX');

      const response = await this.makeRequest('EU_TAX', {
        endpoint: '/ioss/submit',
        method: 'POST',
        data: {
          iossNumber: declaration.iossNumber,
          declarationType: declaration.declarationType,
          reportingPeriod: declaration.reportingPeriod,
          consignmentDetails: declaration.consignmentDetails,
          vatDetails: declaration.vatDetails,
          submissionDate: declaration.submissionDate
        }
      });

      if (response.success) {
        this.logger.info('IOSS申报提交成功', {
          submissionId: response.data.submissionId,
          declarationId: declaration.id
        });

        return {
          success: true,
          submissionId: response.data.submissionId
        };
      } else {
        return {
          success: false,
          errors: response.errors || ['未知错误']
        };
      }

    } catch (error) {
      this.logger.error('IOSS申报API调用失败', error);
      return {
        success: false,
        errors: [error.message || 'API调用失败']
      };
    }
  }

  /**
   * 提交UK VAT申报
   */
  async submitUKVATDeclaration(declaration: any): Promise<{
    success: boolean;
    submissionId?: string;
    errors?: string[];
  }> {
    try {
      await this.checkRateLimit('HMRC');

      const response = await this.makeRequest('HMRC', {
        endpoint: '/vat/obligations',
        method: 'POST',
        data: {
          vrn: declaration.vatNumber,
          periodKey: declaration.taxPeriod,
          vatDueSales: declaration.vatCalculation.totalVATDue,
          vatDueAcquisitions: 0,
          totalVatDue: declaration.vatCalculation.totalVATDue,
          vatReclaimedCurrPeriod: 0,
          netVatDue: declaration.vatCalculation.totalVATDue,
          totalValueSalesExVAT: declaration.consignmentDetails.consignmentValue,
          totalValuePurchasesExVAT: 0,
          totalValueGoodsSuppliedExVAT: 0,
          totalAcquisitionsExVAT: 0,
          finalised: true
        }
      });

      if (response.success) {
        this.logger.info('UK VAT申报提交成功', {
          submissionId: response.data.processingDate,
          declarationId: declaration.id
        });

        return {
          success: true,
          submissionId: response.data.processingDate
        };
      } else {
        return {
          success: false,
          errors: response.errors || ['未知错误']
        };
      }

    } catch (error) {
      this.logger.error('UK VAT申报API调用失败', error);
      return {
        success: false,
        errors: [error.message || 'API调用失败']
      };
    }
  }

  /**
   * 提交Section 321申报
   */
  async submitSection321Declaration(declaration: any): Promise<{
    success: boolean;
    entryNumber?: string;
    errors?: string[];
  }> {
    try {
      await this.checkRateLimit('CBP');

      const response = await this.makeRequest('CBP', {
        endpoint: '/ace/section321',
        method: 'POST',
        data: {
          filerCode: declaration.cbpRequirements.filerCode,
          entryType: declaration.cbpRequirements.entryType,
          importer: declaration.importer,
          consignee: declaration.consignee,
          shipmentDetails: declaration.shipmentDetails,
          merchandise: declaration.merchandise,
          certification: declaration.certification
        }
      });

      if (response.success) {
        this.logger.info('Section 321申报提交成功', {
          entryNumber: response.data.entryNumber,
          declarationId: declaration.id
        });

        return {
          success: true,
          entryNumber: response.data.entryNumber
        };
      } else {
        return {
          success: false,
          errors: response.errors || ['未知错误']
        };
      }

    } catch (error) {
      this.logger.error('Section 321申报API调用失败', error);
      return {
        success: false,
        errors: [error.message || 'API调用失败']
      };
    }
  }

  /**
   * 获取关税税率
   */
  async getCustomsDutyRates(hsCode: string, originCountry: string, destinationCountry: string): Promise<{
    dutyRate: number;
    additionalDuties: Array<{ type: string; rate: number }>;
    preferentialPrograms: string[];
    lastUpdated: string;
  }> {
    try {
      const platform = this.getPlatformForCountry(destinationCountry);
      await this.checkRateLimit(platform);

      const endpoint = this.getCustomsEndpoint(destinationCountry);
      const response = await this.makeRequest(platform, {
        endpoint: `${endpoint}/${hsCode}`,
        method: 'GET',
        params: {
          origin: originCountry,
          destination: destinationCountry
        }
      });

      if (response.success) {
        return {
          dutyRate: response.data.dutyRate || 0,
          additionalDuties: response.data.additionalDuties || [],
          preferentialPrograms: response.data.preferentialPrograms || [],
          lastUpdated: response.data.lastUpdated || new Date().toISOString()
        };
      } else {
        throw new Error(`获取关税税率失败: ${response.error}`);
      }

    } catch (error) {
      this.logger.error(`获取关税税率失败 ${hsCode} ${originCountry}->${destinationCountry}`, error);
      
      // 返回默认税率作为备用
      return this.getDefaultDutyRates(hsCode, destinationCountry);
    }
  }

  /**
   * 验证税号
   */
  async validateTaxNumber(taxNumber: string, countryCode: string): Promise<{
    valid: boolean;
    companyName?: string;
    address?: string;
    status?: string;
  }> {
    try {
      const platform = this.getPlatformForCountry(countryCode);
      await this.checkRateLimit(platform);

      const response = await this.makeRequest(platform, {
        endpoint: '/tax-number/validate',
        method: 'POST',
        data: {
          taxNumber,
          countryCode
        }
      });

      if (response.success) {
        return {
          valid: response.data.valid,
          companyName: response.data.companyName,
          address: response.data.address,
          status: response.data.status
        };
      } else {
        return { valid: false };
      }

    } catch (error) {
      this.logger.error(`税号验证失败: ${taxNumber}`, error);
      return { valid: false };
    }
  }

  /**
   * 检查API调用限制
   */
  private async checkRateLimit(platform: string): Promise<void> {
    const limit = this.rateLimits.get(platform);
    if (!limit) return;

    const now = Date.now();
    
    // 重置窗口
    if (now - limit.lastReset > limit.window) {
      limit.requests = 0;
      limit.lastReset = now;
    }

    // 检查限制
    const maxRequests = this.getMaxRequestsForPlatform(platform);
    if (limit.requests >= maxRequests) {
      const waitTime = limit.window - (now - limit.lastReset);
      this.logger.warn(`API调用达到限制，需等待 ${waitTime}ms`, { platform });
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000)));
    }

    limit.requests++;
  }

  /**
   * 发起API请求
   */
  private async makeRequest(platform: string, options: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    params?: any;
  }): Promise<{
    success: boolean;
    data?: any;
    errors?: string[];
    error?: string;
  }> {
    const apiKey = this.apiKeys.get(platform);
    const baseUrl = this.baseUrls.get(platform);

    if (!apiKey || !baseUrl) {
      throw new Error(`${platform} API未配置`);
    }

    const url = `${baseUrl}${options.endpoint}`;
    const headers = this.getHeadersForPlatform(platform, apiKey);

    try {
      const requestConfig: RequestInit = {
        method: options.method,
        headers,
      };

      if (options.data && options.method !== 'GET') {
        requestConfig.body = JSON.stringify(options.data);
      }

      if (options.params && options.method === 'GET') {
        const searchParams = new URLSearchParams(options.params);
        url + '?' + searchParams.toString();
      }

      const response = await fetch(url, requestConfig);
      const responseData = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: responseData
        };
      } else {
        return {
          success: false,
          error: responseData.message || `HTTP ${response.status}`,
          errors: responseData.errors || []
        };
      }

    } catch (error) {
      this.logger.error(`API请求失败: ${platform} ${options.endpoint}`, error);
      return {
        success: false,
        error: error.message || '网络请求失败'
      };
    }
  }

  /**
   * 获取平台特定的请求头
   */
  private getHeadersForPlatform(platform: string, apiKey: string): Record<string, string> {
    const commonHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'DTax-Bridge/1.0.0'
    };

    switch (platform) {
      case 'HMRC':
        return {
          ...commonHeaders,
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/vnd.hmrc.1.0+json'
        };

      case 'CBP':
        return {
          ...commonHeaders,
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        };

      case 'EU_TAX':
        return {
          ...commonHeaders,
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        };

      case 'VAT_SENSE':
        return {
          ...commonHeaders,
          'X-API-Key': apiKey
        };

      default:
        return {
          ...commonHeaders,
          'Authorization': `Bearer ${apiKey}`
        };
    }
  }

  /**
   * 获取国家对应的平台
   */
  private getPlatformForCountry(countryCode: string): string {
    if (countryCode === 'GB') return 'HMRC';
    if (countryCode === 'US') return 'CBP';
    if (this.isEUCountry(countryCode)) return 'EU_TAX';
    return 'VAT_SENSE'; // 默认使用第三方服务
  }

  /**
   * 获取海关API端点
   */
  private getCustomsEndpoint(countryCode: string): string {
    switch (countryCode) {
      case 'US': return '/customs/tariff';
      case 'GB': return '/customs/duty-calculator';
      default: return '/customs/rates';
    }
  }

  /**
   * 获取平台最大请求数
   */
  private getMaxRequestsForPlatform(platform: string): number {
    const limits = {
      'HMRC': 1000,
      'CBP': 500,
      'EU_TAX': 2000,
      'VAT_SENSE': 5000
    };
    return limits[platform as keyof typeof limits] || 1000;
  }

  /**
   * 获取默认VAT税率
   */
  private getDefaultVATRates(countryCode: string) {
    const defaultRates: Record<string, any> = {
      'DE': { standardRate: 19, reducedRates: [7], zeroRate: true },
      'FR': { standardRate: 20, reducedRates: [10, 5.5, 2.1], zeroRate: true },
      'GB': { standardRate: 20, reducedRates: [5], zeroRate: true },
      'IT': { standardRate: 22, reducedRates: [10, 4], zeroRate: true },
      'ES': { standardRate: 21, reducedRates: [10, 4], zeroRate: true }
    };

    return defaultRates[countryCode] || {
      standardRate: 20,
      reducedRates: [],
      zeroRate: false,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 获取默认关税税率
   */
  private getDefaultDutyRates(hsCode: string, countryCode: string) {
    // 简化的默认税率
    const prefix = hsCode.substring(0, 2);
    const defaultRates: Record<string, number> = {
      '61': 12, '62': 12, '64': 17, '42': 8, '85': 0, '90': 0
    };

    return {
      dutyRate: defaultRates[prefix] || 5,
      additionalDuties: [],
      preferentialPrograms: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 检查是否为EU国家
   */
  private isEUCountry(countryCode: string): boolean {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
    ];
    return euCountries.includes(countryCode);
  }
}