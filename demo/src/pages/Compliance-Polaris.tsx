import React, { useState, useEffect } from 'react'
import { 
  Page, 
  Layout, 
  Card, 
  Badge, 
  Button, 
  Tabs, 
  DataTable,
  Text,
  Stack,
  Banner,
  ProgressBar,
  ButtonGroup,
  Popover,
  ActionList,
  TextField,
  Select
} from '@shopify/polaris'
import { useNavigate } from 'react-router-dom'
import { ExportIcon, AlertTriangleIcon, CheckCircleIcon } from '@shopify/polaris-icons'

export function Compliance() {
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState(0)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actionsPopoverActive, setActionsPopoverActive] = useState(false)

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
      case 'submitted': return <Badge status="info">已提交</Badge>
      case 'approved': return <Badge status="success">已批准</Badge>
      case 'processing': return <Badge status="attention">处理中</Badge>
      case 'rejected': return <Badge status="critical">被拒绝</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'IOSS': return <Badge status="info">IOSS</Badge>
      case 'UK VAT': return <Badge status="critical">UK VAT</Badge>
      case 'Section 321': return <Badge status="warning">Section 321</Badge>
      default: return <Badge>{type}</Badge>
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
    { id: 'overview', content: '📊 总览' },
    { id: 'ioss', content: '🇪🇺 IOSS 申报' },
    { id: 'ukVat', content: '🇬🇧 UK VAT' },
    { id: 'section321', content: '🇺🇸 Section 321' },
  ]

  const quickActions = [
    { content: '生成 IOSS 申报', onAction: () => generateReport('IOSS') },
    { content: '生成 UK VAT 申报', onAction: () => generateReport('UK VAT') },
    { content: '生成 Section 321 报告', onAction: () => generateReport('Section 321') },
    { content: '导出所有报告', onAction: () => generateReport('综合') },
  ]

  const renderOverviewTab = () => (
    <Layout>
      <Layout.Section>
        {/* KPI 指标 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--p-space-4)', marginBottom: 'var(--p-space-6)' }}>
          <Card>
            <div style={{ padding: 'var(--p-space-4)' }}>
              <Stack distribution="equalSpacing" alignment="center">
                <div>
                  <Text variant="bodySm" color="subdued" as="p">IOSS 申报状态</Text>
                  <Text variant="headingLg" as="h3" style={{ color: 'var(--p-color-text-success)' }}>
                    ✅ 已提交
                  </Text>
                </div>
              </Stack>
              <Text variant="bodySm" color="subdued" as="p" style={{ marginTop: 'var(--p-space-2)' }}>
                下次申报: 2024-03-01
              </Text>
            </div>
          </Card>

          <Card>
            <div style={{ padding: 'var(--p-space-4)' }}>
              <Stack distribution="equalSpacing" alignment="center">
                <div>
                  <Text variant="bodySm" color="subdued" as="p">UK VAT 申报状态</Text>
                  <Text variant="headingLg" as="h3" style={{ color: 'var(--p-color-text-success)' }}>
                    ✅ 已批准
                  </Text>
                </div>
              </Stack>
              <Text variant="bodySm" color="subdued" as="p" style={{ marginTop: 'var(--p-space-2)' }}>
                下次申报: 2024-07-01
              </Text>
            </div>
          </Card>

          <Card>
            <div style={{ padding: 'var(--p-space-4)' }}>
              <Stack distribution="equalSpacing" alignment="center">
                <div>
                  <Text variant="bodySm" color="subdued" as="p">Section 321 利用率</Text>
                  <Text variant="headingLg" as="h3">94.2%</Text>
                </div>
                <Badge status="success">▲ 3.5%</Badge>
              </Stack>
            </div>
          </Card>

          <Card>
            <div style={{ padding: 'var(--p-space-4)' }}>
              <Stack distribution="equalSpacing" alignment="center">
                <div>
                  <Text variant="bodySm" color="subdued" as="p">整体合规率</Text>
                  <Text variant="headingLg" as="h3">98.7%</Text>
                </div>
                <Badge status="success">▲ 1.2%</Badge>
              </Stack>
            </div>
          </Card>
        </div>

        {/* 风险提醒 */}
        <div style={{ marginBottom: 'var(--p-space-6)' }}>
          <Card>
            <div style={{ padding: 'var(--p-space-4)' }}>
              <Text variant="headingLg" as="h3" style={{ marginBottom: 'var(--p-space-4)' }}>
                ⚠️ 合规风险提醒
              </Text>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-3)' }}>
                <Banner status="warning">
                  <p><strong>🇩🇪 德国订单价值接近阈值</strong></p>
                  <p>本月德国订单累计价值已达 €142，建议控制在 €150 以下以适用 IOSS</p>
                </Banner>
                
                <Banner status="info">
                  <p><strong>🇺🇸 Section 321 优化建议</strong></p>
                  <p>检测到 3 个订单可通过拆分获得更好的关税优惠，预计可节省 $127</p>
                </Banner>
              </div>
            </div>
          </Card>
        </div>

        {/* 最近申报记录 */}
        <Card>
          <div style={{ padding: 'var(--p-space-4)' }}>
            <Stack distribution="equalSpacing" alignment="center">
              <Text variant="headingLg" as="h3">
                📋 最近申报记录
              </Text>
              <Button
                variant="primary"
                onClick={() => setActionsPopoverActive(true)}
              >
                快速操作
              </Button>
            </Stack>
            
            <div style={{ marginTop: 'var(--p-space-4)' }}>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'numeric', 'numeric', 'text', 'text']}
                headings={['申报ID', '类型', '期间', '订单数', '税费金额', '状态', '操作']}
                rows={reports.map((report) => [
                  report.id,
                  getTypeBadge(report.type),
                  report.period,
                  report.totalTransactions,
                  report.type === 'Section 321' ? 
                    `$${report.totalValue?.toFixed(2)}` : 
                    `$${report.totalVAT?.toFixed(2)}`,
                  getStatusBadge(report.status),
                  <ButtonGroup key={report.id}>
                    <Button size="slim" onClick={() => alert(`查看 ${report.id} 详情`)}>
                      查看
                    </Button>
                    <Button size="slim" variant="plain" onClick={() => alert(`下载 ${report.id} 报表`)}>
                      下载
                    </Button>
                  </ButtonGroup>
                ])}
                footerContent={`共 ${reports.length} 条申报记录`}
              />
            </div>
          </div>
        </Card>
      </Layout.Section>
    </Layout>
  )

  const renderIOSSTab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <div style={{ padding: 'var(--p-space-4)' }}>
            <Stack distribution="equalSpacing" alignment="center">
              <Text variant="headingLg" as="h3">
                🇪🇺 IOSS (Import One-Stop Shop) 申报
              </Text>
              <Button
                variant="primary"
                loading={loading}
                onClick={() => generateReport('IOSS')}
              >
                {loading ? '生成中...' : '生成新申报'}
              </Button>
            </Stack>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--p-space-4)', margin: 'var(--p-space-6) 0' }}>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  本月交易数
                </Text>
                <Text variant="heading2xl" as="p">245</Text>
              </div>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  VAT 总额
                </Text>
                <Text variant="heading2xl" as="p">€1,250.75</Text>
              </div>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  覆盖国家
                </Text>
                <Text variant="heading2xl" as="p">5</Text>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--p-space-6)' }}>
              <Text variant="headingMd" as="h4" style={{ marginBottom: 'var(--p-space-3)' }}>
                按国家分布
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--p-space-3)' }}>
                {[
                  { country: '🇩🇪 德国', transactions: 89, vat: 445.20 },
                  { country: '🇫🇷 法国', transactions: 67, vat: 324.50 },
                  { country: '🇮🇹 意大利', transactions: 45, vat: 278.30 },
                  { country: '🇪🇸 西班牙', transactions: 32, vat: 156.75 },
                  { country: '🇳🇱 荷兰', transactions: 12, vat: 46.00 }
                ].map((item, index) => (
                  <div key={index} style={{ 
                    padding: 'var(--p-space-3)', 
                    backgroundColor: 'var(--p-color-bg-subdued)', 
                    borderRadius: 'var(--p-border-radius-base)',
                    border: '1px solid var(--p-color-border-subdued)'
                  }}>
                    <Text variant="bodyMd" fontWeight="medium" as="p" style={{ marginBottom: 'var(--p-space-05)' }}>
                      {item.country}
                    </Text>
                    <Text variant="bodySm" color="subdued" as="p">
                      {item.transactions} 笔订单 | €{item.vat}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            <Banner status="info">
              <p><strong>💡 IOSS 申报提醒</strong></p>
              <ul>
                <li>下次申报截止日期：2024年3月1日</li>
                <li>当前月度交易已接近建议阈值，建议及时申报</li>
                <li>所有€150以下订单均已包含在IOSS申报范围内</li>
              </ul>
            </Banner>
          </div>
        </Card>
      </Layout.Section>
    </Layout>
  )

  const renderUKVATTab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <div style={{ padding: 'var(--p-space-4)' }}>
            <Stack distribution="equalSpacing" alignment="center">
              <Text variant="headingLg" as="h3">
                🇬🇧 UK VAT 申报
              </Text>
              <Button
                variant="primary"
                loading={loading}
                onClick={() => generateReport('UK VAT')}
              >
                {loading ? '生成中...' : '生成季度申报'}
              </Button>
            </Stack>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--p-space-4)', margin: 'var(--p-space-6) 0' }}>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  本季度交易数
                </Text>
                <Text variant="heading2xl" as="p">89</Text>
              </div>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  VAT 应付总额
                </Text>
                <Text variant="heading2xl" as="p">£890.25</Text>
              </div>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  低价值救济适用率
                </Text>
                <Text variant="heading2xl" as="p">94%</Text>
              </div>
            </div>

            <Banner status="success">
              <p><strong>✅ UK VAT 申报状态</strong></p>
              <ul>
                <li>Q1 2024 申报已提交并获得批准</li>
                <li>下次申报期间：2024年7月1日 - 8月7日</li>
                <li>£135以下订单已自动包含VAT，无需边境缴税</li>
              </ul>
            </Banner>
          </div>
        </Card>
      </Layout.Section>
    </Layout>
  )

  const renderSection321Tab = () => (
    <Layout>
      <Layout.Section>
        <Card>
          <div style={{ padding: 'var(--p-space-4)' }}>
            <Stack distribution="equalSpacing" alignment="center">
              <Text variant="headingLg" as="h3">
                🇺🇸 Section 321 de minimis
              </Text>
              <Button
                variant="primary"
                loading={loading}
                onClick={() => generateReport('Section 321')}
              >
                {loading ? '生成中...' : '生成月度报告'}
              </Button>
            </Stack>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--p-space-4)', margin: 'var(--p-space-6) 0' }}>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  本月符合条件订单
                </Text>
                <Text variant="heading2xl" as="p">156</Text>
              </div>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  总订单价值
                </Text>
                <Text variant="heading2xl" as="p">$45,620</Text>
              </div>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  利用率
                </Text>
                <Text variant="heading2xl" as="p">94.2%</Text>
              </div>
              <div style={{ padding: 'var(--p-space-4)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                <Text variant="bodySm" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-1)' }}>
                  节省关税
                </Text>
                <Text variant="heading2xl" as="p">$2,281</Text>
              </div>
            </div>

            <Banner status="warning">
              <p><strong>⚠️ Section 321 注意事项</strong></p>
              <ul>
                <li>订单价值必须≤$800才能享受免税</li>
                <li>同一收件人24小时内订单总价值不能超过$800</li>
                <li>纺织品、食品等特定商品类别不适用此政策</li>
                <li>当前有3个订单建议拆分以获得更好优惠</li>
              </ul>
            </Banner>
          </div>
        </Card>
      </Layout.Section>
    </Layout>
  )

  return (
    <div style={{ backgroundColor: 'var(--p-color-bg-subdued)', minHeight: '100vh' }}>
      <Page
        title="合规申报"
        subtitle="管理IOSS、UK VAT、Section 321等跨境税务合规申报"
        backAction={{
          content: '返回仪表板',
          onAction: () => navigate('/dashboard')
        }}
        primaryAction={{
          content: '生成报告',
          icon: ExportIcon,
          onAction: () => setActionsPopoverActive(true)
        }}
        secondaryActions={[
          {
            content: '合规检查',
            icon: CheckCircleIcon,
            onAction: () => alert('合规检查功能开发中...')
          }
        ]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <div style={{ padding: 'var(--p-space-4)' }}>
                  {selectedTab === 0 && renderOverviewTab()}
                  {selectedTab === 1 && renderIOSSTab()}
                  {selectedTab === 2 && renderUKVATTab()}
                  {selectedTab === 3 && renderSection321Tab()}
                </div>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>

        {/* 快速操作 Popover */}
        <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 9999 }}>
          <Popover
            active={actionsPopoverActive}
            activator={<div></div>}
            onClose={() => setActionsPopoverActive(false)}
          >
            <ActionList items={quickActions} />
          </Popover>
        </div>
      </Page>
    </div>
  )
}