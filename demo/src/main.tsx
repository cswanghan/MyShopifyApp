import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from '@shopify/polaris'
import App from './App'
import '@shopify/polaris/build/esm/styles.css'
import './styles/globals.css'
import zhCN from '@shopify/polaris/locales/zh-CN.json'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider i18n={zhCN}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
)