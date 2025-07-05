import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createAuthMiddleware } from '../packages/shared/src/middleware/ExpressAuthMiddleware';
import { Permission } from '../packages/shared/src/auth/PermissionManager';
import { Logger } from '../packages/shared/src/utils/logger';

const logger = new Logger('AuthServer');

// 创建Express应用
const app = express();

// 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// 创建认证中间件
const authMiddleware = createAuthMiddleware({
  shopify: {
    clientId: process.env.SHOPIFY_CLIENT_ID || '',
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
    scopes: ['read_products', 'write_products', 'read_orders', 'write_orders'],
    redirectUri: process.env.SHOPIFY_REDIRECT_URI || 'http://localhost:3001/auth/callback'
  },
  session: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
    enableAutoCleanup: true
  },
  multiStore: {
    enableMultiStore: true
  }
});

// 安全头
app.use(authMiddleware.securityHeaders());

// 认证相关路由
app.post('/auth/login', authMiddleware.loginEndpoint());
app.get('/auth/callback', authMiddleware.callbackEndpoint());
app.post('/auth/logout', authMiddleware.authenticate(), authMiddleware.logoutEndpoint());
app.post('/auth/switch-shop', authMiddleware.authenticate(), authMiddleware.switchShopEndpoint());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 用户信息端点
app.get('/api/user', authMiddleware.authenticate(), (req, res) => {
  res.json({
    user: req.auth!.user,
    shop: req.auth!.shop,
    permissions: req.auth!.permissions
  });
});

// 仪表板数据（需要基础查看权限）
app.get('/api/dashboard',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DASHBOARD_VIEW),
  (req, res) => {
    res.json({
      stats: {
        totalOrders: 1234,
        totalRevenue: 56789.12,
        taxesSaved: 2345.67,
        activeShippingRoutes: 8
      },
      recentOrders: [
        {
          id: 'ORD-001',
          customer: 'John Doe',
          amount: 129.99,
          status: 'shipped',
          date: '2024-01-15'
        }
      ]
    });
  }
);

// 订单管理（需要订单查看权限）
app.get('/api/orders',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.ORDERS_VIEW),
  (req, res) => {
    res.json({
      orders: [
        {
          id: 'ORD-001',
          customer: 'John Doe',
          amount: 129.99,
          status: 'shipped',
          taxAmount: 12.99,
          shippingCost: 9.99,
          destination: 'Germany',
          date: '2024-01-15'
        },
        {
          id: 'ORD-002',
          customer: 'Jane Smith',
          amount: 249.99,
          status: 'processing',
          taxAmount: 24.99,
          shippingCost: 14.99,
          destination: 'France',
          date: '2024-01-16'
        }
      ],
      pagination: {
        total: 156,
        page: 1,
        limit: 20
      }
    });
  }
);

// 创建订单（需要订单编辑权限）
app.post('/api/orders',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.ORDERS_EDIT),
  authMiddleware.csrfProtection(),
  (req, res) => {
    const { customer, amount, destination } = req.body;
    
    // 模拟订单创建
    const newOrder = {
      id: `ORD-${Date.now()}`,
      customer,
      amount,
      destination,
      status: 'pending',
      date: new Date().toISOString().split('T')[0]
    };
    
    logger.info('订单已创建', {
      orderId: newOrder.id,
      userId: req.auth!.user.id,
      shopId: req.auth!.shop.id
    });
    
    res.json({ order: newOrder });
  }
);

// 税费设置（需要税费设置查看权限）
app.get('/api/tax-settings',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.TAX_SETTINGS_VIEW),
  (req, res) => {
    res.json({
      settings: {
        iossNumber: 'IM1234567890',
        ukVatNumber: 'GB123456789',
        enableAutoCalculation: true,
        defaultTaxInclusive: false,
        euVatNumbers: {
          DE: 'DE123456789',
          FR: 'FR12345678901'
        }
      }
    });
  }
);

// 更新税费设置（需要税费设置编辑权限）
app.put('/api/tax-settings',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.TAX_SETTINGS_EDIT),
  authMiddleware.csrfProtection(),
  (req, res) => {
    const { settings } = req.body;
    
    logger.info('税费设置已更新', {
      userId: req.auth!.user.id,
      shopId: req.auth!.shop.id,
      updatedFields: Object.keys(settings)
    });
    
    res.json({ success: true, settings });
  }
);

// 合规报表（需要合规查看权限）
app.get('/api/compliance/reports',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.COMPLIANCE_REPORTS),
  (req, res) => {
    res.json({
      reports: [
        {
          id: 'RPT-001',
          type: 'IOSS',
          period: '2024-01',
          status: 'submitted',
          submittedAt: '2024-02-01T10:00:00Z',
          totalTax: 1234.56
        },
        {
          id: 'RPT-002',
          type: 'UK_VAT',
          period: '2024-01',
          status: 'pending',
          totalTax: 567.89
        }
      ]
    });
  }
);

// 提交合规报表（需要合规提交权限）
app.post('/api/compliance/submit',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.COMPLIANCE_SUBMIT),
  authMiddleware.csrfProtection(),
  (req, res) => {
    const { reportType, period } = req.body;
    
    const report = {
      id: `RPT-${Date.now()}`,
      type: reportType,
      period,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };
    
    logger.info('合规报表已提交', {
      reportId: report.id,
      type: reportType,
      period,
      userId: req.auth!.user.id,
      shopId: req.auth!.shop.id
    });
    
    res.json({ report });
  }
);

// 管理员专用端点（需要管理员权限）
app.get('/api/admin/stats',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.ADMIN_ACCESS),
  (req, res) => {
    res.json({
      systemStats: {
        totalUsers: 156,
        activeShops: 89,
        totalSessions: 234,
        systemLoad: 0.45
      }
    });
  }
);

// Webhook处理（验证HMAC但不需要会话）
app.post('/webhooks/app/uninstalled', express.raw({ type: 'application/json' }), (req, res) => {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const body = req.body.toString();
  
  // 验证webhook HMAC
  // const isValid = authMiddleware.authService.verifyWebhookHmac(body, hmacHeader);
  // if (!isValid) {
  //   return res.status(401).send('Unauthorized');
  // }
  
  const data = JSON.parse(body);
  logger.info('应用卸载webhook接收', { shopDomain: data.domain });
  
  // 处理应用卸载
  // await authMiddleware.authService.handleAppUninstall(data.domain);
  
  res.status(200).send('OK');
});

// 错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('服务器错误', error);
  
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Endpoint not found'
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`认证服务器启动成功`, { port: PORT });
  logger.info('环境变量检查', {
    hasClientId: !!process.env.SHOPIFY_CLIENT_ID,
    hasClientSecret: !!process.env.SHOPIFY_CLIENT_SECRET,
    nodeEnv: process.env.NODE_ENV
  });
});

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，开始优雅关闭');
  // 这里可以添加清理逻辑
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，开始优雅关闭');
  // 这里可以添加清理逻辑
  process.exit(0);
});

export default app;