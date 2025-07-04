import React, { useState } from 'react'
import {
  AppProvider,
  Frame,
  TopBar,
  Navigation,
  Toast,
  Loading
} from '@shopify/polaris'
import {
  HomeIcon,
  SettingsIcon,
  OrdersIcon,
  AnalyticsIcon,
  QuestionMarkIcon
} from '@shopify/polaris-icons'
import { useLocation, useNavigate } from '@remix-run/react'
import { APP_CONFIG, ROUTES } from '../../constants'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchActive, setSearchActive] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const toggleMobileNavigationActive = () =>
    setMobileNavigationActive(!mobileNavigationActive)

  const toggleUserMenuOpen = () => setUserMenuOpen(!userMenuOpen)

  const handleSearchChange = (value: string) => setSearchValue(value)

  const handleSearchSubmit = () => {
    console.log('搜索:', searchValue)
    setSearchActive(false)
    setSearchValue('')
  }

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      userMenu={{
        actions: [
          {
            items: [
              { content: '账户设置', onAction: () => navigate('/settings/account') },
              { content: '帮助中心', onAction: () => navigate('/help') },
              { content: '退出登录', onAction: () => console.log('退出登录') }
            ]
          }
        ],
        name: '商户名称',
        detail: APP_CONFIG.NAME,
        initials: '商',
        open: userMenuOpen,
        onToggle: toggleUserMenuOpen
      }}
      searchResultsVisible={searchActive}
      searchField={{
        value: searchValue,
        placeholder: '搜索订单、商品...',
        showFocusBorder: true,
        onSubmit: handleSearchSubmit,
        onChange: handleSearchChange
      }}
      onNavigationToggle={toggleMobileNavigationActive}
      onSearchResultsDismiss={() => setSearchActive(false)}
    />
  )

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            label: '仪表板',
            icon: HomeIcon,
            url: ROUTES.DASHBOARD,
            exactMatch: true,
            selected: location.pathname === ROUTES.DASHBOARD
          },
          {
            label: '订单管理',
            icon: OrdersIcon,
            url: ROUTES.ORDERS,
            selected: location.pathname.startsWith(ROUTES.ORDERS)
          },
          {
            label: '报表分析',
            icon: AnalyticsIcon,
            url: ROUTES.REPORTS,
            selected: location.pathname.startsWith(ROUTES.REPORTS)
          }
        ]}
      />
      <Navigation.Section
        title="设置"
        items={[
          {
            label: '税费设置',
            icon: SettingsIcon,
            url: ROUTES.TAX_SETTINGS,
            selected: location.pathname === ROUTES.TAX_SETTINGS
          },
          {
            label: '物流设置',
            icon: SettingsIcon,
            url: ROUTES.LOGISTICS_SETTINGS,
            selected: location.pathname === ROUTES.LOGISTICS_SETTINGS
          }
        ]}
      />
      <Navigation.Section
        items={[
          {
            label: '帮助中心',
            icon: QuestionMarkIcon,
            url: ROUTES.HELP,
            selected: location.pathname === ROUTES.HELP
          }
        ]}
      />
    </Navigation>
  )

  return (
    <AppProvider
      i18n={{
        Polaris: {
          Avatar: {
            label: '头像',
            labelWithInitials: '头像 {initials}'
          },
          Frame: {
            skipToContent: '跳转到内容',
            navigationLabel: '导航',
            Navigation: {
              closeMobileNavigationLabel: '关闭导航'
            }
          },
          TopBar: {
            toggleMenuLabel: '切换菜单',
            SearchField: {
              clearButtonLabel: '清除',
              search: '搜索'
            }
          },
          ActionList: {
            SearchField: {
              placeholder: '搜索操作',
              clearButtonLabel: '清除搜索字段',
              search: '搜索'
            }
          },
          Button: {
            spinnerAccessibilityLabel: '加载中'
          }
        }
      }}
      features={{ newDesignLanguage: true }}
    >
      <Frame
        topBar={topBarMarkup}
        navigation={navigationMarkup}
        showMobileNavigation={mobileNavigationActive}
        onNavigationDismiss={toggleMobileNavigationActive}
        skipToContentTarget="main-content"
      >
        <main id="main-content">
          {children}
        </main>
      </Frame>
    </AppProvider>
  )
}