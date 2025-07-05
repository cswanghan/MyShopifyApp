import { ComplianceTransaction, UKVATDeclaration, UKVATReturn } from '../types';
import { Logger } from '../../shared/src/utils/logger';

/**
 * UK VAT申报服务
 * 处理英国增值税申报和退税
 */
export class UKVATService {
  private logger = new Logger('UKVATService');
  private vatNumber: string;
  private hmrcApiKey: string;
  private isLowValueConsignmentRelief: boolean;

  constructor(config: {
    vatNumber: string;
    hmrcApiKey: string;
    isLowValueConsignmentRelief?: boolean;
  }) {
    this.vatNumber = config.vatNumber;
    this.hmrcApiKey = config.hmrcApiKey;
    this.isLowValueConsignmentRelief = config.isLowValueConsignmentRelief || true;
  }

  /**
   * 验证订单是否需要UK VAT申报
   */
  async validateUKVATRequirement(transaction: ComplianceTransaction): Promise<{
    required: boolean;
    exemptionReason?: string;
    vatAmount?: number;
    applicableRate?: number;
  }> {
    const { destination, items, totalValue } = transaction;

    // 检查目的地是否为英国
    if (destination.countryCode !== 'GB') {
      return {
        required: false,
        exemptionReason: '目的地不在英国'
      };
    }

    // 检查低价值货物救济政策 (£135以下)
    if (this.isLowValueConsignmentRelief && totalValue <= 135) {
      const vatCalculation = this.calculateUKVAT(items, totalValue);
      
      return {
        required: true,
        vatAmount: vatCalculation.totalVAT,
        applicableRate: vatCalculation.effectiveRate
      };
    }

    // 超过£135的货物需要在边境缴纳VAT
    if (totalValue > 135) {
      return {
        required: false,
        exemptionReason: '订单价值超过£135，需在边境缴纳VAT',
        vatAmount: this.calculateUKVAT(items, totalValue).totalVAT
      };
    }

    // 检查免税商品
    const exemptItems = this.checkVATExemptItems(items);
    if (exemptItems.length === items.length) {
      return {
        required: false,
        exemptionReason: '所有商品均为VAT免税商品'
      };
    }

    const vatCalculation = this.calculateUKVAT(items, totalValue);
    
    return {
      required: true,
      vatAmount: vatCalculation.totalVAT,
      applicableRate: vatCalculation.effectiveRate
    };
  }

  /**
   * 生成UK VAT申报
   */
  async generateDeclaration(transaction: ComplianceTransaction): Promise<UKVATDeclaration> {
    const requirement = await this.validateUKVATRequirement(transaction);
    
    if (!requirement.required) {
      throw new Error(`无需UK VAT申报: ${requirement.exemptionReason}`);
    }

    const { destination, items, totalValue, currency, orderId } = transaction;

    // 计算VAT详情
    const vatCalculation = this.calculateDetailedUKVAT(items, totalValue);

    const declaration: UKVATDeclaration = {
      id: `UKVAT_${orderId}_${Date.now()}`,
      vatNumber: this.vatNumber,
      declarationType: 'IMPORT_VAT',
      taxPeriod: this.getCurrentTaxPeriod(),
      consignmentDetails: {
        orderId,
        consignmentValue: totalValue,
        currency,
        consignmentDate: new Date().toISOString(),
        customsDeclarationNumber: this.generateCustomsDeclarationNumber(),
        items: items.map(item => ({
          description: item.title,
          commodityCode: item.hsCode,
          quantity: item.quantity,
          unitValue: item.price,
          totalValue: item.quantity * item.price,
          vatRate: this.getUKVATRate(item.hsCode, item.tags),
          vatAmount: this.calculateItemUKVAT(item)
        }))
      },
      vatCalculation: {
        totalConsignmentValue: totalValue,
        totalVATDue: vatCalculation.totalVAT,
        vatBreakdown: vatCalculation.breakdown,
        effectiveRate: vatCalculation.effectiveRate
      },
      relief: {
        lowValueConsignmentRelief: this.isLowValueConsignmentRelief && totalValue <= 135,
        otherReliefs: this.checkOtherReliefs(items)
      },
      submissionDate: new Date().toISOString(),
      status: 'PENDING'
    };

    this.logger.info('UK VAT申报已生成', {
      declarationId: declaration.id,
      orderId,
      totalVAT: vatCalculation.totalVAT,
      relief: declaration.relief
    });

    return declaration;
  }

