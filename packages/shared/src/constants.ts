import { Country } from './types'

// 欧盟成员国
export const EU_COUNTRIES: Country[] = [
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'CZ', 'DK', 'FI', 'SE'
]

// 标准增值税率
export const VAT_RATES: Record<Country, number> = {
  US: 0, // 美国没有统一的增值税
  UK: 0.20, // 英国20%
  DE: 0.19, // 德国19%
  FR: 0.20, // 法国20%
  IT: 0.22, // 意大利22%
  ES: 0.21, // 西班牙21%
  NL: 0.21, // 荷兰21%
  BE: 0.21, // 比利时21%
  AT: 0.20, // 奥地利20%
  PL: 0.23, // 波兰23%
  CZ: 0.21, // 捷克21%
  DK: 0.25, // 丹麦25%
  FI: 0.24, // 芬兰24%
  SE: 0.25, // 瑞典25%
  NO: 0.25, // 挪威25%
  CH: 0.077 // 瑞士7.7%
}

// 免税门槛 (USD)
export const TAX_THRESHOLDS: Record<Country, { dutyFree: number; vatFree: number }> = {
  US: { dutyFree: 800, vatFree: 0 }, // Section 321
  UK: { dutyFree: 135, vatFree: 135 },
  DE: { dutyFree: 22, vatFree: 22 },
  FR: { dutyFree: 22, vatFree: 22 },
  IT: { dutyFree: 22, vatFree: 22 },
  ES: { dutyFree: 22, vatFree: 22 },
  NL: { dutyFree: 22, vatFree: 22 },
  BE: { dutyFree: 22, vatFree: 22 },
  AT: { dutyFree: 22, vatFree: 22 },
  PL: { dutyFree: 22, vatFree: 22 },
  CZ: { dutyFree: 22, vatFree: 22 },
  DK: { dutyFree: 22, vatFree: 22 },
  FI: { dutyFree: 22, vatFree: 22 },
  SE: { dutyFree: 22, vatFree: 22 },
  NO: { dutyFree: 25, vatFree: 25 },
  CH: { dutyFree: 65, vatFree: 65 }
}

// 汇率 (相对于USD)
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.75,
  CNY: 7.2
}

// 物流服务商配置
export const LOGISTICS_PROVIDERS = {
  DHL_ECOM: {
    name: 'DHL eCommerce',
    supportedCountries: ['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT'],
    ddpSupported: true,
    trackingSupported: true
  },
  YANWEN: {
    name: '燕文物流',
    supportedCountries: ['US', 'UK', 'DE', 'FR', 'IT', 'ES'],
    ddpSupported: true,
    trackingSupported: true
  },
  YUNEXPRESS: {
    name: '云途物流',
    supportedCountries: ['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'],
    ddpSupported: true,
    trackingSupported: true
  },
  SHUNFRIEND: {
    name: '顺友物流',
    supportedCountries: ['US', 'UK', 'DE', 'FR'],
    ddpSupported: false,
    trackingSupported: true
  }
}

// 常见商品类别的默认税率
export const DEFAULT_DUTY_RATES: Record<string, number> = {
  'electronics': 0.06, // 电子产品6%
  'clothing': 0.16, // 服装16%
  'accessories': 0.08, // 配饰8%
  'home': 0.04, // 家居用品4%
  'beauty': 0.02, // 美妆2%
  'sports': 0.12, // 运动用品12%
  'toys': 0.00, // 玩具0%
  'books': 0.00, // 书籍0%
  'default': 0.05 // 默认5%
}