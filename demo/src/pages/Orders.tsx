import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    // 模拟加载订单数据
    setTimeout(() => {
      setOrders([
        {
          id: 'ORD-2024-001',
          customerName: 'John Smith',
          destination: 'New York, US',
          totalValue: 299.99,
          taxAmount: 23.99,
          status: 'processing',
          orderDate: '2024-01-15',
          items: 3,
          logisticsProvider: 'DHL Express',
          complianceStatus: 'section321_approved'
        },
        {
          id: 'ORD-2024-002',
          customerName: 'Marie Dubois',
          destination: 'Paris, FR',
          totalValue: 149.50,
          taxAmount: 29.90,
          status: 'shipped',
          orderDate: '2024-01-14',
          items: 2,
          logisticsProvider: 'YunExpress',
          complianceStatus: 'ioss_submitted'
        },
        {
          id: 'ORD-2024-003',
          customerName: 'James Wilson',
          destination: 'London, GB',
          totalValue: 89.99,
          taxAmount: 15.30,
          status: 'delivered',
          orderDate: '2024-01-13',
          items: 1,
          logisticsProvider: 'Yanwen',
          complianceStatus: 'uk_vat_paid'
        },
        {
          id: 'ORD-2024-004',
          customerName: 'Hans Mueller',
          destination: 'Berlin, DE',
          totalValue: 234.50,
          taxAmount: 44.56,
          status: 'processing',
          orderDate: '2024-01-12',
          items: 4,
          logisticsProvider: 'DHL eCommerce',
          complianceStatus: 'pending_review'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return '#FF7A45'
      case 'shipped': return '#006EFF'
      case 'delivered': return '#10B981'
      case 'cancelled': return '#EF4444'
      default: return '#6B7280'
    }
  }

  const getComplianceStatusText = (status: string) => {
    switch (status) {
      case 'section321_approved': return 'Section 321 已批准'
      case 'ioss_submitted': return 'IOSS 已提交'
      case 'uk_vat_paid': return 'UK VAT 已缴纳'
      case 'pending_review': return '待审核'
      default: return '未知状态'
    }
  }

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'section321_approved':
      case 'ioss_submitted':
      case 'uk_vat_paid': return '#10B981'
      case 'pending_review': return '#FF7A45'
      default: return '#6B7280'
    }
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter((order: any) => order.status === filter)

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <div>🔄 加载订单数据...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 标题和筛选 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: 'var(--text-primary)',
            margin: 0
          }}>
            订单管理
          </h1>
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
            onClick={() => alert('导出功能开发中...')}
          >
            📊 导出报表
          </button>
        </div>

        {/* 筛选按钮 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'all', label: '全部' },
            { key: 'processing', label: '处理中' },
            { key: 'shipped', label: '已发货' },
            { key: 'delivered', label: '已送达' }
          ].map(item => (
            <button
              key={item.key}
              style={{
                background: filter === item.key ? 'var(--brand-primary)' : 'transparent',
                color: filter === item.key ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${filter === item.key ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 订单列表 */}
      <div className="kpi-card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  订单号
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  客户
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  目的地
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  订单金额
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  税费
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  订单状态
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  合规状态
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order: any) => (
                <tr 
                  key={order.id}
                  style={{ 
                    borderBottom: '1px solid var(--border-color)',
                    ':hover': { backgroundColor: 'var(--bg-workspace)' }
                  }}
                >
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{order.id}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {order.orderDate}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{order.customerName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {order.items} 件商品
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    {order.destination}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    <div style={{ fontWeight: '500' }}>${order.totalValue}</div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                    <div style={{ fontWeight: '500', color: 'var(--warning-orange)' }}>
                      ${order.taxAmount}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: `${getStatusColor(order.status)}20`,
                      color: getStatusColor(order.status)
                    }}>
                      {order.status === 'processing' ? '处理中' :
                       order.status === 'shipped' ? '已发货' :
                       order.status === 'delivered' ? '已送达' : order.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: `${getComplianceStatusColor(order.complianceStatus)}20`,
                      color: getComplianceStatusColor(order.complianceStatus)
                    }}>
                      {getComplianceStatusText(order.complianceStatus)}
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
                        onClick={() => alert(`查看订单 ${order.id} 详情`)}
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
                        onClick={() => alert(`追踪订单 ${order.id}`)}
                      >
                        追踪
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: 'var(--text-secondary)'
          }}>
            📦 暂无订单数据
          </div>
        )}
      </div>

      {/* 统计摘要 */}
      <div style={{ marginTop: '24px' }}>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="kpi-card">
            <h3>总订单数</h3>
            <div className="value">{orders.length}</div>
            <div className="change">
              <span className="positive">▲ 12.5% vs 上月</span>
            </div>
          </div>
          <div className="kpi-card">
            <h3>总订单价值</h3>
            <div className="value">
              ${orders.reduce((sum: number, order: any) => sum + order.totalValue, 0).toFixed(2)}
            </div>
            <div className="change">
              <span className="positive">▲ 8.3% vs 上月</span>
            </div>
          </div>
          <div className="kpi-card">
            <h3>总税费收入</h3>
            <div className="value">
              ${orders.reduce((sum: number, order: any) => sum + order.taxAmount, 0).toFixed(2)}
            </div>
            <div className="change">
              <span className="positive">▲ 15.2% vs 上月</span>
            </div>
          </div>
          <div className="kpi-card">
            <h3>合规率</h3>
            <div className="value">
              {((orders.filter((order: any) => 
                ['section321_approved', 'ioss_submitted', 'uk_vat_paid'].includes(order.complianceStatus)
              ).length / orders.length) * 100).toFixed(1)}%
            </div>
            <div className="change">
              <span className="positive">▲ 2.1% vs 上月</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}