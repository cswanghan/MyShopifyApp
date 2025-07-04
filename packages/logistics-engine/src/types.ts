import { z } from 'zod'

/**
 * 物流服务商枚举
 */
export const ShippingProviderSchema = z.enum([
  'DHL_ECOM',
  'YUNEXPRESS', 
  'YANWEN',
  'SHUNFRIEND',
  'CAINIAO',
  'WINIT'
])
export type ShippingProvider = z.infer<typeof ShippingProviderSchema>

/**
 * 运输方式
 */
export const ShippingMethodSchema = z.enum([
  'AIR_STANDARD',
  'AIR_EXPRESS', 
  'AIR_ECONOMY',
  'SEA_STANDARD',
  'TRUCK_STANDARD',
  'RAIL_STANDARD'
])
export type ShippingMethod = z.infer<typeof ShippingMethodSchema>

/**
 * 贸易术语
 */
export const IncotermsSchema = z.enum(['DAP', 'DDP', 'EXW', 'FOB', 'CIF'])
export type Incoterms = z.infer<typeof IncotermsSchema>

/**
 * 包裹信息
 */
export const PackageSchema = z.object({
  weight: z.number().min(0), // 重量(克)
  dimensions: z.object({
    length: z.number().min(0), // 长度(厘米)
    width: z.number().min(0),  // 宽度(厘米)
    height: z.number().min(0)  // 高度(厘米)
  }),
  value: z.number().min(0), // 申报价值
  currency: z.string().length(3), // 货币代码
  description: z.string().optional(), // 包裹描述
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number().min(1),
    weight: z.number().min(0),
    value: z.number().min(0),
    hsCode: z.string().optional(),
    description: z.string().optional()
  }))
})
export type Package = z.infer<typeof PackageSchema>

/**
 * 地址信息
 */
export const AddressSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  zip: z.string(),
  country: z.string().length(2), // ISO 2位国家代码
  phone: z.string().optional(),
  email: z.string().email().optional()
})
export type Address = z.infer<typeof AddressSchema>

/**
 * 物流费率查询请求
 */
export const ShippingRateRequestSchema = z.object({
  from: AddressSchema,
  to: AddressSchema,
  packages: z.array(PackageSchema),
  services: z.array(ShippingProviderSchema).optional(), // 指定查询的服务商
  options: z.object({
    incoterms: IncotermsSchema.default('DAP'),
    insurance: z.boolean().default(false),
    signature: z.boolean().default(false),
    saturday: z.boolean().default(false)
  }).optional()
})
export type ShippingRateRequest = z.infer<typeof ShippingRateRequestSchema>

/**
 * 物流费率响应
 */
export const ShippingRateSchema = z.object({
  id: z.string(),
  provider: ShippingProviderSchema,
  serviceName: z.string(),
  serviceCode: z.string(),
  method: ShippingMethodSchema,
  incoterms: IncotermsSchema,
  price: z.object({
    amount: z.number(),
    currency: z.string().length(3),
    breakdown: z.object({
      shipping: z.number(),
      fuel: z.number().optional(),
      insurance: z.number().optional(),
      duties: z.number().optional(),
      vat: z.number().optional(),
      other: z.number().optional()
    }).optional()
  }),
  transit: z.object({
    min: z.number(), // 最小工作日
    max: z.number(), // 最大工作日
    estimated: z.number() // 预计工作日
  }),
  features: z.object({
    tracking: z.boolean(),
    insurance: z.boolean(),
    signature: z.boolean(),
    ddp: z.boolean() // 是否支持DDP
  }),
  restrictions: z.object({
    maxWeight: z.number().optional(), // 最大重量限制(克)
    maxValue: z.number().optional(),  // 最大价值限制
    prohibited: z.array(z.string()).optional() // 禁运品列表
  }).optional(),
  cutoffTime: z.string().optional(), // 截单时间
  validity: z.object({
    expiresAt: z.date(),
    timezone: z.string()
  }),
  metadata: z.record(z.string(), z.any()).optional()
})
export type ShippingRate = z.infer<typeof ShippingRateSchema>

/**
 * 物流费率比较结果
 */
export const ShippingComparisonSchema = z.object({
  requestId: z.string(),
  request: ShippingRateRequestSchema,
  rates: z.array(ShippingRateSchema),
  recommendations: z.object({
    fastest: z.string().optional(), // 最快服务ID
    cheapest: z.string().optional(), // 最便宜服务ID
    bestValue: z.string().optional(), // 最佳性价比服务ID
    ddpOption: z.string().optional() // 推荐DDP服务ID
  }),
  timestamp: z.date(),
  errors: z.array(z.object({
    provider: ShippingProviderSchema,
    error: z.string(),
    code: z.string()
  })).optional()
})
export type ShippingComparison = z.infer<typeof ShippingComparisonSchema>

/**
 * 运单创建请求
 */
