import React from 'react'
import {
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Box,
  Button,
  EmptyState
} from '@shopify/polaris'
import { OrderIcon } from '@shopify/polaris-icons'
import { ProcessedOrder } from '../../types'
import { formatCurrency, formatRelativeTime, getStatusColor } from '../../utils'

interface RecentOrdersProps {
  orders: ProcessedOrder[]
  loading?: boolean
  onViewAll?: () => void
  onViewOrder?: (orderId: string) => void
}

export function RecentOrders({
  orders,
  loading = false,
  onViewAll,
  onViewOrder
}: RecentOrdersProps) {
  if (loading) {
    return (
      <Card>
        <Box padding="400">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </Box>
      </Card>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <Card>
        <Box padding="400">
          <EmptyState
            heading="暂无订单"
            action={{
              content: '查看所有订单',
              onAction: onViewAll
            }}
            image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
          >
            <Text variant="bodyMd" color="subdued">
              当有新订单时，它们将显示在这里
            </Text>
          </EmptyState>
        </Box>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { status: any; children: string }> = {
      pending: { status: 'warning', children: '待处理' },
      calculated: { status: 'info', children: '已计算' },
      shipped: { status: 'success', children: '已发货' },
      delivered: { status: 'success', children: '已送达' },
      failed: { status: 'critical', children: '失败' }
    }
    
    const config = statusMap[status] || { status: 'info', children: status }
    return <Badge status={config.status}>{config.children}</Badge>
  }

  return (
    <Card>
      <Box padding="400">
        <div className="flex items-center justify-between mb-4">
          <Text variant="headingMd" as="h3">
            最近订单
          </Text>
          {onViewAll && (
            <Button variant="plain" onClick={onViewAll}>
              查看全部
            </Button>
          )}
        </div>

        <ResourceList
          resourceName={{ singular: '订单', plural: '订单' }}
          items={orders.slice(0, 5)}
          renderItem={(order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
            
            return (
              <ResourceItem
                id={order.id}
                onClick={onViewOrder ? () => onViewOrder(order.id) : undefined}
                accessibilityLabel={`查看订单 ${order.shopifyOrderId}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <OrderIcon />
                    </div>
                    <div>
                      <Text variant="bodyMd" fontWeight="semibold">
                        #{order.shopifyOrderId}
                      </Text>
                      <div className="flex items-center space-x-2 mt-1">
                        <Text variant="bodySm" color="subdued">
                          {itemCount} 件商品
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          •
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {order.shippingAddress.country}
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          •
                        </Text>
                        <Text variant="bodySm" color="subdued">
                          {formatRelativeTime(order.createdAt)}
                        </Text>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <Text variant="bodyMd" fontWeight="semibold">
                        {formatCurrency(order.taxCalculation.total)}
                      </Text>
                      <Text variant="bodySm" color="subdued">
                        税费
                      </Text>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              </ResourceItem>
            )
          }}
        />
      </Box>
    </Card>
  )
}