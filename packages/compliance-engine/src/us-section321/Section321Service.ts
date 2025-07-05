import { ComplianceTransaction, Section321Declaration, Section321Report } from '../types';
import { Logger } from '../../shared/src/utils/logger';

/**
 * US Section 321合规服务
 * 处理美国Section 321 de minimis规定的合规申报
 */
export class Section321Service {
  private logger = new Logger('Section321Service');
  private importer: string;
  private cbpPortCode: string;
  private filerCode: string;

  constructor(config: {
    importer: string; // 进口商信息
    cbpPortCode: string; // CBP港口代码
    filerCode: string; // 申报人代码
  }) {
    this.importer = config.importer;
    this.cbpPortCode = config.cbpPortCode;
    this.filerCode = config.filerCode;
  }

  /**
   * 验证订单是否符合Section 321条件
   */
  async validateSection321Eligibility(transaction: ComplianceTransaction): Promise<{
    eligible: boolean;
    reason?: string;
    dutyAmount?: number;
    recommendations?: string[];
  }> {
    const { destination, items, totalValue, shipment } = transaction;

    // 检查目的地是否为美国
    if (destination.countryCode !== 'US') {
      return {
        eligible: false,
        reason: '目的地不在美国'
      };
    }

    // 检查订单价值是否在Section 321阈值内 ($800)
    if (totalValue > 800) {
      const dutyCalculation = this.calculateUSCustomsDuty(items, totalValue);
      
      return {
        eligible: false,
        reason: '订单价值超过$800 Section 321阈值',
        dutyAmount: dutyCalculation.totalDuty,
        recommendations: [
          '拆分订单至$800以下',
          '使用标准关税申报程序',
          '考虑分批发货'
        ]
      };
    }

    // 检查禁止使用Section 321的商品
    const prohibitedItems = this.checkProhibitedItems(items);
    if (prohibitedItems.length > 0) {
      return {
        eligible: false,
        reason: `包含Section 321不适用商品: ${prohibitedItems.join(', ')}`,
        recommendations: [
          '移除不适用商品',
          '使用正式进口程序'
        ]
      };
    }

    // 检查收件人限制 (同一收件人24小时内限制)
    const recipientCheck = await this.checkRecipientLimitation(
      shipment?.recipient || destination,
      totalValue
    );
    
    if (!recipientCheck.allowed) {
      return {
        eligible: false,
        reason: recipientCheck.reason,
        recommendations: [
          '延迟发货至24小时后',
          '使用不同的收件人地址',
          '合并为单个订单'
        ]
      };
    }

    return {
      eligible: true
    };
  }

  /**
   * 生成Section 321申报
   */
  async generateDeclaration(transaction: ComplianceTransaction): Promise<Section321Declaration> {
    const eligibility = await this.validateSection321Eligibility(transaction);
    
    if (!eligibility.eligible) {
      throw new Error(`无法使用Section 321: ${eligibility.reason}`);
    }

    const { destination, items, totalValue, currency, orderId, shipment } = transaction;

    const declaration: Section321Declaration = {
      id: `S321_${orderId}_${Date.now()}`,
      type: 'SECTION_321_DE_MINIMIS',
      filingDate: new Date().toISOString(),
      importer: {
        name: this.importer,
        address: shipment?.origin || {
          street: 'Unknown',
          city: 'Shenzhen',
          state: 'Guangdong',
          zip: '518000',
          countryCode: 'CN'
        }
      },
      consignee: {
        name: shipment?.recipient?.name || destination.name || 'Unknown',
        address: {
          street: destination.street || 'Unknown',
          city: destination.city,
          state: destination.provinceCode,
          zip: destination.postalCode,
          countryCode: destination.countryCode
        }
      },
      shipmentDetails: {
        orderId,
        trackingNumber: shipment?.trackingNumber || this.generateTrackingNumber(),
        carrier: shipment?.carrier || 'Unknown',
        totalValue,
        currency,
        portOfEntry: this.cbpPortCode,
        arrivalDate: this.estimateArrivalDate(shipment?.estimatedDelivery)
      },
      merchandise: items.map(item => ({
        lineNumber: items.indexOf(item) + 1,
        description: this.formatItemDescription(item),
        hsCode: item.hsCode,
        countryOfOrigin: 'CN', // 默认中国制造
        quantity: item.quantity,
        unitOfMeasure: this.determineUnitOfMeasure(item),
        unitValue: item.price,
        totalValue: item.quantity * item.price,
        manufacturer: item.vendor || 'Unknown'
      })),
      certification: {
        certifierName: this.filerCode,
        certifierTitle: 'Automated Filing System',
        certificationDate: new Date().toISOString(),
        statement: 'I certify that this shipment qualifies for Section 321 de minimis treatment'
      },
      cbpRequirements: {
        filerCode: this.filerCode,
        entryType: 'SECTION_321',
        dutyStatus: 'FREE',
        estimatedDuty: 0,
        estimatedTax: 0
      },
      status: 'PENDING'
    };

    this.logger.info('Section 321申报已生成', {
      declarationId: declaration.id,
      orderId,
      totalValue,
      itemCount: items.length
    });

    return declaration;
  }

