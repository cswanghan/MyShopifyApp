import { z } from 'zod'

// 基础类型定义
export const CountrySchema = z.enum(['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'CZ', 'DK', 'FI', 'SE', 'NO', 'CH'])
export type Country = z.infer<typeof CountrySchema>

export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CNY'])
export type Currency = z.infer<typeof CurrencySchema>

// 商品信息
export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number(),
  currency: CurrencySchema,
  weight: z.number(), // 重量(克)
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number()
  }),
  hsCode: z.string().optional(),
  category: z.string().optional(),
  originCountry: CountrySchema.default('CN')
})
export type Product = z.infer<typeof ProductSchema>

// 税费计算结果
export const TaxCalculationSchema = z.object({
  product: ProductSchema,
  destinationCountry: CountrySchema,
  duties: z.number(), // 关税
  vat: z.number(), // 增值税
  totalTax: z.number(), // 总税费
  threshold: z.object({
    dutyFree: z.number(),
    vatFree: z.number()
  }),
  calculation: z.object({
    dutyRate: z.number(),
    vatRate: z.number(),
    taxableValue: z.number()
  })
})
export type TaxCalculation = z.infer<typeof TaxCalculationSchema>

// 物流方案
export const ShippingMethodSchema = z.enum(['DHL_ECOM', 'YANWEN', 'YUNEXPRESS', 'SHUNFRIEND'])
export type ShippingMethod = z.infer<typeof ShippingMethodSchema>

export const ShippingOptionSchema = z.object({
  id: z.string(),
  method: ShippingMethodSchema,
  name: z.string(),
  price: z.number(),
  currency: CurrencySchema,
  estimatedDays: z.number(),
  type: z.enum(['DAP', 'DDP']), // 贸易术语
  tracking: z.boolean(),
  insurance: z.boolean()
})
export type ShippingOption = z.infer<typeof ShippingOptionSchema>

// 订单
export const OrderSchema = z.object({
  id: z.string(),
  shopifyOrderId: z.string(),
  products: z.array(ProductSchema),
  shippingAddress: z.object({
    country: CountrySchema,
    state: z.string(),
    city: z.string(),
    address1: z.string(),
    address2: z.string().optional(),
    zip: z.string()
  }),
  taxCalculation: TaxCalculationSchema.optional(),
  shippingOption: ShippingOptionSchema.optional(),
  totalAmount: z.number(),
  currency: CurrencySchema,
  status: z.enum(['pending', 'calculated', 'shipped', 'delivered', 'cancelled']),
  createdAt: z.date(),
  updatedAt: z.date()
})
export type Order = z.infer<typeof OrderSchema>

// API响应类型
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional()
})
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}