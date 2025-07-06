import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [queryValue, setQueryValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    // 模拟加载订单数据
    setTimeout(() => {
      setOrders([
        {
          id: 'ORD-2024-001',
          customerName: 'John Smith',
          customerEmail: 'john.smith@email.com',
          destination: 'New York, US 🇺🇸',
          totalValue: 299.99,
          taxAmount: 23.99,
          status: 'processing',
          orderDate: '2024-01-15',
          items: 3,
          logisticsProvider: 'DHL Express',
          complianceStatus: 'section321_approved',
          trackingNumber: 'DHL1234567890'
        },
        {
          id: 'ORD-2024-002',
          customerName: 'Emma Johnson',
          customerEmail: 'emma.j@email.com',
          destination: 'London, UK 🇬🇧',
          totalValue: 156.50,
          taxAmount: 31.30,
          status: 'shipped',
          orderDate: '2024-01-14',
          items: 2,
          logisticsProvider: 'YunExpress',
          complianceStatus: 'uk_vat_applied',
          trackingNumber: 'YUN987654321'
        },
        {
          id: 'ORD-2024-003',
          customerName: 'Hans Mueller',
          customerEmail: 'hans.m@email.de',
          destination: 'Berlin, Germany 🇩🇪',
          totalValue: 89.99,
          taxAmount: 17.10,
          status: 'delivered',
          orderDate: '2024-01-13',
          items: 1,
          logisticsProvider: 'DHL eCommerce',
          complianceStatus: 'ioss_submitted',
          trackingNumber: 'DHLeCom123456'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing': return <span className="badge badge-warning">处理中</span>
      case 'shipped': return <span className="badge badge-info">已发货</span>
      case 'delivered': return <span className="badge badge-success">已交付</span>
      case 'cancelled': return <span className="badge badge-error">已取消</span>
      default: return <span className="badge badge-default">{status}</span>
    }
  }

  const getComplianceStatusBadge = (status: string) => {
    switch (status) {
      case 'section321_approved': return <span className="badge badge-success">🇺🇸 Section 321</span>
      case 'uk_vat_applied': return <span className="badge badge-info">🇬🇧 UK VAT</span>
      case 'ioss_submitted': return <span className="badge badge-warning">🇪🇺 IOSS</span>
      default: return <span className="badge badge-default">{status}</span>
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesQuery = order.customerName.toLowerCase().includes(queryValue.toLowerCase()) ||
                        order.id.toLowerCase().includes(queryValue.toLowerCase())
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesQuery && matchesStatus
  })

  if (loading) {
    return (
      <div className="fade-in text-center p-2xl">
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>⏳</div>
        <h3 className="font-semibold mb-sm">加载订单数据中...</h3>
        <p className="text-secondary">正在从Shopify获取最新订单信息</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* 顶部搜索和筛选 */}
      <div className="card mb-lg">
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-md)', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">搜索订单</label>
              <input
                className="form-input"
                type="text"
                value={queryValue}
                onChange={(e) => setQueryValue(e.target.value)}
                placeholder="🔍 搜索订单号或客户姓名..."
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">状态筛选</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">全部状态</option>
                <option value="processing">处理中</option>
                <option value="shipped">已发货</option>
                <option value="delivered">已交付</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            
            <button className="btn btn-primary">
              📥 导出订单
            </button>
          </div>
        </div>
      </div>

      {/* 订单统计 */}
      <div className="grid grid-4 mb-lg">
        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>📦</div>
            <h3 className="kpi-title">总订单数</h3>
            <div className="kpi-value">{orders.length}</div>
            <div className="kpi-change">今日新增 +12</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>🚚</div>
            <h3 className="kpi-title">已发货</h3>
            <div className="kpi-value">{orders.filter(o => o.status === 'shipped').length}</div>
            <div className="kpi-change positive">▲ 5.2%</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>✅</div>
            <h3 className="kpi-title">已交付</h3>
            <div className="kpi-value">{orders.filter(o => o.status === 'delivered').length}</div>
            <div className="kpi-change positive">▲ 8.1%</div>
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: 'var(--space-sm)' }}>💰</div>
            <h3 className="kpi-title">总收入</h3>
            <div className="kpi-value">${orders.reduce((sum, o) => sum + o.totalValue, 0).toFixed(2)}</div>
            <div className="kpi-change positive">▲ 12.5%</div>
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 订单列表</h2>
          <span className="text-secondary">共 {filteredOrders.length} 个订单</span>
        </div>
        <div className="card-content">
          {filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>📦</div>
              <h3 className="font-semibold mb-sm">暂无订单</h3>
              <p className="text-secondary">没有找到符合条件的订单</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>客户</th>
                  <th>目的地</th>
                  <th>订单金额</th>
                  <th>税费</th>
                  <th>状态</th>
                  <th>合规状态</th>
                  <th>物流商</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="font-medium">{order.id}</div>
                      <div className="text-secondary text-sm">{order.orderDate}</div>
                    </td>
                    <td>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-secondary text-sm">{order.customerEmail}</div>
                    </td>
                    <td>{order.destination}</td>
                    <td className="font-medium">${order.totalValue}</td>
                    <td className="text-success font-medium">${order.taxAmount}</td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td>{getComplianceStatusBadge(order.complianceStatus)}</td>
                    <td className="text-secondary">{order.logisticsProvider}</td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn btn-secondary btn-sm">
                          查看
                        </button>
                        <button className="btn btn-secondary btn-sm">
                          跟踪
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}