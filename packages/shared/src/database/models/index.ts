/**
 * DTax-Bridge 数据库模型定义
 * 基于 Prisma ORM 的数据模型
 */

export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 店铺模型
 */
export interface Shop extends BaseModel {
  // Shopify 基本信息
  shopifyId: string;
  domain: string;
  name: string;
  email: string;
  phone?: string;
  
  // 地理信息
  country: string;
  province?: string;
  city?: string;
  timezone: string;
  currency: string;
  
  // 计划和状态
  plan: string;
  isActive: boolean;
  isTest: boolean;
  
  // 认证信息
  accessToken: string;
  scope: string[];
  
  // 安装信息
  installedAt: Date;
  uninstalledAt?: Date;
  lastSyncAt?: Date;
  
  // 关联关系
  users: User[];
  orders: Order[];
  settings: ShopSettings[];
}

/**
 * 用户模型
 */
export interface User extends BaseModel {
  // 基本信息
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  
  // 认证信息
  passwordHash?: string; // 用于后台管理员
  
  // 角色和权限
  roles: UserRole[];
  permissions: UserPermission[];
  
  // 状态
  isActive: boolean;
  emailVerified: boolean;
  
  // 登录信息
  lastLoginAt?: Date;
  loginCount: number;
  
  // 关联关系
  shopId: string;
  shop: Shop;
  sessions: UserSession[];
  auditLogs: AuditLog[];
}

/**
 * 用户角色模型
 */
export interface UserRole extends BaseModel {
  userId: string;
  user: User;
  role: string; // owner, admin, manager, operator, viewer, accountant, logistics
  assignedBy?: string;
  assignedAt: Date;
  expiresAt?: Date;
}

/**
 * 用户权限模型
 */
export interface UserPermission extends BaseModel {
  userId: string;
  user: User;
  permission: string;
  resource?: string; // 可选的资源限制
  assignedBy?: string;
  assignedAt: Date;
  expiresAt?: Date;
}

/**
 * 用户会话模型
 */
export interface UserSession extends BaseModel {
  sessionId: string;
  userId: string;
  user: User;
  shopId: string;
  shop: Shop;
  
  // 会话信息
  ipAddress?: string;
  userAgent?: string;
  
  // 状态
  isActive: boolean;
  expiresAt: Date;
  lastActiveAt: Date;
  
  // 元数据
  metadata?: Record<string, any>;
}

/**
 * 店铺设置模型
 */
export interface ShopSettings extends BaseModel {
  shopId: string;
  shop: Shop;
  
  // 设置类型和值
  category: 'tax' | 'logistics' | 'compliance' | 'notification' | 'general';
  key: string;
  value: any;
  
  // 设置元数据
  description?: string;
  isPublic: boolean;
  
  // 修改信息
  updatedBy?: string;
}

/**
 * 订单模型
 */
export interface Order extends BaseModel {
  // Shopify 订单信息
  shopifyOrderId: string;
  orderNumber: string;
  shopId: string;
  shop: Shop;
  
  // 客户信息
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  
  // 订单状态
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  fulfillmentStatus?: 'pending' | 'partial' | 'fulfilled';
  financialStatus: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'voided';
  
  // 金额信息
  totalAmount: number;
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  currency: string;
  
  // 地址信息
  billingAddress: Address;
  shippingAddress: Address;
  
  // 时间信息
  orderDate: Date;
  processedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  
  // 关联关系
  orderItems: OrderItem[];
  taxCalculations: TaxCalculation[];
  shippingCalculations: ShippingCalculation[];
  complianceReports: ComplianceOrderReport[];
  
  // 元数据
  metadata?: Record<string, any>;
}

/**
 * 订单商品模型
 */
export interface OrderItem extends BaseModel {
  orderId: string;
  order: Order;
  
  // 商品信息
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  variantTitle?: string;
  
  // 数量和价格
  quantity: number;
  price: number;
  compareAtPrice?: number;
  
  // 分类信息
  hsCode?: string;
  category?: string;
  
  // 重量和尺寸
  weight?: number;
  weightUnit?: string;
  
  // 关联关系
  taxCalculations: TaxCalculation[];
}

/**
 * 地址模型
 */
export interface Address {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

/**
 * 税费计算模型
 */
export interface TaxCalculation extends BaseModel {
  orderId: string;
  order: Order;
  orderItemId?: string;
  orderItem?: OrderItem;
  
  // 计算基础信息
  calculationType: 'order' | 'item' | 'shipping';
  destinationCountry: string;
  destinationProvince?: string;
  
