import React, { useState, useEffect } from 'react'

export interface ThemeSwitcherProps {
  className?: string
}

export function ThemeSwitcher({ className = '' }: ThemeSwitcherProps) {
  const [currentTheme, setCurrentTheme] = useState<'default' | 'ant-design'>('default')

  useEffect(() => {
    // 从localStorage读取主题设置
    const savedTheme = localStorage.getItem('dtax-theme') as 'default' | 'ant-design' || 'default'
    setCurrentTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (theme: 'default' | 'ant-design') => {
    // 移除之前的主题样式
    const existingThemeLink = document.getElementById('theme-css')
    if (existingThemeLink) {
      existingThemeLink.remove()
    }

    // 如果是Ant Design主题，添加对应的CSS
    if (theme === 'ant-design') {
      const link = document.createElement('link')
      link.id = 'theme-css'
      link.rel = 'stylesheet'
      link.href = '/ant-design-theme.css'
      document.head.appendChild(link)
    }
    
    // 保存主题设置到localStorage
    localStorage.setItem('dtax-theme', theme)
  }

  const handleThemeChange = (theme: 'default' | 'ant-design') => {
    setCurrentTheme(theme)
    applyTheme(theme)
  }

  return (
    <div className={`theme-switcher ${className}`}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">主题风格</label>
        <select
          className="form-select"
          value={currentTheme}
          onChange={(e) => handleThemeChange(e.target.value as 'default' | 'ant-design')}
          style={{ minWidth: '140px' }}
        >
          <option value="default">🎨 默认主题</option>
          <option value="ant-design">🐜 Ant Design</option>
        </select>
      </div>
    </div>
  )
}