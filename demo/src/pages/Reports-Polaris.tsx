import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function Reports() {
  const navigate = useNavigate()
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedTab, setSelectedTab] = useState(0)
  const [loading, setLoading] = useState(false)

  const generateReport = (type: string) => {
    setLoading(true)
    setTimeout(() => {
      alert(`${type} 报表已生成并下载`)
      setLoading(false)
    }, 2000)
  }

  const periodOptions = [
    { label: '本周', value: 'week' },
    { label: '本月', value: 'month' },
    { label: '本季度', value: 'quarter' },
    { label: '本年', value: 'year' },
  ]

  const tabs = [
    { id: 'overview', name: '📊 总览' },
    { id: 'sales', name: '💰 销售分析' },
    { id: 'tax', name: '🧾 税费分析' },
    { id: 'logistics', name: '🚚 物流分析' },
    { id: 'compliance', name: '✅ 合规分析' },
  ]

  const renderOverviewTab = () => (
    <div>
      {/* 概览 KPI */}
      <div className="grid grid-4 mb-lg">
        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>📈</div>
            <h3 className="kpi-title">总销售额</h3>
            <div className="kpi-value">$127,450</div>
            <div className="kpi-change positive">▲ 18.2% vs 上月</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>🧾</div>
            <h3 className="kpi-title">税费总额</h3>
            <div className="kpi-value">$12,745</div>
            <div className="kpi-change positive">▲ 15.3% vs 上月</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>🚚</div>
            <h3 className="kpi-title">物流成本</h3>
            <div className="kpi-value">$8,230</div>
            <div className="kpi-change negative">▼ 2.1% vs 上月</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>📦</div>
            <h3 className="kpi-title">订单数量</h3>
            <div className="kpi-value">1,847</div>
            <div className="kpi-change positive">▲ 22.8% vs 上月</div>
          </div>
        </div>
      </div>

      {/* 图表展示区域 */}
      <div className="grid grid-2 gap-lg mb-lg">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📈 销售趋势</h3>
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
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📊</div>
                <h4 className="font-semibold mb-sm">销售趋势图表</h4>
                <p className="text-secondary">Chart.js 图表组件</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🌍 地区分布</h3>
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
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🗺️</div>
                <h4 className="font-semibold mb-sm">地区分布图</h4>
                <p className="text-secondary">世界地图可视化</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 快速数据表格 */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 快速数据概览</h3>
        </div>
        <div className="card-content">
          <table className="table">
            <thead>
              <tr>
                <th>指标</th>
                <th>当前值</th>
                <th>上月对比</th>
                <th>趋势</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>🇺🇸 美国订单</td>
                <td className="font-medium">647</td>
                <td>+127 (+24.4%)</td>
                <td><span className="badge badge-success">上升</span></td>
              </tr>
              <tr>
                <td>🇪🇺 欧盟订单</td>
                <td className="font-medium">892</td>
                <td>+156 (+21.2%)</td>
                <td><span className="badge badge-success">上升</span></td>
              </tr>
              <tr>
                <td>🇬🇧 英国订单</td>
                <td className="font-medium">308</td>
                <td>+45 (+17.1%)</td>
                <td><span className="badge badge-success">上升</span></td>
              </tr>
              <tr>
                <td>DDP 比例</td>
                <td className="font-medium">87.3%</td>
                <td>+2.1%</td>
                <td><span className="badge badge-success">上升</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderSalesTab = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">💰 销售分析报表</h2>
      </div>
      <div className="card-content">
        <div className="banner banner-info mb-lg">
          <div>
            <strong>📈 销售分析功能</strong><br />
            详细的销售数据分析，包括产品表现、客户分析、地区销售等维度的深度报表。
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🚧</div>
          <h3 className="font-semibold mb-sm">功能开发中</h3>
          <p className="text-secondary">销售分析模块正在开发中，敬请期待！</p>
        </div>
      </div>
    </div>
  )

  const renderTaxTab = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">🧾 税费分析报表</h2>
      </div>
      <div className="card-content">
        <div className="banner banner-warning mb-lg">
          <div>
            <strong>🧾 税费分析功能</strong><br />
            各国税费明细、IOSS申报数据、UK VAT统计、Section 321优化建议等专业税务分析。
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🚧</div>
          <h3 className="font-semibold mb-sm">功能开发中</h3>
          <p className="text-secondary">税费分析模块正在开发中，敬请期待！</p>
        </div>
      </div>
    </div>
  )

  const renderLogisticsTab = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">🚚 物流分析报表</h2>
      </div>
      <div className="card-content">
        <div className="banner banner-success mb-lg">
          <div>
            <strong>🚚 物流分析功能</strong><br />
            物流成本优化、时效分析、服务商表现对比、配送路线优化等物流数据洞察。
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🚧</div>
          <h3 className="font-semibold mb-sm">功能开发中</h3>
          <p className="text-secondary">物流分析模块正在开发中，敬请期待！</p>
        </div>
      </div>
    </div>
  )

  const renderComplianceTab = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">✅ 合规分析报表</h2>
      </div>
      <div className="card-content">
        <div className="banner banner-error mb-lg">
          <div>
            <strong>✅ 合规分析功能</strong><br />
            合规申报状态监控、风险预警、申报成功率统计、各国政策变化影响分析。
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🚧</div>
          <h3 className="font-semibold mb-sm">功能开发中</h3>
          <p className="text-secondary">合规分析模块正在开发中，敬请期待！</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fade-in">
      {/* 报表控制栏 */}
      <div className="card mb-lg">
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-md)', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">报表周期</label>
              <select
                className="form-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              className="btn btn-secondary"
              onClick={() => generateReport('综合报表')}
              disabled={loading}
            >
              📊 生成报表
            </button>
            
            <button 
              className="btn btn-primary"
              onClick={() => generateReport('导出')}
              disabled={loading}
            >
              {loading ? '生成中...' : '📥 导出数据'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="card mb-lg">
        <div className="card-content" style={{ padding: 'var(--space-md)' }}>
          <div className="flex gap-md">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                className={`btn ${selectedTab === index ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedTab(index)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab 内容 */}
      <div>
        {selectedTab === 0 && renderOverviewTab()}
        {selectedTab === 1 && renderSalesTab()}
        {selectedTab === 2 && renderTaxTab()}
        {selectedTab === 3 && renderLogisticsTab()}
        {selectedTab === 4 && renderComplianceTab()}
      </div>
    </div>
  )
}