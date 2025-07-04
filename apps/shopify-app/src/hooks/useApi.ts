import { useState, useEffect, useCallback } from 'react'
import { ApiError, LoadingState } from '../types'

interface UseApiOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: ApiError) => void
}

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const execute = useCallback(async (...args: any[]) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiFunction(...args)
      setData(result)
      
      if (options.onSuccess) {
        options.onSuccess(result)
      }
      
      return result
    } catch (err: any) {
      const apiError: ApiError = {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || '请求失败',
        details: err.details
      }
      
      setError(apiError)
      
      if (options.onError) {
        options.onError(apiError)
      }
      
      throw apiError
    } finally {
      setLoading(false)
    }
  }, [apiFunction, options])

  useEffect(() => {
    if (options.immediate) {
      execute()
    }
  }, [execute, options.immediate])

  return {
    data,
    loading,
    error,
    execute,
    reset: () => {
      setData(null)
      setError(null)
      setLoading(false)
    }
  }
}

export function useAsyncData<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    refreshInterval?: number
    onError?: (error: ApiError) => void
  } = {}
) {
  const [state, setState] = useState<{
    data: T | null
    loading: boolean
    error: ApiError | null
  }>({
    data: null,
    loading: true,
    error: null
  })

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const result = await fetcher()
      setState({ data: result, loading: false, error: null })
    } catch (err: any) {
      const error: ApiError = {
        code: err.code || 'FETCH_ERROR',
        message: err.message || '数据获取失败'
      }
      setState({ data: null, loading: false, error })
      
      if (options.onError) {
        options.onError(error)
      }
    }
  }, [fetcher, options])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (options.refreshInterval) {
      const interval = setInterval(fetchData, options.refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, options.refreshInterval])

  return {
    ...state,
    refresh: fetchData,
    mutate: (newData: T | null) => setState(prev => ({ ...prev, data: newData }))
  }
}

// 专用hooks
export function useDashboardStats() {
  return useAsyncData(
    'dashboard-stats',
    async () => {
      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) throw new Error('获取统计数据失败')
      return response.json()
    },
    { refreshInterval: 30000 } // 30秒刷新
  )
}

export function useCountrySettings() {
  return useAsyncData(
    'country-settings',
    async () => {
      const response = await fetch('/api/settings/countries')
      if (!response.ok) throw new Error('获取国家设置失败')
      return response.json()
    }
  )
}

export function useProviderStatus() {
  return useAsyncData(
    'provider-status',
    async () => {
      const response = await fetch('/api/logistics/health')
      if (!response.ok) throw new Error('获取服务商状态失败')
      return response.json()
    },
    { refreshInterval: 60000 } // 1分钟刷新
  )
}