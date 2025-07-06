import React, { useState, useEffect } from 'react'
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

  // KPI数据
  const kpiData = [
    {
      id: 'orders',
      title: '总订单 (含税)',
      value: 1820,
      change: { value: 6.2, positive: true, period: 'vs 上月' },
      icon: '📦',
      color: 'success'
    },
    {
      id: 'revenue', 
      title: '预估总税费 (USD)',
      value: 21450,
      prefix: '$',
      change: { value: 5.8, positive: true, period: 'vs 上月' },
      icon: '💰',
      color: 'info'
    },
    {
      id: 'conversion',
      title: '结账转化率提升',
      value: 6.15,
      suffix: '%',
      prefix: '+',
      change: { value: null, positive: true, period: '目标: ≥ 6%' },
      icon: '📈',
      color: 'success'
    },
    {
      id: 'iossRate',
      title: 'IOSS 自动申报率',
      value: 92.5,
      suffix: '%',
      change: { value: 12.5, positive: true, period: 'vs 上月' },
      icon: '🇪🇺',
      color: 'warning'
    },
    {
      id: 'deliveryRate',
      title: '物流时效达成率',
      value: 98.1,
      suffix: '%',
      change: { value: 0.5, positive: true, period: 'vs 上月' },
      icon: '🚚',
      color: 'success'
    },
    {
      id: 'apiSuccess',
      title: '计算API调用成功率',
      value: 99.98,
      suffix: '%',
      change: { value: null, positive: true, period: 'SLA: ≥ 99.9%' },
      icon: '⚡',
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

  // KPI卡片组件
  const KpiCard = ({ kpi }: { kpi: any }) => {
    const animatedValue = animatedValues[kpi.id as keyof typeof animatedValues]
    
    const formatValue = (value: number) => {
      if (kpi.id === 'revenue') {
        return Math.floor(value).toLocaleString()
      } else if (kpi.suffix === '%') {
        return value.toFixed(kpi.id === 'conversion' ? 2 : 1)
      }
      return Math.floor(value).toLocaleString()
    }

    const getBadgeClass = () => {
      if (!kpi.change.value) return 'badge-info'
      return kpi.change.positive ? 'badge-success' : 'badge-error'
    }

    return (
      <div className="card kpi-card fade-in">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>
            {kpi.icon}
          </div>
          <h3 className="kpi-title">{kpi.title}</h3>
          <div className="kpi-value">
            {kpi.prefix && kpi.prefix}
            {formatValue(animatedValue)}
            {kpi.suffix && kpi.suffix}
          </div>
          <div className={`kpi-change ${kpi.change.positive ? 'positive' : 'negative'}`}>
            {kpi.change.value && `${kpi.change.positive ? '▲' : '▼'} ${kpi.change.value}%`} {kpi.change.period}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* 状态横幅 */}
      <div className="banner banner-success mb-lg">
        <div>
          <strong>✅ DTax-Bridge 运行正常</strong><br />
          所有系统运行正常，税费计算和物流服务可用。上次检查：{new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {/* KPI 指标网格 */}
      <div className="grid grid-3 mb-lg">
        {kpiData.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* 订单趋势图表 */}
      <div className="card mb-lg">
        <div className="card-header">
          <h2 className="card-title">📊 订单趋势分析</h2>
          <p className="card-subtitle">近30天的订单模式变化趋势，DDP订单增长显著</p>
        </div>
        <div className="card-content">
          <div style={{ 
            height: '300px',
            backgroundColor: 'var(--form-bg-info)',
            borderRadius: 'var(--border-radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            border: '2px dashed var(--border-color)'
          }}>
            <div>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>📈</div>
              <h3 className="text-lg font-semibold mb-sm">订单趋势图表</h3>
              <p className="text-secondary mb-md">集成Chart.js图表组件显示详细趋势</p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/reports')}
              >
                查看详细报表
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 快速操作卡片 */}
      <div className="card mb-lg">
        <div className="card-header">
          <h2 className="card-title">⚡ 快速操作</h2>
          <p className="card-subtitle">常用功能快速入口，提升工作效率</p>
        </div>
        <div className="card-content">
          <div className="grid grid-4 gap-md">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/settings/tax')}
            >
              🧾 税费设置
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/settings/logistics')}
            >
              🚚 物流配置
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/compliance')}
            >
              📋 合规申报
            </button>
            
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/help')}
            >
              ❓ 帮助文档
            </button>
          </div>
        </div>
      </div>

      {/* 系统状态指示器 */}
      <div className="grid grid-3">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-sm">⚙️ 税费计算引擎</h3>
                <p className="text-secondary">运行状态正常</p>
              </div>
              <span className="badge badge-success">正常</span>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-sm">🚛 物流集成服务</h3>
                <p className="text-secondary">所有渠道可用</p>
              </div>
              <span className="badge badge-success">正常</span>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium mb-sm">📊 合规申报系统</h3>
                <p className="text-secondary">IOSS/VAT同步中</p>
              </div>
              <span className="badge badge-warning">同步中</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}