export const ShipmentCreateRequestSchema = z.object({
  rateId: z.string(), // 选择的费率ID
  from: AddressSchema,
  to: AddressSchema,
  packages: z.array(PackageSchema),
  options: z.object({
    incoterms: IncotermsSchema.default('DAP'),
    insurance: z.boolean().default(false),
    signature: z.boolean().default(false),
    notification: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false)
    }).optional()
  }).optional(),
  customsInfo: z.object({
    contentType: z.enum(['GIFT', 'MERCHANDISE', 'SAMPLE', 'RETURN', 'OTHER']),
    restriction: z.enum(['NONE', 'QUARANTINE', 'SANITARY_PHYTOSANITARY']).optional(),
    invoice: z.string().optional(), // 发票号
    license: z.string().optional()  // 许可证号
  }).optional(),
  reference: z.string().optional() // 客户参考号
})
export type ShipmentCreateRequest = z.infer<typeof ShipmentCreateRequestSchema>

/**
 * 运单信息
 */
export const ShipmentSchema = z.object({
  id: z.string(),
  trackingNumber: z.string(),
  provider: ShippingProviderSchema,
  status: z.enum([
    'CREATED',
    'MANIFESTED', 
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'RETURNED',
    'EXCEPTION',
    'CANCELLED'
  ]),
  from: AddressSchema,
  to: AddressSchema,
  packages: z.array(PackageSchema),
  service: z.object({
    name: z.string(),
    code: z.string(),
    method: ShippingMethodSchema,
    incoterms: IncotermsSchema
  }),
  price: z.object({
    amount: z.number(),
    currency: z.string().length(3)
  }),
  labels: z.array(z.object({
    url: z.string(),
    format: z.enum(['PDF', 'PNG', 'JPG', 'ZPL']),
    size: z.enum(['4x6', '4x8', 'A4', 'LETTER'])
  })),
  tracking: z.object({
    url: z.string().optional(),
    events: z.array(z.object({
      timestamp: z.date(),
      status: z.string(),
      location: z.string().optional(),
      description: z.string()
    })).optional()
  }).optional(),
  dates: z.object({
    created: z.date(),
    shipped: z.date().optional(),
    estimated: z.date().optional(),
    delivered: z.date().optional()
  }),
  customs: z.object({
    forms: z.array(z.object({
      type: z.string(),
      url: z.string()
    })).optional(),
    invoice: z.string().optional()
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})
export type Shipment = z.infer<typeof ShipmentSchema>

/**
 * 追踪事件
 */
export const TrackingEventSchema = z.object({
  timestamp: z.date(),
  status: z.string(),
  location: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  }).optional(),
  description: z.string(),
  nextSteps: z.string().optional()
})
export type TrackingEvent = z.infer<typeof TrackingEventSchema>

/**
 * 追踪信息
 */
export const TrackingInfoSchema = z.object({
  trackingNumber: z.string(),
  provider: ShippingProviderSchema,
  status: z.string(),
  estimatedDelivery: z.date().optional(),
  events: z.array(TrackingEventSchema),
  currentLocation: z.object({
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  lastUpdate: z.date()
})
export type TrackingInfo = z.infer<typeof TrackingInfoSchema>

/**
 * 物流错误
 */
export const LogisticsErrorSchema = z.object({
  code: z.enum([
    'INVALID_ADDRESS',
    'INVALID_PACKAGE',
    'SERVICE_UNAVAILABLE',
    'RATE_NOT_FOUND',
    'AUTHENTICATION_FAILED',
    'QUOTA_EXCEEDED',
    'NETWORK_ERROR',
    'INVALID_TRACKING_NUMBER',
    'SHIPMENT_NOT_FOUND',
    'LABEL_GENERATION_FAILED'
  ]),
  message: z.string(),
  provider: ShippingProviderSchema.optional(),
  details: z.any().optional(),
  timestamp: z.date()
})
export type LogisticsError = z.infer<typeof LogisticsErrorSchema>

/**
 * 服务提供商配置
 */
export const ProviderConfigSchema = z.object({
  provider: ShippingProviderSchema,
  name: z.string(),
  enabled: z.boolean(),
  credentials: z.object({
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    customerId: z.string().optional(),
    accountNumber: z.string().optional()
  }),
  endpoints: z.object({
    baseUrl: z.string(),
    rateUrl: z.string().optional(),
    shipUrl: z.string().optional(),
    trackUrl: z.string().optional(),
    labelUrl: z.string().optional()
  }),
  settings: z.object({
    timeout: z.number().default(30000), // 超时时间(毫秒)
    retries: z.number().default(3),     // 重试次数
    rateLimit: z.object({
      requests: z.number(),
      window: z.number() // 时间窗口(毫秒)
    }).optional(),
    sandbox: z.boolean().default(false)
  }),
  supportedCountries: z.array(z.string()),
  supportedServices: z.array(z.string()),
  features: z.object({
    rates: z.boolean(),
    shipping: z.boolean(),
    tracking: z.boolean(),
    ddp: z.boolean(),
    insurance: z.boolean()
  })
})
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>