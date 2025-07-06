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

  // KPI数据 - 遵循Polaris设计原则
  const kpiData = [
    {
      id: 'orders',
      title: '总订单 (含税)',
      value: 1820,
      change: { value: 6.2, positive: true, period: 'vs 上月' },
      icon: OrderIcon,
      color: 'success'
    },
    {
      id: 'revenue', 
      title: '预估总税费 (USD)',
      value: 21450,
      prefix: '$',
      change: { value: 5.8, positive: true, period: 'vs 上月' },
      icon: ChartVerticalIcon,
      color: 'info'
    },
    {
      id: 'conversion',
      title: '结账转化率提升',
      value: 6.15,
      suffix: '%',
      prefix: '+',
      change: { value: null, positive: true, period: '目标: ≥ 6%' },
      icon: ProductIcon,
      color: 'success'
    },
    {
      id: 'iossRate',
      title: 'IOSS 自动申报率',
      value: 92.5,
      suffix: '%',
      change: { value: 12.5, positive: true, period: 'vs 上月' },
      icon: DeliveryIcon,
      color: 'warning'
    },
    {
      id: 'deliveryRate',
      title: '物流时效达成率',
      value: 98.1,
      suffix: '%',
      change: { value: 0.5, positive: true, period: 'vs 上月' },
      icon: SettingsIcon,
      color: 'success'
    },
    {
      id: 'apiSuccess',
      title: '计算API调用成功率',
      value: 99.98,
      suffix: '%',
      change: { value: null, positive: true, period: 'SLA: ≥ 99.9%' },
      icon: ExternalIcon,
      color: 'info'
    }
  ]

  // 动画效果
  useEffect(() => {
    const animateValue = (field: string, targetValue: number, duration: number = 800) => {
      let startValue = 0
      const startTime = Date.now()
      
      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // 使用缓动函数让动画更自然
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
        const easedProgress = easeOutCubic(progress)
        
        const currentValue = startValue + (targetValue - startValue) * easedProgress
        
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

    // 启动交错动画
    kpiData.forEach((kpi, index) => {
      setTimeout(() => {
        animateValue(kpi.id, kpi.value, 1000)
      }, index * 150)
    })
  }, [])

  // Polaris风格的KPI卡片组件
  const PolarisKpiCard = ({ kpi }: { kpi: any }) => {
    const animatedValue = animatedValues[kpi.id as keyof typeof animatedValues]
    
    const formatValue = (value: number) => {
      if (kpi.id === 'revenue') {
        return Math.floor(value).toLocaleString()
      } else if (kpi.suffix === '%') {
        return value.toFixed(kpi.id === 'conversion' ? 2 : 1)
      }
      return Math.floor(value).toLocaleString()
    }

    const getBadgeVariant = () => {
      if (!kpi.change.value) return 'info'
      return kpi.change.positive ? 'success' : 'critical'
    }

    return (
      <div className="polaris-card polaris-fade-in">
        <div className="polaris-card__section">
          {/* 卡片标题 */}
          <h3 className="polaris-text polaris-text--body-sm polaris-text--subdued" style={{ marginBottom: 'var(--p-space-1)' }}>
            {kpi.title}
          </h3>
          
          {/* 主要数值 */}
          <div className="polaris-text polaris-text--heading-2xl" style={{ marginBottom: 'var(--p-space-2)' }}>
            {kpi.prefix && kpi.prefix}
            {formatValue(animatedValue)}
            {kpi.suffix && kpi.suffix}
          </div>
          
          {/* 变化指标 */}
          <div className={`polaris-badge polaris-badge--${getBadgeVariant()}`}>
            {kpi.change.value && `${kpi.change.positive ? '↗' : '↘'} ${kpi.change.value}%`} {kpi.change.period}
          </div>
        </div>
      </div>
    )
  }

  // Polaris横幅组件
  const PolarisSuccessBanner = () => (
    <div className="polaris-banner polaris-banner--success" style={{ marginBottom: 'var(--p-space-4)' }}>
      <div className="polaris-banner__icon">
        <span style={{ fontSize: '1.25rem' }}>✓</span>
      </div>
      <div className="polaris-banner__content">
        <div className="polaris-banner__title">DTax-Bridge 运行正常</div>
        <div className="polaris-banner__text">
          所有系统运行正常，税费计算和物流服务可用。上次检查：{new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )

  return (
    <div className="polaris-layout polaris-layout--single-column">
      {/* 状态横幅 */}
      <PolarisSuccessBanner />
      
      {/* KPI 指标网格 - 使用Polaris网格系统 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: 'var(--p-space-3)',
        marginBottom: 'var(--p-space-4)'
      }}>
        {kpiData.map((kpi) => (
          <PolarisKpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* 订单趋势图表 */}
      <div className="polaris-card polaris-scale-in">
        <div className="polaris-card__section">
          <h2 className="polaris-text polaris-text--heading-xl" style={{ marginBottom: 'var(--p-space-2)' }}>
            订单趋势分析
          </h2>
          <p className="polaris-text polaris-text--body-md polaris-text--subdued" style={{ marginBottom: 'var(--p-space-4)' }}>
            近30天的订单模式变化趋势，DDP订单增长显著
          </p>
          
          <div style={{ 
            height: '300px',
            backgroundColor: 'var(--p-color-bg-subdued)',
            borderRadius: 'var(--p-border-radius-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            border: '2px dashed var(--p-color-border)'
          }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--p-space-2)' }}>📊</div>
              <h3 className="polaris-text polaris-text--heading-md" style={{ marginBottom: 'var(--p-space-1)' }}>
                订单趋势图表
              </h3>
              <p className="polaris-text polaris-text--body-md polaris-text--subdued" style={{ marginBottom: 'var(--p-space-3)' }}>
                集成Chart.js图表组件显示详细趋势
              </p>
              <button 
                className="polaris-button polaris-button--primary"
                onClick={() => navigate('/reports')}
              >
                查看详细报表
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作卡片 */}
      <div className="polaris-card polaris-scale-in" style={{ marginTop: 'var(--p-space-4)' }}>
        <div className="polaris-card__section">
          <h2 className="polaris-text polaris-text--heading-xl" style={{ marginBottom: 'var(--p-space-2)' }}>
            快速操作
          </h2>
          <p className="polaris-text polaris-text--body-md polaris-text--subdued" style={{ marginBottom: 'var(--p-space-4)' }}>
            常用功能快速入口，提升工作效率
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 'var(--p-space-3)'
          }}>
            <button 
              className="polaris-button polaris-button--primary"
              onClick={() => navigate('/settings/tax')}
              style={{ justifySelf: 'stretch' }}
            >
              <SettingsIcon />
              <span style={{ marginLeft: 'var(--p-space-1)' }}>税费设置</span>
            </button>
            
            <button 
              className="polaris-button polaris-button--default"
              onClick={() => navigate('/settings/logistics')}
              style={{ justifySelf: 'stretch' }}
            >
              <DeliveryIcon />
              <span style={{ marginLeft: 'var(--p-space-1)' }}>物流配置</span>
            </button>
            
            <button 
              className="polaris-button polaris-button--default"
              onClick={() => navigate('/reports')}
              style={{ justifySelf: 'stretch' }}
            >
              <ChartVerticalIcon />
              <span style={{ marginLeft: 'var(--p-space-1)' }}>数据报表</span>
            </button>
            
            <button 
              className="polaris-button polaris-button--default"
              onClick={() => navigate('/help')}
              style={{ justifySelf: 'stretch' }}
            >
              <ExternalIcon />
              <span style={{ marginLeft: 'var(--p-space-1)' }}>帮助文档</span>
            </button>
          </div>
        </div>
      </div>

      {/* 系统状态指示器 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: 'var(--p-space-3)',
        marginTop: 'var(--p-space-4)'
      }}>
        <div className="polaris-card">
          <div className="polaris-card__section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="polaris-text polaris-text--body-md" style={{ marginBottom: 'var(--p-space-05)' }}>
                  税费计算引擎
                </h3>
                <p className="polaris-text polaris-text--body-sm polaris-text--subdued">
                  运行状态正常
                </p>
              </div>
              <div className="polaris-badge polaris-badge--success">正常</div>
            </div>
          </div>
        </div>
        
        <div className="polaris-card">
          <div className="polaris-card__section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="polaris-text polaris-text--body-md" style={{ marginBottom: 'var(--p-space-05)' }}>
                  物流集成服务
                </h3>
                <p className="polaris-text polaris-text--body-sm polaris-text--subdued">
                  所有渠道可用
                </p>
              </div>
              <div className="polaris-badge polaris-badge--success">正常</div>
            </div>
          </div>
        </div>
        
        <div className="polaris-card">
          <div className="polaris-card__section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 className="polaris-text polaris-text--body-md" style={{ marginBottom: 'var(--p-space-05)' }}>
                  合规申报系统
                </h3>
                <p className="polaris-text polaris-text--body-sm polaris-text--subdued">
                  IOSS/VAT同步中
                </p>
              </div>
              <div className="polaris-badge polaris-badge--warning">同步中</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}