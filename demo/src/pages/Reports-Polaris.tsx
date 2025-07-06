import React, { useState, useEffect } from 'react'
import { 
  Page, 
  Layout, 
  Card, 
  Button, 
  Select, 
  Tabs, 
  DataTable,
  Text,
  Stack,
  ProgressBar,
  Banner,
  ButtonGroup,
  Popover,
  ActionList
} from '@shopify/polaris'
import { useNavigate } from 'react-router-dom'
import { ExportIcon, CalendarIcon, TrendingUpIcon } from '@shopify/polaris-icons'

export function Reports() {
  const navigate = useNavigate()
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedTab, setSelectedTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exportPopoverActive, setExportPopoverActive] = useState(false)

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
    { id: 'overview', content: '📊 总览' },
    { id: 'sales', content: '💰 销售分析' },
    { id: 'tax', content: '🧾 税费分析' },
    { id: 'logistics', content: '🚚 物流分析' },
    { id: 'compliance', content: '✅ 合规分析' },
  ]

  // KPI 数据
  const kpiData = [
    { title: '总收入', value: '$89,247', change: '+12.5%', trend: 'positive' },
    { title: '税费收入', value: '$8,924', change: '+15.2%', trend: 'positive' },
    { title: '订单数量', value: '1,247', change: '+8.7%', trend: 'positive' },
    { title: '平均订单价值', value: '$71.58', change: '+3.4%', trend: 'positive' },
  ]

  // 地区分布数据
  const regionData = [
    { region: '🇺🇸 美国', percentage: 35, orders: 436, revenue: 31245 },
    { region: '🇪🇺 欧盟', percentage: 28, orders: 349, revenue: 24987 },
    { region: '🇬🇧 英国', percentage: 18, orders: 224, revenue: 16058 },
    { region: '🌏 其他', percentage: 19, orders: 238, revenue: 17057 }
  ]

  // 详细数据表格
  const tableRows = [
    ['2024-01-20', '45', '$3,240', '$324', '$72', '98.9%'],
    ['2024-01-19', '52', '$3,744', '$374', '$72', '96.2%'],
    ['2024-01-18', '38', '$2,736', '$274', '$72', '100%'],
    ['2024-01-17', '41', '$2,952', '$295', '$72', '97.6%'],
    ['2024-01-16', '47', '$3,384', '$338', '$72', '95.7%'],
    ['2024-01-15', '39', '$2,808', '$281', '$72', '100%'],
    ['2024-01-14', '44', '$3,168', '$317', '$72', '97.7%'],
  ]

  const exportActions = [
    { content: '导出 CSV', onAction: () => generateReport('CSV') },
    { content: '导出 PDF', onAction: () => generateReport('PDF') },
    { content: '导出 Excel', onAction: () => generateReport('Excel') },
    { content: '发送邮件报告', onAction: () => alert('邮件发送功能开发中...') },
  ]

  const renderOverviewTab = () => (
    <Layout>
      <Layout.Section>
        {/* KPI 指标卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--p-space-4)', marginBottom: 'var(--p-space-6)' }}>
          {kpiData.map((kpi, index) => (
            <div key={index} className="polaris-card">
              <div className="polaris-card__section">
                <Stack distribution="equalSpacing" alignment="center">
                  <div>
                    <Text variant="bodySm" color="subdued" as="p">
                      {kpi.title}
                    </Text>
                    <Text variant="heading2xl" as="h3">
                      {kpi.value}
                    </Text>
                  </div>
                  <div className="polaris-badge polaris-badge--success">
                    {kpi.change}
                  </div>
                </Stack>
              </div>
            </div>
          ))}
        </div>

        {/* 图表和地区分布 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--p-space-6)', marginBottom: 'var(--p-space-6)' }}>
          {/* 趋势图表 */}
          <Card>
            <div style={{ padding: 'var(--p-space-4)' }}>
              <Stack distribution="equalSpacing" alignment="center">
                <Text variant="headingLg" as="h3">
                  📈 订单趋势分析
                </Text>
                <Button
                  icon={TrendingUpIcon}
                  variant="plain"
                  onClick={() => alert('图表设置功能开发中...')}
                >
                  设置
                </Button>
              </Stack>
              
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)', marginTop: 'var(--p-space-4)' }}>
                <div style={{ textAlign: 'center' }}>
                  <Text variant="bodyLg" color="subdued" as="p">
                    📊 趋势图表
                  </Text>
                  <Text variant="bodySm" color="subdued" as="p" style={{ marginTop: 'var(--p-space-2)' }}>
                    订单量持续增长，税费收入稳步提升
                  </Text>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--p-space-4)', marginTop: 'var(--p-space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-1)' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--p-color-bg-primary)', borderRadius: '50%' }}></div>
                      <Text variant="bodySm" as="span">订单数量</Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-1)' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--p-color-bg-info)', borderRadius: '50%' }}></div>
                      <Text variant="bodySm" as="span">税费收入</Text>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 地区分布 */}
          <Card>
            <div style={{ padding: 'var(--p-space-4)' }}>
              <Text variant="headingLg" as="h3" style={{ marginBottom: 'var(--p-space-4)' }}>
                🌍 地区分布
              </Text>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-4)' }}>
                {regionData.map((item, index) => (
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--p-space-1)' }}>
                      <Text variant="bodyMd" fontWeight="medium" as="span">
                        {item.region}
                      </Text>
                      <Text variant="bodyMd" color="subdued" as="span">
                        {item.percentage}%
                      </Text>
                    </div>
                    <ProgressBar progress={item.percentage} size="small" />
                    <Text variant="bodySm" color="subdued" as="p" style={{ marginTop: 'var(--p-space-05)' }}>
                      {item.orders} 订单 | ${item.revenue.toLocaleString()}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* 详细数据表格 */}
        <Card>
          <div style={{ padding: 'var(--p-space-4)' }}>
            <Stack distribution="equalSpacing" alignment="center">
              <Text variant="headingLg" as="h3">
                📋 详细数据
              </Text>
              <div style={{ display: 'flex', gap: 'var(--p-space-2)' }}>
                <Button variant="primary" size="slim" onClick={() => generateReport('CSV')}>
                  导出 CSV
                </Button>
                <Button variant="primary" size="slim" onClick={() => generateReport('PDF')}>
                  导出 PDF
                </Button>
              </div>
            </Stack>
            
            <div style={{ marginTop: 'var(--p-space-4)' }}>
              <DataTable
                columnContentTypes={['text', 'numeric', 'numeric', 'numeric', 'numeric', 'text']}
                headings={['日期', '订单数', '总收入', '税费收入', '平均订单价值', '合规率']}
                rows={tableRows}
                footerContent={`共显示 ${tableRows.length} 条记录`}
              />
            </div>
          </div>
        </Card>

        {/* 数据洞察 */}
        <div style={{ marginTop: 'var(--p-space-6)' }}>
          <Card>
            <div style={{ padding: 'var(--p-space-4)' }}>
              <Text variant="headingLg" as="h3" style={{ marginBottom: 'var(--p-space-4)' }}>
                💡 数据洞察和建议
              </Text>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--p-space-4)' }}>
                <Banner status="info">
                  <p><strong>📈 增长趋势</strong></p>
                  <p>订单量环比增长12.5%，建议增加营销投入以维持增长势头</p>
                </Banner>
                
                <Banner status="warning">
                  <p><strong>⚠️ 注意事项</strong></p>
                  <p>欧盟地区合规率略有下降，建议检查IOSS申报流程</p>
                </Banner>
                
                <Banner status="success">
                  <p><strong>💰 收入优化</strong></p>
                  <p>美国市场表现优异，可考虑推出针对性的产品线</p>
                </Banner>
              </div>
            </div>
          </Card>
        </div>
      </Layout.Section>
    </Layout>
  )

  const renderPlaceholderTab = (tabName: string) => (
    <Layout>
      <Layout.Section>
        <Card>
          <div style={{ padding: 'var(--p-space-8)', textAlign: 'center' }}>
            <Text variant="headingMd" as="h3" style={{ marginBottom: 'var(--p-space-2)' }}>
              {tabName} 功能开发中
            </Text>
            <Text variant="bodyMd" color="subdued" as="p">
              该模块正在开发中，敬请期待更详细的分析功能
            </Text>
          </div>
        </Card>
      </Layout.Section>
    </Layout>
  )

  return (
    <div style={{ backgroundColor: 'var(--p-color-bg-subdued)', minHeight: '100vh' }}>
      <Page
        title="数据报表"
        subtitle="查看业务数据统计和趋势分析"
        backAction={{
          content: '返回仪表板',
          onAction: () => navigate('/dashboard')
        }}
        primaryAction={{
          content: '导出报表',
          icon: ExportIcon,
          onAction: () => setExportPopoverActive(true)
        }}
        secondaryActions={[
          {
            content: '调度报告',
            icon: CalendarIcon,
            onAction: () => alert('调度报告功能开发中...')
          }
        ]}
      >
        {loading && (
          <div style={{ marginBottom: 'var(--p-space-4)' }}>
            <Banner title="正在生成报表" status="info">
              <p>请稍候，报表生成可能需要几秒钟时间...</p>
            </Banner>
          </div>
        )}

        <Layout>
          <Layout.Section>
            {/* 期间选择器 */}
            <div style={{ marginBottom: 'var(--p-space-4)' }}>
              <Card>
                <div style={{ padding: 'var(--p-space-4)' }}>
                  <Stack distribution="equalSpacing" alignment="center">
                    <div>
                      <Text variant="bodyMd" as="p">
                        选择报表期间
                      </Text>
                    </div>
                    <div style={{ minWidth: '200px' }}>
                      <Select
                        label=""
                        labelHidden
                        options={periodOptions}
                        value={selectedPeriod}
                        onChange={setSelectedPeriod}
                      />
                    </div>
                  </Stack>
                </div>
              </Card>
            </div>

            {/* 标签页 */}
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <div style={{ padding: 'var(--p-space-4)' }}>
                  {selectedTab === 0 && renderOverviewTab()}
                  {selectedTab === 1 && renderPlaceholderTab('销售分析')}
                  {selectedTab === 2 && renderPlaceholderTab('税费分析')}
                  {selectedTab === 3 && renderPlaceholderTab('物流分析')}
                  {selectedTab === 4 && renderPlaceholderTab('合规分析')}
                </div>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>

        {/* 导出 Popover */}
        <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 9999 }}>
          <Popover
            active={exportPopoverActive}
            activator={<div></div>}
            onClose={() => setExportPopoverActive(false)}
          >
            <ActionList items={exportActions} />
          </Popover>
        </div>
      </Page>
    </div>
  )
}