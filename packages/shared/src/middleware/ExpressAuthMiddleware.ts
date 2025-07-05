import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthServiceConfig } from '../auth/AuthService';
import { Permission, User } from '../auth/PermissionManager';
import { Shop } from '../multistore/MultiStoreManager';
import { Logger } from '../utils/logger';

/**
 * 扩展Express Request接口
 */
declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: User;
        shop: Shop;
        sessionId: string;
        permissions: Permission[];
      };
    }
  }
}

/**
 * Express认证中间件配置
 */
export interface ExpressAuthMiddlewareConfig {
  authService: AuthService;
  excludePaths?: string[];
  cookieName?: string;
  requireHttps?: boolean;
  enableCSRF?: boolean;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Express认证中间件
 */
export class ExpressAuthMiddleware {
  private logger = new Logger('ExpressAuthMiddleware');
  private authService: AuthService;
  private excludePaths: Set<string>;
  private cookieName: string;
  private requireHttps: boolean;
  private enableCSRF: boolean;
  private rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };

  // 速率限制存储
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  constructor(config: ExpressAuthMiddlewareConfig) {
    this.authService = config.authService;
    this.excludePaths = new Set(config.excludePaths || []);
    this.cookieName = config.cookieName || 'dtax-session-id';
    this.requireHttps = config.requireHttps || false;
    this.enableCSRF = config.enableCSRF || true;
    this.rateLimit = config.rateLimit;

    // 添加默认排除路径
    this.excludePaths.add('/auth/start');
    this.excludePaths.add('/auth/callback');
    this.excludePaths.add('/webhooks');
    this.excludePaths.add('/health');
  }

  /**
   * 主认证中间件
   */
  authenticate() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 检查排除路径
        if (this.isExcludedPath(req.path)) {
          return next();
        }

        // HTTPS检查
        if (this.requireHttps && !req.secure && req.get('x-forwarded-proto') !== 'https') {
          return this.sendError(res, 426, 'HTTPS_REQUIRED', 'HTTPS connection required');
        }

        // 速率限制检查
        if (this.rateLimit && !this.checkRateLimit(req)) {
          return this.sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests');
        }

        // 获取会话ID
        const sessionId = this.extractSessionId(req);
        if (!sessionId) {
          return this.handleAuthRequired(res, 'Missing session ID');
        }

        // 验证会话
        const authResult = await this.authService.validateSession(sessionId);
        if (!authResult.success) {
          if (authResult.requiresAuth) {
            return this.handleAuthRequired(res, authResult.error);
          }
          return this.sendError(res, 500, 'AUTH_ERROR', authResult.error);
        }

        // 设置请求上下文
        req.auth = {
          user: authResult.user!,
          shop: authResult.shop!,
          sessionId,
          permissions: this.authService.getUserPermissions(authResult.user!)
        };

