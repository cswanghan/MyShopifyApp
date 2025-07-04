import React from 'react'
import { Card, Box, Button, Text, Grid } from '@shopify/polaris'
import {
  SettingsIcon,
  DeliveryIcon,
  ChartVerticalIcon,
  QuestionCircleIcon
} from '@shopify/polaris-icons'

interface QuickActionsProps {
  onAction: (action: string) => void
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'tax-settings',
      title: '税费设置',
      description: '配置税率和计算规则',
      icon: SettingsIcon,
      primary: true
    },
    {
      id: 'logistics-settings',
      title: '物流配置',
      description: '管理物流服务商',
      icon: DeliveryIcon,
      primary: false
    },
    {
      id: 'view-reports',
      title: '查看报表',
      description: '分析业务数据',
      icon: ChartVerticalIcon,
      primary: false
    },
    {
      id: 'help-center',
      title: '帮助中心',
      description: '获取使用帮助',
      icon: QuestionCircleIcon,
      primary: false
    }
  ]

  return (
    <Card>
      <Box padding="400">
        <Text variant="headingMd" as="h3" marginBottom="400">
          快速操作
        </Text>
        
        <Grid>
          {actions.map((action) => (
            <Grid.Cell
              key={action.id}
              columnSpan={{
                xs: 6,
                sm: 3,
                md: 3,
                lg: 3,
                xl: 3
              }}
            >
              <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <action.icon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Text variant="bodyMd" fontWeight="semibold">
                      {action.title}
                    </Text>
                    <Text variant="bodySm" color="subdued" className="mt-1">
                      {action.description}
                    </Text>
                    <div className="mt-3">
                      <Button
                        size="slim"
                        primary={action.primary}
                        onClick={() => onAction(action.id)}
                        fullWidth
                      >
                        {action.primary ? '立即设置' : '查看'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Grid.Cell>
          ))}
        </Grid>
      </Box>
    </Card>
  )
}