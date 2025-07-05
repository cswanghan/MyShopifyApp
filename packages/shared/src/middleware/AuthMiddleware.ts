import { Request, Response, NextFunction } from 'express';
import { SessionManager, UserSession } from '../auth/SessionManager';
import { PermissionManager, Permission, User } from '../auth/PermissionManager';
import { Logger } from '../utils/logger';

/**
 * 认证中间件配置
 */
export interface AuthMiddlewareConfig {
  sessionManager: SessionManager;
  permissionManager: PermissionManager;
  excludePaths?: string[];
  requireHttps?: boolean;
  csrfProtection?: boolean;
}

/**
 * 扩展Request接口，添加用户和会话信息
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: UserSession;
      permissions?: Permission[];
    }
  }
}

/**
 * 认证中间件
 */
export class AuthMiddleware {
  private logger = new Logger('AuthMiddleware');
  private sessionManager: SessionManager;
  private permissionManager: PermissionManager;
  private excludePaths: Set<string>;
  private requireHttps: boolean;
  private csrfProtection: boolean;

  constructor(config: AuthMiddlewareConfig) {
    this.sessionManager = config.sessionManager;
    this.permissionManager = config.permissionManager;
    this.excludePaths = new Set(config.excludePaths || []);
    this.requireHttps = config.requireHttps || false;
    this.csrfProtection = config.csrfProtection || true;
  }

  /**
   * 主要认证中间件
   */
  authenticate() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // 检查是否为排除路径
        if (this.isExcludedPath(req.path)) {
          return next();
        }

        // HTTPS检查
        if (this.requireHttps && !req.secure && req.get('x-forwarded-proto') !== 'https') {
          return res.status(426).json({
            error: 'HTTPS required',
            message: 'This endpoint requires a secure connection'
          });
        }

        // 获取会话ID
        const sessionId = this.extractSessionId(req);
        if (!sessionId) {
          return this.handleUnauthorized(res, 'Missing session ID');
        }

        // 验证会话
        const sessionValidation = await this.sessionManager.validateSession(sessionId);
        if (!sessionValidation.valid) {
          return this.handleUnauthorized(res, sessionValidation.reason || 'Invalid session');
        }

        // 模拟用户数据（实际应用中从数据库获取）
        const user = await this.getUserFromSession(sessionValidation.session!);
        if (!user) {
          return this.handleUnauthorized(res, 'User not found');
        }

        // 检查用户状态
        if (!user.isActive) {
          return this.handleUnauthorized(res, 'User account is inactive');
        }

        // 刷新会话
        await this.sessionManager.refreshSession(sessionId);

        // 获取用户权限
        const permissions = this.permissionManager.getUserPermissions(user);

        // 设置请求上下文
        req.user = user;
        req.session = sessionValidation.session;
        req.permissions = permissions;

        // 记录访问日志
        this.logAccess(req, user);

