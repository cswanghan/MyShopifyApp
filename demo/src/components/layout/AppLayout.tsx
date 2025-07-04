import React from 'react'
import { Frame, Navigation, TopBar } from '@shopify/polaris'
import {
  HomeIcon,
  SettingsIcon,
  DeliveryIcon,
  QuestionCircleIcon
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

  // 导航菜单项
  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: '服务计划',
            icon: HomeIcon,
            url: '/dashboard',
            onClick: () => handleNavigate('/dashboard'),
            selected: location.pathname === '/dashboard'
          }
        ]}
      />
      <Navigation.Section
        title="设置"
        items={[
          {
            label: '税费设置',
            icon: SettingsIcon,
            url: '/settings/tax',
            onClick: () => handleNavigate('/settings/tax'),
            selected: location.pathname === '/settings/tax'
          },
          {
            label: '物流设置',
            icon: DeliveryIcon,
            url: '/settings/logistics',
            onClick: () => handleNavigate('/settings/logistics'),
            selected: location.pathname === '/settings/logistics'
          }
        ]}
      />
      <Navigation.Section
        title="帮助"
        items={[
          {
            label: '帮助中心',
            icon: QuestionCircleIcon,
            url: '/help',
            onClick: () => handleNavigate('/help')
          }
        ]}
      />
    </Navigation>
  )

  // 顶部栏
  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigationActive}
    />
  )

  return (
    <Frame
      topBar={topBarMarkup}
      navigation={navigationMarkup}
      showMobileNavigation={mobileNavigationActive}
      onNavigationDismiss={toggleMobileNavigationActive}
    >
      {children}
    </Frame>
  )
}