        next();

      } catch (error) {
        this.logger.error('认证中间件错误', error);
        return this.sendError(res, 500, 'INTERNAL_ERROR', 'Authentication error');
      }
    };
  }

  /**
   * 权限检查中间件
   */
  requirePermission(permissions: Permission | Permission[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.auth) {
        return this.handleAuthRequired(res, 'Authentication required');
      }

      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
      const hasPermission = this.authService.checkPermission(req.auth.user, requiredPermissions);

      if (!hasPermission) {
        this.logger.warn('权限不足', {
          userId: req.auth.user.id,
          shopId: req.auth.shop.id,
          requiredPermissions,
          userPermissions: req.auth.permissions,
          path: req.path
        });

        return this.sendError(res, 403, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions');
      }

      next();
    };
  }

  /**
   * CSRF保护中间件
   */
  csrfProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.enableCSRF) {
        return next();
      }

      // 对于安全方法跳过CSRF检查
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      if (!req.auth) {
        return this.handleAuthRequired(res, 'Authentication required for CSRF protection');
      }

      const token = req.get('X-CSRF-Token') || req.body._token;
      const expectedToken = req.auth.sessionId; // 简化版本，实际应该使用专门的CSRF令牌

      if (!token || token !== expectedToken) {
        this.logger.warn('CSRF令牌验证失败', {
          userId: req.auth.user.id,
          shopId: req.auth.shop.id,
          path: req.path,
          hasToken: !!token
        });

        return this.sendError(res, 403, 'CSRF_TOKEN_INVALID', 'Invalid CSRF token');
      }

      next();
    };
  }

  /**
   * 店铺访问控制中间件
   */
  requireShopAccess(shopIdParam: string = 'shopId') {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.auth) {
        return this.handleAuthRequired(res, 'Authentication required');
      }

      const requestedShopId = req.params[shopIdParam] || req.body[shopIdParam] || req.query[shopIdParam];

      if (!requestedShopId) {
        return this.sendError(res, 400, 'MISSING_SHOP_ID', 'Shop ID is required');
      }

      if (req.auth.shop.id !== requestedShopId) {
        this.logger.warn('店铺访问被拒绝', {
          userId: req.auth.user.id,
          currentShopId: req.auth.shop.id,
          requestedShopId,
          path: req.path
        });

        return this.sendError(res, 403, 'SHOP_ACCESS_DENIED', 'Shop access denied');
      }

      next();
    };
  }

  /**
   * 安全头中间件
   */
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:;",
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      });

      next();
    };
  }

  /**
   * 登录端点
   */
  loginEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const { shop, state } = req.body;

        if (!shop) {
          return this.sendError(res, 400, 'MISSING_SHOP', 'Shop parameter is required');
        }

        const authData = await this.authService.startAuth(shop, state);

        res.json({
          success: true,
          authUrl: authData.authUrl,
          state: authData.state
        });

      } catch (error) {
        this.logger.error('登录端点错误', error);
        return this.sendError(res, 500, 'LOGIN_ERROR', error.message);
      }
    };
  }

  /**
   * 回调端点
   */
  callbackEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const { code, shop, state, hmac, timestamp } = req.query;

        if (!code || !shop || !hmac || !timestamp) {
          return this.sendError(res, 400, 'MISSING_PARAMETERS', 'Missing required parameters');
        }

        const authResult = await this.authService.handleCallback({
          code: code as string,
          shop: shop as string,
          state: state as string,
          hmac: hmac as string,
          timestamp: timestamp as string
        });

        if (!authResult.success) {
          if (authResult.requiresAuth) {
            // 重定向到重新认证
            const reAuthData = await this.authService.startAuth(shop as string);
            return res.redirect(reAuthData.authUrl);
          }
          return this.sendError(res, 400, 'AUTH_FAILED', authResult.error);
        }

        // 设置会话Cookie
        res.cookie(this.cookieName, authResult.sessionId, {
          httpOnly: true,
          secure: this.requireHttps,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24小时
        });

        // 重定向到应用
        res.redirect(authResult.redirectUrl || '/dashboard');

      } catch (error) {
        this.logger.error('回调端点错误', error);
        return this.sendError(res, 500, 'CALLBACK_ERROR', error.message);
      }
    };
  }

  /**
   * 登出端点
   */
  logoutEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const sessionId = this.extractSessionId(req);

        if (sessionId) {
          await this.authService.logout(sessionId);
        }

        // 清除Cookie
        res.clearCookie(this.cookieName);

        res.json({
          success: true,
          message: 'Logged out successfully'
        });

      } catch (error) {
        this.logger.error('登出端点错误', error);
        return this.sendError(res, 500, 'LOGOUT_ERROR', error.message);
      }
    };
  }

  /**
   * 店铺切换端点
   */
  switchShopEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        if (!req.auth) {
          return this.handleAuthRequired(res, 'Authentication required');
        }

        const { shopId } = req.body;

        if (!shopId) {
          return this.sendError(res, 400, 'MISSING_SHOP_ID', 'Shop ID is required');
        }

        const switchResult = await this.authService.switchShop(req.auth.sessionId, shopId);

        if (!switchResult.success) {
          return this.sendError(res, 400, 'SHOP_SWITCH_FAILED', switchResult.error);
        }

        res.json({
          success: true,
          shop: switchResult.shop,
          user: switchResult.user
        });

      } catch (error) {
        this.logger.error('店铺切换端点错误', error);
        return this.sendError(res, 500, 'SWITCH_ERROR', error.message);
      }
    };
  }

  /**
   * 提取会话ID
   */
  private extractSessionId(req: Request): string | null {
    // 从Cookie获取
    const cookieSessionId = req.cookies?.[this.cookieName];
    if (cookieSessionId) return cookieSessionId;

    // 从Authorization头获取
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 从自定义头获取
    const customHeader = req.get('X-Session-ID');
    if (customHeader) return customHeader;

    return null;
  }

  /**
   * 检查是否为排除路径
   */
  private isExcludedPath(path: string): boolean {
    return this.excludePaths.has(path) ||
           Array.from(this.excludePaths).some(excludePath =>
             path.startsWith(excludePath)
           );
  }

  /**
   * 检查速率限制
   */
  private checkRateLimit(req: Request): boolean {
    if (!this.rateLimit) return true;

    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - this.rateLimit.windowMs;

    // 清理过期记录
    for (const [k, v] of this.rateLimitStore.entries()) {
      if (v.resetTime < windowStart) {
        this.rateLimitStore.delete(k);
      }
    }

    // 获取或创建请求记录
    let requestData = this.rateLimitStore.get(key);
    if (!requestData || requestData.resetTime < windowStart) {
      requestData = { count: 0, resetTime: now + this.rateLimit.windowMs };
      this.rateLimitStore.set(key, requestData);
    }

    requestData.count++;

    return requestData.count <= this.rateLimit.maxRequests;
  }

  /**
   * 处理需要认证的情况
   */
  private handleAuthRequired(res: Response, reason: string): void {
    this.logger.warn('需要认证', { reason });

    res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: reason,
      requiresAuth: true
    });
  }

  /**
   * 发送错误响应
   */
  private sendError(res: Response, status: number, code: string, message: string): void {
    res.status(status).json({
      error: code,
      message
    });
  }
}

/**
 * 创建认证中间件的便捷函数
 */
export function createAuthMiddleware(config: AuthServiceConfig): ExpressAuthMiddleware {
  const authService = new AuthService(config);
  
  return new ExpressAuthMiddleware({
    authService,
    excludePaths: [
      '/auth',
      '/webhooks',
      '/health',
      '/api/health'
    ],
    requireHttps: process.env.NODE_ENV === 'production',
    enableCSRF: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      maxRequests: 100 // 每15分钟最多100个请求
    }
  });
}