        next();

      } catch (error) {
        this.logger.error('认证中间件错误', error);
        return res.status(500).json({
          error: 'Authentication error',
          message: 'Internal authentication error'
        });
      }
    };
  }

  /**
   * 权限检查中间件
   */
  requirePermission(permissions: Permission | Permission[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.handleUnauthorized(res, 'User not authenticated');
      }

      const checkResult = this.permissionManager.checkPermission(req.user, permissions);
      
      if (!checkResult.allowed) {
        this.logger.warn('权限检查失败', {
          userId: req.user.id,
          requiredPermissions: permissions,
          reason: checkResult.reason
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: checkResult.reason,
          requiredPermissions: checkResult.requiredPermissions
        });
      }

      next();
    };
  }

  /**
   * API权限检查中间件
   */
  checkApiPermission() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.handleUnauthorized(res, 'User not authenticated');
      }

      const checkResult = this.permissionManager.checkApiPermission(
        req.user,
        req.route?.path || req.path,
        req.method
      );

      if (!checkResult.allowed) {
        this.logger.warn('API权限检查失败', {
          userId: req.user.id,
          endpoint: req.path,
          method: req.method,
          reason: checkResult.reason
        });

        return res.status(403).json({
          error: 'API access denied',
          message: checkResult.reason
        });
      }

      next();
    };
  }

  /**
   * CSRF保护中间件
   */
  csrfProtect() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.csrfProtection) {
        return next();
      }

      // 对于GET、HEAD、OPTIONS请求跳过CSRF检查
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const token = req.get('X-CSRF-Token') || req.body._token;
      const sessionToken = req.session?.metadata?.csrfToken;

      if (!token || !sessionToken || token !== sessionToken) {
        this.logger.warn('CSRF令牌验证失败', {
          userId: req.user?.id,
          path: req.path,
          hasToken: !!token,
          hasSessionToken: !!sessionToken
        });

        return res.status(403).json({
          error: 'CSRF token validation failed',
          message: 'Invalid or missing CSRF token'
        });
      }

      next();
    };
  }

  /**
   * 速率限制中间件
   */
  rateLimit(config: {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
  }) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const key = config.keyGenerator ? config.keyGenerator(req) : 
                  req.user?.id || req.ip || 'anonymous';
      
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // 清理过期记录
      for (const [k, v] of requests.entries()) {
        if (v.resetTime < windowStart) {
          requests.delete(k);
        }
      }

      // 获取或创建请求记录
      let requestData = requests.get(key);
      if (!requestData || requestData.resetTime < windowStart) {
        requestData = { count: 0, resetTime: now + config.windowMs };
        requests.set(key, requestData);
      }

      requestData.count++;

      // 检查是否超出限制
      if (requestData.count > config.maxRequests) {
        const retryAfter = Math.ceil((requestData.resetTime - now) / 1000);
        
        res.set('Retry-After', retryAfter.toString());
        res.set('X-RateLimit-Limit', config.maxRequests.toString());
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', requestData.resetTime.toString());

        this.logger.warn('速率限制触发', {
          key,
          count: requestData.count,
          limit: config.maxRequests,
          path: req.path
        });

        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter
        });
      }

      // 设置响应头
      res.set('X-RateLimit-Limit', config.maxRequests.toString());
      res.set('X-RateLimit-Remaining', (config.maxRequests - requestData.count).toString());
      res.set('X-RateLimit-Reset', requestData.resetTime.toString());

      next();
    };
  }

  /**
   * 店铺访问控制中间件
   */
  requireShopAccess(shopIdParam: string = 'shopId') {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return this.handleUnauthorized(res, 'User not authenticated');
      }

      const requestedShopId = req.params[shopIdParam] || req.body[shopIdParam] || req.query[shopIdParam];
      
      if (!requestedShopId) {
        return res.status(400).json({
          error: 'Missing shop ID',
          message: 'Shop ID is required for this operation'
        });
      }

      // 检查用户是否有权访问该店铺
      if (req.user.shopId !== requestedShopId) {
        this.logger.warn('店铺访问被拒绝', {
          userId: req.user.id,
          userShopId: req.user.shopId,
          requestedShopId,
          path: req.path
        });

        return res.status(403).json({
          error: 'Shop access denied',
          message: 'You do not have access to this shop'
        });
      }

      next();
    };
  }

  /**
   * 安全头中间件
   */
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // 设置安全头
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      });

      next();
    };
  }

  /**
   * 提取会话ID
   */
  private extractSessionId(req: Request): string | null {
    // 从Cookie中获取
    const cookieSessionId = req.cookies?.['dtax-session-id'];
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
   * 处理未授权请求
   */
  private handleUnauthorized(res: Response, reason: string): void {
    this.logger.warn('未授权访问', { reason });
    
    res.status(401).json({
      error: 'Unauthorized',
      message: reason,
      code: 'AUTH_REQUIRED'
    });
  }

  /**
   * 从会话获取用户信息（模拟）
   */
  private async getUserFromSession(session: UserSession): Promise<User | null> {
    // 实际应用中这里应该从数据库获取用户信息
    // 这里返回模拟数据
    return {
      id: session.userId || 'user_' + session.shopId,
      email: 'user@example.com',
      name: 'Test User',
      shopId: session.shopId,
      roles: ['owner'], // 模拟角色
      permissions: [], // 直接权限为空，通过角色获取
      isActive: true,
      createdAt: new Date(),
      lastLoginAt: new Date()
    } as User;
  }

  /**
   * 记录访问日志
   */
  private logAccess(req: Request, user: User): void {
    this.logger.info('用户访问', {
      userId: user.id,
      shopId: user.shopId,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }
}