import { ValidationSchema } from './BaseValidator';
import { Role } from '../auth/PermissionManager';

/**
 * 通用验证模式
 */
export const CommonSchemas = {
  /**
   * 分页参数
   */
  pagination: {
    page: { type: 'number', min: 1 },
    limit: { type: 'number', min: 1, max: 100 },
    orderBy: { type: 'string', maxLength: 50 },
    orderDirection: { type: 'string', enum: ['asc', 'desc'] }
  } as ValidationSchema,

  /**
   * 日期范围
   */
  dateRange: {
    dateFrom: { type: 'date' },
    dateTo: { type: 'date' }
  } as ValidationSchema,

  /**
   * UUID参数
   */
  uuidParam: {
    id: { required: true, type: 'uuid' }
  } as ValidationSchema,

  /**
   * 地址信息
   */
  address: {
    firstName: { type: 'string', maxLength: 50 },
    lastName: { type: 'string', maxLength: 50 },
    company: { type: 'string', maxLength: 100 },
    address1: { required: true, type: 'string', maxLength: 255 },
    address2: { type: 'string', maxLength: 255 },
    city: { required: true, type: 'string', maxLength: 100 },
    province: { type: 'string', maxLength: 100 },
    country: { required: true, type: 'string', maxLength: 2 },
    zip: { required: true, type: 'string', maxLength: 20 },
    phone: { type: 'string', maxLength: 20 }
  } as ValidationSchema
};

/**
 * 店铺相关验证模式
 */
export const ShopSchemas = {
  /**
   * 更新店铺信息
   */
  updateShop: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    email: { type: 'email', maxLength: 255 },
    phone: { type: 'string', maxLength: 20 },
    timezone: { type: 'string', maxLength: 50 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    plan: { type: 'string', maxLength: 50 },
    isActive: { type: 'boolean' }
  } as ValidationSchema,

  /**
   * 店铺设置
   */
  updateSettings: {
    category: { 
      required: true, 
      type: 'string', 
      enum: ['tax', 'logistics', 'compliance', 'notification', 'general'] 
    },
    key: { required: true, type: 'string', maxLength: 100 },
    value: { required: true },
    description: { type: 'string', maxLength: 500 }
  } as ValidationSchema,

  /**
   * 店铺查询过滤器
   */
  shopFilter: {
    domain: { type: 'string', maxLength: 255 },
    isActive: { type: 'boolean' },
    isTest: { type: 'boolean' },
    country: { type: 'string', maxLength: 2 },
    plan: { type: 'string', maxLength: 50 },
    installedAfter: { type: 'date' },
    installedBefore: { type: 'date' }
  } as ValidationSchema,

  /**
   * 批量同步
   */
  batchSync: {
    shopIds: { 
      required: true, 
      type: 'array', 
      arrayOf: { type: 'uuid' },
      custom: (value: string[]) => value.length > 0 && value.length <= 100
    }
  } as ValidationSchema,

  /**
   * 停用店铺
   */
  deactivateShop: {
    reason: { type: 'string', maxLength: 500 }
  } as ValidationSchema
};

/**
 * 用户相关验证模式
 */
export const UserSchemas = {
  /**
   * 创建用户
   */
  createUser: {
    email: { required: true, type: 'email', maxLength: 255 },
    name: { required: true, type: 'string', minLength: 1, maxLength: 255 },
    phone: { type: 'string', maxLength: 20 },
    avatar: { type: 'url', maxLength: 500 },
    roles: { 
      type: 'array', 
      arrayOf: { type: 'string', enum: Object.values(Role) } 
    },
    permissions: { 
      type: 'array', 
      arrayOf: { type: 'string' } 
    },
    isActive: { type: 'boolean' },
    emailVerified: { type: 'boolean' }
  } as ValidationSchema,

  /**
   * 更新用户信息
   */
  updateUser: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    phone: { type: 'string', maxLength: 20 },
    avatar: { type: 'url', maxLength: 500 },
    isActive: { type: 'boolean' },
    emailVerified: { type: 'boolean' }
  } as ValidationSchema,

  /**
   * 分配角色
   */
  assignRole: {
    role: { 
      required: true, 
      type: 'string', 
      enum: Object.values(Role) 
    }
  } as ValidationSchema,

  /**
   * 用户查询过滤器
   */
  userFilter: {
    email: { type: 'string', maxLength: 255 },
    isActive: { type: 'boolean' },
    emailVerified: { type: 'boolean' },
    roles: { type: 'string' }, // 逗号分隔的角色列表
    lastLoginAfter: { type: 'date' },
    lastLoginBefore: { type: 'date' }
  } as ValidationSchema
};

/**
 * 订单相关验证模式
 */
