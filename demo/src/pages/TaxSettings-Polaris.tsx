import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

  // 税率规则数据
  const taxRulesData = [
    {
      country: '英国',
      code: 'GB',
      rate: '20%',
      type: '标准VAT',
      status: 'enabled',
      flag: '🇬🇧'
    },
    {
      country: '德国',
      code: 'DE',
      rate: '19%',
      type: '标准VAT',
      status: 'enabled',
      flag: '🇩🇪'
    },
    {
      country: '法国',
      code: 'FR',
      rate: '20%',
      type: '标准VAT',
      status: 'enabled',
      flag: '🇫🇷'
    },
    {
      country: '美国',
      code: 'US',
      rate: '0%',
      type: 'Section 321',
      status: 'exempt',
      flag: '🇺🇸'
    },
    {
      country: '加拿大',
      code: 'CA',
      rate: '13%',
      type: 'HST',
      status: 'pending',
      flag: '🇨🇦'
    }
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enabled':
        return <span className="badge badge-success">启用</span>
      case 'exempt':
        return <span className="badge badge-info">免税</span>
      case 'pending':
        return <span className="badge badge-warning">待配置</span>
      default:
        return <span className="badge badge-default">{status}</span>
    }
  }

  return (
    <div className="fade-in">
      {showSuccess && (
        <div className="banner banner-success mb-lg">
          <div>
            <strong>✅ 设置已保存</strong><br />
            税费设置已成功更新，新配置将在下次计算时生效。
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-lg)' }}>
        {/* 主要内容区域 */}
        <div>
          {/* 基础设置卡片 */}
          <div className="card mb-lg">
            <div className="card-header">
              <h2 className="card-title">⚙️ 基础设置</h2>
              <p className="card-subtitle">配置税费计算的基本参数</p>
            </div>
            <div className="card-content">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                <div className="form-group">
                  <label className="form-label">默认税率 (%)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={formData.defaultTaxRate}
                    onChange={(e) => handleInputChange('defaultTaxRate')(e.target.value)}
                    placeholder="请输入默认税率"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">免税阈值 (USD)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={formData.taxExemptThreshold}
                    onChange={(e) => handleInputChange('taxExemptThreshold')(e.target.value)}
                    placeholder="请输入免税阈值"
                  />
                </div>
              </div>

              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="enableTaxCalculation"
                  className="checkbox"
                  checked={formData.enableTaxCalculation}
                  onChange={(e) => handleCheckboxChange('enableTaxCalculation')(e.target.checked)}
                />
                <label htmlFor="enableTaxCalculation">
                  启用自动税费计算
                </label>
              </div>
            </div>
          </div>

          {/* 合规设置卡片 */}
          <div className="card mb-lg">
            <div className="card-header">
              <h2 className="card-title">📋 合规申报设置</h2>
              <p className="card-subtitle">配置VAT、IOSS等合规申报信息</p>
            </div>
            <div className="card-content">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                <div className="form-group">
                  <label className="form-label">VAT注册号</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => handleInputChange('vatNumber')(e.target.value)}
                    placeholder="GB123456789"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">IOSS号码</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.iossNumber}
                    onChange={(e) => handleInputChange('iossNumber')(e.target.value)}
                    placeholder="IM1234567890"
                  />
                </div>
              </div>

              <div className="form-group mb-lg">
                <label className="form-label">通知邮箱</label>
                <input
                  className="form-input"
                  type="email"
                  value={formData.notificationEmail}
                  onChange={(e) => handleInputChange('notificationEmail')(e.target.value)}
                  placeholder="tax@example.com"
                />
              </div>

              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="enableAutoReporting"
                  className="checkbox"
                  checked={formData.enableAutoReporting}
                  onChange={(e) => handleCheckboxChange('enableAutoReporting')(e.target.checked)}
                />
                <label htmlFor="enableAutoReporting">
                  启用自动申报（推荐）
                </label>
              </div>
            </div>
          </div>

          {/* 税率规则表格 */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">🌍 税率规则</h2>
              <div className="flex gap-md">
                <button className="btn btn-secondary btn-sm">批量操作</button>
                <button className="btn btn-primary btn-sm">添加规则</button>
              </div>
            </div>
            <div className="card-content">
              <table className="table">
                <thead>
                  <tr>
                    <th>国家</th>
                    <th>代码</th>
                    <th>税率</th>
                    <th>类型</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRulesData.map((rule, index) => (
                    <tr key={index}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <span style={{ fontSize: '18px' }}>{rule.flag}</span>
                          <span>{rule.country}</span>
                        </div>
                      </td>
                      <td><span className="text-secondary">{rule.code}</span></td>
                      <td><span className="font-medium">{rule.rate}</span></td>
                      <td><span className="text-secondary">{rule.type}</span></td>
                      <td>{getStatusBadge(rule.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 侧边栏 */}
        <div>
          {/* 帮助和信息侧边栏 */}
          <div className="card mb-lg">
            <div className="card-header">
              <h3 className="card-title">💡 配置帮助</h3>
            </div>
            <div className="card-content">
              <p className="text-secondary mb-md">
                正确配置税费设置可以确保合规申报和准确计算。
              </p>
              
              <div className="mb-lg">
                <h4 className="font-medium mb-sm">重要提示:</h4>
                <ul style={{ paddingLeft: 'var(--space-lg)', margin: 0 }}>
                  <li className="text-secondary mb-xs">VAT号码格式需符合各国标准</li>
                  <li className="text-secondary mb-xs">IOSS申报适用于EU境内小包</li>
                  <li className="text-secondary mb-xs">税率变更需要24小时生效</li>
                </ul>
              </div>
              
              <button className="btn btn-secondary w-full">
                📚 查看文档
              </button>
            </div>
          </div>

          {/* 快速统计 */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📊 税费统计</h3>
            </div>
            <div className="card-content">
              <div className="flex justify-between items-center mb-md">
                <span className="text-secondary">活跃税率规则</span>
                <span className="font-semibold">4</span>
              </div>
              
              <div className="flex justify-between items-center mb-md">
                <span className="text-secondary">本月计算次数</span>
                <span className="font-semibold">1,847</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-secondary">计算成功率</span>
                <span className="badge badge-success">99.8%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}