import React, { useState } from 'react'
import { 
  Page, 
  Layout, 
  Card, 
  Button, 
  TextField, 
  Navigation,
  Text,
  Stack,
  Banner,
  ButtonGroup,
  Icon
} from '@shopify/polaris'
import { useNavigate } from 'react-router-dom'
import { 
  SearchIcon, 
  QuestionCircleIcon, 
  BookIcon, 
  SettingsIcon, 
  DeliveryIcon, 
  TroubleshootIcon, 
  ApiIcon, 
  ChatIcon,
  PlayIcon,
  LightbulbIcon,
  RocketIcon
} from '@shopify/polaris-icons'

export function Help() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')

  const helpSections = [
    {
      id: 'getting-started',
      title: '快速开始',
      icon: RocketIcon,
      content: {
        title: '快速开始使用 DTax-Bridge',
        items: [
          {
            title: '第一步：配置基本信息',
            content: '在"税费设置"页面配置您的IOSS号码、UK VAT号码等基本税务信息。这些信息将用于自动申报和合规处理。',
            action: '前往税费设置'
          },
          {
            title: '第二步：设置物流渠道',
            content: '在"物流设置"页面配置您的物流服务商账号，包括DHL、YunExpress等。系统将自动获取最优报价。',
            action: '前往物流设置'
          },
          {
            title: '第三步：安装Checkout扩展',
            content: '在Shopify后台安装DTax-Bridge的Checkout扩展，为客户提供实时税费计算和物流选择。',
            action: '查看安装指南'
          },
          {
            title: '第四步：测试订单流程',
            content: '创建测试订单，验证税费计算、物流方案选择和合规申报是否正常工作。',
            action: '运行测试'
          }
        ]
      }
    },
    {
      id: 'tax-compliance',
      title: '税务合规',
      icon: BookIcon,
      content: {
        title: '税务合规指南',
        items: [
          {
            title: 'IOSS (Import One-Stop Shop)',
            content: '适用于发往欧盟的€150以下商品。自动处理VAT计算和申报，客户无需在边境缴税。',
            action: '了解IOSS详情'
          },
          {
            title: 'UK VAT',
            content: '适用于发往英国的£135以下商品。系统自动计算VAT并生成季度申报报表。',
            action: '了解UK VAT详情'
          },
          {
            title: 'US Section 321',
            content: '美国$800以下商品免征关税政策。系统自动验证订单资格并生成CBP申报文件。',
            action: '了解Section 321详情'
          },
          {
            title: '合规最佳实践',
            content: '定期检查申报状态、保持税号有效性、及时更新税率信息，确保100%合规。',
            action: '查看合规检查清单'
          }
        ]
      }
    },
    {
      id: 'logistics',
      title: '物流管理',
      icon: DeliveryIcon,
      content: {
        title: '物流方案配置',
        items: [
          {
            title: '支持的物流服务商',
            content: 'DHL eCommerce、DHL Express、YunExpress、Yanwen、顺丰国际等主要跨境物流服务商。',
            action: '查看完整列表'
          },
          {
            title: 'DDP vs DAP 模式',
            content: 'DDP（含税到门）客户无需额外缴税；DAP（目的港交货）客户可能需要在边境缴税。',
            action: '选择模式指南'
          },
          {
            title: '物流成本优化',
            content: '系统自动比较不同服务商价格和时效，为每个订单推荐最优方案。',
            action: '查看优化策略'
          },
          {
            title: '跟踪和监控',
            content: '实时跟踪包裹状态，监控配送时效，及时处理异常情况。',
            action: '设置监控规则'
          }
        ]
      }
    },
    {
      id: 'troubleshooting',
      title: '故障排除',
      icon: TroubleshootIcon,
      content: {
        title: '常见问题解决',
        items: [
          {
            title: '税费计算不准确',
            content: '检查商品HSCode设置、目的地国家信息、税率数据更新状态。确保商品分类正确。',
            action: '运行诊断工具'
          },
          {
            title: '物流报价获取失败',
            content: '检查物流服务商API配置、账号余额、服务区域覆盖。重新验证API密钥。',
            action: '检查连接状态'
          },
          {
            title: '合规申报被拒绝',
            content: '检查税号有效性、申报数据完整性、文件格式要求。联系相关税务机关确认要求。',
            action: '查看错误日志'
          },
          {
            title: 'Checkout扩展不显示',
            content: '检查扩展安装状态、权限配置、主题兼容性。确保扩展已正确激活。',
            action: '重新安装扩展'
          }
        ]
      }
    },
    {
      id: 'api-docs',
      title: 'API 文档',
      icon: ApiIcon,
      content: {
        title: 'API 集成指南',
        items: [
          {
            title: '税费计算 API',
            content: 'POST /api/calculate-tax-logistics - 实时计算订单税费和推荐物流方案。',
            action: '查看API文档'
          },
          {
            title: '合规申报 API',
            content: 'POST /api/compliance/submit - 提交IOSS、UK VAT、Section 321申报。',
            action: '查看API文档'
          },
          {
            title: 'Webhook 集成',
            content: '监听订单状态变化、税费计算完成、申报状态更新等事件。',
            action: '配置Webhook'
          },
          {
            title: '认证和安全',
            content: '使用OAuth 2.0认证，所有API调用需要有效的访问令牌。',
            action: '获取访问令牌'
          }
        ]
      }
    },
    {
      id: 'contact',
      title: '联系支持',
      icon: ChatIcon,
      content: {
        title: '获取技术支持',
        items: [
          {
            title: '在线客服',
            content: '工作日 9:00-18:00 (UTC+8) 在线客服支持，平均响应时间 < 5分钟。',
            action: '开始对话'
          },
          {
            title: '邮件支持',
            content: 'support@dtax-bridge.com - 详细技术问题请发送邮件，24小时内回复。',
            action: '发送邮件'
          },
          {
            title: '电话支持',
            content: '+86 400-XXX-XXXX - 紧急问题可直接电话联系，7x24小时支持。',
            action: '立即拨打'
          },
          {
            title: '社区论坛',
            content: '加入DTax-Bridge社区，与其他商家交流经验，获取最新产品动态。',
            action: '访问论坛'
          }
        ]
      }
    }
  ]

  const currentSection = helpSections.find(section => section.id === activeSection)

  const filteredSections = searchQuery 
    ? helpSections.filter(section => 
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.items.some(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : helpSections

  const navigationMarkup = (
    <Navigation location="/">
      <Navigation.Section
        items={filteredSections.map(section => ({
          label: section.title,
          icon: section.icon,
          onClick: () => setActiveSection(section.id),
          selected: activeSection === section.id,
        }))}
      />
    </Navigation>
  )

  return (
    <div style={{ backgroundColor: 'var(--p-color-bg-subdued)', minHeight: '100vh' }}>
      <Page
        title="帮助中心"
        subtitle="查找使用指南、最佳实践和常见问题解答"
        backAction={{
          content: '返回仪表板',
          onAction: () => navigate('/dashboard')
        }}
        primaryAction={{
          content: '联系支持',
          icon: ChatIcon,
          onAction: () => alert('联系支持功能开发中...')
        }}
        secondaryActions={[
          {
            content: '视频教程',
            icon: PlayIcon,
            onAction: () => alert('视频教程功能开发中...')
          }
        ]}
      >
        <Layout>
          <Layout.Section>
            {/* 搜索框 */}
            <div style={{ marginBottom: 'var(--p-space-4)' }}>
              <Card>
                <div style={{ padding: 'var(--p-space-4)' }}>
                  <TextField
                    label=""
                    labelHidden
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="🔍 搜索帮助内容..."
                    prefix={<Icon source={SearchIcon} />}
                    clearButton
                    onClearButtonClick={() => setSearchQuery('')}
                  />
                </div>
              </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--p-space-6)' }}>
              {/* 左侧导航 */}
              <Card>
                <div style={{ padding: 'var(--p-space-4)' }}>
                  <Text variant="headingMd" as="h3" style={{ marginBottom: 'var(--p-space-3)' }}>
                    📖 帮助分类
                  </Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-1)' }}>
                    {filteredSections.map((section) => (
                      <Button
                        key={section.id}
                        variant={activeSection === section.id ? 'primary' : 'plain'}
                        textAlign="left"
                        fullWidth
                        icon={section.icon}
                        onClick={() => setActiveSection(section.id)}
                      >
                        {section.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* 右侧内容 */}
              <Card>
                <div style={{ padding: 'var(--p-space-6)' }}>
                  {currentSection && (
                    <>
                      <div style={{ marginBottom: 'var(--p-space-6)' }}>
                        <Stack alignment="center">
                          <Icon source={currentSection.icon} />
                          <Text variant="headingLg" as="h2">
                            {currentSection.content.title}
                          </Text>
                        </Stack>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-6)' }}>
                        {currentSection.content.items.map((item, index) => (
                          <div key={index} style={{ 
                            padding: 'var(--p-space-5)',
                            backgroundColor: 'var(--p-color-bg-subdued)',
                            borderRadius: 'var(--p-border-radius-base)',
                            border: '1px solid var(--p-color-border-subdued)'
                          }}>
                            <Text variant="headingMd" as="h3" style={{ marginBottom: 'var(--p-space-3)' }}>
                              {item.title}
                            </Text>
                            <Text variant="bodyMd" color="subdued" as="p" style={{ marginBottom: 'var(--p-space-4)', lineHeight: 1.6 }}>
                              {item.content}
                            </Text>
                            <Button
                              variant="primary"
                              onClick={() => alert(`${item.action} - 功能开发中...`)}
                            >
                              {item.action}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {searchQuery && filteredSections.length === 0 && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: 'var(--p-space-8)',
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: 'var(--p-space-4)' }}>🔍</div>
                      <Text variant="headingMd" as="h3" style={{ marginBottom: 'var(--p-space-2)' }}>
                        未找到相关内容
                      </Text>
                      <Text variant="bodyMd" color="subdued" as="p">
                        试试其他关键词或浏览分类内容
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* 底部快速链接 */}
            <div style={{ marginTop: 'var(--p-space-8)' }}>
              <Card>
                <div style={{ padding: 'var(--p-space-6)' }}>
                  <Text variant="headingLg" as="h3" style={{ marginBottom: 'var(--p-space-4)' }}>
                    🔗 快速链接
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--p-space-4)' }}>
                    <div style={{ 
                      padding: 'var(--p-space-4)',
                      backgroundColor: 'var(--p-color-bg-subdued)',
                      borderRadius: 'var(--p-border-radius-base)',
                      border: '1px solid var(--p-color-border-subdued)',
                      textAlign: 'center'
                    }}>
                      <Icon source={BookIcon} />
                      <Text variant="bodyMd" fontWeight="medium" as="p" style={{ margin: 'var(--p-space-2) 0 var(--p-space-1) 0' }}>
                        完整文档
                      </Text>
                      <Text variant="bodySm" color="subdued" as="p">
                        查看详细的技术文档和集成指南
                      </Text>
                    </div>
                    <div style={{ 
                      padding: 'var(--p-space-4)',
                      backgroundColor: 'var(--p-color-bg-subdued)',
                      borderRadius: 'var(--p-border-radius-base)',
                      border: '1px solid var(--p-color-border-subdued)',
                      textAlign: 'center'
                    }}>
                      <Icon source={PlayIcon} />
                      <Text variant="bodyMd" fontWeight="medium" as="p" style={{ margin: 'var(--p-space-2) 0 var(--p-space-1) 0' }}>
                        视频教程
                      </Text>
                      <Text variant="bodySm" color="subdued" as="p">
                        观看逐步操作视频，快速上手使用
                      </Text>
                    </div>
                    <div style={{ 
                      padding: 'var(--p-space-4)',
                      backgroundColor: 'var(--p-color-bg-subdued)',
                      borderRadius: 'var(--p-border-radius-base)',
                      border: '1px solid var(--p-color-border-subdued)',
                      textAlign: 'center'
                    }}>
                      <Icon source={LightbulbIcon} />
                      <Text variant="bodyMd" fontWeight="medium" as="p" style={{ margin: 'var(--p-space-2) 0 var(--p-space-1) 0' }}>
                        最佳实践
                      </Text>
                      <Text variant="bodySm" color="subdued" as="p">
                        学习行业最佳实践，优化业务流程
                      </Text>
                    </div>
                    <div style={{ 
                      padding: 'var(--p-space-4)',
                      backgroundColor: 'var(--p-color-bg-subdued)',
                      borderRadius: 'var(--p-border-radius-base)',
                      border: '1px solid var(--p-color-border-subdued)',
                      textAlign: 'center'
                    }}>
                      <Icon source={RocketIcon} />
                      <Text variant="bodyMd" fontWeight="medium" as="p" style={{ margin: 'var(--p-space-2) 0 var(--p-space-1) 0' }}>
                        功能更新
                      </Text>
                      <Text variant="bodySm" color="subdued" as="p">
                        了解最新功能和产品路线图
                      </Text>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </div>
  )
}