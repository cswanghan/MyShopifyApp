import React, { useState, useEffect } from 'react'

export function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedReport, setSelectedReport] = useState('overview')
  const [loading, setLoading] = useState(false)

  const generateReport = (type: string) => {
    setLoading(true)
    setTimeout(() => {
      alert(`${type} 报表已生成并下载`)
      setLoading(false)
    }, 2000)
  }

  const chartData = {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    datasets: [
      {
        label: '订单数量',
        data: [245, 289, 312, 278, 356, 398],
        color: '#00C9C8'
      },
      {
        label: '税费收入',
        data: [1250, 1445, 1567, 1389, 1789, 1998],
        color: '#006EFF'
      }
    ]
  }

  return (
    <div>
      {/* 标题和操作 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: 'var(--text-primary)',
            margin: '0 0 8px 0'
          }}>
            数据报表
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            查看业务数据统计和趋势分析
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'var(--bg-main)'
            }}
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="quarter">本季度</option>
            <option value="year">本年</option>
          </select>
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
            onClick={() => generateReport('综合数据')}
            disabled={loading}
          >
            {loading ? '生成中...' : '📊 导出报表'}
          </button>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <h3>总收入</h3>
          <div className="value">$89,247</div>
          <div className="change">
            <span className="positive">▲ 12.5% vs 上月</span>
          </div>
        </div>
        <div className="kpi-card">
          <h3>税费收入</h3>
          <div className="value">$8,924</div>
          <div className="change">
            <span className="positive">▲ 15.2% vs 上月</span>
          </div>
        </div>
        <div className="kpi-card">
          <h3>订单数量</h3>
          <div className="value">1,247</div>
          <div className="change">
            <span className="positive">▲ 8.7% vs 上月</span>
          </div>
        </div>
        <div className="kpi-card">
          <h3>平均订单价值</h3>
          <div className="value">$71.58</div>
          <div className="change">
            <span className="positive">▲ 3.4% vs 上月</span>
          </div>
        </div>
      </div>

      {/* 报表类型选择 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
          {[
            { key: 'overview', label: '总览', icon: '📊' },
            { key: 'sales', label: '销售分析', icon: '💰' },
            { key: 'tax', label: '税费分析', icon: '🧾' },
            { key: 'logistics', label: '物流分析', icon: '🚚' },
            { key: 'compliance', label: '合规分析', icon: '✅' }
          ].map(tab => (
            <button
              key={tab.key}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                borderBottom: selectedReport === tab.key ? '2px solid var(--brand-primary)' : '2px solid transparent',
                color: selectedReport === tab.key ? 'var(--brand-primary)' : 'var(--text-secondary)'
              }}
              onClick={() => setSelectedReport(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 图表区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* 主要趋势图 */}
        <div className="kpi-card">
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
            📈 订单趋势分析
          </h3>
          <div className="chart-placeholder" style={{ height: '300px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                📊 趋势图表
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                订单量持续增长，税费收入稳步提升
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#00C9C8', borderRadius: '50%' }}></div>
                  <span>订单数量</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#006EFF', borderRadius: '50%' }}></div>
                  <span>税费收入</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 地区分布 */}
        <div className="kpi-card">
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
            🌍 地区分布
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { region: '🇺🇸 美国', percentage: 35, orders: 436, revenue: 31245 },
              { region: '🇪🇺 欧盟', percentage: 28, orders: 349, revenue: 24987 },
              { region: '🇬🇧 英国', percentage: 18, orders: 224, revenue: 16058 },
              { region: '🌏 其他', percentage: 19, orders: 238, revenue: 17057 }
            ].map((item, index) => (
              <div key={index}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.region}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{item.percentage}%</span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '6px', 
                  backgroundColor: 'var(--bg-workspace)', 
                  borderRadius: '3px',
                  marginBottom: '4px'
                }}>
                  <div style={{ 
                    width: `${item.percentage}%`, 
                    height: '100%', 
                    backgroundColor: 'var(--brand-primary)', 
                    borderRadius: '3px'
                  }}></div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {item.orders} 订单 | ${item.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 详细数据表格 */}
      <div className="kpi-card">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            📋 详细数据
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              onClick={() => generateReport('CSV')}
            >
              导出 CSV
            </button>
            <button
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              onClick={() => generateReport('PDF')}
            >
              导出 PDF
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  日期
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  订单数
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  总收入
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  税费收入
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  平均订单价值
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  合规率
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: '2024-01-20', orders: 45, revenue: 3240, tax: 324, avg: 72, compliance: 98.9 },
                { date: '2024-01-19', orders: 52, revenue: 3744, tax: 374, avg: 72, compliance: 96.2 },
                { date: '2024-01-18', orders: 38, revenue: 2736, tax: 274, avg: 72, compliance: 100 },
                { date: '2024-01-17', orders: 41, revenue: 2952, tax: 295, avg: 72, compliance: 97.6 },
                { date: '2024-01-16', orders: 47, revenue: 3384, tax: 338, avg: 72, compliance: 95.7 },
                { date: '2024-01-15', orders: 39, revenue: 2808, tax: 281, avg: 72, compliance: 100 },
                { date: '2024-01-14', orders: 44, revenue: 3168, tax: 317, avg: 72, compliance: 97.7 }
              ].map((row, index) => (
                <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {row.date}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {row.orders}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    ${row.revenue.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--warning-orange)', fontWeight: '500' }}>
                    ${row.tax}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    ${row.avg}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      color: row.compliance >= 98 ? '#10B981' : row.compliance >= 95 ? '#FF7A45' : '#EF4444',
                      fontWeight: '500'
                    }}>
                      {row.compliance}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 洞察和建议 */}
      <div style={{ marginTop: '24px' }}>
        <div className="kpi-card">
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
            💡 数据洞察和建议
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F0F9FF', 
              borderRadius: '8px',
              border: '1px solid #0EA5E9'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#0C4A6E', marginBottom: '8px' }}>
                📈 增长趋势
              </div>
              <div style={{ fontSize: '14px', color: '#0C4A6E' }}>
                订单量环比增长12.5%，建议增加营销投入以维持增长势头
              </div>
            </div>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#FEF3C7', 
              borderRadius: '8px',
              border: '1px solid #F59E0B'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#92400E', marginBottom: '8px' }}>
                ⚠️ 注意事项
              </div>
              <div style={{ fontSize: '14px', color: '#92400E' }}>
                欧盟地区合规率略有下降，建议检查IOSS申报流程
              </div>
            </div>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F0FDF4', 
              borderRadius: '8px',
              border: '1px solid #16A34A'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#15803D', marginBottom: '8px' }}>
                💰 收入优化
              </div>
              <div style={{ fontSize: '14px', color: '#15803D' }}>
                美国市场表现优异，可考虑推出针对性的产品线
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}