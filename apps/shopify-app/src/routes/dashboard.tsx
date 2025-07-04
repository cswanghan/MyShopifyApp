import React, { useState } from 'react'
import { Page, Layout, Grid, Text, Box } from '@shopify/polaris'
import { 
  OrdersIcon, 
  ProductIcon, 
  AnalyticsIcon, 
  ShipmentIcon 
} from '@shopify/polaris-icons'
import { StatCard } from '../components/dashboard/StatCard'
import { ChartCard } from '../components/dashboard/ChartCard'
import { RecentOrders } from '../components/dashboard/RecentOrders'
import { QuickActions } from '../components/dashboard/QuickActions'
import { AppLayout } from '../components/layout/AppLayout'
import { useDashboardStats } from '../hooks/useApi'
import { useNavigate } from '@remix-run/react'
import { formatCurrency, calculateGrowthRate } from '../utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: stats, loading, error } = useDashboardStats()
  const [chartTimeRange, setChartTimeRange] = useState('30d')

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'tax-settings':
        navigate('/settings/tax')
        break
      case 'logistics-settings':
        navigate('/settings/logistics')
        break
      case 'view-reports':
        navigate('/reports')
        break
      case 'help-center':
        navigate('/help')
        break
      default:
        console.log('未知操作:', action)
    }
  }

  const handleViewAllOrders = () => {
    navigate('/orders')
  }

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`)
  }

  // 模拟数据（实际应用中从API获取）
  const mockStats = {
    orders: {
      total: 1248,
      thisMonth: 156,
      lastMonth: 142,
      growth: calculateGrowthRate(156, 142)
    },
    revenue: {
      total: 89650,
      thisMonth: 12400,
      lastMonth: 10800,
      growth: calculateGrowthRate(12400, 10800)
    },
    taxCalculations: {
      total: 2156,
      thisMonth: 298,
      successful: 2089,
      successRate: 0.969
    },
    logistics: {
      shipments: 1189,
      thisMonth: 148,
      averageDeliveryDays: 7.2,
      ddpPercentage: 0.65
    }
  }

  const mockRecentOrders = [
    {
      id: '1',
      shopifyOrderId: '1001',
      customerEmail: 'customer@example.com',
      items: [
        {
          id: '1',
          productId: 'p1',
          title: 'iPhone 15',
          price: 999,
          currency: 'USD',
          quantity: 1,
          weight: 200,
          category: 'electronics'
        }
      ],
      shippingAddress: {
        country: 'DE',
        state: 'Bayern',
        city: 'Munich',
        zip: '80331'
      },
      taxCalculation: {
        total: 199.8,
        breakdown: {
          duties: 59.94,
          vat: 139.86
        },
        confidence: 0.95
      },
      status: 'calculated' as const,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      shopifyOrderId: '1002',
      customerEmail: 'customer2@example.com',
      items: [
        {
          id: '2',
          productId: 'p2',
          title: '运动鞋',
          price: 120,
          currency: 'USD',
          quantity: 2,
          weight: 800,
          category: 'sports'
        }
      ],
      shippingAddress: {
        country: 'US',
        state: 'CA',
        city: 'Los Angeles',
        zip: '90210'
      },
      taxCalculation: {
        total: 0,
        breakdown: {
          duties: 0,
          vat: 0
        },
        confidence: 1.0
      },
      logistics: {
        provider: 'DHL_ECOM',
        service: 'DHL eCommerce',
        trackingNumber: 'GM123456789012345',
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        cost: 15.99
      },
      status: 'shipped' as const,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
      updatedAt: new Date().toISOString()
    }
  ]

  const chartTimeRangeOptions = [
    { value: '7d', label: '7天' },
    { value: '30d', label: '30天' },
    { value: '90d', label: '90天' }
  ]

  return (
    <AppLayout>
      <Page
        title="仪表板"
        subtitle="DTax-Bridge 跨境税费&物流一体化"
        primaryAction={{
          content: '新建测试订单',
          onAction: () => navigate('/orders/new')
        }}
      >
      <Layout>
        {/* 统计卡片区域 */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <StatCard
                title="本月订单"
                value={mockStats.orders.thisMonth}
                change={{
                  value: mockStats.orders.growth,
                  isPositive: mockStats.orders.growth > 0,
                  period: '较上月'
                }}
                icon={OrdersIcon}
                loading={loading}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <StatCard
                title="税费总计"
                value={mockStats.revenue.thisMonth}
                format="currency"
                currency="USD"
                change={{
                  value: mockStats.revenue.growth,
                  isPositive: mockStats.revenue.growth > 0,
                  period: '较上月'
                }}
                icon={AnalyticsIcon}
                loading={loading}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <StatCard
                title="计算成功率"
                value={mockStats.taxCalculations.successRate}
                format="percentage"
                subtitle={`${mockStats.taxCalculations.successful}/${mockStats.taxCalculations.total}`}
                icon={ProductIcon}
                loading={loading}
              />
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <StatCard
                title="平均时效"
                value={`${mockStats.logistics.averageDeliveryDays}天`}
                subtitle={`DDP占比 ${(mockStats.logistics.ddpPercentage * 100).toFixed(0)}%`}
                icon={ShipmentIcon}
                loading={loading}
              />
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* 图表区域 */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 8, xl: 8 }}>
              <ChartCard
                title="订单趋势"
                subtitle="过去30天的订单和税费数据"
                height={300}
                timeRange={{
                  selected: chartTimeRange,
                  options: chartTimeRangeOptions,
                  onChange: setChartTimeRange
                }}
                loading={loading}
              >
                <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Text variant="headingSm" color="subdued">
                      订单趋势图表
                    </Text>
                    <Text variant="bodySm" color="subdued">
                      Chart.js 或 Recharts 图表将在此处显示
                    </Text>
                  </div>
                </div>
              </ChartCard>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4, xl: 4 }}>
              <QuickActions onAction={handleQuickAction} />
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* 最近订单 */}
        <Layout.Section>
          <RecentOrders
            orders={mockRecentOrders}
            loading={loading}
            onViewAll={handleViewAllOrders}
            onViewOrder={handleViewOrder}
          />
        </Layout.Section>

        {/* 额外信息区域 */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 6, xl: 6 }}>
              <ChartCard
                title="税费分布"
                subtitle="按国家统计的税费收入"
                height={250}
                loading={loading}
              >
                <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                  <Text variant="bodySm" color="subdued">
                    饼状图：各国税费占比
                  </Text>
                </div>
              </ChartCard>
            </Grid.Cell>
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 3, lg: 6, xl: 6 }}>
              <ChartCard
                title="物流服务商"
                subtitle="各服务商使用情况"
                height={250}
                loading={loading}
              >
                <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                  <Text variant="bodySm" color="subdued">
                    柱状图：服务商使用量对比
                  </Text>
                </div>
              </ChartCard>
            </Grid.Cell>
          </Grid>
        </Layout.Section>
      </Layout>
      </Page>
    </AppLayout>
  )
}