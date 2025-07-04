import { 
  ShippingRateRequest,
  ShippingComparison,
  ShipmentCreateRequest,
  Shipment,
  TrackingInfo,
  LogisticsError,
  ProviderConfig
} from './types'
import { LogisticsComparisonService } from './services/comparison'
import { ShipmentService } from './services/shipment'
import { LogisticsCacheManager } from './services/cache'
import { ApiResponse } from '@dtax-bridge/shared'

/**
 * 物流服务API类
 */
export class LogisticsAPI {
  private comparisonService: LogisticsComparisonService
  private shipmentService: ShipmentService
  private cacheManager: LogisticsCacheManager

  constructor(configs: ProviderConfig[]) {
    this.comparisonService = new LogisticsComparisonService(configs)
    this.shipmentService = new ShipmentService(configs)
    this.cacheManager = new LogisticsCacheManager()
  }

  /**
   * 获取物流费率比较
   */
  async getRatesComparison(request: ShippingRateRequest): Promise<ApiResponse<ShippingComparison>> {
    try {
      const comparison = await this.comparisonService.compareRates(request)
      
      return {
        success: true,
        data: comparison,
        message: `找到 ${comparison.rates.length} 个物流方案`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 获取推荐费率
   */
  async getBestRates(request: ShippingRateRequest): Promise<ApiResponse<{
    fastest: any | null
    cheapest: any | null
    bestValue: any | null
    ddpOptions: any[]
  }>> {
    try {
      const bestRates = await this.comparisonService.getBestRates(request)
      
      return {
        success: true,
        data: bestRates,
        message: '获取推荐费率成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 筛选物流费率
   */
  filterRates(
    rates: any[], 
    filters: {
      maxPrice?: number
      maxDays?: number
      ddpOnly?: boolean
      trackingRequired?: boolean
      providers?: string[]
    }
  ): ApiResponse<any[]> {
    try {
      const filtered = this.comparisonService.filterRates(rates, filters)
      
      return {
        success: true,
        data: filtered,
        message: `筛选出 ${filtered.length} 个符合条件的方案`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 创建运单
   */
  async createShipment(request: ShipmentCreateRequest): Promise<ApiResponse<Shipment>> {
    try {
      const shipment = await this.shipmentService.createShipment(request)
      
      return {
        success: true,
        data: shipment,
        message: '运单创建成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 获取运单信息
   */
  async getShipment(shipmentId: string): Promise<ApiResponse<Shipment | null>> {
    try {
      const shipment = await this.shipmentService.getShipment(shipmentId)
      
      return {
        success: true,
        data: shipment,
        message: shipment ? '获取运单信息成功' : '运单不存在'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 取消运单
   */
  async cancelShipment(shipmentId: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    try {
      const cancelled = await this.shipmentService.cancelShipment(shipmentId)
      
      return {
        success: true,
        data: { cancelled },
        message: cancelled ? '运单取消成功' : '运单取消失败'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 获取追踪信息
   */
  async getTracking(trackingNumber: string, forceRefresh: boolean = false): Promise<ApiResponse<TrackingInfo>> {
    try {
      const trackingInfo = await this.shipmentService.getTracking(trackingNumber, forceRefresh)
      
      return {
        success: true,
        data: trackingInfo,
        message: '获取追踪信息成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 批量获取追踪信息
   */
  async batchGetTracking(trackingNumbers: string[]): Promise<ApiResponse<{
    successful: Record<string, TrackingInfo>
    failed: Record<string, string>
  }>> {
    try {
      const results = await this.shipmentService.batchGetTracking(trackingNumbers)
      
      const successful: Record<string, TrackingInfo> = {}
      const failed: Record<string, string> = {}
      
      for (const [trackingNumber, result] of results.entries()) {
        if (result instanceof Error) {
          failed[trackingNumber] = result.message
        } else {
          successful[trackingNumber] = result
        }
      }
      
      return {
        success: true,
        data: { successful, failed },
        message: `成功获取 ${Object.keys(successful).length}/${trackingNumbers.length} 个追踪信息`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 生成运单标签
   */
  async generateLabel(shipmentId: string, format: 'PDF' | 'PNG' | 'ZPL' = 'PDF'): Promise<ApiResponse<{ labelUrl: string }>> {
    try {
      const labelUrl = await this.shipmentService.generateLabel(shipmentId, format)
      
      return {
        success: true,
        data: { labelUrl },
        message: '标签生成成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 验证地址
   */
  async validateAddress(
    address: any, 
    provider?: string
  ): Promise<ApiResponse<{
    valid: boolean
    normalized?: any
    errors?: string[]
  }>> {
    try {
      const result = await this.shipmentService.validateAddress(address, provider as any)
      
      return {
        success: true,
        data: result,
        message: result.valid ? '地址验证成功' : '地址验证失败'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 获取支持的物流服务商
   */
  getSupportedProviders(): ApiResponse<{
    providers: Array<{
      id: string
      name: string
      features: string[]
      countries: string[]
    }>
  }> {
    try {
      const providers = [
        {
          id: 'DHL_ECOM',
          name: 'DHL eCommerce',
          features: ['rates', 'shipping', 'tracking', 'address_validation'],
          countries: ['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT']
        },
        {
          id: 'YUNEXPRESS',
          name: 'YunExpress 云途物流',
          features: ['rates', 'shipping', 'tracking', 'ddp'],
          countries: ['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE']
        },
        {
          id: 'YANWEN',
          name: '燕文物流',
          features: ['rates', 'shipping', 'tracking'],
          countries: ['US', 'UK', 'DE', 'FR', 'IT', 'ES']
        }
      ]
      
      return {
        success: true,
        data: { providers },
        message: `支持 ${providers.length} 个物流服务商`
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 获取服务统计信息
   */
  async getServiceStats(): Promise<ApiResponse<{
    comparison: any
    shipment: any
    cache: any
    providers: any
  }>> {
    try {
      const [comparisonStats, shipmentStats, cacheStats, providerStatus] = await Promise.all([
        this.comparisonService.getCacheStats(),
        this.shipmentService.getCacheStats(),
        this.cacheManager.getStats(),
        this.comparisonService.getProviderStatus()
      ])
      
      // 转换Map为普通对象
      const providers: Record<string, any> = {}
      providerStatus.forEach((status, provider) => {
        providers[provider] = status
      })
      
      return {
        success: true,
        data: {
          comparison: comparisonStats,
          shipment: shipmentStats,
          cache: cacheStats,
          providers
        },
        message: '获取服务统计信息成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): ApiResponse<{ cleared: boolean }> {
    try {
      this.comparisonService.clearCache()
      this.shipmentService.clearCache()
      this.cacheManager.clear()
      
      return {
        success: true,
        data: { cleared: true },
        message: '缓存清除成功'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<ApiResponse<{
    status: 'healthy' | 'unhealthy'
    timestamp: string
    services: Record<string, boolean>
    details: any
  }>> {
    try {
      const providerStatus = await this.comparisonService.getProviderStatus()
      const cacheStats = this.cacheManager.getStats()
      
      const services: Record<string, boolean> = {}
      providerStatus.forEach((status, provider) => {
        services[provider] = status.available
      })
      
      const allHealthy = Array.from(providerStatus.values()).every(s => s.available)
      
      return {
        success: true,
        data: {
          status: allHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          services,
          details: {
            cache: cacheStats,
            providers: Object.fromEntries(providerStatus)
          }
        },
        message: allHealthy ? '所有服务运行正常' : '部分服务异常'
      }
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * 错误处理
   */
  private handleError(error: any): ApiResponse {
    console.error('Logistics API Error:', error)
    
    if (error instanceof LogisticsError) {
      return {
        success: false,
        error: error.code,
        message: error.message
      }
    }
    
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: error?.message || '未知错误'
    }
  }
}

/**
 * Express路由处理器
 */
export class LogisticsRoutes {
  
  static createRoutes(logisticsAPI: LogisticsAPI) {
    return {
      // POST /api/logistics/rates
      getRatesComparison: async (req: any, res: any) => {
        const request = req.body
        const result = await logisticsAPI.getRatesComparison(request)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // POST /api/logistics/rates/best
      getBestRates: async (req: any, res: any) => {
        const request = req.body
        const result = await logisticsAPI.getBestRates(request)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // POST /api/logistics/rates/filter
      filterRates: async (req: any, res: any) => {
        const { rates, filters } = req.body
        const result = logisticsAPI.filterRates(rates, filters)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // POST /api/logistics/shipments
      createShipment: async (req: any, res: any) => {
        const request = req.body
        const result = await logisticsAPI.createShipment(request)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // GET /api/logistics/shipments/:id
      getShipment: async (req: any, res: any) => {
        const { id } = req.params
        const result = await logisticsAPI.getShipment(id)
        res.status(result.success ? 200 : 404).json(result)
      },
      
      // DELETE /api/logistics/shipments/:id
      cancelShipment: async (req: any, res: any) => {
        const { id } = req.params
        const result = await logisticsAPI.cancelShipment(id)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // GET /api/logistics/tracking/:trackingNumber
      getTracking: async (req: any, res: any) => {
        const { trackingNumber } = req.params
        const { refresh } = req.query
        const result = await logisticsAPI.getTracking(trackingNumber, refresh === 'true')
        res.status(result.success ? 200 : 404).json(result)
      },
      
      // POST /api/logistics/tracking/batch
      batchGetTracking: async (req: any, res: any) => {
        const { trackingNumbers } = req.body
        const result = await logisticsAPI.batchGetTracking(trackingNumbers)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // POST /api/logistics/shipments/:id/label
      generateLabel: async (req: any, res: any) => {
        const { id } = req.params
        const { format } = req.body
        const result = await logisticsAPI.generateLabel(id, format)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // POST /api/logistics/address/validate
      validateAddress: async (req: any, res: any) => {
        const { address, provider } = req.body
        const result = await logisticsAPI.validateAddress(address, provider)
        res.status(result.success ? 200 : 400).json(result)
      },
      
      // GET /api/logistics/providers
      getSupportedProviders: async (req: any, res: any) => {
        const result = logisticsAPI.getSupportedProviders()
        res.status(result.success ? 200 : 500).json(result)
      },
      
      // GET /api/logistics/stats
      getServiceStats: async (req: any, res: any) => {
        const result = await logisticsAPI.getServiceStats()
        res.status(result.success ? 200 : 500).json(result)
      },
      
      // DELETE /api/logistics/cache
      clearCache: async (req: any, res: any) => {
        const result = logisticsAPI.clearCache()
        res.status(result.success ? 200 : 500).json(result)
      },
      
      // GET /api/logistics/health
      healthCheck: async (req: any, res: any) => {
        const result = await logisticsAPI.healthCheck()
        res.status(result.success ? 200 : 500).json(result)
      }
    }
  }
}