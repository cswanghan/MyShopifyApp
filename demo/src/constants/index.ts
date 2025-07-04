// 应用常量定义
export const APP_CONFIG = {
  NAME: 'DTax-Bridge',
  VERSION: '1.0.0',
  DESCRIPTION: '跨境税费&物流一体化 Shopify App',
  SUPPORT_EMAIL: 'support@dtax-bridge.com',
  DOCS_URL: 'https://docs.dtax-bridge.com'
}

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  TAX_SETTINGS: '/settings/tax',
  LOGISTICS_SETTINGS: '/settings/logistics',
  ORDERS: '/orders',
  REPORTS: '/reports',
  HELP: '/help'
}

export const COLORS = {
  PRIMARY: '#00C9C8',
  SECONDARY: '#006EFF', 
  SUCCESS: '#00A86B',
  WARNING: '#FF7A45',
  ERROR: '#D73A49',
  GRAY: {
    50: '#F9FAFB',
    100: '#F2F4F5',
    200: '#E5E7EA',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  }
}

export const SUPPORTED_COUNTRIES = [
  { code: 'US', name: '美国', flag: '🇺🇸' },
  { code: 'UK', name: '英国', flag: '🇬🇧' },
  { code: 'DE', name: '德国', flag: '🇩🇪' },
  { code: 'FR', name: '法国', flag: '🇫🇷' },
  { code: 'IT', name: '意大利', flag: '🇮🇹' },
  { code: 'ES', name: '西班牙', flag: '🇪🇸' },
  { code: 'NL', name: '荷兰', flag: '🇳🇱' },
  { code: 'BE', name: '比利时', flag: '🇧🇪' },
  { code: 'AT', name: '奥地利', flag: '🇦🇹' },
  { code: 'PL', name: '波兰', flag: '🇵🇱' },
  { code: 'CZ', name: '捷克', flag: '🇨🇿' },
  { code: 'DK', name: '丹麦', flag: '🇩🇰' },
  { code: 'FI', name: '芬兰', flag: '🇫🇮' },
  { code: 'SE', name: '瑞典', flag: '🇸🇪' }
]

export const LOGISTICS_PROVIDERS = [
  {
    id: 'DHL_ECOM',
    name: 'DHL eCommerce',
    logo: '/images/providers/dhl.svg',
    description: 'DHL电商小包，可靠快速',
    features: ['tracking', 'insurance', 'global']
  },
  {
    id: 'YUNEXPRESS',
    name: 'YunExpress 云途物流',
    logo: '/images/providers/yunexpress.svg', 
    description: 'DDP一站式服务，含税到门',
    features: ['ddp', 'tracking', 'customs']
  },
  {
    id: 'YANWEN',
    name: '燕文物流',
    logo: '/images/providers/yanwen.svg',
    description: '性价比优选，经济实惠',
    features: ['economy', 'tracking']
  }
]

export const PRODUCT_CATEGORIES = [
  { id: 'electronics', name: '电子产品', dutyRate: 0.06, icon: '📱' },
  { id: 'clothing', name: '服装', dutyRate: 0.16, icon: '👕' },
  { id: 'accessories', name: '配饰', dutyRate: 0.08, icon: '👜' },
  { id: 'home', name: '家居用品', dutyRate: 0.04, icon: '🏠' },
  { id: 'beauty', name: '美妆', dutyRate: 0.02, icon: '💄' },
  { id: 'sports', name: '运动用品', dutyRate: 0.12, icon: '⚽' },
  { id: 'toys', name: '玩具', dutyRate: 0.00, icon: '🧸' },
  { id: 'books', name: '书籍', dutyRate: 0.00, icon: '📚' }
]

export const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      backgroundColor: COLORS.GRAY[800],
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: COLORS.PRIMARY,
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      }
    },
    y: {
      grid: {
        color: COLORS.GRAY[200]
      },
      beginAtZero: true
    }
  }
}

export const STATUS_COLORS = {
  pending: COLORS.WARNING,
  calculated: COLORS.SECONDARY,
  shipped: COLORS.PRIMARY,
  delivered: COLORS.SUCCESS,
  failed: COLORS.ERROR
}

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥'
}

export const DATE_FORMATS = {
  SHORT: 'MM/DD',
  MEDIUM: 'MMM DD',
  LONG: 'YYYY-MM-DD',
  FULL: 'YYYY-MM-DD HH:mm:ss'
}

export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100]
}

export const API_ENDPOINTS = {
  TAX: {
    CALCULATE: '/api/tax/calculate',
    BATCH: '/api/tax/calculate/batch',
    SETTINGS: '/api/tax/settings'
  },
  LOGISTICS: {
    RATES: '/api/logistics/rates',
    SHIPMENTS: '/api/logistics/shipments',
    TRACKING: '/api/logistics/tracking'
  },
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
    CHARTS: '/api/dashboard/charts'
  }
}

export const LANGUAGES = {
  zh: {
    name: '中文',
    flag: '🇨🇳'
  },
  en: {
    name: 'English', 
    flag: '🇺🇸'
  }
}