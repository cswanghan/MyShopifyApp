import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function Help() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')

  const helpSections = [
    {
      id: 'getting-started',
      title: '快速开始',
      icon: '🚀',
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
      icon: '📋',
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
      icon: '🚚',
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
      icon: '🔧',
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
      icon: '⚡',
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
      icon: '💬',
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

  return (
    <div className="fade-in">
      {/* 搜索框 */}
      <div className="card mb-lg">
        <div className="card-content">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input
              className="form-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 搜索帮助内容..."
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-lg)' }}>
        {/* 左侧导航 */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📖 帮助分类</h3>
          </div>
          <div className="card-content">
            <div className="flex flex-col gap-xs">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  className={`btn ${activeSection === section.id ? 'btn-primary' : 'btn-secondary'} w-full text-left`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="flex items-center gap-sm">
                    <span>{section.icon}</span>
                    <span>{section.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="card">
          <div className="card-content" style={{ padding: 'var(--space-xl)' }}>
            {currentSection && (
              <>
                <div className="mb-xl">
                  <div className="flex items-center gap-md mb-md">
                    <span style={{ fontSize: '32px' }}>{currentSection.icon}</span>
                    <h2 className="text-xl font-bold">
                      {currentSection.content.title}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col gap-xl">
                  {currentSection.content.items.map((item, index) => (
                    <div key={index} className="card" style={{ 
                      padding: 'var(--space-lg)',
                      backgroundColor: 'var(--form-bg-info)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <h3 className="font-semibold mb-md">{item.title}</h3>
                      <p className="text-secondary mb-lg" style={{ lineHeight: 1.6 }}>
                        {item.content}
                      </p>
                      <button
                        className="btn btn-primary"
                        onClick={() => alert(`${item.action} - 功能开发中...`)}
                      >
                        {item.action}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {searchQuery && filteredSections.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: 'var(--space-2xl)',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🔍</div>
                <h3 className="font-semibold mb-sm">未找到相关内容</h3>
                <p className="text-secondary">试试其他关键词或浏览分类内容</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部快速链接 */}
      <div className="card mt-xl">
        <div className="card-header">
          <h2 className="card-title">🔗 快速链接</h2>
        </div>
        <div className="card-content">
          <div className="grid grid-4 gap-lg">
            <div className="card" style={{ 
              padding: 'var(--space-lg)',
              backgroundColor: 'var(--form-bg-info)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: 'var(--space-md)' }}>📚</div>
              <h4 className="font-medium mb-sm">完整文档</h4>
              <p className="text-secondary">查看详细的技术文档和集成指南</p>
            </div>
            <div className="card" style={{ 
              padding: 'var(--space-lg)',
              backgroundColor: 'var(--form-bg-info)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: 'var(--space-md)' }}>🎥</div>
              <h4 className="font-medium mb-sm">视频教程</h4>
              <p className="text-secondary">观看逐步操作视频，快速上手使用</p>
            </div>
            <div className="card" style={{ 
              padding: 'var(--space-lg)',
              backgroundColor: 'var(--form-bg-info)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: 'var(--space-md)' }}>💡</div>
              <h4 className="font-medium mb-sm">最佳实践</h4>
              <p className="text-secondary">学习行业最佳实践，优化业务流程</p>
            </div>
            <div className="card" style={{ 
              padding: 'var(--space-lg)',
              backgroundColor: 'var(--form-bg-info)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: 'var(--space-md)' }}>🆕</div>
              <h4 className="font-medium mb-sm">功能更新</h4>
              <p className="text-secondary">了解最新功能和产品路线图</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}