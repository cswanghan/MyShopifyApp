import { ComplianceTransaction, IOSSDeclaration, IOSSReport } from '../types';
import { Logger } from '../../shared/src/utils/logger';

/**
 * IOSS (Import One-Stop Shop) 申报服务
 * 处理欧盟进口商品的增值税申报
 */
export class IOSSService {
  private logger = new Logger('IOSSService');
  private iossNumber: string;
  private vatRegistrations: Map<string, string> = new Map();

  constructor(config: {
    iossNumber: string;
    vatRegistrations?: Record<string, string>;
  }) {
    this.iossNumber = config.iossNumber;
    
    // 初始化各国VAT注册号
    if (config.vatRegistrations) {
      Object.entries(config.vatRegistrations).forEach(([country, vatNumber]) => {
        this.vatRegistrations.set(country, vatNumber);
      });
    }
  }

  /**
   * 验证订单是否适用IOSS
   */
  async validateIOSSEligibility(transaction: ComplianceTransaction): Promise<{
    eligible: boolean;
    reason?: string;
    recommendations?: string[];
  }> {
    const { destination, items, totalValue } = transaction;

    // 检查目的地是否为EU国家
    const euCountries = this.getEUCountries();
    if (!euCountries.includes(destination.countryCode)) {
      return {
        eligible: false,
        reason: '目的地不在欧盟范围内'
      };
    }

    // 检查订单价值是否在IOSS阈值内
    if (totalValue > 150) {
      return {
        eligible: false,
        reason: '订单价值超过€150 IOSS阈值',
        recommendations: [
          '考虑拆分订单至€150以下',
          '使用标准VAT申报流程',
          '建议客户选择DDP模式'
        ]
      };
    }

    // 检查商品类型
    const prohibitedItems = this.checkProhibitedItems(items);
    if (prohibitedItems.length > 0) {
      return {
        eligible: false,
        reason: `包含IOSS不适用商品: ${prohibitedItems.join(', ')}`,
        recommendations: [
          '移除不适用商品',
          '使用标准进口程序'
        ]
      };
    }

    // 检查是否有有效的IOSS注册号
    if (!this.iossNumber || !this.isValidIOSSNumber(this.iossNumber)) {
      return {
        eligible: false,
        reason: '缺少有效的IOSS注册号',
        recommendations: [
          '申请IOSS注册号',
          '配置IOSS设置'
        ]
      };
    }

    return {
      eligible: true
    };
  }

  /**
   * 生成IOSS申报
   */
  async generateDeclaration(transaction: ComplianceTransaction): Promise<IOSSDeclaration> {
    const eligibility = await this.validateIOSSEligibility(transaction);
    
    if (!eligibility.eligible) {
      throw new Error(`无法生成IOSS申报: ${eligibility.reason}`);
    }

    const { destination, items, totalValue, currency, orderId } = transaction;

    // 计算各国VAT
    const vatBreakdown = this.calculateVATBreakdown(items, destination.countryCode);

    const declaration: IOSSDeclaration = {
      id: `IOSS_${orderId}_${Date.now()}`,
      iossNumber: this.iossNumber,
      declarationType: 'IMPORT',
      reportingPeriod: this.getCurrentReportingPeriod(),
      consignmentDetails: {
        orderId,
        totalValue,
        currency,
        destinationCountry: destination.countryCode,
        consignmentDate: new Date().toISOString(),
        items: items.map(item => ({
          description: item.title,
          hsCode: item.hsCode,
          quantity: item.quantity,
          unitValue: item.price,
          totalValue: item.quantity * item.price,
          vatRate: this.getVATRate(destination.countryCode, item.hsCode),
          vatAmount: this.calculateItemVAT(item, destination.countryCode)
        }))
      },
      vatDetails: {
        memberStateOfConsumption: destination.countryCode,
        totalVATDue: vatBreakdown.totalVAT,
        vatBreakdown: vatBreakdown.breakdown
      },
      submissionDate: new Date().toISOString(),
      status: 'PENDING'
    };

    // 记录申报日志
    this.logger.info('IOSS申报已生成', {
      declarationId: declaration.id,
      orderId,
      destination: destination.countryCode,
      totalVAT: vatBreakdown.totalVAT
    });

    return declaration;
  }

