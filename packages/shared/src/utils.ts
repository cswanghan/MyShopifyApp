import dayjs from 'dayjs'
import { Country, Currency, EXCHANGE_RATES, EU_COUNTRIES } from './constants'

/**
 * 货币转换
 */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount
  
  const fromRate = EXCHANGE_RATES[from] || 1
  const toRate = EXCHANGE_RATES[to] || 1
  
  return (amount / fromRate) * toRate
}

/**
 * 判断是否为欧盟国家
 */
export function isEUCountry(country: Country): boolean {
  return EU_COUNTRIES.includes(country)
}

/**
 * 格式化金额
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
  
  return formatted
}

/**
 * 格式化重量
 */
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`
  }
  return `${grams}g`
}

/**
 * 格式化尺寸
 */
export function formatDimensions(length: number, width: number, height: number): string {
  return `${length}×${width}×${height}cm`
}

/**
 * 计算体积重量
 */
export function calculateVolumetricWeight(length: number, width: number, height: number): number {
  // 一般使用 5000 作为体积重量除数
  return (length * width * height) / 5000
}

/**
 * 获取实际计费重量
 */
export function getBillableWeight(actualWeight: number, length: number, width: number, height: number): number {
  const volumetricWeight = calculateVolumetricWeight(length, width, height)
  return Math.max(actualWeight, volumetricWeight)
}

/**
 * 生成唯一ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}${timestamp}-${random}`
}

/**
 * 格式化日期
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}

/**
 * 计算预计到达时间
 */
export function calculateEstimatedDelivery(days: number): string {
  const deliveryDate = dayjs().add(days, 'day')
  return deliveryDate.format('YYYY-MM-DD')
}

/**
 * 验证HSCode格式
 */
export function validateHSCode(hsCode: string): boolean {
  // HSCode通常是6-10位数字
  return /^\d{6,10}$/.test(hsCode)
}

/**
 * 计算税费百分比
 */
export function calculateTaxPercentage(tax: number, baseAmount: number): number {
  if (baseAmount === 0) return 0
  return (tax / baseAmount) * 100
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}