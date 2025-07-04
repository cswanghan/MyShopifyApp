import React from 'react'
import { Page, Layout, Card, Text, Button } from '@shopify/polaris'
import { useNavigate } from 'react-router-dom'

export function TaxSettings() {
  const navigate = useNavigate()

  return (
    <Page
      title="税费设置"
      subtitle="配置税率计算和合规申报设置"
      backAction={{
        content: '返回仪表板',
        onAction: () => navigate('/dashboard')
      }}
      primaryAction={{
        content: '保存设置',
        onAction: () => console.log('保存设置')
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '16px' }}>
              <Text variant="headingMd" as="h2">
                税费设置功能演示
              </Text>
              <div style={{ marginTop: '16px' }}>
                <Text as="p">
                  这里将展示完整的税费设置界面，包括：
                </Text>
                <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
                  <li>通用设置和阈值配置</li>
                  <li>税率规则管理</li>
                  <li>VAT注册信息</li>
                  <li>通知设置</li>
                </ul>
              </div>
              <div style={{ marginTop: '16px' }}>
                <Button onClick={() => alert('税费设置功能完整实现中...')}>
                  查看完整功能
                </Button>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}