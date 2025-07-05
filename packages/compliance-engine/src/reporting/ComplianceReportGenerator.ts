import { 
  ComplianceReport, 
  IOSSReport, 
  UKVATReturn, 
  Section321Report,
  ComplianceTransaction 
} from '../types';
import { IOSSService } from '../ioss/IOSSService';
import { UKVATService } from '../uk-vat/UKVATService';
import { Section321Service } from '../us-section321/Section321Service';
import { Logger } from '../../shared/src/utils/logger';

/**
 * 合规报表生成器
 * 统一生成各种税务和合规报表
 */
export class ComplianceReportGenerator {
  private logger = new Logger('ComplianceReportGenerator');
  private iossService?: IOSSService;
  private ukvatService?: UKVATService;
  private section321Service?: Section321Service;

  constructor(config: {
    iossService?: IOSSService;
    ukvatService?: UKVATService;
    section321Service?: Section321Service;
  }) {
    this.iossService = config.iossService;
    this.ukvatService = config.ukvatService;
    this.section321Service = config.section321Service;
  }

  /**
   * 生成综合合规报表
   */
  async generateComprehensiveReport(
    startDate: Date,
    endDate: Date,
    options: {
      includeIOSS?: boolean;
      includeUKVAT?: boolean;
      includeSection321?: boolean;
      format?: 'JSON' | 'CSV' | 'PDF' | 'XML';
      currency?: string;
    } = {}
  ): Promise<ComplianceReport> {
    const {
      includeIOSS = true,
      includeUKVAT = true,
      includeSection321 = true,
      format = 'JSON',
      currency = 'USD'
    } = options;

    this.logger.info('开始生成综合合规报表', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      format
    });

    // 获取期间内所有交易数据
    const transactions = await this.getTransactionsForPeriod(startDate, endDate);

    // 分析交易数据
    const analysis = await this.analyzeTransactions(transactions);

    // 生成各项报表
    const reports: any = {};

    if (includeIOSS && this.iossService) {
      try {
        reports.ioss = await this.generateIOSSReports(startDate, endDate, transactions);
      } catch (error) {
        this.logger.error('IOSS报表生成失败', error);
        reports.ioss = { error: error.message };
      }
    }

    if (includeUKVAT && this.ukvatService) {
      try {
        reports.ukVAT = await this.generateUKVATReports(startDate, endDate, transactions);
      } catch (error) {
        this.logger.error('UK VAT报表生成失败', error);
        reports.ukVAT = { error: error.message };
      }
    }

    if (includeSection321 && this.section321Service) {
      try {
        reports.section321 = await this.generateSection321Reports(startDate, endDate, transactions);
      } catch (error) {
        this.logger.error('Section 321报表生成失败', error);
        reports.section321 = { error: error.message };
      }
    }

    // 生成风险分析
    const riskAnalysis = this.generateRiskAnalysis(transactions, analysis);

    // 生成合规建议
    const recommendations = this.generateComplianceRecommendations(analysis, riskAnalysis);

    const comprehensiveReport: ComplianceReport = {
      id: `COMPLIANCE_REPORT_${Date.now()}`,
      type: 'COMPREHENSIVE',
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: {
        totalTransactions: transactions.length,
        totalValue: analysis.totalValue,
        currency,
        regions: analysis.regionBreakdown,
        compliance: {
          iossEligible: analysis.iossEligible,
          ukVatRequired: analysis.ukVatRequired,
          section321Eligible: analysis.section321Eligible,
          overallComplianceRate: analysis.overallComplianceRate
        }
      },
      reports,
      riskAnalysis,
      recommendations,
      generatedDate: new Date().toISOString(),
      format,
      metadata: {
        generatedBy: 'DTax-Bridge Compliance Engine',
        version: '1.0.0',
        processingTime: 0 // 将在最后设置
      }
    };

    this.logger.info('综合合规报表生成完成', {
      reportId: comprehensiveReport.id,
      transactionCount: transactions.length,
      totalValue: analysis.totalValue
    });

