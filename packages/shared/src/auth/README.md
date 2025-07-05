# DTax-Bridge 认证和授权系统

这是一个为 Shopify App 设计的完整认证和授权系统，支持 OAuth 2.0、会话管理、基于角色的权限控制 (RBAC) 和多店铺管理。

## 目录

- [系统架构](#系统架构)
- [核心组件](#核心组件)
- [快速开始](#快速开始)
- [配置选项](#配置选项)
- [权限系统](#权限系统)
- [多店铺支持](#多店铺支持)
- [安全特性](#安全特性)
- [API 文档](#api-文档)
- [示例代码](#示例代码)
- [测试](#测试)
- [故障排除](#故障排除)

## 系统架构

```
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│  Shopify OAuth  │ ──▶│  AuthService     │ ──▶│  SessionManager   │
│  认证服务        │    │  (主服务)         │    │  (会话管理)        │
└─────────────────┘    └──────────────────┘    └───────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│  PermissionMgr  │ ◀──│  Express中间件    │ ──▶│  MultiStoreMgr    │
│  (权限管理)      │    │  (HTTP集成)       │    │  (多店铺管理)      │
└─────────────────┘    └──────────────────┘    └───────────────────┘
```

## 核心组件

### 1. ShopifyAuthService
处理 Shopify OAuth 2.0 认证流程：
- 生成授权 URL
- 验证回调参数和 HMAC 签名
- 交换访问令牌
- 验证访问令牌有效性

### 2. SessionManager
管理用户会话：
- 创建和验证会话
- 自动清理过期会话
- 支持多种存储后端

### 3. PermissionManager
基于角色的权限控制：
- 预定义角色和权限
- 动态权限检查
- 权限继承和组合

### 4. MultiStoreManager
多店铺支持：
- 店铺注册和管理
- 店铺切换
- 店铺设置管理

### 5. AuthService
主认证服务，整合所有组件：
- 完整的认证流程
- 统一的 API 接口
- 错误处理和日志记录

## 快速开始

### 1. 安装依赖

```bash
npm install express cookie-parser cors
npm install --save-dev @types/express @types/cookie-parser @types/cors
```

### 2. 基础配置

```typescript
import { createAuthMiddleware } from './src/middleware/ExpressAuthMiddleware';

const authMiddleware = createAuthMiddleware({
  shopify: {
    clientId: process.env.SHOPIFY_CLIENT_ID!,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET!,
    scopes: ['read_products', 'write_products', 'read_orders', 'write_orders'],
    redirectUri: 'https://your-app.com/auth/callback'
  },
  session: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
    enableAutoCleanup: true
  }
});
```

### 3. Express 集成

```typescript
import express from 'express';

const app = express();

// 安全头
app.use(authMiddleware.securityHeaders());

// 认证路由
app.post('/auth/login', authMiddleware.loginEndpoint());
app.get('/auth/callback', authMiddleware.callbackEndpoint());
app.post('/auth/logout', authMiddleware.authenticate(), authMiddleware.logoutEndpoint());

// 受保护的路由
app.get('/api/dashboard',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.DASHBOARD_VIEW),
  (req, res) => {
    res.json({ user: req.auth!.user, shop: req.auth!.shop });
  }
);
```

### 4. 环境变量

```bash
SHOPIFY_CLIENT_ID=your_shopify_client_id
SHOPIFY_CLIENT_SECRET=your_shopify_client_secret
SHOPIFY_REDIRECT_URI=https://your-app.com/auth/callback
NODE_ENV=production
```

## 配置选项

### AuthServiceConfig

```typescript
interface AuthServiceConfig {
  shopify: {
    clientId: string;          // Shopify App Client ID
    clientSecret: string;      // Shopify App Client Secret
    scopes: string[];          // 请求的权限范围
    redirectUri: string;       // OAuth 回调 URL
  };
  session?: {
    sessionTimeout?: number;    // 会话超时时间（毫秒）
    enableAutoCleanup?: boolean; // 是否启用自动清理
  };
  multiStore?: {
    enableMultiStore?: boolean; // 是否启用多店铺支持
  };
}
```

### ExpressAuthMiddlewareConfig

```typescript
interface ExpressAuthMiddlewareConfig {
  authService: AuthService;
  excludePaths?: string[];     // 排除认证的路径
  cookieName?: string;        // 会话 Cookie 名称
  requireHttps?: boolean;     // 是否要求 HTTPS
  enableCSRF?: boolean;       // 是否启用 CSRF 保护
  rateLimit?: {              // 速率限制配置
    windowMs: number;
    maxRequests: number;
  };
}
```

## 权限系统

### 预定义角色

| 角色 | 描述 | 权限 |
|------|------|------|
| `OWNER` | 店铺所有者 | 所有权限 |
| `ADMIN` | 管理员 | 除删除用户外的所有权限 |
| `MANAGER` | 经理 | 订单、税费、物流、合规管理 |
| `OPERATOR` | 操作员 | 基础订单和计算操作 |
| `VIEWER` | 查看者 | 只读权限 |
| `ACCOUNTANT` | 财务 | 财务和合规相关权限 |
| `LOGISTICS` | 物流专员 | 物流和订单管理权限 |

### 权限类别

```typescript
enum Permission {
  // 仪表盘
  DASHBOARD_VIEW = 'dashboard:view',
  
  // 订单管理
  ORDERS_VIEW = 'orders:view',
  ORDERS_EDIT = 'orders:edit',
  ORDERS_DELETE = 'orders:delete',
  ORDERS_EXPORT = 'orders:export',
  
  // 税费设置
  TAX_SETTINGS_VIEW = 'tax_settings:view',
  TAX_SETTINGS_EDIT = 'tax_settings:edit',
  TAX_CALCULATE = 'tax:calculate',
  
  // 物流设置
  LOGISTICS_SETTINGS_VIEW = 'logistics_settings:view',
  LOGISTICS_SETTINGS_EDIT = 'logistics_settings:edit',
  LOGISTICS_CALCULATE = 'logistics:calculate',
  
  // 合规申报
  COMPLIANCE_VIEW = 'compliance:view',
  COMPLIANCE_SUBMIT = 'compliance:submit',
  COMPLIANCE_REPORTS = 'compliance:reports',
  
  // 报表
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  REPORTS_ADVANCED = 'reports:advanced',
  
  // 用户管理
  USERS_VIEW = 'users:view',
  USERS_INVITE = 'users:invite',
  USERS_EDIT = 'users:edit',
  USERS_DELETE = 'users:delete',
  
  // 店铺管理
  SHOP_SETTINGS_VIEW = 'shop_settings:view',
  SHOP_SETTINGS_EDIT = 'shop_settings:edit',
  SHOP_BILLING = 'shop:billing',
  
  // 系统管理
  ADMIN_ACCESS = 'admin:access',
  ADMIN_LOGS = 'admin:logs',
  ADMIN_SYSTEM = 'admin:system'
}
```

### 权限检查示例

```typescript
// 检查单个权限
const canViewOrders = authService.checkPermission(user, Permission.ORDERS_VIEW);

// 检查多个权限（需要全部满足）
const canManageOrders = authService.checkPermission(user, [
  Permission.ORDERS_VIEW,
  Permission.ORDERS_EDIT
]);

// 在中间件中使用
app.get('/api/orders',
  authMiddleware.authenticate(),
  authMiddleware.requirePermission(Permission.ORDERS_VIEW),
  (req, res) => {
    // 处理订单查看逻辑
  }
);
```

## 多店铺支持

### 店铺注册

```typescript
const shop = await multiStoreManager.registerShop({
  domain: 'test-shop.myshopify.com',
  accessToken: 'access_token',
  scope: ['read_products', 'write_products'],
  shopInfo: {
    id: 123,
    name: 'Test Shop',
    email: 'test@example.com'
  }
});
```

### 店铺切换

```typescript
// 用户切换到另一个店铺
const switchResult = await authService.switchShop(sessionId, newShopId);

if (switchResult.success) {
  console.log('切换成功', switchResult.shop);
} else {
  console.error('切换失败', switchResult.error);
}
```

### 店铺设置管理

```typescript
// 更新店铺设置
await multiStoreManager.updateShopSettings(shopId, {
  taxSettings: {
    iossNumber: 'IM1234567890',
    enableAutoCalculation: true
  },
  logisticsSettings: {
    defaultProvider: 'DHL',
    enableAutoSelection: true
  }
});
```

## 安全特性

### 1. HMAC 验证
- 所有 Shopify 回调都经过 HMAC 签名验证
- Webhook 也进行 HMAC 验证

### 2. CSRF 保护
- 自动生成和验证 CSRF 令牌
- 对状态更改操作强制检查

### 3. 速率限制
- 基于 IP 的速率限制
- 可配置的时间窗口和请求数限制

### 4. 安全头
- 自动设置安全相关的 HTTP 头
- 包括 CSP、HSTS、XSS 保护等

### 5. 会话安全
- 安全的会话 ID 生成
- 自动会话过期和清理
- HttpOnly Cookie

## API 文档

### 认证端点

#### POST /auth/login
开始 OAuth 认证流程

**请求体：**
```json
{
  "shop": "test-shop",
  "state": "optional_custom_state"
}
```

**响应：**
```json
{
  "success": true,
  "authUrl": "https://test-shop.myshopify.com/admin/oauth/authorize?...",
  "state": "generated_state"
}
```

#### GET /auth/callback
处理 OAuth 回调

**查询参数：**
- `code`: 授权码
- `shop`: 店铺域名
- `state`: 状态参数
- `hmac`: HMAC 签名
- `timestamp`: 时间戳

#### POST /auth/logout
用户登出

**响应：**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /auth/switch-shop
切换店铺

**请求体：**
```json
{
  "shopId": "new_shop_id"
}
```

### 受保护的端点

所有受保护的端点都需要在请求中包含有效的会话信息：

**Cookie:**
```
dtax-session-id=session_id_here
```

**或 Authorization 头:**
```
Authorization: Bearer session_id_here
```

**或自定义头:**
```
X-Session-ID: session_id_here
```

## 示例代码

### 完整的认证流程

```typescript
import { AuthService } from './src/auth/AuthService';

const authService = new AuthService({
  shopify: {
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret',
    scopes: ['read_products', 'write_products'],
    redirectUri: 'https://your-app.com/auth/callback'
  }
});

// 1. 生成认证 URL
const { authUrl, state } = await authService.startAuth('test-shop');
console.log('访问此 URL 进行认证:', authUrl);

// 2. 处理回调（在你的回调端点中）
const authResult = await authService.handleCallback({
  code: 'received_code',
  shop: 'test-shop',
  state: 'received_state',
  hmac: 'received_hmac',
  timestamp: 'received_timestamp'
});

if (authResult.success) {
  const { sessionId, user, shop } = authResult;
  console.log('认证成功:', { sessionId, user, shop });
  
  // 3. 验证会话
  const validation = await authService.validateSession(sessionId);
  if (validation.success) {
    console.log('会话有效:', validation.user);
  }
  
  // 4. 检查权限
  const canViewOrders = authService.checkPermission(user, Permission.ORDERS_VIEW);
  console.log('可以查看订单:', canViewOrders);
}
```

### 自定义权限检查

```typescript
// 创建自定义权限检查中间件
function requireCustomPermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const hasPermission = authService.checkPermission(req.auth.user, permission);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

// 使用自定义中间件
app.get('/api/sensitive-data',
  authMiddleware.authenticate(),
  requireCustomPermission(Permission.ADMIN_ACCESS),
  (req, res) => {
    res.json({ sensitiveData: 'only for admins' });
  }
);
```

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行认证相关测试
npm test -- --grep "AuthService"

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 测试示例

```typescript
import { AuthService } from '../AuthService';
import { Role, Permission } from '../PermissionManager';

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    authService = new AuthService(mockConfig);
  });
  
  it('should generate valid auth URL', async () => {
    const result = await authService.startAuth('test-shop');
    expect(result.authUrl).toContain('test-shop.myshopify.com');
    expect(result.state).toHaveLength(64);
  });
  
  it('should check permissions correctly', () => {
    const user = { roles: [Role.VIEWER], /* ... */ };
    const canView = authService.checkPermission(user, Permission.DASHBOARD_VIEW);
    const canEdit = authService.checkPermission(user, Permission.ORDERS_EDIT);
    
    expect(canView).toBe(true);
    expect(canEdit).toBe(false);
  });
});
```

## 故障排除

### 常见问题

1. **认证失败 - HMAC 验证错误**
   - 检查 `SHOPIFY_CLIENT_SECRET` 是否正确
   - 确保回调 URL 与 Shopify App 设置一致

2. **会话过期**
   - 检查系统时间是否正确
   - 确认 `sessionTimeout` 配置合理

3. **权限被拒绝**
   - 验证用户角色是否正确分配
   - 检查权限映射是否包含所需权限

4. **多店铺切换失败**
   - 确认用户有权访问目标店铺
   - 检查店铺状态是否为激活状态

### 调试技巧

1. **启用详细日志**
```typescript
process.env.LOG_LEVEL = 'debug';
```

2. **检查会话状态**
```typescript
const stats = authService.getAuthStats();
console.log('认证统计:', stats);
```

3. **验证权限配置**
```typescript
const permissions = authService.getUserPermissions(user);
console.log('用户权限:', permissions);
```

### 性能优化

1. **会话存储优化**
   - 生产环境使用 Redis 或数据库存储
   - 设置合适的清理间隔

2. **权限缓存**
   - 缓存用户权限计算结果
   - 定期刷新权限缓存

3. **并发处理**
   - 使用连接池
   - 实现请求去重

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 添加测试
5. 确保所有测试通过
6. 提交 Pull Request

## 许可证

MIT License