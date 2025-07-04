import React, { useState, useCallback } from 'react'
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  ButtonGroup,
  Text,
  Box,
  Divider,
  DataTable,
  Modal,
  Toast,
  Frame,
  Banner,
  Link,
  Tabs,
  Grid,
  Badge,
  ResourceList,
  ResourceItem,
  Avatar,
  Thumbnail,
  Stack,
  Icon
} from '@shopify/polaris'
import {
  TruckIcon,
  ImportIcon,
  ExportIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon,
  SettingsIcon,
  CheckmarkIcon,
  CancelIcon,
  InfoIcon
} from '@shopify/polaris-icons'
import { useNavigate } from '@remix-run/react'
import { AppLayout } from '../components/layout/AppLayout'
import { LogisticsProvider, LogisticsSettings, ShippingService } from '../types'

export default function LogisticsSettingsPage() {
  const navigate = useNavigate()
  
  // 状态管理
  const [selectedTab, setSelectedTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<LogisticsProvider | null>(null)
  const [selectedService, setSelectedService] = useState<ShippingService | null>(null)

  // 物流设置
  const [settings, setSettings] = useState<LogisticsSettings>({
    id: '1',
    shopId: 'shop_123',
    defaultProvider: 'DHL_ECOM',
    autoRouting: true,
    preferences: {
      prioritizeCost: false,
      prioritizeSpeed: true,
      prioritizeReliability: true,
      ddpPreferred: true
    },
    notifications: {
      trackingUpdates: true,
      deliveryConfirmation: true,
      exceptions: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  // 物流服务商数据
  const [providers, setProviders] = useState<LogisticsProvider[]>([
    {
      id: '1',
      code: 'DHL_ECOM',
      name: 'DHL eCommerce',
      description: 'DHL跨境电商物流服务',
      logoUrl: 'https://logos-world.net/wp-content/uploads/2020/04/DHL-Logo.png',
      enabled: true,
      apiKey: 'dhl_****1234',
      config: {
        accountNumber: '123456789',
        siteId: 'SITE123',
        password: '****',
        testMode: false
      },
      supportedCountries: ['US', 'DE', 'FR', 'UK', 'CA'],
      features: {
        tracking: true,
        insurance: true,
        signature: true,
        ddp: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      code: 'YUNEXPRESS',
      name: 'YunExpress',
      description: '云途物流跨境小包服务',
      logoUrl: 'https://www.yunexpress.com/static/img/logo.png',
      enabled: true,
      apiKey: 'yun_****5678',
      config: {
        customerCode: 'CUST789',
        apiToken: '****',
        testMode: false
      },
      supportedCountries: ['US', 'DE', 'FR', 'UK', 'AU'],
      features: {
        tracking: true,
        insurance: false,
        signature: false,
        ddp: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      code: 'FEDEX',
      name: 'FedEx',
      description: 'FedEx国际快递服务',
      logoUrl: 'https://logos-world.net/wp-content/uploads/2020/04/FedEx-Logo.png',
      enabled: false,
      apiKey: '',
      config: {
        accountNumber: '',
        meterNumber: '',
        password: '',
        testMode: true
      },
      supportedCountries: ['US', 'DE', 'FR', 'UK', 'CA', 'AU'],
      features: {
        tracking: true,
        insurance: true,
        signature: true,
        ddp: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ])

  // 物流服务数据
  const [services, setServices] = useState<ShippingService[]>([
    {
      id: '1',
      providerId: '1',
      providerCode: 'DHL_ECOM',
      serviceCode: 'PACKET_PLUS',
      name: 'DHL Packet Plus',
      description: '经济实惠的跨境小包服务',
      type: 'standard',
      deliveryTime: '7-15',
      maxWeight: 2000,
      maxDimensions: {
        length: 60,
        width: 60,
        height: 60
      },
      features: {
        tracking: true,
        insurance: true,
        signature: false,
        ddp: true
      },
      pricing: {
        baseRate: 8.99,
        weightRate: 0.05,
        fuelSurcharge: 0.12,
        currency: 'USD'
      },
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      providerId: '2',
      providerCode: 'YUNEXPRESS',
      serviceCode: 'YE1',
      name: 'YunExpress普通小包',
      description: '性价比高的跨境小包',
      type: 'economy',
      deliveryTime: '10-20',
      maxWeight: 2000,
      maxDimensions: {
        length: 60,
        width: 60,
        height: 60
      },
      features: {
        tracking: true,
        insurance: false,
        signature: false,
        ddp: true
      },
      pricing: {
        baseRate: 6.99,
        weightRate: 0.04,
        fuelSurcharge: 0.08,
        currency: 'USD'
      },
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ])

  // 选项数据
  const providerOptions = providers
    .filter(p => p.enabled)
    .map(p => ({ label: p.name, value: p.code }))

  const serviceTypeOptions = [
    { label: '标准', value: 'standard' },
    { label: '经济', value: 'economy' },
    { label: '快递', value: 'express' },
    { label: '特快', value: 'priority' }
  ]

  // 事件处理
  const handleSettingsChange = useCallback((field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const handleNestedSettingsChange = useCallback((parent: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof LogisticsSettings],
        [field]: value
      }
    }))
  }, [])

  const handleSaveSettings = useCallback(async () => {
    setLoading(true)
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      setToastMessage('物流设置已保存')
      setShowToast(true)
    } catch (error) {
      setToastMessage('保存失败，请重试')
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }, [settings])

  const handleToggleProvider = useCallback((providerId: string) => {
    setProviders(prev => prev.map(provider => 
      provider.id === providerId 
        ? { ...provider, enabled: !provider.enabled }
        : provider
    ))
  }, [])

  const handleTestConnection = useCallback(async (providerId: string) => {
    setLoading(true)
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000))
      setToastMessage('连接测试成功')
      setShowToast(true)
    } catch (error) {
      setToastMessage('连接测试失败')
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleConfigureProvider = useCallback((provider: LogisticsProvider) => {
    setSelectedProvider(provider)
    setShowProviderModal(true)
  }, [])

  const handleConfigureService = useCallback((service: ShippingService) => {
    setSelectedService(service)
    setShowServiceModal(true)
  }, [])

  // 表格数据
  const serviceTableRows = services.map(service => {
    const provider = providers.find(p => p.id === service.providerId)
    return [
      <div key={service.id} className="flex items-center space-x-2">
        <Thumbnail
          source={provider?.logoUrl || ''}
          alt={provider?.name || ''}
          size="small"
        />
        <div>
          <Text variant="bodyMd" fontWeight="semibold">
            {service.name}
          </Text>
          <Text variant="bodySm" color="subdued">
            {provider?.name}
          </Text>
        </div>
      </div>,
      <Badge status={service.type === 'express' ? 'success' : service.type === 'standard' ? 'info' : 'warning'}>
        {serviceTypeOptions.find(o => o.value === service.type)?.label}
      </Badge>,
      `${service.deliveryTime} 工作日`,
      `${service.maxWeight}g`,
      `$${service.pricing.baseRate}`,
      service.enabled ? (
        <Badge status="success">启用</Badge>
      ) : (
        <Badge status="critical">禁用</Badge>
      ),
      <ButtonGroup key={service.id}>
        <Button size="slim" icon={SettingsIcon} onClick={() => handleConfigureService(service)}>
          配置
        </Button>
        <Button 
          size="slim" 
          icon={service.enabled ? CancelIcon : CheckmarkIcon}
          onClick={() => {
            setServices(prev => prev.map(s => 
              s.id === service.id 
                ? { ...s, enabled: !s.enabled }
                : s
            ))
          }}
        >
          {service.enabled ? '禁用' : '启用'}
        </Button>
      </ButtonGroup>
    ]
  })

  const tabs = [
    {
      id: 'general',
      content: '通用设置',
      panelID: 'general-panel'
    },
    {
      id: 'providers',
      content: '物流服务商',
      panelID: 'providers-panel'
    },
    {
      id: 'services',
      content: '物流服务',
      panelID: 'services-panel'
    },
    {
      id: 'routing',
      content: '路由规则',
      panelID: 'routing-panel'
    }
  ]

  const toastMarkup = showToast ? (
    <Toast
      content={toastMessage}
      onDismiss={() => setShowToast(false)}
    />
  ) : null

  return (
    <AppLayout>
      <Frame>
        <Page
        title="物流设置"
        subtitle="管理物流服务商和配送选项"
        titleMetadata={<Text variant="bodyMd" color="subdued">DTax-Bridge</Text>}
        backAction={{
          content: '返回仪表板',
          onAction: () => navigate('/dashboard')
        }}
        primaryAction={{
          content: loading ? '保存中...' : '保存设置',
          onAction: handleSaveSettings,
          loading: loading
        }}
      >
        <Layout>
          <Layout.Section>
            <Banner
              title="物流设置指南"
              status="info"
              action={{
                content: '查看文档',
                onAction: () => window.open('https://docs.dtax-bridge.com/logistics', '_blank')
              }}
            >
              <Text as="p">
                配置物流服务商和路由规则，为您的客户提供最优的配送体验。
              </Text>
            </Banner>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Box padding="400">
                  {selectedTab === 0 && (
                    <FormLayout>
                      <Text variant="headingMd">基础设置</Text>
                      <Divider />
                      
                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Select
                            label="默认物流服务商"
                            options={providerOptions}
                            value={settings.defaultProvider}
                            onChange={(value) => handleSettingsChange('defaultProvider', value)}
                            helpText="订单的默认物流服务商"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Checkbox
                            label="启用智能路由"
                            checked={settings.autoRouting}
                            onChange={(checked) => handleSettingsChange('autoRouting', checked)}
                            helpText="根据成本、时效等因素自动选择最佳路由"
                          />
                        </Grid.Cell>
                      </Grid>

                      <Text variant="headingMd">路由偏好</Text>
                      <Divider />
                      
                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Checkbox
                            label="优先考虑成本"
                            checked={settings.preferences.prioritizeCost}
                            onChange={(checked) => handleNestedSettingsChange('preferences', 'prioritizeCost', checked)}
                            helpText="选择成本最低的物流方案"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Checkbox
                            label="优先考虑速度"
                            checked={settings.preferences.prioritizeSpeed}
                            onChange={(checked) => handleNestedSettingsChange('preferences', 'prioritizeSpeed', checked)}
                            helpText="选择时效最快的物流方案"
                          />
                        </Grid.Cell>
                      </Grid>

                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Checkbox
                            label="优先考虑可靠性"
                            checked={settings.preferences.prioritizeReliability}
                            onChange={(checked) => handleNestedSettingsChange('preferences', 'prioritizeReliability', checked)}
                            helpText="选择可靠性最高的物流方案"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Checkbox
                            label="优先DDP服务"
                            checked={settings.preferences.ddpPreferred}
                            onChange={(checked) => handleNestedSettingsChange('preferences', 'ddpPreferred', checked)}
                            helpText="优先选择DDP（包税到门）服务"
                          />
                        </Grid.Cell>
                      </Grid>

                      <Text variant="headingMd">通知设置</Text>
                      <Divider />
                      
                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 4, xl: 4}}>
                          <Checkbox
                            label="跟踪更新通知"
                            checked={settings.notifications.trackingUpdates}
                            onChange={(checked) => handleNestedSettingsChange('notifications', 'trackingUpdates', checked)}
                            helpText="包裹状态更新时发送通知"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 4, xl: 4}}>
                          <Checkbox
                            label="送达确认通知"
                            checked={settings.notifications.deliveryConfirmation}
                            onChange={(checked) => handleNestedSettingsChange('notifications', 'deliveryConfirmation', checked)}
                            helpText="包裹送达后发送确认通知"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 4, xl: 4}}>
                          <Checkbox
                            label="异常情况通知"
                            checked={settings.notifications.exceptions}
                            onChange={(checked) => handleNestedSettingsChange('notifications', 'exceptions', checked)}
                            helpText="包裹异常时发送通知"
                          />
                        </Grid.Cell>
                      </Grid>
                    </FormLayout>
                  )}

                  {selectedTab === 1 && (
                    <div>
                      <div className="mb-4">
                        <Text variant="headingMd">物流服务商管理</Text>
                        <Text variant="bodySm" color="subdued">
                          配置和管理您的物流服务商账户
                        </Text>
                      </div>

                      <ResourceList
                        resourceName={{singular: '服务商', plural: '服务商'}}
                        items={providers}
                        renderItem={(provider) => (
                          <ResourceItem
                            id={provider.id}
                            accessibilityLabel={`查看 ${provider.name} 设置`}
                            media={
                              <Thumbnail
                                source={provider.logoUrl}
                                alt={provider.name}
                                size="medium"
                              />
                            }
                            shortcutActions={[
                              {
                                content: '测试连接',
                                onAction: () => handleTestConnection(provider.id)
                              },
                              {
                                content: '配置',
                                onAction: () => handleConfigureProvider(provider)
                              }
                            ]}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <Text variant="bodyMd" fontWeight="semibold">
                                  {provider.name}
                                </Text>
                                <Text variant="bodySm" color="subdued">
                                  {provider.description}
                                </Text>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Badge status={provider.enabled ? 'success' : 'critical'}>
                                    {provider.enabled ? '已启用' : '已禁用'}
                                  </Badge>
                                  <Text variant="bodySm" color="subdued">
                                    支持 {provider.supportedCountries.length} 个国家
                                  </Text>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="slim"
                                  onClick={() => handleToggleProvider(provider.id)}
                                  primary={!provider.enabled}
                                  destructive={provider.enabled}
                                >
                                  {provider.enabled ? '禁用' : '启用'}
                                </Button>
                              </div>
                            </div>
                          </ResourceItem>
                        )}
                      />
                    </div>
                  )}

                  {selectedTab === 2 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Text variant="headingMd">物流服务管理</Text>
                          <Text variant="bodySm" color="subdued">
                            管理具体的物流服务和定价
                          </Text>
                        </div>
                        <Button icon={PlusIcon} primary onClick={() => {
                          setToastMessage('添加服务功能开发中')
                          setShowToast(true)
                        }}>
                          添加服务
                        </Button>
                      </div>

                      <DataTable
                        columnContentTypes={[
                          'text',
                          'text',
                          'text',
                          'text',
                          'text',
                          'text',
                          'text'
                        ]}
                        headings={[
                          '服务名称',
                          '类型',
                          '时效',
                          '重量限制',
                          '起步价',
                          '状态',
                          '操作'
                        ]}
                        rows={serviceTableRows}
                        footerContent={`共 ${services.length} 项服务`}
                      />
                    </div>
                  )}

                  {selectedTab === 3 && (
                    <div>
                      <Text variant="headingMd">智能路由规则</Text>
                      <Text variant="bodySm" color="subdued">
                        配置自动选择物流服务的规则
                      </Text>
                      <div className="mt-4 p-8 bg-gray-50 rounded-lg text-center">
                        <Icon source={InfoIcon} />
                        <Text variant="headingSm" as="h3" className="mt-2">
                          路由规则功能
                        </Text>
                        <Text variant="bodySm" color="subdued" className="mt-2">
                          此功能正在开发中，敬请期待
                        </Text>
                      </div>
                    </div>
                  )}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>

      {/* 配置服务商Modal */}
      {selectedProvider && (
        <Modal
          open={showProviderModal}
          onClose={() => setShowProviderModal(false)}
          title={`配置 ${selectedProvider.name}`}
          primaryAction={{
            content: '保存',
            onAction: () => {
              setShowProviderModal(false)
              setToastMessage('服务商配置已保存')
              setShowToast(true)
            }
          }}
          secondaryActions={[
            {
              content: '取消',
              onAction: () => setShowProviderModal(false)
            }
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="API密钥"
                value={selectedProvider.apiKey}
                onChange={() => {}}
                type="password"
                helpText="从服务商获取的API密钥"
              />
              {selectedProvider.code === 'DHL_ECOM' && (
                <>
                  <TextField
                    label="账户号码"
                    value={selectedProvider.config.accountNumber}
                    onChange={() => {}}
                    helpText="DHL账户号码"
                  />
                  <TextField
                    label="站点ID"
                    value={selectedProvider.config.siteId}
                    onChange={() => {}}
                    helpText="DHL站点ID"
                  />
                </>
              )}
              <Checkbox
                label="测试模式"
                checked={selectedProvider.config.testMode}
                onChange={() => {}}
                helpText="启用测试模式进行开发调试"
              />
            </FormLayout>
          </Modal.Section>
        </Modal>
      )}

      {/* 配置服务Modal */}
      {selectedService && (
        <Modal
          open={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          title={`配置 ${selectedService.name}`}
          primaryAction={{
            content: '保存',
            onAction: () => {
              setShowServiceModal(false)
              setToastMessage('服务配置已保存')
              setShowToast(true)
            }
          }}
          secondaryActions={[
            {
              content: '取消',
              onAction: () => setShowServiceModal(false)
            }
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <Grid>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                  <TextField
                    label="起步价 ($)"
                    type="number"
                    value={selectedService.pricing.baseRate.toString()}
                    onChange={() => {}}
                    helpText="基础运费"
                  />
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                  <TextField
                    label="续重单价 ($/g)"
                    type="number"
                    value={selectedService.pricing.weightRate.toString()}
                    onChange={() => {}}
                    helpText="每克重量的费用"
                  />
                </Grid.Cell>
              </Grid>
              <TextField
                label="燃油附加费率"
                type="number"
                value={selectedService.pricing.fuelSurcharge.toString()}
                onChange={() => {}}
                suffix="%"
                helpText="燃油附加费率"
              />
              <TextField
                label="最大重量 (g)"
                type="number"
                value={selectedService.maxWeight.toString()}
                onChange={() => {}}
                helpText="此服务支持的最大重量"
              />
              <TextField
                label="预计时效"
                value={selectedService.deliveryTime}
                onChange={() => {}}
                helpText="配送时间范围（工作日）"
              />
            </FormLayout>
          </Modal.Section>
        </Modal>
      )}

        {toastMarkup}
      </Frame>
    </AppLayout>
  )
}