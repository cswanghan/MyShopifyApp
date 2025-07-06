import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard-Polaris'
import { TaxSettings } from './pages/TaxSettings'
import { LogisticsSettings } from './pages/LogisticsSettings'
import { Orders } from './pages/Orders'
import { Reports } from './pages/Reports'
import { Compliance } from './pages/Compliance'
import { Help } from './pages/Help'

// 导入新的Polaris设计系统样式
import './styles/polaris-design-system.css'

function App() {
  return (
    <BrowserRouter>
      <div style={{ 
        fontFamily: 'var(--p-font-family-sans)',
        backgroundColor: 'var(--p-color-bg-subdued)',
        minHeight: '100vh'
      }}>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings/tax" element={<TaxSettings />} />
            <Route path="/settings/logistics" element={<LogisticsSettings />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/help" element={<Help />} />
          </Routes>
        </AppLayout>
      </div>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)