  /**
   * 提交Section 321申报到CBP
   */
  async submitDeclaration(declaration: Section321Declaration): Promise<{
    success: boolean;
    entryNumber?: string;
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

      // 提交到CBP系统
      const submissionResult = await this.submitToCBP(declaration);
      
      if (submissionResult.success) {
        this.logger.info('Section 321申报提交成功', {
          declarationId: declaration.id,
          entryNumber: submissionResult.entryNumber
        });

        return {
          success: true,
          entryNumber: submissionResult.entryNumber
        };
      } else {
        return {
          success: false,
          errors: submissionResult.errors
        };
      }

    } catch (error) {
      this.logger.error('Section 321申报提交失败', error);
      return {
        success: false,
        errors: [error.message || '提交过程中发生未知错误']
      };
    }
  }

  /**
   * 生成月度Section 321报告
   */
  async generateMonthlyReport(year: number, month: number): Promise<Section321Report> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 获取本月所有Section 321申报记录
    const declarations = await this.getDeclarationsForPeriod(startDate, endDate);
    
    // 统计数据
    const statistics = this.calculateStatistics(declarations);

    const report: Section321Report = {
      id: `S321_REPORT_${year}_${month.toString().padStart(2, '0')}`,
      reportingPeriod: {
        year,
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: {
        totalShipments: declarations.length,
        totalValue: statistics.totalValue,
        averageValue: statistics.averageValue,
        utilizationRate: this.calculateUtilizationRate(declarations.length),
        topDestinationStates: statistics.topStates,
        topProductCategories: statistics.topCategories
      },
      complianceMetrics: {
        successfulFilings: declarations.filter(d => d.status === 'APPROVED').length,
        rejectedFilings: declarations.filter(d => d.status === 'REJECTED').length,
        pendingFilings: declarations.filter(d => d.status === 'PENDING').length,
        averageProcessingTime: statistics.averageProcessingTime,
        complianceRate: statistics.complianceRate
      },
      riskAnalysis: {
        highValueShipments: declarations.filter(d => d.shipmentDetails.totalValue > 600).length,
        repeatedConsignees: this.identifyRepeatedConsignees(declarations),
        flaggedCategories: this.identifyFlaggedCategories(declarations)
      },
      generatedDate: new Date().toISOString(),
      status: 'DRAFT'
    };

    this.logger.info('Section 321月度报告已生成', {
      reportId: report.id,
      period: `${year}-${month}`,
      shipments: report.summary.totalShipments,
      totalValue: report.summary.totalValue
    });

    return report;
  }

  /**
   * 检查禁止使用Section 321的商品
   */
  private checkProhibitedItems(items: any[]): string[] {
    const prohibited: string[] = [];
    
    items.forEach(item => {
      const hsCode = item.hsCode;
      const tags = item.tags || [];
      
      // 纺织品配额限制
      if (hsCode.startsWith('50') || hsCode.startsWith('51') || 
          hsCode.startsWith('52') || hsCode.startsWith('53') ||
          hsCode.startsWith('54') || hsCode.startsWith('55') ||
          hsCode.startsWith('56') || hsCode.startsWith('57') ||
          hsCode.startsWith('58') || hsCode.startsWith('59') ||
          hsCode.startsWith('60') || hsCode.startsWith('61') ||
          hsCode.startsWith('62') || hsCode.startsWith('63')) {
        // 检查是否来自特定国家（配额限制）
        prohibited.push('配额限制纺织品');
      }
      
      // 需要FDA许可的产品
      if (hsCode.startsWith('3003') || hsCode.startsWith('3004') || 
          tags.some(tag => tag.toLowerCase().includes('medical'))) {
        prohibited.push('需FDA许可产品');
      }
      
      // 食品饮料（需要FDA注册）
      if (hsCode.startsWith('04') || hsCode.startsWith('19') || hsCode.startsWith('20') ||
          tags.some(tag => tag.toLowerCase().includes('food'))) {
        prohibited.push('食品饮料类');
      }
      
      // 化妆品（某些需要FDA注册）
      if (hsCode.startsWith('3303') || hsCode.startsWith('3304')) {
        prohibited.push('化妆品类');
      }
    });

    return [...new Set(prohibited)];
  }

  /**
   * 检查收件人限制
   */
  private async checkRecipientLimitation(recipient: any, currentValue: number): Promise<{
    allowed: boolean;
    reason?: string;
    dailyTotal?: number;
  }> {
    // 实际实现中需要查询数据库检查同一收件人24小时内的订单
    // 这里返回模拟结果
    
    const recipientKey = `${recipient.name}_${recipient.street}_${recipient.zip}`;
    const today = new Date().toDateString();
    
    // 模拟查询24小时内同一收件人的订单总价值
    const dailyTotal = await this.getRecipientDailyTotal(recipientKey, today);
    
    if (dailyTotal + currentValue > 800) {
      return {
        allowed: false,
        reason: '收件人24小时内订单总价值将超过$800限制',
        dailyTotal
      };
    }
    
    return {
      allowed: true,
      dailyTotal
    };
  }

  /**
   * 计算美国关税
   */
  private calculateUSCustomsDuty(items: any[], totalValue: number) {
    let totalDuty = 0;
    
    items.forEach(item => {
      const dutyRate = this.getUSCustomsDutyRate(item.hsCode);
      const itemValue = item.quantity * item.price;
      const itemDuty = itemValue * (dutyRate / 100);
      totalDuty += itemDuty;
    });
    
    return {
      totalDuty,
      effectiveRate: totalValue > 0 ? (totalDuty / totalValue) * 100 : 0
    };
  }

  /**
   * 获取美国关税税率
   */
  private getUSCustomsDutyRate(hsCode: string): number {
    // 简化的关税税率表
    const dutyRates: Record<string, number> = {
      '61': 16.5, // 服装类
      '62': 16.5, // 服装类
      '64': 37.5, // 鞋类
      '42': 17.6, // 箱包类
      '71': 5.5,  // 珠宝类
      '85': 0,    // 电子产品（大多免税）
      '90': 0,    // 光学仪器
      '87': 2.5   // 汽车配件
    };
    
    const prefix = hsCode.substring(0, 2);
    return dutyRates[prefix] || 5.63; // 默认平均税率
  }

  /**
   * 格式化商品描述
   */
  private formatItemDescription(item: any): string {
    const baseDescription = item.title || 'Unknown Item';
    const vendor = item.vendor ? ` by ${item.vendor}` : '';
    return `${baseDescription}${vendor}`.substring(0, 200); // CBP限制描述长度
  }

  /**
   * 确定计量单位
   */
  private determineUnitOfMeasure(item: any): string {
    const hsCode = item.hsCode;
    
    // 根据HSCode确定常用计量单位
    if (hsCode.startsWith('61') || hsCode.startsWith('62')) {
      return 'PCS'; // 服装按件计
    } else if (hsCode.startsWith('64')) {
      return 'PRS'; // 鞋类按双计
    } else if (hsCode.startsWith('85')) {
      return 'NO'; // 电子产品按个计
    }
    
    return 'PCS'; // 默认按件计
  }

  /**
   * 估算到达日期
   */
  private estimateArrivalDate(estimatedDelivery?: string): string {
    if (estimatedDelivery) {
      return estimatedDelivery;
    }
    
    // 默认估算7-15天送达
    const arrival = new Date();
    arrival.setDate(arrival.getDate() + 10);
    return arrival.toISOString();
  }

  /**
   * 生成跟踪号
   */
  private generateTrackingNumber(): string {
    return `DTB${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * 验证申报数据
   */
  private validateDeclaration(declaration: Section321Declaration): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!declaration.importer.name) {
      errors.push('缺少进口商信息');
    }

    if (!declaration.consignee.name || !declaration.consignee.address.street) {
      errors.push('缺少收货人信息');
    }

    if (declaration.shipmentDetails.totalValue <= 0) {
      errors.push('货物价值必须大于0');
    }

    if (declaration.shipmentDetails.totalValue > 800) {
      errors.push('货物价值超过Section 321阈值$800');
    }

    if (!declaration.merchandise || declaration.merchandise.length === 0) {
      errors.push('缺少商品信息');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 模拟提交到CBP系统
   */
  private async submitToCBP(declaration: Section321Declaration): Promise<{
    success: boolean;
    entryNumber?: string;
    errors?: string[];
  }> {
    // 实际实现中这里会调用真实的CBP API
    await new Promise(resolve => setTimeout(resolve, 2000));

    const success = Math.random() > 0.05; // 95%成功率
    
    if (success) {
      return {
        success: true,
        entryNumber: `${this.cbpPortCode}${Date.now().toString().substr(-8)}`
      };
    } else {
      return {
        success: false,
        errors: ['模拟的CBP系统错误']
      };
    }
  }

  /**
   * 获取收件人当日订单总额（模拟）
   */
  private async getRecipientDailyTotal(recipientKey: string, date: string): Promise<number> {
    // 实际实现中从数据库查询
    return Math.random() * 200; // 模拟0-200美元的随机值
  }

  /**
   * 获取指定期间的申报记录（模拟）
   */
  private async getDeclarationsForPeriod(startDate: Date, endDate: Date): Promise<Section321Declaration[]> {
    // 实际实现中从数据库查询
    return [];
  }

  /**
   * 计算统计数据
   */
  private calculateStatistics(declarations: Section321Declaration[]) {
    const totalValue = declarations.reduce((sum, decl) => sum + decl.shipmentDetails.totalValue, 0);
    const averageValue = declarations.length > 0 ? totalValue / declarations.length : 0;

    return {
      totalValue,
      averageValue,
      averageProcessingTime: 2, // 模拟平均处理时间（天）
      complianceRate: 95, // 模拟合规率
      topStates: ['CA', 'NY', 'TX', 'FL', 'WA'], // 模拟热门州
      topCategories: ['Electronics', 'Clothing', 'Accessories', 'Home & Garden'] // 模拟热门类别
    };
  }

  /**
   * 计算Section 321利用率
   */
  private calculateUtilizationRate(shipmentCount: number): number {
    // 基于历史数据和行业基准计算利用率
    // 这里返回模拟值
    return Math.min(95, (shipmentCount / 1000) * 100);
  }

  /**
   * 识别重复收件人
   */
  private identifyRepeatedConsignees(declarations: Section321Declaration[]): number {
    const consigneeMap = new Map<string, number>();
    
    declarations.forEach(decl => {
      const key = `${decl.consignee.name}_${decl.consignee.address.zip}`;
      consigneeMap.set(key, (consigneeMap.get(key) || 0) + 1);
    });
    
    return Array.from(consigneeMap.values()).filter(count => count > 3).length;
  }

  /**
   * 识别标记类别
   */
  private identifyFlaggedCategories(declarations: Section321Declaration[]): string[] {
    // 识别可能需要特别关注的商品类别
    return ['Textiles', 'Electronics', 'Cosmetics'];
  }
}