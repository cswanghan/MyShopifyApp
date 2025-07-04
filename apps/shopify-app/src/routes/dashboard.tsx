import { Page, Layout, Card, Text, Grid, Button } from '@shopify/polaris'
import { useLoaderData } from '@remix-run/react'

export default function Dashboard() {
  return (
    <Page title="控制面板">
      <Layout>
        <Layout.Section>
          <Grid columns={{ xs: 1, sm: 2, md: 3 }}>
            <Grid.Cell>
              <Card>
                <div style={{ padding: '16px' }}>
                  <Text variant="headingMd" as="h3">
                    税费计算
                  </Text>
                  <Text as="p">
                    精确计算关税、增值税等费用
                  </Text>
                  <div style={{ marginTop: '16px' }}>
                    <Button>配置税费</Button>
                  </div>
                </div>
              </Card>
            </Grid.Cell>
            <Grid.Cell>
              <Card>
                <div style={{ padding: '16px' }}>
                  <Text variant="headingMd" as="h3">
                    物流管理
                  </Text>
                  <Text as="p">
                    对比多个物流方案，选择最优配送
                  </Text>
                  <div style={{ marginTop: '16px' }}>
                    <Button>管理物流</Button>
                  </div>
                </div>
              </Card>
            </Grid.Cell>
            <Grid.Cell>
              <Card>
                <div style={{ padding: '16px' }}>
                  <Text variant="headingMd" as="h3">
                    合规申报
                  </Text>
                  <Text as="p">
                    自动化IOSS、UK VAT等合规申报
                  </Text>
                  <div style={{ marginTop: '16px' }}>
                    <Button>查看报表</Button>
                  </div>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>
      </Layout>
    </Page>
  )
}