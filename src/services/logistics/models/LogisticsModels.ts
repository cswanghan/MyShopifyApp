// 物流服务核心数据模型

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CNY'
export type DeliveryMode = 'DDP' | 'DAP' | 'EXW' | 'FCA'
export type ServiceType = 'EXPRESS' | 'STANDARD' | 'ECONOMY' | 'PACKET'

// 物流请求
export interface LogisticsRequest {
  orderId?: string
  origin: AddressInfo
  destination: AddressInfo
  packages: PackageInfo[]
  shipmentValue: MoneyAmount
  preferredMode?: DeliveryMode
  requiredServices?: string[]
  cutoffTime?: Date
}

// 地址信息
export interface AddressInfo {
  countryCode: string // ISO 3166-1 alpha-2
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

// 包裹信息
export interface PackageInfo {
  weight: WeightInfo
  dimensions: DimensionInfo
  value: MoneyAmount
  hsCode?: string
  description: string
  quantity: number
  isDangerous?: boolean
  requiresSignature?: boolean
}

// 重量信息
export interface WeightInfo {
  value: number
  unit: 'KG' | 'LB' | 'G' | 'OZ'
}

// 尺寸信息
export interface DimensionInfo {
  length: number
  width: number
  height: number
  unit: 'CM' | 'IN'
}

// 金额信息
export interface MoneyAmount {
  amount: number
  currency: Currency
}

// 物流方案响应
export interface LogisticsResponse {
  requestId: string
  providerId: string
  providerName: string
  quotes: LogisticsQuote[]
  errors?: LogisticsError[]
  processingTime: number
  timestamp: Date
}

// 物流报价
export interface LogisticsQuote {
  quoteId: string
  serviceCode: string
  serviceName: string
  serviceType: ServiceType
  deliveryMode: DeliveryMode
  
  // 费用详情
  pricing: LogisticsPricing
  
  // 时效信息
  deliveryTime: DeliveryTimeInfo
  
  // 服务特性
  features: ServiceFeature[]
  
  // 限制条件
  restrictions?: ServiceRestriction[]
  
  // 保险和附加服务
  insurance?: InsuranceInfo
  additionalServices?: AdditionalService[]
  
  // 跟踪信息
  tracking: TrackingInfo
  
  // 有效期
  validUntil: Date
  
  // 元数据
  metadata?: Record<string, any>
}

// 价格信息
export interface LogisticsPricing {
  baseCost: MoneyAmount
  fuelSurcharge?: MoneyAmount
  remoteAreaSurcharge?: MoneyAmount
  dutiesAndTaxes?: MoneyAmount
  insuranceFee?: MoneyAmount
  handlingFee?: MoneyAmount
  additionalFees?: MoneyAmount[]
  totalCost: MoneyAmount
  discounts?: MoneyAmount[]
  netCost: MoneyAmount
}

// 时效信息
export interface DeliveryTimeInfo {
  estimatedDays: number
  minDays?: number
  maxDays?: number
  cutoffTime?: string // HH:MM format
  businessDaysOnly: boolean
  guaranteedDelivery?: boolean
  nextDayAvailable?: boolean
}

// 服务特性
export interface ServiceFeature {
  code: string
  name: string
  description: string
  included: boolean
  additionalCost?: MoneyAmount
}

// 服务限制
export interface ServiceRestriction {
  type: 'WEIGHT' | 'DIMENSION' | 'VALUE' | 'COUNTRY' | 'PRODUCT'
  description: string
  maxValue?: number
  minValue?: number
  prohibitedItems?: string[]
}

// 保险信息
export interface InsuranceInfo {
  available: boolean
  maxCoverage?: MoneyAmount
  rate?: number // percentage
  mandatory?: boolean
  cost?: MoneyAmount
}

// 附加服务
export interface AdditionalService {
  code: string
  name: string
  description: string
  cost: MoneyAmount
  mandatory: boolean
}

// 跟踪信息
export interface TrackingInfo {
  available: boolean
  trackingNumber?: string
  trackingUrl?: string
  realTimeUpdates: boolean
  smsNotification?: boolean
  emailNotification?: boolean
}

// 错误信息
export interface LogisticsError {
  code: string
  message: string
  details?: string
  field?: string
}

// 物流服务商配置
export interface LogisticsProviderConfig {
  providerId: string
  providerName: string
  apiEndpoint: string
  apiVersion: string
  authentication: {
    type: 'API_KEY' | 'BASIC_AUTH' | 'OAUTH2' | 'JWT'
    credentials: Record<string, string>
  }
  defaultSettings: {
    currency: Currency
    weightUnit: 'KG' | 'LB'
    dimensionUnit: 'CM' | 'IN'
    timeout: number
  }
  supportedServices: string[]
  supportedCountries: string[]
  features: {
    realTimeTracking: boolean
    insurance: boolean
    signatureRequired: boolean
    proofOfDelivery: boolean
  }
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
}

// 批量物流请求
export interface BulkLogisticsRequest {
  requests: LogisticsRequest[]
  options: {
    maxProviders?: number
    timeout?: number
    includeRestricted?: boolean
    sortBy?: 'COST' | 'TIME' | 'RELIABILITY'
  }
}

// 批量物流响应
export interface BulkLogisticsResponse {
  requestId: string
  responses: LogisticsResponse[]
  summary: {
    totalRequests: number
    successfulResponses: number
    failedResponses: number
    averageProcessingTime: number
  }
  bestOptions: {
    cheapest: LogisticsQuote
    fastest: LogisticsQuote
    recommended: LogisticsQuote
  }
}

// 物流订单
export interface LogisticsOrder {
  orderId: string
  quoteId: string
  providerId: string
  serviceCode: string
  