  /**
   * 提交UK VAT申报到HMRC
   */
  async submitDeclaration(declaration: UKVATDeclaration): Promise<{
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

      // 提交到HMRC API
      const submissionResult = await this.submitToHMRC(declaration);
      
      if (submissionResult.success) {
        this.logger.info('UK VAT申报提交成功', {
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
      this.logger.error('UK VAT申报提交失败', error);
      return {
        success: false,
        errors: [error.message || '提交过程中发生未知错误']
      };
    }
  }

  /**
   * 生成季度VAT退税申请
   */
  async generateQuarterlyReturn(year: number, quarter: number): Promise<UKVATReturn> {
    const { startDate, endDate } = this.getQuarterDates(year, quarter);

    // 获取本季度所有VAT申报记录
    const declarations = await this.getDeclarationsForPeriod(startDate, endDate);
    
    // 计算VAT汇总
    const vatSummary = this.aggregateVATForReturn(declarations);

    const vatReturn: UKVATReturn = {
      id: `UKVAT_RETURN_${year}_Q${quarter}`,
      vatNumber: this.vatNumber,
      periodKey: `${year.toString().substr(2)}A${quarter}`, // HMRC期间密钥格式
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      boxes: {
        box1: vatSummary.vatDueOnSales, // 销售项VAT
        box2: 0, // EU采购VAT (通常为0)
        box3: vatSummary.vatDueOnSales, // 总VAT到期
        box4: 0, // VAT回收 (通常为0，除非有进项VAT)
        box5: vatSummary.netVATDue, // 净VAT到期
        box6: vatSummary.totalSalesValue, // 销售总值 (不含VAT)
        box7: 0, // 其他供应品 (通常为0)
        box8: 0, // EU商品购买 (通常为0)
        box9: 0 // EU服务购买 (通常为0)
      },
      finalised: false,
      submissionDate: new Date().toISOString(),
      status: 'DRAFT'
    };

    this.logger.info('UK VAT季度申报已生成', {
      returnId: vatReturn.id,
      period: `${year} Q${quarter}`,
      netVATDue: vatSummary.netVATDue,
      totalSales: vatSummary.totalSalesValue
    });

    return vatReturn;
  }

  /**
   * 计算UK VAT
   */
  private calculateUKVAT(items: any[], totalValue: number) {
    let totalVAT = 0;
    let taxableValue = 0;

    items.forEach(item => {
      const vatRate = this.getUKVATRate(item.hsCode, item.tags);
      const itemValue = item.quantity * item.price;
      const itemVAT = itemValue * (vatRate / 100);
      
      totalVAT += itemVAT;
      if (vatRate > 0) {
        taxableValue += itemValue;
      }
    });

    return {
      totalVAT,
      effectiveRate: taxableValue > 0 ? (totalVAT / taxableValue) * 100 : 0
    };
  }

  /**
   * 计算详细UK VAT
   */
  private calculateDetailedUKVAT(items: any[], totalValue: number) {
    const breakdown: Record<string, { value: number; vat: number }> = {};
    let totalVAT = 0;

    items.forEach(item => {
      const vatRate = this.getUKVATRate(item.hsCode, item.tags);
      const itemValue = item.quantity * item.price;
      const itemVAT = itemValue * (vatRate / 100);
      
      const rateKey = `${vatRate}%`;
      if (!breakdown[rateKey]) {
        breakdown[rateKey] = { value: 0, vat: 0 };
      }
      
      breakdown[rateKey].value += itemValue;
      breakdown[rateKey].vat += itemVAT;
      totalVAT += itemVAT;
    });

    return {
      totalVAT,
      breakdown,
      effectiveRate: totalValue > 0 ? (totalVAT / totalValue) * 100 : 0
    };
  }

  /**
   * 获取UK VAT税率
   */
  private getUKVATRate(hsCode: string, tags: string[] = []): number {
    // 零税率商品
    if (this.isZeroRatedItem(hsCode, tags)) {
      return 0;
    }

    // 减税率商品 (5%)
    if (this.isReducedRateItem(hsCode, tags)) {
      return 5;
    }

    // 标准税率 (20%)
    return 20;
  }

  /**
   * 检查是否为零税率商品
   */
  private isZeroRatedItem(hsCode: string, tags: string[]): boolean {
    // 图书、报纸、杂志
    if (hsCode.startsWith('4901') || hsCode.startsWith('4902') || hsCode.startsWith('4903')) {
      return true;
    }

    // 食品 (基本食品)
    if (hsCode.startsWith('04') || hsCode.startsWith('19') || hsCode.startsWith('20')) {
      return true;
    }

    // 儿童服装和鞋类
    if (tags.some(tag => tag.toLowerCase().includes('children') || tag.toLowerCase().includes('baby'))) {
      if (hsCode.startsWith('61') || hsCode.startsWith('62') || hsCode.startsWith('64')) {
        return true;
      }
    }

    // 药品
    if (hsCode.startsWith('3003') || hsCode.startsWith('3004')) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否为减税率商品
   */
  private isReducedRateItem(hsCode: string, tags: string[]): boolean {
    // 家用燃料和电力 (不适用于跨境电商)
    // 女性卫生用品
    if (hsCode.startsWith('4818') && tags.some(tag => 
      tag.toLowerCase().includes('sanitary') || tag.toLowerCase().includes('feminine'))) {
      return true;
    }

    // 儿童汽车座椅
    if (hsCode.startsWith('9401') && tags.some(tag => 
      tag.toLowerCase().includes('car seat') || tag.toLowerCase().includes('child safety'))) {
      return true;
    }

    return false;
  }

  /**
   * 检查VAT免税商品
   */
  private checkVATExemptItems(items: any[]): any[] {
    return items.filter(item => 
      this.isZeroRatedItem(item.hsCode, item.tags || [])
    );
  }

  /**
   * 检查其他减免政策
   */
  private checkOtherReliefs(items: any[]): string[] {
    const reliefs: string[] = [];

    // 检查是否有书籍 - 通常零税率
    if (items.some(item => item.hsCode.startsWith('4901'))) {
      reliefs.push('零税率图书');
    }

    // 检查是否有食品
    if (items.some(item => item.hsCode.startsWith('04') || item.hsCode.startsWith('19'))) {
      reliefs.push('零税率基本食品');
    }

    // 检查是否有儿童用品
    if (items.some(item => (item.tags || []).some((tag: string) => 
      tag.toLowerCase().includes('children') || tag.toLowerCase().includes('baby')))) {
      reliefs.push('儿童用品减免');
    }

    return reliefs;
  }

  /**
   * 计算单个商品UK VAT
   */
  private calculateItemUKVAT(item: any): number {
    const vatRate = this.getUKVATRate(item.hsCode, item.tags || []);
    const itemValue = item.quantity * item.price;
    return itemValue * (vatRate / 100);
  }

  /**
   * 获取当前税期
   */
  private getCurrentTaxPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // UK VAT按季度申报
    const quarter = Math.ceil(month / 3);
    return `${year} Q${quarter}`;
  }

  /**
   * 生成海关申报编号
   */
  private generateCustomsDeclarationNumber(): string {
    const year = new Date().getFullYear().toString().substr(2);
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${year}GB${random}`;
  }

  /**
   * 获取季度日期范围
   */
  private getQuarterDates(year: number, quarter: number): {
    startDate: Date;
    endDate: Date;
  } {
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0);
    
    return { startDate, endDate };
  }

  /**
   * 验证申报数据
   */
  private validateDeclaration(declaration: UKVATDeclaration): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!declaration.vatNumber || !this.isValidUKVATNumber(declaration.vatNumber)) {
      errors.push('无效的UK VAT注册号');
    }

    if (!declaration.consignmentDetails.orderId) {
      errors.push('缺少订单ID');
    }

    if (declaration.consignmentDetails.consignmentValue <= 0) {
      errors.push('货物价值必须大于0');
    }

    if (!declaration.consignmentDetails.customsDeclarationNumber) {
      errors.push('缺少海关申报编号');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证UK VAT号码格式
   */
  private isValidUKVATNumber(vatNumber: string): boolean {
    // UK VAT号码格式: GB + 9位数字 或 GB + 12位数字
    const pattern9 = /^GB\d{9}$/;
    const pattern12 = /^GB\d{12}$/;
    return pattern9.test(vatNumber) || pattern12.test(vatNumber);
  }

  /**
   * 模拟提交到HMRC
   */
  private async submitToHMRC(declaration: UKVATDeclaration): Promise<{
    success: boolean;
    submissionId?: string;
    errors?: string[];
  }> {
    // 实际实现中这里会调用真实的HMRC API
    await new Promise(resolve => setTimeout(resolve, 1500));

    const success = Math.random() > 0.1;
    
    if (success) {
      return {
        success: true,
        submissionId: `HMRC_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
      };
    } else {
      return {
        success: false,
        errors: ['模拟的HMRC提交失败错误']
      };
    }
  }

  /**
   * 获取指定期间的申报记录（模拟）
   */
  private async getDeclarationsForPeriod(startDate: Date, endDate: Date): Promise<UKVATDeclaration[]> {
    // 实际实现中从数据库查询
    return [];
  }

  /**
   * 汇总VAT用于退税申请
   */
  private aggregateVATForReturn(declarations: UKVATDeclaration[]) {
    let vatDueOnSales = 0;
    let totalSalesValue = 0;

    declarations.forEach(decl => {
      vatDueOnSales += decl.vatCalculation.totalVATDue;
      totalSalesValue += decl.consignmentDetails.consignmentValue;
    });

    return {
      vatDueOnSales,
      totalSalesValue,
      netVATDue: vatDueOnSales // 简化计算，实际情况需要扣除进项VAT
    };
  }
}