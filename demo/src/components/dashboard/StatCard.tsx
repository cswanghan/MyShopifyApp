import React from 'react'
import { Card, Text, Box, Icon } from '@shopify/polaris'
import { ArrowUpIcon, ArrowDownIcon } from '@shopify/polaris-icons'
import { formatCurrency, formatNumber, formatPercentage } from '../../utils'

interface StatCardProps {
  title: string
  value: number | string
  change?: {
    value: number
    isPositive: boolean
    period: string
  }
  format?: 'currency' | 'number' | 'percentage'
  currency?: string
  icon?: React.ComponentType<any>
  subtitle?: string
  loading?: boolean
}

export function StatCard({
  title,
  value,
  change,
  format = 'number',
  currency = 'USD',
  icon: IconComponent,
  subtitle,
  loading = false
}: StatCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return formatCurrency(val, currency)
      case 'percentage':
        return formatPercentage(val / 100)
      default:
        return formatNumber(val)
    }
  }

  if (loading) {
    return (
      <Card>
        <Box padding="400">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </Box>
      </Card>
    )
  }

  return (
    <Card>
      <Box padding="400">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Text variant="bodyMd" color="subdued">
              {title}
            </Text>
            <div className="mt-1 flex items-baseline">
              <Text variant="heading2xl" as="h3">
                {formatValue(value)}
              </Text>
              {subtitle && (
                <Text variant="bodySm" color="subdued" as="span" className="ml-2">
                  {subtitle}
                </Text>
              )}
            </div>
            {change && (
              <div className="mt-2 flex items-center">
                <Icon
                  source={change.isPositive ? ArrowUpIcon : ArrowDownIcon}
                  color={change.isPositive ? 'success' : 'critical'}
                />
                <Text
                  variant="bodySm"
                  color={change.isPositive ? 'success' : 'critical'}
                  as="span"
                  className="ml-1"
                >
                  {formatPercentage(Math.abs(change.value) / 100)} {change.period}
                </Text>
              </div>
            )}
          </div>
          {IconComponent && (
            <div className="flex-shrink-0 ml-4">
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                <Icon source={IconComponent} color="base" />
              </div>
            </div>
          )}
        </div>
      </Box>
    </Card>
  )
}