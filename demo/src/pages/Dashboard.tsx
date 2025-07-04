import React, { useState } from 'react'
import { 
  Page, 
  Layout, 
  Card, 
  Text, 
  Badge, 
  Button,
  ButtonGroup,
  Divider,
  Box,
  Grid,
  DataTable,
  Link
} from '@shopify/polaris'
import { 
  OrderIcon, 
  ProductIcon, 
  ChartVerticalIcon, 
  DeliveryIcon,
  SettingsIcon,
  ExternalIcon
} from '@shopify/polaris-icons'
import { useNavigate } from 'react-router-dom'
import { formatCurrency, calculateGrowthRate } from '../utils'

export function Dashboard() {
  const navigate = useNavigate()

  // 当前计划信息
  const currentPlan = {
    name: 'Standard Plan',
    price: '$29.99',
    period: '每30天',
    status: 'Activated',
    subscriptionId: 'DTX1234567890',
    created: '创建时间：2024年1月15日',
    activated: '激活时间：2024年1月15日'
  }

  // 本月使用情况
  const monthlyUsage = [
    { type: '税费计算', used: 1248, limit: 5000, price: '$0.05/次' },
    { type: '物流查询', used: 856, limit: 3000, price: '$0.03/次' },
    { type: 'API调用', used: 2104, limit: 10000, price: '$0.01/次' }
  ]

  // 最近发票
  const recentInvoices = [
    { date: '2024年7月1日', amount: '$29.99', status: 'paid' },
    { date: '2024年6月1日', amount: '$29.99', status: 'paid' },
    { date: '2024年5月1日', amount: '$29.99', status: 'paid' }
  ]

  // 使用情况表格数据
  const usageTableRows = monthlyUsage.map((usage) => [
    usage.type,
    `${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}`,
    <div key={usage.type} style={{ width: '100px', backgroundColor: '#f0f0f0', borderRadius: '4px', height: '8px' }}>
      <div 
        style={{ 
          width: `${(usage.used / usage.limit) * 100}%`, 
          backgroundColor: usage.used / usage.limit > 0.8 ? '#ff6b6b' : '#4ecdc4',
          borderRadius: '4px',
          height: '100%'
        }}
      />
    </div>,
    usage.price
  ])

  // 发票表格数据
  const invoiceTableRows = recentInvoices.map((invoice) => [
    invoice.date,
    invoice.amount,
    <Badge key={invoice.date} status={invoice.status === 'paid' ? 'success' : 'warning'}>
      {invoice.status === 'paid' ? '已支付' : '待支付'}
    </Badge>
  ])

  return (
    <Page 
      title="服务计划"
      subtitle="查看使用费用"
      secondaryActions={[
        {
          content: '查看待付款项',
          onAction: () => navigate('/billing/pending')
        },
        {
          content: '申请退款',
          onAction: () => navigate('/billing/refund')
        }
      ]}
    >
      <Layout>
        {/* 当前计划信息卡片 */}
        <Layout.Section>
          <Card>
            <Box padding="600">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text variant="headingLg" as="h2">
                    {currentPlan.name}
                  </Text>
                  <Badge status="success">{currentPlan.status}</Badge>
                </div>
                <Button 
                  icon={SettingsIcon}
                  onClick={() => navigate('/settings/billing')}
                >
                  管理计划
                </Button>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <Text variant="bodySm" color="subdued">
                  查看使用费用
                </Text>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <Text variant="bodySm" color="subdued">应用订阅ID {currentPlan.subscriptionId}</Text>
                <Text variant="headingXl" as="h3">{currentPlan.price} {currentPlan.period}</Text>
                <Text variant="bodySm" color="subdued">{currentPlan.created}</Text>
                <Text variant="bodySm" color="subdued">{currentPlan.activated}</Text>
              </div>

              <Divider />

              <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                <Text variant="bodyMd" fontWeight="semibold">应用</Text>
                <div style={{ marginTop: '8px' }}>
                  <Link 
                    url="#" 
                    external
                    onClick={() => window.open('https://apps.shopify.com/dtax-bridge', '_blank')}
                  >
                    DTax-Bridge 跨境税费&物流一体化
                  </Link>
                </div>
              </div>

              <div>
                <Text variant="bodyMd" fontWeight="semibold">商店</Text>
                <div style={{ marginTop: '8px' }}>
                  <Link 
                    url="#" 
                    external
                    onClick={() => window.open('https://your-store.myshopify.com', '_blank')}
                  >
                    您的跨境商店
                  </Link>
                </div>
              </div>
            </Box>
          </Card>
        </Layout.Section>

        {/* 使用情况和账单信息 */}
        <Layout.Section>
          <Grid>
            {/* 本月使用情况 */}
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 8, xl: 8 }}>
              <Card>
                <Box padding="600">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <Text variant="headingMd" as="h3">
                      2024年7月1日 - 2024年7月31日
                    </Text>
                    <Text variant="bodySm" color="subdued">
                      创建时间：2024年7月1日
                    </Text>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <Text variant="bodySm" color="subdued">
                      本月使用情况
                    </Text>
                  </div>

                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text']}
                    headings={['服务类型', '使用量', '使用率', '单价']}
                    rows={usageTableRows}
                    footerContent={`当前计划限额内使用`}
                  />
                </Box>
              </Card>
            </Grid.Cell>

            {/* 最近发票 */}
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 4, xl: 4 }}>
              <Card>
                <Box padding="600">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <Text variant="headingMd" as="h3">
                      最近发票
                    </Text>
                    <Button 
                      variant="plain"
                      icon={ExternalIcon}
                      onClick={() => navigate('/billing/invoices')}
                    >
                      查看全部
                    </Button>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <DataTable
                      columnContentTypes={['text', 'text', 'text']}
                      headings={['开票日期', '金额', '状态']}
                      rows={invoiceTableRows}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="bodySm" color="subdued">
                      预计收费时间：2024年8月1日
                    </Text>
                    <Text variant="headingMd" as="h4">
                      $29.99
                    </Text>
                  </div>
                </Box>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* 快速操作 */}
        <Layout.Section>
          <Card>
            <Box padding="600">
              <div style={{ marginBottom: '24px' }}>
                <Text variant="headingMd" as="h3">
                  快速操作
                </Text>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <Button 
                  size="large"
                  onClick={() => navigate('/settings/tax')}
                >
                  税费设置
                </Button>
                <Button 
                  size="large"
                  onClick={() => navigate('/settings/logistics')}
                >
                  物流配置
                </Button>
                <Button 
                  size="large"
                  onClick={() => navigate('/reports')}
                >
                  数据报表
                </Button>
                <Button 
                  size="large"
                  onClick={() => navigate('/help')}
                >
                  帮助文档
                </Button>
              </div>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}