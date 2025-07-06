/**
 * DTax-Bridge 税费计算请求模型
 * 
 * 支持多种场景的税费计算请求，包括：
 * - B2C/B2B 不同业务类型
 * - 多种商品组合订单
 * - 不同目的地国家/地区
 * - IOSS/Section 321 等合规要求
 */

export interface TaxCalculationRequest {
  /** 订单基本信息 */
  orderId?: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'CNY';
  
  /** 商品明细 */
  items: TaxCalculationItem[];
  
  /** 目的地信息 */
  destination: DestinationInfo;
  
  /** 客户信息 */
  customerInfo?: CustomerInfo;
  
  /** 物流信息 */
  shippingInfo?: ShippingInfo;
  
  /** 计算选项 */
  options?: CalculationOptions;
}

export interface TaxCalculationItem {
  /** 商品基本信息 */
  productId?: string;
  name: string;
  description?: string;
  
  /** 价格和数量 */
  unitPrice: number;
  quantity: number;
  totalValue: number;
  
  /** 商品分类 */
  hsCode?: string;
  category?: string;
  
  /** 商品属性 */
  weight?: number; // kg
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  
  /** 原产地 */
  originCountry?: string;
  
  /** 特殊属性 */
  isDigital?: boolean;
  isDangerous?: boolean;
  isRestricted?: boolean;
}

export interface DestinationInfo {
  /** 国家代码 (ISO 3166-1 alpha-2) */
  countryCode: string;
  
  /** 州/省代码 */
  stateCode?: string;
  
  /** 城市 */
  city?: string;
  
  /** 邮政编码 */
  postalCode?: string;
  
  /** 是否为欧盟成员国 */
  isEuMember?: boolean;
  
  /** 是否为偏远地区 */
  isRemoteArea?: boolean;
}

export interface CustomerInfo {
  /** 客户类型 */
  type: 'B2C' | 'B2B';
  
  /** VAT 号码 */
  vatNumber?: string;
  
  /** EORI 号码 */
  eoriNumber?: string;
  
  /** 是否为注册进口商 */
  isRegisteredImporter?: boolean;
  
  /** 客户ID */
  customerId?: string;
}

export interface ShippingInfo {
  /** 物流服务类型 */
  serviceType: 'DDP' | 'DAP' | 'DDU';
  
  /** 物流服务商 */
  carrier?: string;
  
  /** 预计配送时间 */
  estimatedDeliveryDays?: number;
  
  /** 运费 */
  shippingCost?: number;
}

export interface CalculationOptions {
  /** 是否包含运费在税费计算中 */
  includeshippingInTax?: boolean;
  
  /** 是否强制使用指定税率 */
  forceSpecificRate?: number;
  
  /** 是否启用缓存 */
  enableCache?: boolean;
  
  /** 计算精度 */
  precision?: number;
  
  /** 是否返回详细分解 */
  includeBreakdown?: boolean;
  
  /** 特殊合规要求 */
  complianceRequirements?: ('IOSS' | 'Section321' | 'UkVat' | 'CanadaGST')[];
}