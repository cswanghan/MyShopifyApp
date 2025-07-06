import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { Dashboard } from './pages/Dashboard-Polaris'
import { Orders } from './pages/Orders-Polaris'
import { TaxSettings } from './pages/TaxSettings-Polaris'
import { LogisticsSettings } from './pages/LogisticsSettings-Polaris'
import { Compliance } from './pages/Compliance-Polaris'
import { Reports } from './pages/Reports-Polaris'
import { Help } from './pages/Help-Polaris'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/settings/tax" element={<TaxSettings />} />
        <Route path="/settings/logistics" element={<LogisticsSettings />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default App