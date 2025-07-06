import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function Compliance() {
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState(0)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <span className="badge badge-info">已提交</span>
      case 'approved': return <span className="badge badge-success">已批准</span>
      case 'processing': return <span className="badge badge-warning">处理中</span>
      case 'rejected': return <span className="badge badge-error">被拒绝</span>
      default: return <span className="badge badge-default">{status}</span>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IOSS': return <span className="badge badge-info">🇪🇺 IOSS</span>
      case 'UK VAT': return <span className="badge badge-error">🇬🇧 UK VAT</span>
      case 'Section 321': return <span className="badge badge-warning">🇺🇸 Section 321</span>
      default: return <span className="badge badge-default">{type}</span>
    }
  }

  const generateReport = (type: string) => {
    setLoading(true)
    setTimeout(() => {
      alert(`${type} 报表生成完成！`)
      setLoading(false)
    }, 2000)
  }

  const tabs = [
    { id: 'overview', name: '📊 总览' },
    { id: 'ioss', name: '🇪🇺 IOSS 申报' },
    { id: 'ukVat', name: '🇬🇧 UK VAT' },
    { id: 'section321', name: '🇺🇸 Section 321' },
  ]

  const renderOverviewTab = () => (
    <div>
      {/* KPI 指标 */}
      <div className="grid grid-4 mb-lg">
        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>🇪🇺</div>
            <h3 className="kpi-title">IOSS 申报状态</h3>
            <div className="kpi-value text-success">✅ 已提交</div>
            <div className="kpi-change">下次申报: 2024-03-01</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>🇬🇧</div>
            <h3 className="kpi-title">UK VAT 申报状态</h3>
            <div className="kpi-value text-success">✅ 已批准</div>
            <div className="kpi-change">下次申报: 2024-07-01</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>🇺🇸</div>
            <h3 className="kpi-title">Section 321 利用率</h3>
            <div className="kpi-value">94.2%</div>
            <div className="kpi-change positive">▲ 3.5%</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>📊</div>
            <h3 className="kpi-title">整体合规率</h3>
            <div className="kpi-value">98.7%</div>
            <div className="kpi-change positive">▲ 1.2%</div>
          </div>
        </div>
      </div>

      {/* 风险提醒 */}
      <div className="mb-lg">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">⚠️ 合规风险提醒</h2>
          </div>
          <div className="card-content">
            <div className="banner banner-warning mb-md">
              <div>
                <strong>🇩🇪 德国订单价值接近阈值</strong><br />
                本月德国订单累计价值已达 €142，建议控制在 €150 以下以适用 IOSS
              </div>
            </div>
            
            <div className="banner banner-info">
              <div>
                <strong>🇺🇸 Section 321 优化建议</strong><br />
                检测到 3 个订单可通过拆分获得更好的关税优惠，预计可节省 $127
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近申报记录 */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 最近申报记录</h2>
          <button 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '生成中...' : '快速操作'}
          </button>
        </div>
        <div className="card-content">
          <table className="table">
            <thead>
              <tr>
                <th>申报ID</th>
                <th>类型</th>
                <th>期间</th>
                <th>订单数</th>
                <th>税费金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="font-medium">{report.id}</td>
                  <td>{getTypeBadge(report.type)}</td>
                  <td>{report.period}</td>
                  <td>{report.totalTransactions}</td>
                  <td>
                    {report.type === 'Section 321' ? 
                      `$${report.totalValue?.toFixed(2)}` : 
                      `$${report.totalVAT?.toFixed(2)}`}
                  </td>
                  <td>{getStatusBadge(report.status)}</td>
                  <td>
                    <div className="flex gap-sm">
                      <button className="btn btn-secondary btn-sm">
                        查看
                      </button>
                      <button className="btn btn-secondary btn-sm">
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

  const renderIOSSTab = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">🇪🇺 IOSS (Import One-Stop Shop) 申报</h2>
        <button 
          className="btn btn-primary"
          disabled={loading}
          onClick={() => generateReport('IOSS')}
        >
          {loading ? '生成中...' : '生成新申报'}
        </button>
      </div>
      <div className="card-content">
        <div className="grid grid-3 mb-lg">
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">本月交易数</h4>
            <div className="text-xl font-bold">245</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">VAT 总额</h4>
            <div className="text-xl font-bold">€1,250.75</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">覆盖国家</h4>
            <div className="text-xl font-bold">5</div>
          </div>
        </div>

        <div className="mb-lg">
          <h3 className="font-semibold mb-md">按国家分布</h3>
          <div className="grid grid-2 gap-md">
            {[
              { country: '🇩🇪 德国', transactions: 89, vat: 445.20 },
              { country: '🇫🇷 法国', transactions: 67, vat: 324.50 },
              { country: '🇮🇹 意大利', transactions: 45, vat: 278.30 },
              { country: '🇪🇸 西班牙', transactions: 32, vat: 156.75 },
              { country: '🇳🇱 荷兰', transactions: 12, vat: 46.00 }
            ].map((item, index) => (
              <div key={index} className="card" style={{ padding: 'var(--space-md)' }}>
                <div className="font-medium mb-xs">{item.country}</div>
                <div className="text-secondary">{item.transactions} 笔订单 | €{item.vat}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="banner banner-info">
          <div>
            <strong>💡 IOSS 申报提醒</strong><br />
            <ul style={{ marginTop: 'var(--space-sm)', paddingLeft: 'var(--space-lg)' }}>
              <li>下次申报截止日期：2024年3月1日</li>
              <li>当前月度交易已接近建议阈值，建议及时申报</li>
              <li>所有€150以下订单均已包含在IOSS申报范围内</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const renderUKVATTab = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">🇬🇧 UK VAT 申报</h2>
        <button 
          className="btn btn-primary"
          disabled={loading}
          onClick={() => generateReport('UK VAT')}
        >
          {loading ? '生成中...' : '生成季度申报'}
        </button>
      </div>
      <div className="card-content">
        <div className="grid grid-3 mb-lg">
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">本季度交易数</h4>
            <div className="text-xl font-bold">89</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">VAT 应付总额</h4>
            <div className="text-xl font-bold">£890.25</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">低价值救济适用率</h4>
            <div className="text-xl font-bold">94%</div>
          </div>
        </div>

        <div className="banner banner-success">
          <div>
            <strong>✅ UK VAT 申报状态</strong><br />
            <ul style={{ marginTop: 'var(--space-sm)', paddingLeft: 'var(--space-lg)' }}>
              <li>Q1 2024 申报已提交并获得批准</li>
              <li>下次申报期间：2024年7月1日 - 8月7日</li>
              <li>£135以下订单已自动包含VAT，无需边境缴税</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSection321Tab = () => (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">🇺🇸 Section 321 de minimis</h2>
        <button 
          className="btn btn-primary"
          disabled={loading}
          onClick={() => generateReport('Section 321')}
        >
          {loading ? '生成中...' : '生成月度报告'}
        </button>
      </div>
      <div className="card-content">
        <div className="grid grid-4 mb-lg">
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">本月符合条件订单</h4>
            <div className="text-xl font-bold">156</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">总订单价值</h4>
            <div className="text-xl font-bold">$45,620</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">利用率</h4>
            <div className="text-xl font-bold">94.2%</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-lg)', backgroundColor: 'var(--form-bg-info)' }}>
            <h4 className="text-secondary mb-sm">节省关税</h4>
            <div className="text-xl font-bold">$2,281</div>
          </div>
        </div>

        <div className="banner banner-warning">
          <div>
            <strong>⚠️ Section 321 注意事项</strong><br />
            <ul style={{ marginTop: 'var(--space-sm)', paddingLeft: 'var(--space-lg)' }}>
              <li>订单价值必须≤$800才能享受免税</li>
              <li>同一收件人24小时内订单总价值不能超过$800</li>
              <li>纺织品、食品等特定商品类别不适用此政策</li>
              <li>当前有3个订单建议拆分以获得更好优惠</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fade-in">
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
        {selectedTab === 1 && renderIOSSTab()}
        {selectedTab === 2 && renderUKVATTab()}
        {selectedTab === 3 && renderSection321Tab()}
      </div>
    </div>
  )
}