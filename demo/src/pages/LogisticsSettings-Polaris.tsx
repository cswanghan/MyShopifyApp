import React, { useState } from 'react'
import { 
  Page, 
  Layout, 
  Banner,
  FormLayout,
  Switch,
  ButtonGroup,
  Popover,
  ActionList
} from '@shopify/polaris'
import { useNavigate } from 'react-router-dom'
import { DeliveryIcon, SettingsIcon, ExternalIcon } from '@shopify/polaris-icons'

export function LogisticsSettings() {
  const navigate = useNavigate()
  const [showSuccess, setShowSuccess] = useState(false)
  const [settings, setSettings] = useState({
    enableDHL: true,
    enableYunExpress: true,
    enableSFExpress: false,
    enableFedEx: false,
    prioritizeDDP: true,
    autoSelectCheapest: false,
    enableTracking: true,
    notifyCustomer: true
  })
  const [popoverActive, setPopoverActive] = useState(false)

  // 物流服务商数据
  const carriersData = [
    {
      name: 'DHL eCommerce',
      code: 'DHL_ECOM',
      logo: '🚚',
      status: 'active',
      ddpSupport: true,
      avgTime: '5-7天',
      countries: 45,
      lastUpdate: '2小时前'
    },
    {
      name: 'YunExpress',
      code: 'YUNEXPRESS',
      logo: '✈️',
      status: 'active', 
      ddpSupport: true,
      avgTime: '7-12天',
      countries: 38,
      lastUpdate: '30分钟前'
    },
    {
      name: 'SF Express',
      code: 'SF_EXPRESS',
      logo: '📦',
      status: 'inactive',
      ddpSupport: false,
      avgTime: '3-5天',
      countries: 25,
      lastUpdate: '1天前'
    },
    {
      name: 'FedEx',
      code: 'FEDEX',
      logo: '🛫',
      status: 'inactive',
      ddpSupport: true,
      avgTime: '2-4天',
      countries: 52,
      lastUpdate: '需要配置'
    }
  ]

  const handleSave = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleToggle = (field: string) => (value: boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <div className="polaris-badge polaris-badge--success">已启用</div>
    }
    return <div className="polaris-badge polaris-badge--default">未启用</div>
  }

  return (
    <div style={{ backgroundColor: 'var(--p-color-bg-subdued)', minHeight: '100vh' }}>
      <Page
        title="物流设置"
        subtitle="管理物流服务商和配送选项"
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
            content: '测试连接',
            icon: ExternalIcon,
            onAction: () => alert('测试所有物流商API连接...')
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
              <p>物流设置已成功更新，新配置将立即生效。</p>
            </Banner>
          </div>
        )}

        <Layout>
          <Layout.Section>
            {/* 物流服务商管理 */}
            <div className="polaris-card" style={{ marginBottom: 'var(--p-space-4)' }}>
              <div className="polaris-card__section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--p-space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <DeliveryIcon />
                    <h2 className="polaris-text polaris-text--heading-lg" style={{ marginLeft: 'var(--p-space-1)' }}>
                      物流服务商
                    </h2>
                  </div>
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
                          { content: '全部启用', onAction: () => alert('全部启用') },
                          { content: '全部禁用', onAction: () => alert('全部禁用') },
                          { content: '刷新状态', onAction: () => alert('刷新状态') }
                        ]}
                      />
                    </Popover>
                    <button className="polaris-button polaris-button--primary">
                      添加服务商
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--p-space-3)' }}>
                  {carriersData.map((carrier, index) => (
                    <div key={index} className="polaris-card" style={{ border: '1px solid var(--p-color-border-subdued)' }}>
                      <div className="polaris-card__section">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--p-space-2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', marginRight: 'var(--p-space-1)' }}>{carrier.logo}</span>
                            <div>
                              <h3 className="polaris-text polaris-text--body-md" style={{ fontWeight: '600' }}>
                                {carrier.name}
                              </h3>
                              <p className="polaris-text polaris-text--body-sm polaris-text--subdued">
                                {carrier.code}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(carrier.status)}
                        </div>

                        <div style={{ marginBottom: 'var(--p-space-2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--p-space-05)' }}>
                            <span className="polaris-text polaris-text--body-sm polaris-text--subdued">配送时效</span>
                            <span className="polaris-text polaris-text--body-sm">{carrier.avgTime}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--p-space-05)' }}>
                            <span className="polaris-text polaris-text--body-sm polaris-text--subdued">覆盖国家</span>
                            <span className="polaris-text polaris-text--body-sm">{carrier.countries}个</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--p-space-05)' }}>
                            <span className="polaris-text polaris-text--body-sm polaris-text--subdued">DDP支持</span>
                            <span className="polaris-text polaris-text--body-sm">
                              {carrier.ddpSupport ? '✅ 支持' : '❌ 不支持'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="polaris-text polaris-text--body-sm polaris-text--subdued">最后更新</span>
                            <span className="polaris-text polaris-text--body-sm">{carrier.lastUpdate}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--p-space-1)' }}>
                          <button 
                            className={`polaris-button ${carrier.status === 'active' ? 'polaris-button--critical' : 'polaris-button--primary'}`}
                            style={{ flex: 1 }}
                          >
                            {carrier.status === 'active' ? '禁用' : '启用'}
                          </button>
                          <button className="polaris-button polaris-button--default">
                            配置
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 配送策略设置 */}
            <div className="polaris-card" style={{ marginBottom: 'var(--p-space-4)' }}>
              <div className="polaris-card__section">
                <h2 className="polaris-text polaris-text--heading-lg" style={{ marginBottom: 'var(--p-space-3)' }}>
                  配送策略
                </h2>
                
                <FormLayout>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--p-space-3)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--p-space-2)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                        <div>
                          <h4 className="polaris-text polaris-text--body-md">优先选择DDP</h4>
                          <p className="polaris-text polaris-text--body-sm polaris-text--subdued">
                            优先推荐含税到门服务
                          </p>
                        </div>
                        <Switch
                          checked={settings.prioritizeDDP}
                          onChange={handleToggle('prioritizeDDP')}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--p-space-2)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                        <div>
                          <h4 className="polaris-text polaris-text--body-md">自动选择最便宜</h4>
                          <p className="polaris-text polaris-text--body-sm polaris-text--subdued">
                            自动选择费用最低的方案
                          </p>
                        </div>
                        <Switch
                          checked={settings.autoSelectCheapest}
                          onChange={handleToggle('autoSelectCheapest')}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--p-space-2)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                        <div>
                          <h4 className="polaris-text polaris-text--body-md">启用物流跟踪</h4>
                          <p className="polaris-text polaris-text--body-sm polaris-text--subdued">
                            提供实时物流跟踪信息
                          </p>
                        </div>
                        <Switch
                          checked={settings.enableTracking}
                          onChange={handleToggle('enableTracking')}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--p-space-2)', backgroundColor: 'var(--p-color-bg-subdued)', borderRadius: 'var(--p-border-radius-base)' }}>
                        <div>
                          <h4 className="polaris-text polaris-text--body-md">通知客户</h4>
                          <p className="polaris-text polaris-text--body-sm polaris-text--subdued">
                            自动发送物流状态更新
                          </p>
                        </div>
                        <Switch
                          checked={settings.notifyCustomer}
                          onChange={handleToggle('notifyCustomer')}
                        />
                      </div>
                    </div>
                  </div>
                </FormLayout>
              </div>
            </div>

            {/* 费率对比 */}
            <div className="polaris-card">
              <div className="polaris-card__section">
                <h2 className="polaris-text polaris-text--heading-lg" style={{ marginBottom: 'var(--p-space-3)' }}>
                  实时费率对比 (示例：中国 → 英国，1kg)
                </h2>
                
                <table className="polaris-data-table">
                  <thead className="polaris-data-table__header">
                    <tr>
                      <th className="polaris-data-table__cell">服务商</th>
                      <th className="polaris-data-table__cell">服务类型</th>
                      <th className="polaris-data-table__cell">预计时效</th>
                      <th className="polaris-data-table__cell">费用 (USD)</th>
                      <th className="polaris-data-table__cell">DDP</th>
                      <th className="polaris-data-table__cell">推荐度</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="polaris-data-table__row">
                      <td className="polaris-data-table__cell">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: 'var(--p-space-1)' }}>🚚</span>
                          DHL eCommerce
                        </div>
                      </td>
                      <td className="polaris-data-table__cell">Packet Plus</td>
                      <td className="polaris-data-table__cell">5-7 工作日</td>
                      <td className="polaris-data-table__cell">$12.50</td>
                      <td className="polaris-data-table__cell">
                        <div className="polaris-badge polaris-badge--success">支持</div>
                      </td>
                      <td className="polaris-data-table__cell">⭐⭐⭐⭐⭐</td>
                    </tr>
                    <tr className="polaris-data-table__row">
                      <td className="polaris-data-table__cell">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: 'var(--p-space-1)' }}>✈️</span>
                          YunExpress
                        </div>
                      </td>
                      <td className="polaris-data-table__cell">Standard</td>
                      <td className="polaris-data-table__cell">7-12 工作日</td>
                      <td className="polaris-data-table__cell">$8.90</td>
                      <td className="polaris-data-table__cell">
                        <div className="polaris-badge polaris-badge--success">支持</div>
                      </td>
                      <td className="polaris-data-table__cell">⭐⭐⭐⭐</td>
                    </tr>
                    <tr className="polaris-data-table__row">
                      <td className="polaris-data-table__cell">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ marginRight: 'var(--p-space-1)' }}>📦</span>
                          SF Express
                        </div>
                      </td>
                      <td className="polaris-data-table__cell">International</td>
                      <td className="polaris-data-table__cell">3-5 工作日</td>
                      <td className="polaris-data-table__cell">$18.00</td>
                      <td className="polaris-data-table__cell">
                        <div className="polaris-badge polaris-badge--critical">不支持</div>
                      </td>
                      <td className="polaris-data-table__cell">⭐⭐⭐</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            {/* 物流统计 */}
            <div className="polaris-card">
              <div className="polaris-card__section">
                <h3 className="polaris-text polaris-text--heading-md" style={{ marginBottom: 'var(--p-space-2)' }}>
                  物流统计
                </h3>
                
                <div style={{ marginBottom: 'var(--p-space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="polaris-text polaris-text--body-sm">活跃服务商</span>
                    <span className="polaris-text polaris-text--body-sm" style={{ fontWeight: '600' }}>2</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: 'var(--p-space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="polaris-text polaris-text--body-sm">本月发货</span>
                    <span className="polaris-text polaris-text--body-sm" style={{ fontWeight: '600' }}>1,234</span>
                  </div>
                </div>
                
                <div style={{ marginBottom: 'var(--p-space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="polaris-text polaris-text--body-sm">时效达成率</span>
                    <div className="polaris-badge polaris-badge--success">98.1%</div>
                  </div>
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="polaris-text polaris-text--body-sm">平均费用</span>
                    <span className="polaris-text polaris-text--body-sm" style={{ fontWeight: '600' }}>$11.20</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="polaris-card" style={{ marginTop: 'var(--p-space-4)' }}>
              <div className="polaris-card__section">
                <h3 className="polaris-text polaris-text--heading-md" style={{ marginBottom: 'var(--p-space-3)' }}>
                  快速操作
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-2)' }}>
                  <button className="polaris-button polaris-button--default" style={{ width: '100%' }}>
                    测试所有连接
                  </button>
                  <button className="polaris-button polaris-button--default" style={{ width: '100%' }}>
                    刷新费率
                  </button>
                  <button className="polaris-button polaris-button--default" style={{ width: '100%' }}>
                    导出配置
                  </button>
                  <button className="polaris-button polaris-button--default" style={{ width: '100%' }}>
                    查看文档
                  </button>
                </div>
              </div>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </div>
  )
}