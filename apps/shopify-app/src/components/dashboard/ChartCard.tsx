import React from 'react'
import { Card, Text, Box, Button, ButtonGroup } from '@shopify/polaris'
import { ChartData } from '../../types'

interface ChartCardProps {
  title: string
  subtitle?: string
  data?: ChartData
  height?: number
  actions?: Array<{
    content: string
    onAction: () => void
    primary?: boolean
  }>
  timeRange?: {
    selected: string
    options: Array<{ value: string; label: string }>
    onChange: (value: string) => void
  }
  loading?: boolean
  children?: React.ReactNode
}

export function ChartCard({
  title,
  subtitle,
  data,
  height = 300,
  actions,
  timeRange,
  loading = false,
  children
}: ChartCardProps) {
  if (loading) {
    return (
      <Card>
        <Box padding="400">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            {subtitle && <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>}
            <div className={`h-${height / 4} bg-gray-200 rounded`}></div>
          </div>
        </Box>
      </Card>
    )
  }

  return (
    <Card>
      <Box padding="400">
        {/* 标题和操作区域 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <Text variant="headingMd" as="h3">
              {title}
            </Text>
            {subtitle && (
              <Text variant="bodySm" color="subdued">
                {subtitle}
              </Text>
            )}
          </div>
          <div className="flex items-center gap-2">
            {timeRange && (
              <ButtonGroup segmented>
                {timeRange.options.map((option) => (
                  <Button
                    key={option.value}
                    pressed={timeRange.selected === option.value}
                    onClick={() => timeRange.onChange(option.value)}
                    size="slim"
                  >
                    {option.label}
                  </Button>
                ))}
              </ButtonGroup>
            )}
            {actions && (
              <ButtonGroup>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.onAction}
                    primary={action.primary}
                    size="slim"
                  >
                    {action.content}
                  </Button>
                ))}
              </ButtonGroup>
            )}
          </div>
        </div>

        {/* 图表内容区域 */}
        <div style={{ height: `${height}px` }} className="relative">
          {children || (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
              <Text variant="bodySm" color="subdued">
                图表组件将在此处显示
              </Text>
            </div>
          )}
        </div>

        {/* 数据说明 */}
        {data && data.datasets && (
          <div className="mt-4 flex flex-wrap gap-4">
            {data.datasets.map((dataset, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-3 h-3 rounded mr-2"
                  style={{ backgroundColor: dataset.borderColor || dataset.backgroundColor }}
                ></div>
                <Text variant="bodySm" color="subdued">
                  {dataset.label}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Box>
    </Card>
  )
}