  // 税费类型
  taxType: 'vat' | 'duty' | 'excise' | 'gst' | 'pst' | 'hst';
  taxRate: number;
  
  // 计算金额
  taxableAmount: number;
  taxAmount: number;
  
  // 计算详情
  calculationMethod: string;
  appliedRules: string[];
  
  // 免税信息
  exemptionType?: string;
  exemptionReason?: string;
  
  // 元数据
  metadata?: Record<string, any>;
}

/**
 * 物流计算模型
 */
export interface ShippingCalculation extends BaseModel {
  orderId: string;
  order: Order;
  
  // 物流提供商
  provider: string;
  service: string;
  
  // 计算信息
  originCountry: string;
  destinationCountry: string;
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  
  // 价格信息
  cost: number;
  currency: string;
  
  // 时效信息
  estimatedDays: number;
  
  // 服务类型
  serviceType: 'express' | 'standard' | 'economy';
  isDDP: boolean; // Delivered Duty Paid
  
  // 跟踪信息
  trackingNumber?: string;
  trackingUrl?: string;
  
  // 元数据
  metadata?: Record<string, any>;
}

/**
 * 合规报告模型
 */
export interface ComplianceReport extends BaseModel {
  shopId: string;
  shop: Shop;
  
  // 报告信息
  reportType: 'ioss' | 'uk_vat' | 'section_321' | 'eu_vat';
  period: string; // YYYY-MM 格式
  status: 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected';
  
  // 报告数据
  totalOrders: number;
  totalValue: number;
  totalTax: number;
  currency: string;
  
  // 提交信息
  submittedAt?: Date;
  submittedBy?: string;
  approvedAt?: Date;
  
  // 文件信息
  reportFile?: string;
  responseFile?: string;
  
  // 关联关系
  orderReports: ComplianceOrderReport[];
  
  // 元数据
  metadata?: Record<string, any>;
}

/**
 * 合规订单报告关联模型
 */
export interface ComplianceOrderReport extends BaseModel {
  reportId: string;
  report: ComplianceReport;
  orderId: string;
  order: Order;
  
  // 包含状态
  isIncluded: boolean;
  excludeReason?: string;
}

/**
 * 审计日志模型
 */
export interface AuditLog extends BaseModel {
  // 操作信息
  action: string;
  resource: string;
  resourceId: string;
  
  // 用户信息
  userId?: string;
  user?: User;
  shopId: string;
  shop: Shop;
  
  // 请求信息
  ipAddress?: string;
  userAgent?: string;
  
  // 变更信息
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // 状态
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
  
  // 元数据
  metadata?: Record<string, any>;
}

/**
 * 系统配置模型
 */
export interface SystemConfig extends BaseModel {
  key: string;
  value: any;
  category: string;
  description?: string;
  isPublic: boolean;
  updatedBy?: string;
}

/**
 * 税率配置模型
 */
export interface TaxRate extends BaseModel {
  // 地理信息
  country: string;
  province?: string;
  
  // 税种信息
  taxType: 'vat' | 'duty' | 'excise' | 'gst' | 'pst' | 'hst';
  rate: number;
  
  // 适用条件
  minAmount?: number;
  maxAmount?: number;
  productCategories?: string[];
  hsCodePatterns?: string[];
  
  // 有效期
  effectiveFrom: Date;
  effectiveTo?: Date;
  
  // 状态
  isActive: boolean;
  
  // 元数据
  source: string; // 数据来源
  lastUpdated: Date;
}

/**
 * 物流费率模型
 */
export interface ShippingRate extends BaseModel {
  // 物流提供商
  provider: string;
  service: string;
  
  // 路线信息
  originCountry: string;
  destinationCountry: string;
  
  // 重量范围
  minWeight: number;
  maxWeight: number;
  weightUnit: string;
  
  // 价格信息
  baseCost: number;
  additionalCost: number; // 每额外单位的费用
  currency: string;
  
  // 时效信息
  estimatedDays: number;
  
  // 服务特性
  isDDP: boolean;
  serviceType: 'express' | 'standard' | 'economy';
  
  // 有效期
  effectiveFrom: Date;
  effectiveTo?: Date;
  
  // 状态
  isActive: boolean;
}

// 导出所有模型类型
export type {
  Shop,
  User,
  UserRole,
  UserPermission,
  UserSession,
  ShopSettings,
  Order,
  OrderItem,
  Address,
  TaxCalculation,
  ShippingCalculation,
  ComplianceReport,
  ComplianceOrderReport,
  AuditLog,
  SystemConfig,
  TaxRate,
  ShippingRate
};