import { Page, Layout, Card, Text, Button } from '@shopify/polaris'
import { useNavigate } from '@remix-run/react'

export default function Index() {
  const navigate = useNavigate()

  return (
    <Page title="DTax-Bridge - 跨境税费&物流一体化">
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '16px' }}>
              <Text variant="headingMd" as="h2">
                欢迎使用 DTax-Bridge
              </Text>
              <div style={{ marginTop: '16px' }}>
                <Text as="p">
                  DTax-Bridge 是为中国跨境商家量身打造的税费计算和物流管理一体化解决方案。
                </Text>
              </div>
              <div style={{ marginTop: '16px' }}>
                <Button primary onClick={() => navigate('/dashboard')}>
                  开始使用
                </Button>
              </div>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}