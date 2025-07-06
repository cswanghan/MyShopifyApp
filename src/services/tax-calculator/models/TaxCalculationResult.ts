/**
 * DTax-Bridge 税费计算结果模型
 * 
 * 返回详细的税费计算结果，包括：
 * - 各种税费的分项计算
 * - 合规检查结果
 * - 优化建议
 * - 错误和警告信息
 */

export interface TaxCalculationResult {
  /** 计算状态 */
  success: boolean;
  
  /** 总税费 */
  totalTax: number;
  currency: string;
  
  /** 税费分解 */
  breakdown: TaxBreakdown[];
  
  /** 合规信息 */
  complianceInfo: ComplianceInfo;
  
  /** 优化建议 */
  recommendations?: TaxOptimizationRecommendation[];
  
  /** 警告信息 */
  warnings?: Warning[];
  
  /** 错误信息 */
  errors?: TaxCalculationError[];
  
  /** 计算元数据 */
  metadata: CalculationMetadata;
}

export interface TaxBreakdown {
  /** 税费类型 */
  taxType: TaxType;
  
  /** 税费名称 */
  taxName: string;
  
  /** 税率 */
  rate: number;
  
  /** 税基 */
  taxBase: number;
  
  /** 税费金额 */
  amount: number;
  
  /** 适用的商品 */
  applicableItems?: string[];
  
  /** 备注 */
  notes?: string;
}

export enum TaxType {
  VAT = 'VAT',
  DUTY = 'DUTY',
  CONSUMPTION_TAX = 'CONSUMPTION_TAX',
  HANDLING_FEE = 'HANDLING_FEE',
  BROKER_FEE = 'BROKER_FEE',
  CUSTOMS_FEE = 'CUSTOMS_FEE'
}

export interface ComplianceInfo {
  /** 是否符合要求 */
  isCompliant: boolean;
  
  /** 适用的合规政策 */
  applicablePolicies: CompliancePolicy[];
  
  /** IOSS 相关信息 */
  iossInfo?: IOSSInfo;
  
  /** Section 321 相关信息 */
  section321Info?: Section321Info;
  
  /** UK VAT 相关信息 */
  ukVatInfo?: UKVatInfo;
  
  /** 需要的文档 */
  requiredDocuments?: string[];
}

export interface CompliancePolicy {
  /** 政策类型 */
  type: 'IOSS' | 'Section321' | 'UkVat' | 'CanadaGST' | 'Other';
  
  /** 政策名称 */
  name: string;
  
  /** 是否适用 */
  applicable: boolean;
  
  /** 阈值信息 */
  threshold?: {
    amount: number;
    currency: string;
    period?: string;
  };
  
  /** 政策说明 */
  description?: string;
}

export interface IOSSInfo {
  /** 是否适用 IOSS */
  applicable: boolean;
  
  /** IOSS 号码 */
  iossNumber?: string;
  
  /** 当前月度累计金额 */
  monthlyAccumulated?: number;
  
  /** 是否接近阈值 */
  nearThreshold?: boolean;
}

export interface Section321Info {
  /** 是否适用 Section 321 */
  applicable: boolean;
  
  /** 当日累计金额 */
  dailyAccumulated?: number;
  
  /** 同收件人累计 */
  recipientAccumulated?: number;
  
  /** 节省的关税金额 */
  savedDutyAmount?: number;
}

export interface UKVatInfo {
  /** 是否适用低价值救济 */
  lowValueReliefApplicable: boolean;
  
  /** UK VAT 号码 */
  vatNumber?: string;
  
  /** 季度累计 */
  quarterlyAccumulated?: number;
}

export interface TaxOptimizationRecommendation {
  /** 优化类型 */
  type: 'SPLIT_ORDER' | 'CHANGE_SHIPPING' | 'ADJUST_PRICE' | 'USE_DIFFERENT_CLASSIFICATION';
  
  /** 建议标题 */
  title: string;
  
  /** 详细说明 */
  description: string;
  
  /** 潜在节省 */
  potentialSavings: number;
  
  /** 实施难度 */
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface Warning {
  /** 警告代码 */
  code: string;
  
  /** 警告信息 */
  message: string;
  
  /** 严重程度 */
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  
  /** 相关字段 */
  field?: string;
}

export interface TaxCalculationError {
  /** 错误代码 */
  code: string;
  
  /** 错误信息 */
  message: string;
  
  /** 错误类型 */
  type: 'VALIDATION' | 'RATE_NOT_FOUND' | 'API_ERROR' | 'SYSTEM_ERROR';
  
  /** 相关字段 */
  field?: string;
  
  /** 错误详情 */
  details?: any;
}

export interface CalculationMetadata {
  /** 计算时间戳 */
  timestamp: string;
  
  /** 计算耗时 (ms) */
  calculationTime: number;
  
  /** 使用的税率版本 */
  rateVersion?: string;
  
  /** 计算引擎版本 */
  engineVersion: string;
  
  /** 是否使用缓存 */
  fromCache?: boolean;
  
  /** 计算ID */
  calculationId: string;
  
  /** 调试信息 */
  debugInfo?: {
    appliedRules: string[];
    skippedRules: string[];
    calculationSteps: any[];
  };
}