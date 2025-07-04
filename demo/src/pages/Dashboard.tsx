import React, { useState, useEffect } from 'react'
import { 
  OrderIcon, 
  ProductIcon, 
  ChartVerticalIcon, 
  DeliveryIcon,
  SettingsIcon,
  ExternalIcon
} from '@shopify/polaris-icons'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, calculateGrowthRate } from '../utils'

export function Dashboard() {
  const navigate = useNavigate()
  const [animatedValues, setAnimatedValues] = useState({
    orders: 0,
    revenue: 0,
    conversion: 0,
    iossRate: 0,
    deliveryRate: 0,
    apiSuccess: 0
  })

  // KPI数据 - 参考demo.html的指标
  const kpiData = [
    {
      id: 'orders',
      title: '总订单 (含税)',
      value: 1820,
      change: { value: 6.2, positive: true, period: 'vs 上月' },
      icon: OrderIcon
    },
    {
      id: 'revenue', 
      title: '预估总税费 (USD)',
      value: 21450,
      prefix: '$',
      change: { value: 5.8, positive: true, period: 'vs 上月' },
      icon: ChartVerticalIcon
    },
    {
      id: 'conversion',
      title: '结账转化率提升',
      value: 6.15,
      suffix: '%',
      prefix: '+',
      change: { value: null, positive: true, period: '目标: ≥ 6%' },
      icon: ProductIcon
    },
    {
      id: 'iossRate',
      title: 'IOSS 自动申报率',
      value: 92.5,
      suffix: '%',
      change: { value: 12.5, positive: true, period: 'vs 上月' },
      icon: DeliveryIcon
    },
    {
      id: 'deliveryRate',
      title: '物流时效达成率',
      value: 98.1,
      suffix: '%',
      change: { value: 0.5, positive: true, period: 'vs 上月' },
      icon: SettingsIcon
    },
    {
      id: 'apiSuccess',
      title: '计算API调用成功率',
      value: 99.98,
      suffix: '%',
      change: { value: null, positive: true, period: 'SLA: ≥ 99.9%' },
      icon: ExternalIcon
    }
  ]

  // 动画效果
  useEffect(() => {
    const animateValue = (field: string, targetValue: number, duration: number = 500) => {
      let startValue = 0
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const currentValue = startValue + (targetValue - startValue) * progress
        
        setAnimatedValues(prev => ({
          ...prev,
          [field]: currentValue
        }))
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      
      animate()
    }

    // 启动所有动画
    kpiData.forEach((kpi, index) => {
      setTimeout(() => {
        animateValue(kpi.id, kpi.value, 800)
      }, index * 100)
    })
  }, [])

  // KPI卡片组件 - 使用全局样式
  const KpiCard = ({ kpi }: { kpi: any }) => {
    const IconComponent = kpi.icon
    const animatedValue = animatedValues[kpi.id as keyof typeof animatedValues]
    
    const formatValue = (value: number) => {
      if (kpi.id === 'revenue') {
        return Math.floor(value).toLocaleString()
      } else if (kpi.suffix === '%') {
        return value.toFixed(kpi.id === 'conversion' ? 2 : 1)
      }
      return Math.floor(value).toLocaleString()
    }

    const getChangeColor = () => {
      if (!kpi.change.value) return 'var(--info-blue)'
      return kpi.change.positive ? '#10B981' : '#EF4444'
    }

    return (
      <div className="kpi-card animate-countup">
        <h3>{kpi.title}</h3>
        <div className="value">
          {kpi.prefix && kpi.prefix}
          {formatValue(animatedValue)}
          {kpi.suffix && kpi.suffix}
        </div>
        <div className="change">
          <span 
            className={kpi.change.value ? (kpi.change.positive ? 'positive' : 'negative') : 'neutral'}
          >
            {kpi.change.value && `▲ ${kpi.change.value}%`} {kpi.change.period}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* KPI 指标网格 - 使用全局样式类 */}
      <div className="kpi-grid">
        {kpiData.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* 订单趋势图表 - 使用全局样式类 */}
      <div className="chart-card">
        <div className="kpi-card">
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              订单模式趋势 (近30天)
            </h3>
          </div>
          
          <div className="chart-placeholder">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                📈 订单趋势图表
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                DDP订单增长显著，DAP订单稳步下降
              </div>
              <button 
                style={{
                  background: 'var(--brand-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/reports/charts')}
              >
                查看详细图表
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作 - 使用全局样式类 */}
      <div className="chart-card">
        <div className="kpi-card">
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              快速操作
            </h3>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            <button 
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => navigate('/settings/tax')}
            >
              税费设置
            </button>
            <button 
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => navigate('/settings/logistics')}
            >
              物流配置
            </button>
            <button 
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => navigate('/reports')}
            >
              数据报表
            </button>
            <button 
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={() => navigate('/help')}
            >
              帮助文档
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}