export const OrderSchemas = {
  /**
   * 创建订单
   */
  createOrder: {
    shopifyOrderId: { required: true, type: 'string', maxLength: 50 },
    orderNumber: { required: true, type: 'string', maxLength: 50 },
    customerId: { type: 'string', maxLength: 50 },
    customerEmail: { required: true, type: 'email', maxLength: 255 },
    customerName: { required: true, type: 'string', maxLength: 255 },
    customerPhone: { type: 'string', maxLength: 20 },
    status: { 
      type: 'string', 
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] 
    },
    fulfillmentStatus: { 
      type: 'string', 
      enum: ['pending', 'partial', 'fulfilled'] 
    },
    financialStatus: { 
      required: true,
      type: 'string', 
      enum: ['pending', 'paid', 'partially_paid', 'refunded', 'voided'] 
    },
    totalAmount: { required: true, type: 'number', min: 0 },
    subtotalAmount: { required: true, type: 'number', min: 0 },
    taxAmount: { required: true, type: 'number', min: 0 },
    shippingAmount: { required: true, type: 'number', min: 0 },
    discountAmount: { type: 'number', min: 0 },
    currency: { required: true, type: 'string', minLength: 3, maxLength: 3 },
    billingAddress: { required: true, type: 'object', nested: CommonSchemas.address },
    shippingAddress: { required: true, type: 'object', nested: CommonSchemas.address },
    orderDate: { required: true, type: 'date' },
    orderItems: { 
      required: true, 
      type: 'array', 
      arrayOf: { 
        type: 'object', 
        nested: {
          productId: { required: true, type: 'string', maxLength: 50 },
          variantId: { type: 'string', maxLength: 50 },
          sku: { required: true, type: 'string', maxLength: 100 },
          title: { required: true, type: 'string', maxLength: 255 },
          variantTitle: { type: 'string', maxLength: 255 },
          quantity: { required: true, type: 'number', min: 1 },
          price: { required: true, type: 'number', min: 0 },
          compareAtPrice: { type: 'number', min: 0 },
          hsCode: { type: 'string', maxLength: 20 },
          category: { type: 'string', maxLength: 100 },
          weight: { type: 'number', min: 0 },
          weightUnit: { type: 'string', maxLength: 10 }
        }
      }
    },
    metadata: { type: 'object' }
  } as ValidationSchema,

  /**
   * 更新订单状态
   */
  updateOrderStatus: {
    status: { 
      type: 'string', 
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] 
    },
    fulfillmentStatus: { 
      type: 'string', 
      enum: ['pending', 'partial', 'fulfilled'] 
    },
    financialStatus: { 
      type: 'string', 
      enum: ['pending', 'paid', 'partially_paid', 'refunded', 'voided'] 
    },
    processedAt: { type: 'date' },
    shippedAt: { type: 'date' },
    deliveredAt: { type: 'date' },
    cancelledAt: { type: 'date' },
    metadata: { type: 'object' }
  } as ValidationSchema,

  /**
   * 批量更新订单状态
   */
  batchUpdateStatus: {
    orderIds: { 
      required: true, 
      type: 'array', 
      arrayOf: { type: 'uuid' },
      custom: (value: string[]) => value.length > 0 && value.length <= 100
    },
    statusUpdate: { 
      required: true, 
      type: 'object',
      nested: {
        status: { 
          type: 'string', 
          enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] 
        },
        fulfillmentStatus: { 
          type: 'string', 
          enum: ['pending', 'partial', 'fulfilled'] 
        },
        financialStatus: { 
          type: 'string', 
          enum: ['pending', 'paid', 'partially_paid', 'refunded', 'voided'] 
        }
      }
    }
  } as ValidationSchema,

  /**
   * 订单查询过滤器
   */
  orderFilter: {
    status: { 
      type: 'string', 
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] 
    },
    fulfillmentStatus: { 
      type: 'string', 
      enum: ['pending', 'partial', 'fulfilled'] 
    },
    financialStatus: { 
      type: 'string', 
      enum: ['pending', 'paid', 'partially_paid', 'refunded', 'voided'] 
    },
    customerEmail: { type: 'string', maxLength: 255 },
    orderDateFrom: { type: 'date' },
    orderDateTo: { type: 'date' },
    amountMin: { type: 'number', min: 0 },
    amountMax: { type: 'number', min: 0 },
    currency: { type: 'string', minLength: 3, maxLength: 3 },
    shippingCountry: { type: 'string', maxLength: 2 }
  } as ValidationSchema,

  /**
   * 导出参数
   */
  exportOrders: {
    format: { type: 'string', enum: ['csv', 'json'] },
    dateFrom: { type: 'date' },
    dateTo: { type: 'date' },
    status: { 
      type: 'string', 
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] 
    },
    limit: { type: 'number', min: 1, max: 10000 }
  } as ValidationSchema
};

/**
 * 认证相关验证模式
 */
export const AuthSchemas = {
  /**
   * 登录请求
   */
  login: {
    shop: { required: true, type: 'string', maxLength: 255 },
    state: { type: 'string', maxLength: 100 }
  } as ValidationSchema,

  /**
   * OAuth回调
   */
  oauthCallback: {
    code: { required: true, type: 'string' },
    shop: { required: true, type: 'string' },
    state: { type: 'string' },
    hmac: { required: true, type: 'string' },
    timestamp: { required: true, type: 'string' }
  } as ValidationSchema,

  /**
   * 店铺切换
   */
  switchShop: {
    shopId: { required: true, type: 'uuid' }
  } as ValidationSchema
};

/**
 * 搜索相关验证模式
 */
export const SearchSchemas = {
  /**
   * 搜索查询
   */
  search: {
    q: { required: true, type: 'string', minLength: 2, maxLength: 100 }
  } as ValidationSchema
};

/**
 * 系统管理相关验证模式
 */
export const AdminSchemas = {
  /**
   * 清理参数
   */
  cleanup: {
    daysOld: { type: 'number', min: 30, max: 3650 }
  } as ValidationSchema,

  /**
   * 同步参数
   */
  syncParams: {
    maxAge: { type: 'number', min: 1, max: 168 }, // 1小时到1周
    limit: { type: 'number', min: 1, max: 1000 }
  } as ValidationSchema
};