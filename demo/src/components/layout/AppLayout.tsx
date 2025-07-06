import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCallback, useState } from 'react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false)

  const handleNavigate = useCallback((path: string) => {
    navigate(path)
    setMobileNavigationActive(false)
  }, [navigate])

  // 获取页面标题
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return '仪表盘'
      case '/settings/tax':
        return '税费设置'
      case '/settings/logistics':
        return '物流设置'
      case '/orders':
        return '订单管理'
      case '/compliance':
        return '合规申报'
      case '/reports':
        return '数据报表'
      case '/help':
        return '帮助中心'
      default:
        return '仪表盘'
    }
  }

  // 获取页面操作按钮
  const getPageAction = () => {
    switch (location.pathname) {
      case '/dashboard':
        return { text: '查看报告', action: () => navigate('/reports') }
      case '/settings/tax':
        return { text: '保存更改', action: () => alert('保存更改') }
      case '/settings/logistics':
        return { text: '保存设置', action: () => alert('保存设置') }
      case '/compliance':
        return { text: '新建申报', action: () => alert('新建申报') }
      case '/orders':
        return { text: '导出订单', action: () => alert('导出订单') }
      case '/help':
        return { text: '联系支持', action: () => alert('联系支持') }
      default:
        return null
    }
  }

  const navigationItems = [
    { 
      path: '/dashboard', 
      icon: 'layout-grid', 
      title: '仪表盘',
      lucideIcon: '📊'
    },
    { 
      path: '/orders', 
      icon: 'package', 
      title: '订单管理',
      lucideIcon: '📦'
    },
    { 
      path: '/settings/tax', 
      icon: 'receipt', 
      title: '税费设置',
      lucideIcon: '🧾'
    },
    { 
      path: '/settings/logistics', 
      icon: 'send', 
      title: '物流方案',
      lucideIcon: '🚚'
    },
    { 
      path: '/compliance', 
      icon: 'file-check-2', 
      title: '合规申报',
      lucideIcon: '📋'
    },
    { 
      path: '/help', 
      icon: 'help-circle', 
      title: '帮助中心',
      lucideIcon: '❓'
    }
  ]

  const pageAction = getPageAction()

  return (
    <div className="app-layout">
      {/* 侧边导航栏 */}
      <aside className={`sidebar ${mobileNavigationActive ? 'open' : ''}`}>
        <div className="sidebar-header">
          <a href="#" className="logo" onClick={(e) => { e.preventDefault(); navigate('/dashboard') }}>
            DTax-Bridge
          </a>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path === '/orders' && location.pathname.startsWith('/orders'))
              
              return (
                <li key={item.path} className="nav-item">
                  <a 
                    href="#"
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      handleNavigate(item.path)
                    }}
                    title={item.title}
                  >
                    <span className="nav-icon" style={{ fontSize: '18px' }}>
                      {item.lucideIcon}
                    </span>
                    <span>{item.title}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* 主内容区域 */}
      <main className="main-content">
        {/* 顶部导航栏 */}
        <header className="top-bar">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setMobileNavigationActive(!mobileNavigationActive)}
            style={{ display: 'none' }}
          >
            ☰
          </button>
          <h1 className="page-title">{getPageTitle()}</h1>
          <div className="top-bar-actions">
            {pageAction && (
              <button 
                className="btn btn-primary"
                onClick={pageAction.action}
              >
                {pageAction.text}
              </button>
            )}
          </div>
        </header>

        {/* 内容区域 */}
        <div className="content-area">
          <div className="content-container">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}