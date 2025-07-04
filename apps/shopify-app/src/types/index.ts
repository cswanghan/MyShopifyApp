// 前端应用类型定义
export interface DashboardStats {
  orders: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
    growth: number
  }
  taxCalculations: {
    total: number
    thisMonth: number
    successful: number
    successRate: number
  }
  logistics: {
    shipments: number
    thisMonth: number
    averageDeliveryDays: number
    ddpPercentage: number
  }
}

export interface TaxSettings {
  enabled: boolean
  defaultCurrency: string
  roundingMethod: 'ROUND' | 'FLOOR' | 'CEIL'
  roundingDecimals: number
  autoCalculation: boolean
  showDetailedBreakdown: boolean
  countrySettings: Record<string, {
    enabled: boolean
    customRates?: {
      dutyRate?: number
      vatRate?: number
    }
    freeThresholds?: {
      dutyFree?: number
      vatFree?: number
    }
  }>
}

export interface LogisticsSettings {
  enabled: boolean
  defaultProvider: string
  autoSelectBest: boolean
  preferDDP: boolean
  providers: Record<string, {
    enabled: boolean
    credentials: {
      apiKey?: string
      customerId?: string
    }
    priority: number
  }>
}

export interface AppSettings {
  tax: TaxSettings
  logistics: LogisticsSettings
  ui: {
    language: 'zh' | 'en'
    theme: 'light' | 'dark'
    showAdvancedOptions: boolean
  }
  notifications: {
    email: boolean
    webhook: string
    events: string[]
  }
}

export interface OrderItem {
  id: string
  productId: string
  title: string
  price: number
  currency: string
  quantity: number
  weight: number
  hsCode?: string
  category?: string
  taxCalculation?: {
    duties: number
    vat: number
    total: number
  }
}

export interface ProcessedOrder {
  id: string
  shopifyOrderId: string
  customerEmail: string
  items: OrderItem[]
  shippingAddress: {
    country: string
    state: string
    city: string
    zip: string
  }
  taxCalculation: {
    total: number
    breakdown: {
      duties: number
      vat: number
      shipping?: number
    }
    confidence: number
  }
  logistics?: {
    provider: string
    service: string
    trackingNumber?: string
    estimatedDelivery?: string
    cost: number
  }
  status: 'pending' | 'calculated' | 'shipped' | 'delivered' | 'failed'
  createdAt: string
  updatedAt: string
}

export interface ApiError {
  code: string
  message: string
  details?: any
}

export interface LoadingState {
  isLoading: boolean
  error?: ApiError | null
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    borderColor?: string
    backgroundColor?: string
    fill?: boolean
  }>
}

export interface CountryInfo {
  code: string
  name: string
  vatRate: number
  dutyFreeThreshold: number
  vatFreeThreshold: number
  supportedProviders: string[]
  specialRules?: string[]
}

export interface ProviderInfo {
  id: string
  name: string
  logo?: string
  features: string[]
  supportedCountries: string[]
  services: Array<{
    code: string
    name: string
    type: 'DAP' | 'DDP'
    estimatedDays: number
  }>
  status: 'active' | 'inactive' | 'error'
  lastHealthCheck?: string
}