    return comprehensiveReport;
  }

  /**
   * 生成IOSS专项报表
   */
  async generateIOSSReports(
    startDate: Date,
    endDate: Date,
    transactions: ComplianceTransaction[]
  ): Promise<{
    monthly: IOSSReport[];
    quarterly: IOSSReport;
    summary: any;
  }> {
    if (!this.iossService) {
      throw new Error('IOSS服务未配置');
    }

    const iossTransactions = transactions.filter(t => 
      t.destination.countryCode !== 'GB' && // 排除英国
      this.isEUCountry(t.destination.countryCode) &&
      t.totalValue <= 150
    );

    // 按月生成报表
    const monthlyReports: IOSSReport[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      try {
        const monthlyReport = await this.iossService.generateMonthlyReport(year, month);
        monthlyReports.push(monthlyReport);
      } catch (error) {
        this.logger.warn(`IOSS ${year}-${month} 月报生成失败`, error);
      }
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // 生成季度汇总
    const quarterlyReport = this.aggregateIOSSQuarterly(monthlyReports);

    // 生成汇总统计
    const summary = {
      totalIOSSTransactions: iossTransactions.length,
      totalIOSSValue: iossTransactions.reduce((sum, t) => sum + t.totalValue, 0),
      totalVATCollected: monthlyReports.reduce((sum, report) => sum + report.totalVAT, 0),
      countryBreakdown: this.getIOSSCountryBreakdown(iossTransactions),
      complianceRate: this.calculateIOSSComplianceRate(iossTransactions)
    };

    return {
      monthly: monthlyReports,
      quarterly: quarterlyReport,
      summary
    };
  }

  /**
   * 生成UK VAT专项报表
   */
  async generateUKVATReports(
    startDate: Date,
    endDate: Date,
    transactions: ComplianceTransaction[]
  ): Promise<{
    quarterly: UKVATReturn[];
    summary: any;
  }> {
    if (!this.ukvatService) {
      throw new Error('UK VAT服务未配置');
    }

    const ukTransactions = transactions.filter(t => 
      t.destination.countryCode === 'GB'
    );

    // 按季度生成VAT退税报表
    const quarterlyReturns: UKVATReturn[] = [];
    const quarters = this.getQuartersInPeriod(startDate, endDate);
    
    for (const quarter of quarters) {
      try {
        const vatReturn = await this.ukvatService.generateQuarterlyReturn(
          quarter.year, 
          quarter.quarter
        );
        quarterlyReturns.push(vatReturn);
      } catch (error) {
        this.logger.warn(`UK VAT ${quarter.year} Q${quarter.quarter} 报表生成失败`, error);
      }
    }

    // 生成汇总统计
    const summary = {
      totalUKTransactions: ukTransactions.length,
      totalUKValue: ukTransactions.reduce((sum, t) => sum + t.totalValue, 0),
      totalVATDue: quarterlyReturns.reduce((sum, ret) => sum + ret.boxes.box5, 0),
      lowValueReliefApplied: ukTransactions.filter(t => t.totalValue <= 135).length,
      averageOrderValue: ukTransactions.length > 0 ? 
        ukTransactions.reduce((sum, t) => sum + t.totalValue, 0) / ukTransactions.length : 0
    };

    return {
      quarterly: quarterlyReturns,
      summary
    };
  }

  /**
   * 生成Section 321专项报表
   */
  async generateSection321Reports(
    startDate: Date,
    endDate: Date,
    transactions: ComplianceTransaction[]
  ): Promise<{
    monthly: Section321Report[];
    summary: any;
  }> {
    if (!this.section321Service) {
      throw new Error('Section 321服务未配置');
    }

    const usTransactions = transactions.filter(t => 
      t.destination.countryCode === 'US'
    );

    // 按月生成报表
    const monthlyReports: Section321Report[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      try {
        const monthlyReport = await this.section321Service.generateMonthlyReport(year, month);
        monthlyReports.push(monthlyReport);
      } catch (error) {
        this.logger.warn(`Section 321 ${year}-${month} 月报生成失败`, error);
      }
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // 生成汇总统计
    const summary = {
      totalUSTransactions: usTransactions.length,
      totalUSValue: usTransactions.reduce((sum, t) => sum + t.totalValue, 0),
      section321Eligible: usTransactions.filter(t => t.totalValue <= 800).length,
      section321Utilized: monthlyReports.reduce((sum, report) => 
        sum + report.summary.totalShipments, 0),
      utilizationRate: monthlyReports.length > 0 ? 
        monthlyReports.reduce((sum, report) => sum + report.summary.utilizationRate, 0) / monthlyReports.length : 0,
      dutyAvoidance: this.calculateDutyAvoidance(usTransactions)
    };

    return {
      monthly: monthlyReports,
      summary
    };
  }

  /**
   * 导出报表为指定格式
   */
  async exportReport(
    report: ComplianceReport,
    format: 'JSON' | 'CSV' | 'PDF' | 'XML' = 'JSON'
  ): Promise<{
    content: string | Buffer;
    mimeType: string;
    filename: string;
  }> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `compliance_report_${timestamp}`;

    switch (format) {
      case 'JSON':
        return {
          content: JSON.stringify(report, null, 2),
          mimeType: 'application/json',
          filename: `${filename}.json`
        };

      case 'CSV':
        const csvContent = this.convertToCSV(report);
        return {
          content: csvContent,
          mimeType: 'text/csv',
          filename: `${filename}.csv`
        };

      case 'XML':
        const xmlContent = this.convertToXML(report);
        return {
          content: xmlContent,
          mimeType: 'application/xml',
          filename: `${filename}.xml`
        };

      case 'PDF':
        const pdfBuffer = await this.generatePDF(report);
        return {
          content: pdfBuffer,
          mimeType: 'application/pdf',
          filename: `${filename}.pdf`
        };

      default:
        throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 分析交易数据
   */
  private async analyzeTransactions(transactions: ComplianceTransaction[]) {
    const totalValue = transactions.reduce((sum, t) => sum + t.totalValue, 0);
    
    // 按地区分类
    const regionBreakdown = {
      EU: transactions.filter(t => this.isEUCountry(t.destination.countryCode)),
      UK: transactions.filter(t => t.destination.countryCode === 'GB'),
      US: transactions.filter(t => t.destination.countryCode === 'US'),
      Other: transactions.filter(t => 
        !this.isEUCountry(t.destination.countryCode) && 
        t.destination.countryCode !== 'GB' && 
        t.destination.countryCode !== 'US'
      )
    };

    // 合规性分析
    const iossEligible = regionBreakdown.EU.filter(t => t.totalValue <= 150).length;
    const ukVatRequired = regionBreakdown.UK.filter(t => t.totalValue <= 135).length;
    const section321Eligible = regionBreakdown.US.filter(t => t.totalValue <= 800).length;

    const totalCompliant = iossEligible + ukVatRequired + section321Eligible;
    const overallComplianceRate = transactions.length > 0 ? 
      (totalCompliant / transactions.length) * 100 : 0;

    return {
      totalValue,
      regionBreakdown: {
        EU: regionBreakdown.EU.length,
        UK: regionBreakdown.UK.length,
        US: regionBreakdown.US.length,
        Other: regionBreakdown.Other.length
      },
      iossEligible,
      ukVatRequired,
      section321Eligible,
      overallComplianceRate
    };
  }

  /**
   * 生成风险分析
   */
  private generateRiskAnalysis(
    transactions: ComplianceTransaction[],
    analysis: any
  ) {
    const risks: string[] = [];
    const warnings: string[] = [];

    // 高价值订单风险
    const highValueOrders = transactions.filter(t => t.totalValue > 800);
    if (highValueOrders.length > transactions.length * 0.1) {
      risks.push('高价值订单比例过高，可能影响税务优惠适用性');
    }

    // 合规率风险
    if (analysis.overallComplianceRate < 90) {
      risks.push('整体合规率偏低，需要优化订单结构');
    }

    // 地区集中风险
    const maxRegionRatio = Math.max(
      analysis.regionBreakdown.EU,
      analysis.regionBreakdown.UK,
      analysis.regionBreakdown.US
    ) / transactions.length;
    
    if (maxRegionRatio > 0.7) {
      warnings.push('订单地区过于集中，建议多元化市场布局');
    }

    return {
      riskLevel: this.calculateOverallRiskLevel(risks, warnings),
      risks,
      warnings,
      recommendations: this.generateRiskMitigationRecommendations(risks, warnings)
    };
  }

  /**
   * 生成合规建议
   */
  private generateComplianceRecommendations(analysis: any, riskAnalysis: any) {
    const recommendations: string[] = [];

    if (analysis.overallComplianceRate < 95) {
      recommendations.push('优化订单拆分策略，提高税务优惠适用率');
    }

    if (analysis.regionBreakdown.EU > 0 && analysis.iossEligible / analysis.regionBreakdown.EU < 0.8) {
      recommendations.push('考虑将EU订单价值控制在€150以下以适用IOSS');
    }

    if (analysis.regionBreakdown.US > 0 && analysis.section321Eligible / analysis.regionBreakdown.US < 0.9) {
      recommendations.push('优化美国订单结构以充分利用Section 321免税政策');
    }

    if (riskAnalysis.riskLevel === 'HIGH') {
      recommendations.push('建议咨询税务专家，制定详细的合规优化方案');
    }

    return recommendations;
  }

  // 辅助方法
  private isEUCountry(countryCode: string): boolean {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
    ];
    return euCountries.includes(countryCode);
  }

  private calculateOverallRiskLevel(risks: string[], warnings: string[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (risks.length >= 3) return 'HIGH';
    if (risks.length >= 1 || warnings.length >= 3) return 'MEDIUM';
    return 'LOW';
  }

  private generateRiskMitigationRecommendations(risks: string[], warnings: string[]): string[] {
    // 基于风险和警告生成具体的缓解建议
    return [
      '定期审查订单模式和税务影响',
      '建立自动化合规检查流程',
      '监控税法变化并及时调整策略'
    ];
  }

  // 数据获取和格式转换方法（模拟实现）
  private async getTransactionsForPeriod(startDate: Date, endDate: Date): Promise<ComplianceTransaction[]> {
    // 实际实现中从数据库查询
    return [];
  }

  private aggregateIOSSQuarterly(monthlyReports: IOSSReport[]): IOSSReport {
    // 聚合月度报表为季度报表
    return {} as IOSSReport;
  }

  private getQuartersInPeriod(startDate: Date, endDate: Date): Array<{year: number, quarter: number}> {
    // 计算期间内的所有季度
    return [];
  }

  private getIOSSCountryBreakdown(transactions: ComplianceTransaction[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    transactions.forEach(t => {
      breakdown[t.destination.countryCode] = (breakdown[t.destination.countryCode] || 0) + 1;
    });
    return breakdown;
  }

  private calculateIOSSComplianceRate(transactions: ComplianceTransaction[]): number {
    return transactions.length > 0 ? 
      (transactions.filter(t => t.totalValue <= 150).length / transactions.length) * 100 : 0;
  }

  private calculateDutyAvoidance(transactions: ComplianceTransaction[]): number {
    // 计算通过Section 321避免的关税金额
    return transactions
      .filter(t => t.totalValue <= 800)
      .reduce((sum, t) => sum + (t.totalValue * 0.05), 0); // 假设平均5%关税率
  }

  private convertToCSV(report: ComplianceReport): string {
    // 将报表转换为CSV格式
    return 'CSV content placeholder';
  }

  private convertToXML(report: ComplianceReport): string {
    // 将报表转换为XML格式
    return '<report>XML content placeholder</report>';
  }

  private async generatePDF(report: ComplianceReport): Promise<Buffer> {
    // 生成PDF报表
    return Buffer.from('PDF content placeholder');
  }
}