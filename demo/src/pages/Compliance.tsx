import React, { useState, useEffect } from 'react'

export function Compliance() {
  const [activeTab, setActiveTab] = useState('overview')
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 模拟加载合规数据
    setReports([
      {
        id: 'IOSS_2024_01',
        type: 'IOSS',
        period: '2024年1月',
        status: 'submitted',
        submissionDate: '2024-02-01',
        totalTransactions: 245,
        totalVAT: 1250.75,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL']
      },
      {
        id: 'UKVAT_2024_Q1',
        type: 'UK VAT',
        period: '2024年Q1',
        status: 'approved',
        submissionDate: '2024-04-01',
        totalTransactions: 89,
        totalVAT: 890.25,
        countries: ['GB']
      },
      {
        id: 'S321_2024_01',
        type: 'Section 321',
        period: '2024年1月',
        status: 'processing',
        submissionDate: '2024-02-05',
        totalTransactions: 156,
        totalValue: 45620.00,
        countries: ['US']
      }
    ])
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return '#006EFF'
      case 'approved': return '#10B981'
      case 'processing': return '#FF7A45'
      case 'rejected': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return '已提交'
      case 'approved': return '已批准'
      case 'processing': return '处理中'
      case 'rejected': return '被拒绝'
      default: return '未知'
    }
  }

  const generateReport = (type: string) => {
    setLoading(true)
    setTimeout(() => {
      alert(`${type} 报表生成完成！`)
      setLoading(false)
    }, 2000)
  }

  const renderOverview = () => (
    <div>
      {/* KPI 指标 */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <h3>IOSS 申报状态</h3>
          <div className="value" style={{ color: '#10B981' }}>✅ 已提交</div>
          <div className="change">
            <span className="neutral">下次申报: 2024-03-01</span>
          </div>
        </div>
        <div className="kpi-card">
          <h3>UK VAT 申报状态</h3>
          <div className="value" style={{ color: '#10B981' }}>✅ 已批准</div>
          <div className="change">
            <span className="neutral">下次申报: 2024-07-01</span>
          </div>
        </div>
        <div className="kpi-card">
          <h3>Section 321 利用率</h3>
          <div className="value">94.2%</div>
          <div className="change">
            <span className="positive">▲ 3.5% vs 上月</span>
          </div>
        </div>
        <div className="kpi-card">
          <h3>整体合规率</h3>
          <div className="value">98.7%</div>
          <div className="change">
            <span className="positive">▲ 1.2% vs 上月</span>
          </div>
        </div>
      </div>

      {/* 风险提醒 */}
      <div className="kpi-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
          ⚠️ 合规风险提醒
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            padding: '12px', 
            borderRadius: '6px', 
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B'
          }}>
            <div style={{ fontWeight: '500', color: '#92400E', marginBottom: '4px' }}>
              🇩🇪 德国订单价值接近阈值
            </div>
            <div style={{ fontSize: '14px', color: '#92400E' }}>
              本月德国订单累计价值已达 €142，建议控制在 €150 以下以适用 IOSS
            </div>
          </div>
          <div style={{ 
            padding: '12px', 
            borderRadius: '6px', 
            backgroundColor: '#DBEAFE',
            border: '1px solid #3B82F6'
          }}>
            <div style={{ fontWeight: '500', color: '#1E40AF', marginBottom: '4px' }}>
              🇺🇸 Section 321 优化建议
            </div>
            <div style={{ fontSize: '14px', color: '#1E40AF' }}>
              检测到 3 个订单可通过拆分获得更好的关税优惠，预计可节省 $127
            </div>
          </div>
        </div>
      </div>

      {/* 最近申报记录 */}
      <div className="kpi-card">
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>
          📋 最近申报记录
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  申报ID
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  类型
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  期间
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  订单数
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  税费金额
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  状态
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {report.id}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: report.type === 'IOSS' ? '#DBEAFE' : 
                                     report.type === 'UK VAT' ? '#FEE2E2' : '#F3E8FF',
                      color: report.type === 'IOSS' ? '#1E40AF' : 
                             report.type === 'UK VAT' ? '#DC2626' : '#7C3AED'
                    }}>
                      {report.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {report.period}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {report.totalTransactions}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {report.type === 'Section 321' ? 
                      `$${report.totalValue?.toFixed(2)}` : 
                      `$${report.totalVAT?.toFixed(2)}`
                    }
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: `${getStatusColor(report.status)}20`,
                      color: getStatusColor(report.status)
                    }}>
                      {getStatusText(report.status)}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--brand-primary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                        onClick={() => alert(`查看 ${report.id} 详情`)}
                      >
                        查看
                      </button>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                        onClick={() => alert(`下载 ${report.id} 报表`)}
                      >
                        下载
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderIOSS = () => (
    <div>
      <div className="kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            🇪🇺 IOSS (Import One-Stop Shop) 申报
          </h3>
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
            onClick={() => generateReport('IOSS')}
            disabled={loading}
          >
            {loading ? '生成中...' : '生成新申报'}
          </button>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              本月交易数
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              245
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              VAT 总额
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              €1,250.75
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              覆盖国家
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              5
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
            按国家分布
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { country: '🇩🇪 德国', transactions: 89, vat: 445.20 },
              { country: '🇫🇷 法国', transactions: 67, vat: 324.50 },
              { country: '🇮🇹 意大利', transactions: 45, vat: 278.30 },
              { country: '🇪🇸 西班牙', transactions: 32, vat: 156.75 },
              { country: '🇳🇱 荷兰', transactions: 12, vat: 46.00 }
            ].map((item, index) => (
              <div key={index} style={{ 
                padding: '12px', 
                backgroundColor: 'var(--bg-workspace)', 
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  {item.country}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {item.transactions} 笔订单 | €{item.vat}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          backgroundColor: '#F0F9FF', 
          borderRadius: '8px',
          border: '1px solid #0EA5E9'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#0C4A6E', marginBottom: '8px' }}>
            💡 IOSS 申报提醒
          </div>
          <div style={{ fontSize: '14px', color: '#0C4A6E' }}>
            • 下次申报截止日期：2024年3月1日<br/>
            • 当前月度交易已接近建议阈值，建议及时申报<br/>
            • 所有€150以下订单均已包含在IOSS申报范围内
          </div>
        </div>
      </div>
    </div>
  )

  const renderUKVAT = () => (
    <div>
      <div className="kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            🇬🇧 UK VAT 申报
          </h3>
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
            onClick={() => generateReport('UK VAT')}
            disabled={loading}
          >
            {loading ? '生成中...' : '生成季度申报'}
          </button>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              本季度交易数
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              89
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              VAT 应付总额
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              £890.25
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              低价值救济适用率
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              94%
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          backgroundColor: '#F0FDF4', 
          borderRadius: '8px',
          border: '1px solid #16A34A'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#15803D', marginBottom: '8px' }}>
            ✅ UK VAT 申报状态
          </div>
          <div style={{ fontSize: '14px', color: '#15803D' }}>
            • Q1 2024 申报已提交并获得批准<br/>
            • 下次申报期间：2024年7月1日 - 8月7日<br/>
            • £135以下订单已自动包含VAT，无需边境缴税
          </div>
        </div>
      </div>
    </div>
  )

  const renderSection321 = () => (
    <div>
      <div className="kpi-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            🇺🇸 Section 321 de minimis
          </h3>
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
            onClick={() => generateReport('Section 321')}
            disabled={loading}
          >
            {loading ? '生成中...' : '生成月度报告'}
          </button>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              本月符合条件订单
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              156
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              总订单价值
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              $45,620
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              利用率
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              94.2%
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--bg-workspace)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              节省关税
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
              $2,281
            </div>
          </div>
        </div>

        <div style={{ 
          padding: '16px', 
          backgroundColor: '#FEF3C7', 
          borderRadius: '8px',
          border: '1px solid #F59E0B'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#92400E', marginBottom: '8px' }}>
            ⚠️ Section 321 注意事项
          </div>
          <div style={{ fontSize: '14px', color: '#92400E' }}>
            • 订单价值必须≤$800才能享受免税<br/>
            • 同一收件人24小时内订单总价值不能超过$800<br/>
            • 纺织品、食品等特定商品类别不适用此政策<br/>
            • 当前有3个订单建议拆分以获得更好优惠
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* 标题 */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: 'var(--text-primary)',
          margin: '0 0 8px 0'
        }}>
          合规申报
        </h1>
        <p style={{ 
          fontSize: '14px', 
          color: 'var(--text-secondary)',
          margin: 0
        }}>
          管理IOSS、UK VAT、Section 321等跨境税务合规申报
        </p>
      </div>

      {/* 标签页 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
          {[
            { key: 'overview', label: '总览', icon: '📊' },
            { key: 'ioss', label: 'IOSS 申报', icon: '🇪🇺' },
            { key: 'ukVat', label: 'UK VAT', icon: '🇬🇧' },
            { key: 'section321', label: 'Section 321', icon: '🇺🇸' }
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
                borderBottom: activeTab === tab.key ? '2px solid var(--brand-primary)' : '2px solid transparent',
                color: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--text-secondary)'
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'ioss' && renderIOSS()}
      {activeTab === 'ukVat' && renderUKVAT()}
      {activeTab === 'section321' && renderSection321()}
    </div>
  )
}