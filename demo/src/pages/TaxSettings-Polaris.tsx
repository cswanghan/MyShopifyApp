import React, { useState } from 'react'
import { 
  Page, 
  Layout, 
  Card, 
  Text, 
  Button, 
  TextField, 
  Select, 
  Checkbox,
  FormLayout,
  Banner,
  Badge,
  DataTable,
  ActionList,
  Popover,
  ButtonGroup
} from '@shopify/polaris'
import { useNavigate } from 'react-router-dom'
import { SettingsIcon, ExternalIcon } from '@shopify/polaris-icons'

export function TaxSettings() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    enableTaxCalculation: true,
    defaultTaxRate: '20',
    taxExemptThreshold: '150',
    vatNumber: 'GB123456789',
    iossNumber: 'IM1234567890',
    enableAutoReporting: true,
    notificationEmail: 'tax@example.com'
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [popoverActive, setPopoverActive] = useState(false)

  // 税率规则数据
  const taxRulesData = [
    ['英国', 'GB', '20%', '标准VAT', <Badge status="success">启用</Badge>],
    ['德国', 'DE', '19%', '标准VAT', <Badge status="success">启用</Badge>],
    ['法国', 'FR', '20%', '标准VAT', <Badge status="success">启用</Badge>],
    ['美国', 'US', '0%', 'Section 321', <Badge status="info">免税</Badge>],
    ['加拿大', 'CA', '13%', 'HST', <Badge status="warning">待配置</Badge>]
  ]

  const handleSave = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleInputChange = (field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field: string) => (value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div style={{ backgroundColor: 'var(--p-color-bg-subdued)', minHeight: '100vh' }}>
      <Page
        title="税费设置"
        subtitle="配置税率计算和合规申报设置"
        backAction={{
          content: '返回仪表板',
          onAction: () => navigate('/dashboard')
        }}
        primaryAction={{
          content: '保存设置',
          onAction: handleSave
        }}
        secondaryActions={[
          {
            content: '导入税率',
            icon: ExternalIcon,
            onAction: () => alert('导入税率功能开发中...')
          }
        ]}
      >
        {showSuccess && (
          <div style={{ marginBottom: 'var(--p-space-4)' }}>
            <Banner
              title="设置已保存"
              status="success"
              onDismiss={() => setShowSuccess(false)}
            >
              <p>税费设置已成功更新，新配置将在下次计算时生效。</p>
            </Banner>
          </div>
        )}

        <Layout>
          <Layout.Section>
            {/* 基础设置卡片 */}
            <div className="polaris-card" style={{ marginBottom: 'var(--p-space-4)' }}>
              <div className="polaris-card__section">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--p-space-3)' }}>
                  <SettingsIcon />
                  <h2 className="polaris-text polaris-text--heading-lg" style={{ marginLeft: 'var(--p-space-1)' }}>
                    基础设置
                  </h2>
                </div>
                
                <FormLayout>
                  <FormLayout.Group>
                    <div className="polaris-form-group">
                      <label className="polaris-label">默认税率 (%)</label>
                      <input
                        className="polaris-input"
                        type="number"
                        value={formData.defaultTaxRate}
                        onChange={(e) => handleInputChange('defaultTaxRate')(e.target.value)}
                        placeholder="请输入默认税率"
                      />
                    </div>
                    
                    <div className="polaris-form-group">
                      <label className="polaris-label">免税阈值 (USD)</label>
                      <input
                        className="polaris-input"
                        type="number"
                        value={formData.taxExemptThreshold}
                        onChange={(e) => handleInputChange('taxExemptThreshold')(e.target.value)}
                        placeholder="请输入免税阈值"
                      />
                    </div>
                  </FormLayout.Group>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-2)' }}>
                    <input
                      type="checkbox"
                      id="enableTaxCalculation"
                      checked={formData.enableTaxCalculation}
                      onChange={(e) => handleCheckboxChange('enableTaxCalculation')(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <label htmlFor="enableTaxCalculation" className="polaris-text polaris-text--body-md">
                      启用自动税费计算
                    </label>
                  </div>
                </FormLayout>
              </div>
            </div>

            {/* 合规设置卡片 */}
            <div className="polaris-card" style={{ marginBottom: 'var(--p-space-4)' }}>
              <div className="polaris-card__section">
                <h2 className="polaris-text polaris-text--heading-lg" style={{ marginBottom: 'var(--p-space-3)' }}>
                  合规申报设置
                </h2>
                
                <FormLayout>
                  <FormLayout.Group>
                    <div className="polaris-form-group">
                      <label className="polaris-label">VAT注册号</label>
                      <input
                        className="polaris-input"
                        type="text"
                        value={formData.vatNumber}
                        onChange={(e) => handleInputChange('vatNumber')(e.target.value)}
                        placeholder="GB123456789"
                      />
                    </div>
                    
                    <div className="polaris-form-group">
                      <label className="polaris-label">IOSS号码</label>
                      <input
                        className="polaris-input"
                        type="text"
                        value={formData.iossNumber}
                        onChange={(e) => handleInputChange('iossNumber')(e.target.value)}
                        placeholder="IM1234567890"
                      />
                    </div>
                  </FormLayout.Group>

                  <div className="polaris-form-group">
                    <label className="polaris-label">通知邮箱</label>
                    <input
                      className="polaris-input"
                      type="email"
                      value={formData.notificationEmail}
                      onChange={(e) => handleInputChange('notificationEmail')(e.target.value)}
                      placeholder="tax@example.com"
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-2)' }}>
                    <input
                      type="checkbox"
                      id="enableAutoReporting"
                      checked={formData.enableAutoReporting}
                      onChange={(e) => handleCheckboxChange('enableAutoReporting')(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <label htmlFor="enableAutoReporting" className="polaris-text polaris-text--body-md">
                      启用自动申报（推荐）
                    </label>
                  </div>
                </FormLayout>
              </div>
            </div>

            {/* 税率规则表格 */}
            <div className="polaris-card">
              <div className="polaris-card__section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--p-space-3)' }}>
                  <h2 className="polaris-text polaris-text--heading-lg">税率规则</h2>
                  <div style={{ display: 'flex', gap: 'var(--p-space-2)' }}>
                    <Popover
                      active={popoverActive}
                      activator={
                        <button 
                          className="polaris-button polaris-button--default"
                          onClick={() => setPopoverActive(!popoverActive)}
                        >
                          批量操作
                        </button>
                      }
                      onClose={() => setPopoverActive(false)}
                    >
                      <ActionList
                        items={[
                          { content: '批量启用', onAction: () => alert('批量启用') },
                          { content: '批量禁用', onAction: () => alert('批量禁用') },
                          { content: '导出规则', onAction: () => alert('导出规则') }
                        ]}
                      />
                    </Popover>
                    <button className="polaris-button polaris-button--primary">
                      添加规则
                    </button>
                  </div>
                </div>
                
                <table className="polaris-data-table">
                  <thead className="polaris-data-table__header">
                    <tr>
                      <th className="polaris-data-table__cell">国家</th>
                      <th className="polaris-data-table__cell">代码</th>
                      <th className="polaris-data-table__cell">税率</th>
                      <th className="polaris-data-table__cell">类型</th>
                      <th className="polaris-data-table__cell">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRulesData.map((row, index) => (
                      <tr key={index} className="polaris-data-table__row">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="polaris-data-table__cell">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            {/* 帮助和信息侧边栏 */}
            <div className="polaris-card">
              <div className="polaris-card__section">
                <h3 className="polaris-text polaris-text--heading-md" style={{ marginBottom: 'var(--p-space-2)' }}>
                  配置帮助
                </h3>
                <p className="polaris-text polaris-text--body-sm polaris-text--subdued" style={{ marginBottom: 'var(--p-space-3)' }}>
                  正确配置税费设置可以确保合规申报和准确计算。
                </p>
                
                <div style={{ marginBottom: 'var(--p-space-3)' }}>
                  <h4 className="polaris-text polaris-text--body-md" style={{ marginBottom: 'var(--p-space-1)' }}>
                    重要提示:
                  </h4>
                  <ul style={{ paddingLeft: 'var(--p-space-3)', margin: 0 }}>
                    <li className="polaris-text polaris-text--body-sm polaris-text--subdued">VAT号码格式需符合各国标准</li>
                    <li className="polaris-text polaris-text--body-sm polaris-text--subdued">IOSS申报适用于EU境内小包</li>
                    <li className="polaris-text polaris-text--body-sm polaris-text--subdued">税率变更需要24小时生效</li>
                  </ul>
                </div>
                
                <button className="polaris-button polaris-button--default" style={{ width: '100%' }}>
                  查看文档
                </button>
              </div>
            </div>

            {/* 快速统计 */}
            <div className="polaris-card" style={{ marginTop: 'var(--p-space-4)' }}>
              <div className="polaris-card__section">
                <h3 className="polaris-text polaris-text--heading-md" style={{ marginBottom: 'var(--p-space-2)' }}>
                  税费统计
                </h3>
                
                <div style={{ marginBottom: 'var(--p-space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="polaris-text polaris-text--body-sm">活跃税率规则</span>
                    <span className="polaris-text polaris-text--body-sm" style={{ fontWeight: '600' }}>4</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: 'var(--p-space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="polaris-text polaris-text--body-sm">本月计算次数</span>
                    <span className="polaris-text polaris-text--body-sm" style={{ fontWeight: '600' }}>1,847</span>
                  </div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="polaris-text polaris-text--body-sm">计算成功率</span>
                    <div className="polaris-badge polaris-badge--success">99.8%</div>
                  </div>
                </div>
              </div>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </div>
  )
}