  // 发货信息
  shipment: {
    trackingNumber: string
    labelUrl?: string
    shipmentDate: Date
    estimatedDeliveryDate: Date
  }
  
  // 状态
  status: LogisticsStatus
  statusHistory: LogisticsStatusUpdate[]
  
  // 费用
  actualCost?: MoneyAmount
  
  // 文档
  documents: ShippingDocument[]
  
  // 事件
  events: TrackingEvent[]
  
  createdAt: Date
  updatedAt: Date
}

// 物流状态
export type LogisticsStatus = 
  | 'CREATED'           // 订单已创建
  | 'CONFIRMED'         // 已确认
  | 'PICKED_UP'         // 已取件
  | 'IN_TRANSIT'        // 运输中
  | 'OUT_FOR_DELIVERY'  // 配送中
  | 'DELIVERED'         // 已送达
  | 'FAILED_DELIVERY'   // 配送失败
  | 'RETURNED'          // 已退回
  | 'CANCELLED'         // 已取消
  | 'EXCEPTION'         // 异常

// 状态更新
export interface LogisticsStatusUpdate {
  status: LogisticsStatus
  timestamp: Date
  location?: string
  description?: string
  updatedBy: 'SYSTEM' | 'PROVIDER' | 'MANUAL'
}

// 运输文档
export interface ShippingDocument {
  type: 'LABEL' | 'INVOICE' | 'MANIFEST' | 'CUSTOMS' | 'CERTIFICATE'
  url: string
  filename: string
  format: 'PDF' | 'PNG' | 'ZPL' | 'EPL'
  generatedAt: Date
}

// 跟踪事件
export interface TrackingEvent {
  eventId: string
  timestamp: Date
  status: LogisticsStatus
  location: string
  description: string
  eventCode?: string
  providerEvent?: any
}

// 成本分析
export interface CostAnalysis {
  baseCosts: MoneyAmount[]
  totalCosts: MoneyAmount[]
  savings: MoneyAmount
  percentageSavings: number
  comparison: {
    cheapest: LogisticsQuote
    mostExpensive: LogisticsQuote
    average: MoneyAmount
  }
}

// 时效分析
export interface TimeAnalysis {
  averageDeliveryTime: number
  fastestOption: LogisticsQuote
  slowestOption: LogisticsQuote
  timeRange: {
    min: number
    max: number
  }
}

// 服务商性能指标
export interface ProviderPerformance {
  providerId: string
  metrics: {
    averageCost: MoneyAmount
    averageDeliveryTime: number
    onTimeDeliveryRate: number
    successRate: number
    customerSatisfaction: number
  }
  ranking: {
    costRank: number
    speedRank: number
    reliabilityRank: number
    overallRank: number
  }
  lastUpdated: Date
}