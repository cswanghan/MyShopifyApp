import React, { useState, useEffect } from 'react'
import { 
  Page, 
  Layout, 
  Card, 
  DataTable, 
  Badge, 
  Button, 
  ButtonGroup, 
  TextField,
  Select,
  Filters,
  ChoiceList,
  ResourceList,
  ResourceItem,
  Avatar,
  Text,
  Stack,
  Banner
} from '@shopify/polaris'
import { useNavigate } from 'react-router-dom'
import { SearchIcon, ExportIcon, FilterIcon } from '@shopify/polaris-icons'

export function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [queryValue, setQueryValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortValue, setSortValue] = useState('date_desc')

  useEffect(() => {
    // 模拟加载订单数据
    setTimeout(() => {
      setOrders([
        {
          id: 'ORD-2024-001',
          customerName: 'John Smith',
          customerEmail: 'john.smith@email.com',
          destination: 'New York, US',
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
          customerName: 'Marie Dubois',
          customerEmail: 'marie.dubois@email.com',
          destination: 'Paris, FR',
          totalValue: 149.50,
          taxAmount: 29.90,
          status: 'shipped',
          orderDate: '2024-01-14',
          items: 2,
          logisticsProvider: 'YunExpress',
          complianceStatus: 'ioss_submitted',
          trackingNumber: 'YUN9876543210'
        },
        {
          id: 'ORD-2024-003',
          customerName: 'James Wilson',
          customerEmail: 'james.wilson@email.com',
          destination: 'London, GB',
          totalValue: 89.99,
          taxAmount: 15.30,
          status: 'delivered',
          orderDate: '2024-01-13',
          items: 1,
          logisticsProvider: 'Yanwen',
          complianceStatus: 'uk_vat_paid',
          trackingNumber: 'YW5555666677'
        },
        {
          id: 'ORD-2024-004',
          customerName: 'Hans Mueller',
          customerEmail: 'hans.mueller@email.com',
          destination: 'Berlin, DE',
          totalValue: 234.50,
          taxAmount: 44.56,
          status: 'processing',
          orderDate: '2024-01-12',
          items: 4,
          logisticsProvider: 'DHL eCommerce',
          complianceStatus: 'pending_review',
          trackingNumber: 'DHE1111222233'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing': return <Badge status="attention">处理中</Badge>
      case 'shipped': return <Badge status="info">已发货</Badge>
      case 'delivered': return <Badge status="success">已送达</Badge>
      case 'cancelled': return <Badge status="critical">已取消</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'section321_approved': return <Badge status="success">Section 321 已批准</Badge>
      case 'ioss_submitted': return <Badge status="success">IOSS 已提交</Badge>
      case 'uk_vat_paid': return <Badge status="success">UK VAT 已缴纳</Badge>
      case 'pending_review': return <Badge status="attention">待审核</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const filteredOrders = orders.filter((order: any) => {
    const matchesQuery = queryValue === '' || 
      order.id.toLowerCase().includes(queryValue.toLowerCase()) ||
      order.customerName.toLowerCase().includes(queryValue.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(queryValue.toLowerCase())
    
    const matchesStatus = statusFilter === '' || order.status === statusFilter
    
    return matchesQuery && matchesStatus
  })

  const handleSelectionChange = (selectionType: any) => {
    setSelectedItems(selectionType)
  }

  const handleExport = () => {
    alert('导出功能开发中...')
  }

  const handleBulkAction = (action: string) => {
    alert(`批量${action}功能开发中...`)
  }

  const promotedBulkActions = [
    {
      content: '标记为已发货',
      onAction: () => handleBulkAction('发货'),
    },
    {
      content: '导出选中',
      onAction: () => handleBulkAction('导出'),
    },
  ]

  const bulkActions = [
    {
      content: '发送通知',
      onAction: () => handleBulkAction('通知'),
    },
    {
      content: '批量打印',
      onAction: () => handleBulkAction('打印'),
    },
  ]

  const filters = [
    {
      key: 'status',
      label: '订单状态',
      filter: (
        <ChoiceList
          title="订单状态"
          titleHidden
          choices={[
            { label: '处理中', value: 'processing' },
            { label: '已发货', value: 'shipped' },
            { label: '已送达', value: 'delivered' },
            { label: '已取消', value: 'cancelled' },
          ]}
          selected={statusFilter ? [statusFilter] : []}
          onChange={(value) => setStatusFilter(value[0] || '')}
        />
      ),
      shortcut: true,
    },
  ]

  const appliedFilters = statusFilter ? [
    {
      key: 'status',
      label: `状态: ${statusFilter}`,
      onRemove: () => setStatusFilter(''),
    },
  ] : []

  const sortOptions = [
    { label: '订单日期 (最新)', value: 'date_desc' },
    { label: '订单日期 (最早)', value: 'date_asc' },
    { label: '订单金额 (高到低)', value: 'amount_desc' },
    { label: '订单金额 (低到高)', value: 'amount_asc' },
  ]

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--p-color-bg-subdued)', minHeight: '100vh' }}>
        <Page title="订单管理">
          <Layout>
            <Layout.Section>
              <div className="polaris-card">
                <div className="polaris-card__section" style={{ textAlign: 'center', padding: 'var(--p-space-8)' }}>
                  <div className="polaris-text polaris-text--body-lg">🔄 加载订单数据...</div>
                </div>
              </div>
            </Layout.Section>
          </Layout>
        </Page>
      </div>
    )
  }

  const resourceName = {
    singular: '订单',
    plural: '订单',
  }

  return (
    <div style={{ backgroundColor: 'var(--p-color-bg-subdued)', minHeight: '100vh' }}>
      <Page
        title="订单管理"
        subtitle={`共 ${orders.length} 个订单`}
        backAction={{
          content: '返回仪表板',
          onAction: () => navigate('/dashboard')
        }}
        primaryAction={{
          content: '导出报表',
          icon: ExportIcon,
          onAction: handleExport
        }}
      >
        <Layout>
          <Layout.Section>
            {/* 快速统计卡片 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--p-space-4)', marginBottom: 'var(--p-space-4)' }}>
              <div className="polaris-card">
                <div className="polaris-card__section">
                  <h3 className="polaris-text polaris-text--body-sm polaris-text--subdued">总订单数</h3>
                  <div className="polaris-text polaris-text--heading-2xl">{orders.length}</div>
                  <div className="polaris-badge polaris-badge--success">▲ 12.5% vs 上月</div>
                </div>
              </div>
              <div className="polaris-card">
                <div className="polaris-card__section">
                  <h3 className="polaris-text polaris-text--body-sm polaris-text--subdued">总订单价值</h3>
                  <div className="polaris-text polaris-text--heading-2xl">
                    ${orders.reduce((sum: number, order: any) => sum + order.totalValue, 0).toFixed(2)}
                  </div>
                  <div className="polaris-badge polaris-badge--success">▲ 8.3% vs 上月</div>
                </div>
              </div>
              <div className="polaris-card">
                <div className="polaris-card__section">
                  <h3 className="polaris-text polaris-text--body-sm polaris-text--subdued">总税费收入</h3>
                  <div className="polaris-text polaris-text--heading-2xl">
                    ${orders.reduce((sum: number, order: any) => sum + order.taxAmount, 0).toFixed(2)}
                  </div>
                  <div className="polaris-badge polaris-badge--success">▲ 15.2% vs 上月</div>
                </div>
              </div>
              <div className="polaris-card">
                <div className="polaris-card__section">
                  <h3 className="polaris-text polaris-text--body-sm polaris-text--subdued">合规率</h3>
                  <div className="polaris-text polaris-text--heading-2xl">
                    {((orders.filter((order: any) => 
                      ['section321_approved', 'ioss_submitted', 'uk_vat_paid'].includes(order.complianceStatus)
                    ).length / orders.length) * 100).toFixed(1)}%
                  </div>
                  <div className="polaris-badge polaris-badge--success">▲ 2.1% vs 上月</div>
                </div>
              </div>
            </div>

            {/* 订单列表 */}
            <div className="polaris-card">
              <ResourceList
                resourceName={resourceName}
                items={filteredOrders}
                selectedItems={selectedItems}
                onSelectionChange={handleSelectionChange}
                promotedBulkActions={promotedBulkActions}
                bulkActions={bulkActions}
                sortValue={sortValue}
                sortOptions={sortOptions}
                onSortChange={(selected) => setSortValue(selected)}
                filterControl={
                  <Filters
                    queryValue={queryValue}
                    filters={filters}
                    appliedFilters={appliedFilters}
                    onQueryChange={setQueryValue}
                    onQueryClear={() => setQueryValue('')}
                    onClearAll={() => {
                      setQueryValue('')
                      setStatusFilter('')
                    }}
                  />
                }
                renderItem={(item: any) => {
                  const { id, customerName, customerEmail, destination, totalValue, taxAmount, status, orderDate, items, logisticsProvider, complianceStatus, trackingNumber } = item

                  return (
                    <ResourceItem
                      id={id}
                      url="#"
                      media={
                        <Avatar customer size="medium" name={customerName} />
                      }
                      accessibilityLabel={`查看订单 ${id} 的详情`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-2)', marginBottom: 'var(--p-space-1)' }}>
                            <Text variant="bodyMd" fontWeight="semibold" as="h3">
                              {id}
                            </Text>
                            {getStatusBadge(status)}
                          </div>
                          
                          <Text variant="bodySm" color="subdued" as="p">
                            {customerName} ({customerEmail})
                          </Text>
                          
                          <div style={{ display: 'flex', gap: 'var(--p-space-4)', marginTop: 'var(--p-space-1)' }}>
                            <Text variant="bodySm" as="span">
                              📍 {destination}
                            </Text>
                            <Text variant="bodySm" as="span">
                              📦 {items} 件商品
                            </Text>
                            <Text variant="bodySm" as="span">
                              🚚 {logisticsProvider}
                            </Text>
                          </div>
                        </div>
                        
                        <div style={{ textAlign: 'right', minWidth: '200px' }}>
                          <div style={{ marginBottom: 'var(--p-space-1)' }}>
                            <Text variant="bodyMd" fontWeight="semibold" as="p">
                              ${totalValue.toFixed(2)}
                            </Text>
                            <Text variant="bodySm" color="subdued" as="p">
                              税费: ${taxAmount.toFixed(2)}
                            </Text>
                          </div>
                          
                          <div style={{ marginBottom: 'var(--p-space-1)' }}>
                            {getComplianceBadge(complianceStatus)}
                          </div>
                          
                          <div style={{ display: 'flex', gap: 'var(--p-space-1)', justifyContent: 'flex-end' }}>
                            <Button size="slim" onClick={() => alert(`查看订单 ${id} 详情`)}>
                              查看
                            </Button>
                            <Button size="slim" variant="plain" onClick={() => alert(`追踪订单 ${trackingNumber}`)}>
                              追踪
                            </Button>
                          </div>
                        </div>
                      </div>
                    </ResourceItem>
                  )
                }}
              />
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </div>
  )
}