  /**
   * 提交IOSS申报到税务平台
   */
  async submitDeclaration(declaration: IOSSDeclaration): Promise<{
    success: boolean;
    submissionId?: string;
    errors?: string[];
  }> {
    try {
      // 验证申报数据
      const validation = this.validateDeclaration(declaration);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // 提交到EU税务平台API
      const submissionResult = await this.submitToEUTaxPlatform(declaration);
      
      if (submissionResult.success) {
        this.logger.info('IOSS申报提交成功', {
          declarationId: declaration.id,
          submissionId: submissionResult.submissionId
        });

        return {
          success: true,
          submissionId: submissionResult.submissionId
        };
      } else {
        return {
          success: false,
          errors: submissionResult.errors
        };
      }

    } catch (error) {
      this.logger.error('IOSS申报提交失败', error);
      return {
        success: false,
        errors: [error.message || '提交过程中发生未知错误']
      };
    }
  }

  /**
   * 生成月度IOSS报告
   */
  async generateMonthlyReport(year: number, month: number): Promise<IOSSReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 获取本月所有IOSS申报记录
    const declarations = await this.getDeclarationsForPeriod(startDate, endDate);
    
    // 按国家汇总VAT
    const vatSummary = this.aggregateVATByCountry(declarations);

    // 生成报告
    const report: IOSSReport = {
      id: `IOSS_REPORT_${year}_${month.toString().padStart(2, '0')}`,
      reportingPeriod: {
        year,
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      iossNumber: this.iossNumber,
      totalTransactions: declarations.length,
      totalValue: declarations.reduce((sum, decl) => sum + decl.consignmentDetails.totalValue, 0),
      totalVAT: vatSummary.totalVAT,
      vatByCountry: vatSummary.byCountry,
      declarationSummary: {
        submitted: declarations.filter(d => d.status === 'SUBMITTED').length,
        pending: declarations.filter(d => d.status === 'PENDING').length,
        rejected: declarations.filter(d => d.status === 'REJECTED').length
      },
      generatedDate: new Date().toISOString(),
      status: 'DRAFT'
    };

    this.logger.info('IOSS月度报告已生成', {
      reportId: report.id,
      period: `${year}-${month}`,
      transactions: report.totalTransactions,
      totalVAT: report.totalVAT
    });

    return report;
  }

  /**
   * 获取EU国家列表
   */
  private getEUCountries(): string[] {
    return [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
    ];
  }

  /**
   * 检查禁止使用IOSS的商品
   */
  private checkProhibitedItems(items: any[]): string[] {
    const prohibited: string[] = [];
    
    items.forEach(item => {
      // 烟草制品
      if (item.hsCode.startsWith('2402') || item.hsCode.startsWith('2403')) {
        prohibited.push('烟草制品');
      }
      
      // 酒精饮料（超过22%酒精度）
      if (item.hsCode.startsWith('2208')) {
        prohibited.push('高度酒精饮料');
      }
      
      // 香水（超过€150）
      if (item.hsCode.startsWith('3303') && item.price > 150) {
        prohibited.push('高价值香水');
      }

      // 检查商品标签
      const tags = item.tags || [];
      if (tags.some((tag: string) => tag.toLowerCase().includes('tobacco'))) {
        prohibited.push('烟草相关商品');
      }
    });

    return [...new Set(prohibited)];
  }

  /**
   * 验证IOSS注册号格式
   */
  private isValidIOSSNumber(iossNumber: string): boolean {
    // IOSS号码格式: IM + 9位数字 + 国家代码
    const pattern = /^IM\d{9}[A-Z]{2}$/;
    return pattern.test(iossNumber);
  }

  /**
   * 计算VAT明细
   */
  private calculateVATBreakdown(items: any[], destinationCountry: string) {
    let totalVAT = 0;
    const breakdown: Record<string, number> = {};

    items.forEach(item => {
      const vatRate = this.getVATRate(destinationCountry, item.hsCode);
      const itemVAT = this.calculateItemVAT(item, destinationCountry);
      
      totalVAT += itemVAT;
      
      const rateKey = `${vatRate}%`;
      breakdown[rateKey] = (breakdown[rateKey] || 0) + itemVAT;
    });

    return {
      totalVAT,
      breakdown
    };
  }

