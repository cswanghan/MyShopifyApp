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
  Grid
} from '@shopify/polaris'
import {
  SettingsIcon,
  ImportIcon,
  ExportIcon,
  PlusIcon,
  EditIcon,
  DeleteIcon
} from '@shopify/polaris-icons'
import { useNavigate } from '@remix-run/react'
import { AppLayout } from '../components/layout/AppLayout'
import { TaxSettings, TaxRule, Country } from '../types'

export default function TaxSettingsPage() {
  const navigate = useNavigate()
  
  // 状态管理
  const [selectedTab, setSelectedTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const [showAddRuleModal, setShowAddRuleModal] = useState(false)

  // 表单数据
  const [settings, setSettings] = useState<TaxSettings>({
    id: '1',
    shopId: 'shop_123',
    autoCalculation: true,
    defaultCurrency: 'USD',
    vatRegistration: {
      iossNumber: '',
      ukVatNumber: '',
      enabled: true
    },
    thresholds: {
      euLowValueThreshold: 22,
      usSection321Threshold: 800,
      dutyFreeThreshold: 15
    },
    hscodeMapping: {
      enabled: true,
      autoDetection: true,
      defaultHsCode: '999999'
    },
    notifications: {
      email: true,
      webhook: false,
      webhookUrl: ''
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const [newRule, setNewRule] = useState<Partial<TaxRule>>({
    country: '',
    productCategory: '',
    taxRate: 0,
    dutyRate: 0,
    enabled: true
  })

  // 模拟税率规则数据
  const [taxRules, setTaxRules] = useState<TaxRule[]>([
    {
      id: '1',
      country: 'DE',
      productCategory: 'electronics',
      taxRate: 19,
      dutyRate: 6,
      minValue: 0,
      maxValue: 1000,
      enabled: true,
      description: '德国电子产品标准税率',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      country: 'FR',
      productCategory: 'clothing',
      taxRate: 20,
      dutyRate: 12,
      minValue: 0,
      maxValue: 500,
      enabled: true,
      description: '法国服装标准税率',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ])

  // 选项数据
  const currencyOptions = [
    { label: 'USD - 美元', value: 'USD' },
    { label: 'EUR - 欧元', value: 'EUR' },
    { label: 'GBP - 英镑', value: 'GBP' },
    { label: 'CNY - 人民币', value: 'CNY' }
  ]

  const countryOptions = [
    { label: '德国 (DE)', value: 'DE' },
    { label: '法国 (FR)', value: 'FR' },
    { label: '英国 (UK)', value: 'UK' },
    { label: '美国 (US)', value: 'US' },
    { label: '加拿大 (CA)', value: 'CA' }
  ]

  const categoryOptions = [
    { label: '电子产品', value: 'electronics' },
    { label: '服装', value: 'clothing' },
    { label: '食品', value: 'food' },
    { label: '书籍', value: 'books' },
    { label: '体育用品', value: 'sports' }
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
        ...prev[parent as keyof TaxSettings],
        [field]: value
      }
    }))
  }, [])

  const handleSaveSettings = useCallback(async () => {
    setLoading(true)
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      setToastMessage('税费设置已保存')
      setShowToast(true)
    } catch (error) {
      setToastMessage('保存失败，请重试')
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }, [settings])

  const handleAddRule = useCallback(async () => {
    if (!newRule.country || !newRule.productCategory || !newRule.taxRate) {
      setToastMessage('请填写完整信息')
      setShowToast(true)
      return
    }

    setLoading(true)
    try {
      const rule: TaxRule = {
        id: Date.now().toString(),
        country: newRule.country!,
        productCategory: newRule.productCategory!,
        taxRate: newRule.taxRate!,
        dutyRate: newRule.dutyRate || 0,
        minValue: newRule.minValue || 0,
        maxValue: newRule.maxValue || 10000,
        enabled: newRule.enabled || true,
        description: newRule.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      setTaxRules(prev => [...prev, rule])
      setNewRule({
        country: '',
        productCategory: '',
        taxRate: 0,
        dutyRate: 0,
        enabled: true
      })
      setShowAddRuleModal(false)
      setToastMessage('税率规则已添加')
      setShowToast(true)
    } catch (error) {
      setToastMessage('添加失败，请重试')
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }, [newRule])

  const handleDeleteRule = useCallback(async () => {
    if (!selectedRuleId) return
    
    setLoading(true)
    try {
      setTaxRules(prev => prev.filter(rule => rule.id !== selectedRuleId))
      setShowDeleteModal(false)
      setSelectedRuleId(null)
      setToastMessage('税率规则已删除')
      setShowToast(true)
    } catch (error) {
      setToastMessage('删除失败，请重试')
      setShowToast(true)
    } finally {
      setLoading(false)
    }
  }, [selectedRuleId])

  const handleImportRules = useCallback(() => {
    // 模拟导入功能
    setToastMessage('导入功能开发中')
    setShowToast(true)
  }, [])

  const handleExportRules = useCallback(() => {
    // 模拟导出功能
    const dataStr = JSON.stringify(taxRules, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = 'tax-rules.json'
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [taxRules])

  // 表格数据
  const tableRows = taxRules.map(rule => [
    rule.country,
    rule.productCategory,
    `${rule.taxRate}%`,
    `${rule.dutyRate}%`,
    `$${rule.minValue} - $${rule.maxValue}`,
    rule.enabled ? '启用' : '禁用',
    <ButtonGroup key={rule.id}>
      <Button size="slim" icon={EditIcon} onClick={() => {
        // 编辑功能
        setToastMessage('编辑功能开发中')
        setShowToast(true)
      }}>
        编辑
      </Button>
      <Button size="slim" icon={DeleteIcon} destructive onClick={() => {
        setSelectedRuleId(rule.id)
        setShowDeleteModal(true)
      }}>
        删除
      </Button>
    </ButtonGroup>
  ])

  const tabs = [
    {
      id: 'general',
      content: '通用设置',
      panelID: 'general-panel'
    },
    {
      id: 'tax-rules',
      content: '税率规则',
      panelID: 'tax-rules-panel'
    },
    {
      id: 'vat-registration',
      content: 'VAT注册',
      panelID: 'vat-registration-panel'
    },
    {
      id: 'notifications',
      content: '通知设置',
      panelID: 'notifications-panel'
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
        title="税费设置"
        subtitle="配置税率计算和合规申报设置"
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
              title="税费设置指南"
              status="info"
              action={{
                content: '查看文档',
                onAction: () => window.open('https://docs.dtax-bridge.com/tax-settings', '_blank')
              }}
            >
              <Text as="p">
                正确配置税费设置对于准确计算跨境税费至关重要。请根据您的业务需求调整以下设置。
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
                          <Checkbox
                            label="启用自动税费计算"
                            checked={settings.autoCalculation}
                            onChange={(checked) => handleSettingsChange('autoCalculation', checked)}
                            helpText="自动为所有订单计算税费"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Select
                            label="默认货币"
                            options={currencyOptions}
                            value={settings.defaultCurrency}
                            onChange={(value) => handleSettingsChange('defaultCurrency', value)}
                            helpText="用于显示税费金额的默认货币"
                          />
                        </Grid.Cell>
                      </Grid>

                      <Text variant="headingMd">阈值设置</Text>
                      <Divider />
                      
                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 4, xl: 4}}>
                          <TextField
                            label="欧盟低价值阈值"
                            type="number"
                            value={settings.thresholds.euLowValueThreshold.toString()}
                            onChange={(value) => handleNestedSettingsChange('thresholds', 'euLowValueThreshold', parseFloat(value) || 0)}
                            suffix="EUR"
                            helpText="欧盟低价值商品免税阈值"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 4, xl: 4}}>
                          <TextField
                            label="美国Section 321阈值"
                            type="number"
                            value={settings.thresholds.usSection321Threshold.toString()}
                            onChange={(value) => handleNestedSettingsChange('thresholds', 'usSection321Threshold', parseFloat(value) || 0)}
                            suffix="USD"
                            helpText="美国Section 321免税阈值"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 4, xl: 4}}>
                          <TextField
                            label="关税免征阈值"
                            type="number"
                            value={settings.thresholds.dutyFreeThreshold.toString()}
                            onChange={(value) => handleNestedSettingsChange('thresholds', 'dutyFreeThreshold', parseFloat(value) || 0)}
                            suffix="USD"
                            helpText="通用关税免征阈值"
                          />
                        </Grid.Cell>
                      </Grid>

                      <Text variant="headingMd">HSCode设置</Text>
                      <Divider />
                      
                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Checkbox
                            label="启用HSCode映射"
                            checked={settings.hscodeMapping.enabled}
                            onChange={(checked) => handleNestedSettingsChange('hscodeMapping', 'enabled', checked)}
                            helpText="根据商品标题自动匹配HSCode"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Checkbox
                            label="自动检测HSCode"
                            checked={settings.hscodeMapping.autoDetection}
                            onChange={(checked) => handleNestedSettingsChange('hscodeMapping', 'autoDetection', checked)}
                            helpText="AI自动检测商品HSCode"
                          />
                        </Grid.Cell>
                      </Grid>

                      <TextField
                        label="默认HSCode"
                        value={settings.hscodeMapping.defaultHsCode}
                        onChange={(value) => handleNestedSettingsChange('hscodeMapping', 'defaultHsCode', value)}
                        helpText="当无法自动检测时使用的默认HSCode"
                      />
                    </FormLayout>
                  )}

                  {selectedTab === 1 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Text variant="headingMd">税率规则管理</Text>
                          <Text variant="bodySm" color="subdued">
                            配置不同国家和商品类别的税率规则
                          </Text>
                        </div>
                        <ButtonGroup>
                          <Button icon={ImportIcon} onClick={handleImportRules}>
                            导入
                          </Button>
                          <Button icon={ExportIcon} onClick={handleExportRules}>
                            导出
                          </Button>
                          <Button icon={PlusIcon} primary onClick={() => setShowAddRuleModal(true)}>
                            添加规则
                          </Button>
                        </ButtonGroup>
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
                          '国家',
                          '商品类别',
                          '税率',
                          '关税率',
                          '价值范围',
                          '状态',
                          '操作'
                        ]}
                        rows={tableRows}
                        footerContent={`共 ${taxRules.length} 条规则`}
                      />
                    </div>
                  )}

                  {selectedTab === 2 && (
                    <FormLayout>
                      <Text variant="headingMd">VAT注册信息</Text>
                      <Divider />
                      
                      <Checkbox
                        label="启用VAT注册"
                        checked={settings.vatRegistration.enabled}
                        onChange={(checked) => handleNestedSettingsChange('vatRegistration', 'enabled', checked)}
                        helpText="启用自动VAT申报功能"
                      />

                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <TextField
                            label="IOSS注册号"
                            value={settings.vatRegistration.iossNumber}
                            onChange={(value) => handleNestedSettingsChange('vatRegistration', 'iossNumber', value)}
                            placeholder="IM123456789"
                            helpText="欧盟进口一站式商店注册号"
                          />
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <TextField
                            label="英国VAT号"
                            value={settings.vatRegistration.ukVatNumber}
                            onChange={(value) => handleNestedSettingsChange('vatRegistration', 'ukVatNumber', value)}
                            placeholder="GB123456789"
                            helpText="英国VAT注册号码"
                          />
                        </Grid.Cell>
                      </Grid>

                      <Banner
                        title="VAT注册帮助"
                        status="info"
                        action={{
                          content: '申请VAT注册',
                          onAction: () => window.open('https://docs.dtax-bridge.com/vat-registration', '_blank')
                        }}
                      >
                        <Text as="p">
                          如果您还没有VAT注册号，我们可以帮助您完成注册流程。
                          <Link url="https://docs.dtax-bridge.com/vat-registration" external>
                            了解更多
                          </Link>
                        </Text>
                      </Banner>
                    </FormLayout>
                  )}

                  {selectedTab === 3 && (
                    <FormLayout>
                      <Text variant="headingMd">通知设置</Text>
                      <Divider />
                      
                      <Checkbox
                        label="启用邮件通知"
                        checked={settings.notifications.email}
                        onChange={(checked) => handleNestedSettingsChange('notifications', 'email', checked)}
                        helpText="接收税费计算结果和异常通知"
                      />

                      <Checkbox
                        label="启用Webhook通知"
                        checked={settings.notifications.webhook}
                        onChange={(checked) => handleNestedSettingsChange('notifications', 'webhook', checked)}
                        helpText="通过Webhook接收实时通知"
                      />

                      {settings.notifications.webhook && (
                        <TextField
                          label="Webhook URL"
                          value={settings.notifications.webhookUrl}
                          onChange={(value) => handleNestedSettingsChange('notifications', 'webhookUrl', value)}
                          placeholder="https://your-domain.com/webhook"
                          helpText="接收通知的Webhook端点URL"
                        />
                      )}
                    </FormLayout>
                  )}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>

      {/* 添加规则Modal */}
      <Modal
        open={showAddRuleModal}
        onClose={() => setShowAddRuleModal(false)}
        title="添加税率规则"
        primaryAction={{
          content: '添加',
          onAction: handleAddRule,
          loading: loading
        }}
        secondaryActions={[
          {
            content: '取消',
            onAction: () => setShowAddRuleModal(false)
          }
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <Grid>
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <Select
                  label="国家"
                  options={countryOptions}
                  value={newRule.country || ''}
                  onChange={(value) => setNewRule(prev => ({ ...prev, country: value }))}
                  placeholder="选择国家"
                />
              </Grid.Cell>
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <Select
                  label="商品类别"
                  options={categoryOptions}
                  value={newRule.productCategory || ''}
                  onChange={(value) => setNewRule(prev => ({ ...prev, productCategory: value }))}
                  placeholder="选择商品类别"
                />
              </Grid.Cell>
            </Grid>

            <Grid>
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <TextField
                  label="税率 (%)"
                  type="number"
                  value={newRule.taxRate?.toString() || ''}
                  onChange={(value) => setNewRule(prev => ({ ...prev, taxRate: parseFloat(value) || 0 }))}
                />
              </Grid.Cell>
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <TextField
                  label="关税率 (%)"
                  type="number"
                  value={newRule.dutyRate?.toString() || ''}
                  onChange={(value) => setNewRule(prev => ({ ...prev, dutyRate: parseFloat(value) || 0 }))}
                />
              </Grid.Cell>
            </Grid>

            <Grid>
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <TextField
                  label="最小值 ($)"
                  type="number"
                  value={newRule.minValue?.toString() || ''}
                  onChange={(value) => setNewRule(prev => ({ ...prev, minValue: parseFloat(value) || 0 }))}
                />
              </Grid.Cell>
              <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                <TextField
                  label="最大值 ($)"
                  type="number"
                  value={newRule.maxValue?.toString() || ''}
                  onChange={(value) => setNewRule(prev => ({ ...prev, maxValue: parseFloat(value) || 0 }))}
                />
              </Grid.Cell>
            </Grid>

            <TextField
              label="描述"
              value={newRule.description || ''}
              onChange={(value) => setNewRule(prev => ({ ...prev, description: value }))}
              placeholder="规则描述（可选）"
            />

            <Checkbox
              label="启用此规则"
              checked={newRule.enabled || false}
              onChange={(checked) => setNewRule(prev => ({ ...prev, enabled: checked }))}
            />
          </FormLayout>
        </Modal.Section>
      </Modal>

      {/* 删除确认Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="删除税率规则"
        primaryAction={{
          content: '删除',
          onAction: handleDeleteRule,
          loading: loading,
          destructive: true
        }}
        secondaryActions={[
          {
            content: '取消',
            onAction: () => setShowDeleteModal(false)
          }
        ]}
      >
        <Modal.Section>
          <Text as="p">
            确定要删除这条税率规则吗？此操作不可撤销。
          </Text>
        </Modal.Section>
      </Modal>

        {toastMarkup}
      </Frame>
    </AppLayout>
  )
}