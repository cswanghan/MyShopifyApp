import React from 'react'
import { Frame, Navigation, TopBar } from '@shopify/polaris'
import {
  HomeIcon,
  SettingsIcon,
  DeliveryIcon,
  QuestionCircleIcon,
  OrderIcon,
  ProductIcon
} from '@shopify/polaris-icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCallback, useState } from 'react'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false)

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((mobileNavigationActive) => !mobileNavigationActive),
    [],
  )

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
      case '/reports':
        return '数据报表'
      case '/help':
        return '帮助中心'
      default:
        return '仪表盘'
    }
  }

  // 导航菜单项 - 参考demo.html的结构
  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: '仪表盘',
            icon: HomeIcon,
            url: '/dashboard',
            onClick: () => handleNavigate('/dashboard'),
            selected: location.pathname === '/dashboard'
          },
          {
            label: '订单管理',
            icon: OrderIcon,
            url: '/orders',
            onClick: () => handleNavigate('/orders'),
            selected: location.pathname.startsWith('/orders')
          },
          {
            label: '税费设置',
            icon: SettingsIcon,
            url: '/settings/tax',
            onClick: () => handleNavigate('/settings/tax'),
            selected: location.pathname === '/settings/tax'
          },
          {
            label: '物流方案',
            icon: DeliveryIcon,
            url: '/settings/logistics',
            onClick: () => handleNavigate('/settings/logistics'),
            selected: location.pathname === '/settings/logistics'
          },
          {
            label: '合规申报',
            icon: ProductIcon,
            url: '/compliance',
            onClick: () => handleNavigate('/compliance'),
            selected: location.pathname === '/compliance'
          },
          {
            label: '账户设置',
            icon: QuestionCircleIcon,
            url: '/help',
            onClick: () => handleNavigate('/help'),
            selected: location.pathname === '/help'
          }
        ]}
      />
    </Navigation>
  )

  // 顶部栏 - 参考demo.html的面包屑设计
  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigationActive}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        width: '100%'
      }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '500',
          color: 'var(--text-primary)'
        }}>
          {getPageTitle()}
        </div>
        <div>
          {location.pathname === '/dashboard' && (
            <button 
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/reports')}
            >
              查看报告
            </button>
          )}
          {location.pathname === '/settings/tax' && (
            <button 
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={() => alert('保存更改')}
            >
              保存更改
            </button>
          )}
          {location.pathname === '/settings/logistics' && (
            <button 
              style={{
                background: 'var(--brand-primary)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={() => alert('保存设置')}
            >
              保存设置
            </button>
          )}
        </div>
      </div>
    </TopBar>
  )

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      fontFamily: 'var(--font-family)'
    }}>
      {/* 自定义侧边栏 - 完全按照demo.html的设计 */}
      <nav style={{
        width: '72px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '24px',
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{
          color: 'var(--brand-primary)',
          marginBottom: '32px'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.2 16.8L22 12L17.2 7.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.8 16.8L2 12L6.8 7.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22L12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* 导航按钮 */}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
          {[
            { path: '/dashboard', icon: HomeIcon, title: '仪表盘' },
            { path: '/orders', icon: OrderIcon, title: '订单管理' },
            { path: '/settings/tax', icon: SettingsIcon, title: '税费设置' },
            { path: '/settings/logistics', icon: DeliveryIcon, title: '物流方案' },
            { path: '/compliance', icon: ProductIcon, title: '合规申报' },
            { path: '/help', icon: QuestionCircleIcon, title: '帮助中心' },
            { path: '/reports', icon: ProductIcon, title: '数据报表' }
          ].map((item) => {
            const IconComponent = item.icon
            const isActive = location.pathname === item.path || 
              (item.path === '/orders' && location.pathname.startsWith('/orders'))
            
            return (
              <li key={item.path} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '56px',
                cursor: 'pointer'
              }}>
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    handleNavigate(item.path)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--border-radius)',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                    transition: 'background-color 0.2s ease, color 0.2s ease',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#E5E7EB'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                  title={item.title}
                >
                  <IconComponent />
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 主内容区域 */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* 顶部栏 */}
        <header style={{
          height: '56px',
          backgroundColor: 'var(--bg-main)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '500',
            color: 'var(--text-primary)'
          }}>
            {getPageTitle()}
          </div>
          <div>
            {location.pathname === '/dashboard' && (
              <button 
                style={{
                  background: 'var(--brand-primary)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#00A09F'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--brand-primary)'
                }}
                onClick={() => navigate('/reports')}
              >
                查看报告
              </button>
            )}
          </div>
        </header>

        {/* 内容区域 */}
        <div style={{
          flexGrow: 1,
          padding: '24px',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-workspace)'
        }}>
          <div style={{
            maxWidth: '1120px',
            margin: '0 auto'
          }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}