  /**
   * 获取VAT税率
   */
  private getVATRate(countryCode: string, hsCode: string): number {
    // 标准VAT税率表
    const standardRates: Record<string, number> = {
      'AT': 20, 'BE': 21, 'BG': 20, 'HR': 25, 'CY': 19, 'CZ': 21,
      'DK': 25, 'EE': 20, 'FI': 24, 'FR': 20, 'DE': 19, 'GR': 24,
      'HU': 27, 'IE': 23, 'IT': 22, 'LV': 21, 'LT': 21, 'LU': 17,
      'MT': 18, 'NL': 21, 'PL': 23, 'PT': 23, 'RO': 19, 'SK': 20,
      'SI': 22, 'ES': 21, 'SE': 25
    };

    // 检查是否有优惠税率
    const reducedRate = this.getReducedVATRate(countryCode, hsCode);
    if (reducedRate !== null) {
      return reducedRate;
    }

    return standardRates[countryCode] || 20;
  }

  /**
   * 获取优惠VAT税率
   */
  private getReducedVATRate(countryCode: string, hsCode: string): number | null {
    // 图书类商品优惠税率
    if (hsCode.startsWith('4901') || hsCode.startsWith('4902')) {
      const bookRates: Record<string, number> = {
        'DE': 7, 'FR': 5.5, 'IT': 4, 'ES': 4, 'PT': 6, 'LU': 3
      };
      return bookRates[countryCode] || null;
    }

    // 食品类商品优惠税率
    if (hsCode.startsWith('04') || hsCode.startsWith('19') || hsCode.startsWith('20')) {
      const foodRates: Record<string, number> = {
        'DE': 7, 'FR': 5.5, 'IT': 4, 'ES': 4, 'IE': 0, 'MT': 0
      };
      return foodRates[countryCode] || null;
    }

    // 医疗用品
    if (hsCode.startsWith('3006') || hsCode.startsWith('9018')) {
      return 0; // 大部分EU国家医疗用品免税
    }

    return null;
  }

  /**
   * 计算单个商品VAT
   */
  private calculateItemVAT(item: any, destinationCountry: string): number {
    const vatRate = this.getVATRate(destinationCountry, item.hsCode);
    const itemValue = item.quantity * item.price;
    return itemValue * (vatRate / 100);
  }

  /**
   * 获取当前申报期
   */
  private getCurrentReportingPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  /**
   * 验证申报数据
   */
  private validateDeclaration(declaration: IOSSDeclaration): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!declaration.iossNumber || !this.isValidIOSSNumber(declaration.iossNumber)) {
      errors.push('无效的IOSS注册号');
    }

    if (!declaration.consignmentDetails.orderId) {
      errors.push('缺少订单ID');
    }

    if (declaration.consignmentDetails.totalValue <= 0) {
      errors.push('订单总价值必须大于0');
    }

    if (declaration.consignmentDetails.totalValue > 150) {
      errors.push('订单价值超过IOSS阈值€150');
    }

    if (!declaration.vatDetails.memberStateOfConsumption) {
      errors.push('缺少消费成员国信息');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 模拟提交到EU税务平台
   */
  private async submitToEUTaxPlatform(declaration: IOSSDeclaration): Promise<{
    success: boolean;
    submissionId?: string;
    errors?: string[];
  }> {
    // 实际实现中这里会调用真实的EU税务平台API
    // 目前返回模拟结果
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟网络延迟

    // 模拟90%成功率
    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        submissionId: `EU_SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        success: false,
        errors: ['模拟的提交失败错误']
      };
    }
  }

  /**
   * 获取指定期间的申报记录（模拟）
   */
  private async getDeclarationsForPeriod(startDate: Date, endDate: Date): Promise<IOSSDeclaration[]> {
    // 实际实现中从数据库查询
    return [];
  }

  /**
   * 按国家汇总VAT
   */
  private aggregateVATByCountry(declarations: IOSSDeclaration[]) {
    const byCountry: Record<string, number> = {};
    let totalVAT = 0;

    declarations.forEach(decl => {
      const country = decl.vatDetails.memberStateOfConsumption;
      const vat = decl.vatDetails.totalVATDue;
      
      byCountry[country] = (byCountry[country] || 0) + vat;
      totalVAT += vat;
    });

    return { totalVAT, byCountry };
  }
}