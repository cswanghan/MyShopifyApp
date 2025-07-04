import { z } from 'zod'

/**
 * HSCode 相关类型
 */
export const HSCodeSchema = z.object({
  code: z.string().regex(/^\d{6,10}$/, 'HSCode must be 6-10 digits'),
  description: z.string(),
  category: z.string(),
  chapter: z.string(),
  dutyRate: z.number().min(0).max(1),
  notes: z.string().optional()
})
export type HSCode = z.infer<typeof HSCodeSchema>

/**
 * 商品分类
 */
export const ProductCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional(),
  hsCodeRanges: z.array(z.string()),
  defaultDutyRate: z.number().min(0).max(1),
  keywords: z.array(z.string()),
  level: z.number().min(1).max(3) // 分类层级
})
export type ProductCategory = z.infer<typeof ProductCategorySchema>

/**
 * 税率数据源
 */
export const TaxRateSourceSchema = z.object({
  country: z.string(),
  source: z.enum(['WTO', 'EU_COMMISSION', 'USCBP', 'HMRC', 'LOCAL']),
  lastUpdated: z.date(),
  version: z.string(),
  reliability: z.number().min(0).max(1) // 可靠性评分
})
export type TaxRateSource = z.infer<typeof TaxRateSourceSchema>

/**
 * 税率数据
 */
export const TaxRateDataSchema = z.object({
  id: z.string(),
  country: z.string(),
  hsCode: z.string(),
  dutyRate: z.number().min(0).max(1),
  vatRate: z.number().min(0).max(1),
  thresholds: z.object({
    dutyFree: z.number().min(0),
    vatFree: z.number().min(0),
    section321: z.number().min(0).optional() // 美国Section 321
  }),
  effectiveDate: z.date(),
  expiryDate: z.date().optional(),
  source: TaxRateSourceSchema,
  notes: z.string().optional()
})
export type TaxRateData = z.infer<typeof TaxRateDataSchema>

/**
 * 税费计算配置
 */
export const TaxCalculationConfigSchema = z.object({
  baseCurrency: z.enum(['USD', 'EUR', 'GBP', 'CNY']),
  exchangeRates: z.record(z.string(), z.number()),
  rounding: z.object({
    decimals: z.number().min(0).max(4),
    method: z.enum(['ROUND', 'FLOOR', 'CEIL'])
  }),
  validation: z.object({
    maxValue: z.number().min(0),
    minValue: z.number().min(0),
    allowZero: z.boolean()
  }),
  caching: z.object({
    enabled: z.boolean(),
    ttl: z.number().min(0) // 缓存时间（秒）
  })
})
export type TaxCalculationConfig = z.infer<typeof TaxCalculationConfigSchema>

/**
 * 税费计算结果详情
 */
export const TaxCalculationDetailSchema = z.object({
  step: z.string(),
  description: z.string(),
  value: z.number(),
  formula: z.string(),
  variables: z.record(z.string(), z.number()),
  applied: z.boolean()
})
export type TaxCalculationDetail = z.infer<typeof TaxCalculationDetailSchema>

/**
 * 扩展的税费计算结果
 */
export const ExtendedTaxCalculationSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  product: z.object({
    id: z.string(),
    title: z.string(),
    price: z.number(),
    currency: z.string(),
    weight: z.number(),
    hsCode: z.string().optional(),
    category: z.string().optional()
  }),
  destinationCountry: z.string(),
  calculation: z.object({
    duties: z.number(),
    vat: z.number(),
    totalTax: z.number(),
    totalValue: z.number(), // 商品价值 + 税费
    taxableValue: z.number(), // 计税价值
    dutyRate: z.number(),
    vatRate: z.number(),
    exchangeRate: z.number(),
    currency: z.string()
  }),
  details: z.array(TaxCalculationDetailSchema),
  thresholds: z.object({
    dutyFree: z.number(),
    vatFree: z.number(),
    section321: z.number().optional()
  }),
  exemptions: z.array(z.object({
    type: z.enum(['DUTY_FREE', 'VAT_FREE', 'SECTION_321', 'TRADE_AGREEMENT']),
    description: z.string(),
    amount: z.number()
  })),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1), // 计算置信度
  source: TaxRateSourceSchema
})
export type ExtendedTaxCalculation = z.infer<typeof ExtendedTaxCalculationSchema>

/**
 * 批量计算请求
 */
export const BatchCalculationRequestSchema = z.object({
  products: z.array(z.object({
    id: z.string(),
    title: z.string(),
    price: z.number(),
    currency: z.string(),
    weight: z.number(),
    hsCode: z.string().optional(),
    category: z.string().optional()
  })),
  destinationCountry: z.string(),
  shippingAddress: z.object({
    country: z.string(),
    state: z.string(),
    city: z.string(),
    zip: z.string()
  }),
  options: z.object({
    includeDuties: z.boolean().default(true),
    includeVAT: z.boolean().default(true),
    includeDetails: z.boolean().default(false),
    currency: z.string().default('USD')
  })
})
export type BatchCalculationRequest = z.infer<typeof BatchCalculationRequestSchema>

/**
 * 税费计算错误
 */
export const TaxCalculationErrorSchema = z.object({
  code: z.enum([
    'INVALID_PRODUCT',
    'INVALID_COUNTRY',
    'INVALID_HSCODE',
    'RATE_NOT_FOUND',
    'CALCULATION_FAILED',
    'VALIDATION_ERROR',
    'API_ERROR',
    'CACHE_ERROR'
  ]),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.date(),
  productId: z.string().optional(),
  country: z.string().optional()
})
export type TaxCalculationError = z.infer<typeof TaxCalculationErrorSchema>