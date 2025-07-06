import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
      return <span className="badge badge-success">已启用</span>
    }
    return <span className="badge badge-default">未启用</span>
  }

  return (
    <div className="fade-in">
      {showSuccess && (
        <div className="banner banner-success mb-lg">
          <div>
            <strong>✅ 设置已保存</strong><br />
            物流设置已成功更新，新配置将在下次计算时生效。
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)' }}>
        {/* 主要内容区域 */}
        <div>
          {/* 物流服务商管理 */}
          <div className="card mb-lg">
            <div className="card-header">
              <h2 className="card-title">🚚 物流服务商管理</h2>
              <p className="card-subtitle">配置和管理您的物流合作伙伴</p>
            </div>
            <div className="card-content">
              <div className="grid grid-1 gap-md">
                {carriersData.map((carrier, index) => (
                  <div key={index} className="card" style={{ padding: 'var(--space-lg)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-md">
                        <div style={{ fontSize: '32px' }}>{carrier.logo}</div>
                        <div>
                          <h3 className="font-semibold mb-xs">{carrier.name}</h3>
                          <div className="flex items-center gap-md text-secondary">
                            <span>📍 {carrier.countries} 个国家</span>
                            <span>⏱️ {carrier.avgTime}</span>
                            <span>DDP: {carrier.ddpSupport ? '✅' : '❌'}</span>
                          </div>
                          <p className="text-secondary mt-xs">最后更新: {carrier.lastUpdate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-md">
                        {getStatusBadge(carrier.status)}
                        <button className="btn btn-secondary btn-sm">
                          配置
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 配送选项设置 */}
          <div className="card mb-lg">
            <div className="card-header">
              <h2 className="card-title">⚙️ 配送选项设置</h2>
              <p className="card-subtitle">配置自动选择和优化策略</p>
            </div>
            <div className="card-content">
              <div className="grid grid-2 gap-lg">
                <div>
                  <h4 className="font-medium mb-md">物流选择策略</h4>
                  <div className="form-group">
                    <div className="checkbox-wrapper mb-md">
                      <input
                        type="checkbox"
                        id="prioritizeDDP"
                        className="checkbox"
                        checked={settings.prioritizeDDP}
                        onChange={(e) => handleToggle('prioritizeDDP')(e.target.checked)}
                      />
                      <label htmlFor="prioritizeDDP">
                        优先推荐DDP（含税到门）
                      </label>
                    </div>
                    
                    <div className="checkbox-wrapper mb-md">
                      <input
                        type="checkbox"
                        id="autoSelectCheapest"
                        className="checkbox"
                        checked={settings.autoSelectCheapest}
                        onChange={(e) => handleToggle('autoSelectCheapest')(e.target.checked)}
                      />
                      <label htmlFor="autoSelectCheapest">
                        自动选择最便宜的方案
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-md">客户通知</h4>
                  <div className="form-group">
                    <div className="checkbox-wrapper mb-md">
                      <input
                        type="checkbox"
                        id="enableTracking"
                        className="checkbox"
                        checked={settings.enableTracking}
                        onChange={(e) => handleToggle('enableTracking')(e.target.checked)}
                      />
                      <label htmlFor="enableTracking">
                        启用包裹跟踪
                      </label>
                    </div>
                    
                    <div className="checkbox-wrapper mb-md">
                      <input
                        type="checkbox"
                        id="notifyCustomer"
                        className="checkbox"
                        checked={settings.notifyCustomer}
                        onChange={(e) => handleToggle('notifyCustomer')(e.target.checked)}
                      />
                      <label htmlFor="notifyCustomer">
                        自动通知客户物流状态
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 费用对比表 */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">💰 费用对比表</h2>
              <p className="card-subtitle">不同重量段的运费对比（示例数据）</p>
            </div>
            <div className="card-content">
              <table className="table">
                <thead>
                  <tr>
                    <th>重量范围</th>
                    <th>DHL eCommerce</th>
                    <th>YunExpress</th>
                    <th>SF Express</th>
                    <th>推荐</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="font-medium">0-500g</span></td>
                    <td>$8.50</td>
                    <td>$6.80</td>
                    <td>$12.00</td>
                    <td><span className="badge badge-success">YunExpress</span></td>
                  </tr>
                  <tr>
                    <td><span className="font-medium">500g-1kg</span></td>
                    <td>$12.50</td>
                    <td>$11.20</td>
                    <td>$16.50</td>
                    <td><span className="badge badge-success">YunExpress</span></td>
                  </tr>
                  <tr>
                    <td><span className="font-medium">1-2kg</span></td>
                    <td>$18.00</td>
                    <td>$19.50</td>
                    <td>$24.00</td>
                    <td><span className="badge badge-success">DHL</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 侧边栏 */}
        <div>
          {/* 物流统计 */}
          <div className="card mb-lg">
            <div className="card-header">
              <h3 className="card-title">📊 物流统计</h3>
            </div>
            <div className="card-content">
              <div className="flex justify-between items-center mb-md">
                <span className="text-secondary">活跃服务商</span>
                <span className="font-semibold">2</span>
              </div>
              
              <div className="flex justify-between items-center mb-md">
                <span className="text-secondary">本月发货量</span>
                <span className="font-semibold">1,245</span>
              </div>
              
              <div className="flex justify-between items-center mb-md">
                <span className="text-secondary">平均时效</span>
                <span className="font-semibold">6.2天</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-secondary">DDP比例</span>
                <span className="badge badge-success">87%</span>
              </div>
            </div>
          </div>

          {/* 配置帮助 */}
          <div className="card mb-lg">
            <div className="card-header">
              <h3 className="card-title">💡 配置提示</h3>
            </div>
            <div className="card-content">
              <p className="text-secondary mb-md">
                合理配置物流选项可以提升客户满意度。
              </p>
              
              <div className="mb-lg">
                <h4 className="font-medium mb-sm">建议:</h4>
                <ul style={{ paddingLeft: 'var(--space-lg)', margin: 0 }}>
                  <li className="text-secondary mb-xs">启用多个物流服务商备选</li>
                  <li className="text-secondary mb-xs">优先使用DDP模式</li>
                  <li className="text-secondary mb-xs">定期检查费用变化</li>
                </ul>
              </div>
              
              <button className="btn btn-secondary w-full">
                📚 查看文档
              </button>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">⚡ 快速操作</h3>
            </div>
            <div className="card-content">
              <div className="flex flex-col gap-sm">
                <button className="btn btn-secondary btn-sm">
                  🔄 刷新费率
                </button>
                <button className="btn btn-secondary btn-sm">
                  📊 查看报表
                </button>
                <button className="btn btn-secondary btn-sm">
                  ⚙️ 高级设置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}