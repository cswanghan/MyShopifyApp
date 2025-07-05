import { ShopifyAuthService } from './ShopifyAuthService';
import { SessionManager } from './SessionManager';
import { PermissionManager, User, Permission, Role } from './PermissionManager';
import { MultiStoreManager, Shop } from '../multistore/MultiStoreManager';
import { Logger } from '../utils/logger';

/**
 * 认证服务配置
 */
export interface AuthServiceConfig {
  shopify: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
    redirectUri: string;
  };
  session?: {
    sessionTimeout?: number;
    enableAutoCleanup?: boolean;
  };
  multiStore?: {
    enableMultiStore?: boolean;
  };
}

/**
 * 认证结果
 */
export interface AuthResult {
  success: boolean;
  sessionId?: string;
  user?: User;
  shop?: Shop;
  redirectUrl?: string;
  error?: string;
  requiresAuth?: boolean;
}

/**
 * 完整的认证服务
 * 整合Shopify OAuth、会话管理、权限管理和多店铺支持
 */
export class AuthService {
  private logger = new Logger('AuthService');
  private shopifyAuth: ShopifyAuthService;
  private sessionManager: SessionManager;
  private permissionManager: PermissionManager;
  private multiStoreManager: MultiStoreManager;
  private config: AuthServiceConfig;

  constructor(config: AuthServiceConfig) {
    this.config = config;
    
    // 初始化各个服务
    this.shopifyAuth = new ShopifyAuthService(config.shopify);
    this.sessionManager = new SessionManager(config.session);
    this.permissionManager = new PermissionManager();
    this.multiStoreManager = new MultiStoreManager();
  }

  /**
   * 开始OAuth认证流程
   */
  async startAuth(shop: string, state?: string): Promise<{
    authUrl: string;
    state: string;
  }> {
    try {
      this.logger.info('开始OAuth认证流程', { shop });
      
      const authData = this.shopifyAuth.generateAuthUrl(shop, state);
      
      return authData;
    } catch (error) {
      this.logger.error('启动认证失败', error);
      throw error;
    }
  }

  /**
   * 处理OAuth回调
   */
  async handleCallback(params: {
    code: string;
    shop: string;
    state?: string;
    hmac: string;
    timestamp: string;
  }): Promise<AuthResult> {
    try {
      this.logger.info('处理OAuth回调', { shop: params.shop });

      // 1. 验证回调参数
      const validation = await this.shopifyAuth.validateCallback(params);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          requiresAuth: true
        };
      }

      // 2. 交换访问令牌
      const tokenResult = await this.shopifyAuth.exchangeAccessToken(params.code, params.shop);
      if (tokenResult.error) {
        return {
          success: false,
          error: tokenResult.error,
          requiresAuth: true
        };
      }

      // 3. 验证访问令牌并获取店铺信息
      const tokenValidation = await this.shopifyAuth.validateAccessToken(
        tokenResult.accessToken!,
        params.shop
      );
      
      if (!tokenValidation.valid) {
        return {
          success: false,
          error: tokenValidation.error,
          requiresAuth: true
        };
      }

      // 4. 注册或更新店铺信息
      const shop = await this.multiStoreManager.registerShop({
        domain: params.shop,
        accessToken: tokenResult.accessToken!,
        scope: tokenResult.scope?.split(',') || [],
        shopInfo: tokenValidation.shopInfo
      });

      // 5. 创建用户会话
      const sessionId = await this.sessionManager.createSession({
        shopId: shop.id,
        shopDomain: shop.domain,
        userId: `user_${shop.id}`, // 生成用户ID
        accessToken: tokenResult.accessToken!,
        scope: shop.scope,
        metadata: {
          csrfToken: this.generateCsrfToken(),
          shopInfo: tokenValidation.shopInfo
        }
      });

      // 6. 创建用户对象
      const user: User = {
        id: `user_${shop.id}`,
        email: shop.email,
        name: shop.name,
        shopId: shop.id,
        roles: [Role.OWNER], // 默认为店铺所有者
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        metadata: {
          shopInfo: tokenValidation.shopInfo
        }
      };

      this.logger.info('OAuth认证成功', {
        shop: shop.domain,
        sessionId,
        userId: user.id
      });

      return {
        success: true,
        sessionId,
        user,
        shop,
        redirectUrl: '/dashboard'
      };

    } catch (error) {
      this.logger.error('OAuth回调处理失败', error);
      return {
        success: false,
        error: error.message || 'Authentication failed',
        requiresAuth: true
      };
    }
  }

  /**
   * 验证用户会话
   */
  async validateSession(sessionId: string): Promise<AuthResult> {
    try {
      if (!sessionId) {
        return {
          success: false,
          error: 'Missing session ID',
          requiresAuth: true
        };
      }

      // 验证会话
      const sessionValidation = await this.sessionManager.validateSession(sessionId);
      if (!sessionValidation.valid) {
        return {
          success: false,
          error: sessionValidation.reason,
          requiresAuth: true
        };
      }

      const session = sessionValidation.session!;

      // 获取店铺信息
      const shop = await this.multiStoreManager.getShop(session.shopId);
      if (!shop || !shop.isActive) {
        return {
          success: false,
          error: 'Shop not found or inactive',
          requiresAuth: true
        };
      }

      // 验证访问令牌是否仍然有效
      const tokenValidation = await this.shopifyAuth.validateAccessToken(
        session.accessToken,
        shop.domain
      );

      if (!tokenValidation.valid) {
        // 令牌无效，清理会话
        await this.sessionManager.deleteSession(sessionId);
        return {
          success: false,
          error: 'Access token expired',
          requiresAuth: true
        };
      }

      // 创建用户对象
      const user: User = {
        id: session.userId || `user_${shop.id}`,
        email: shop.email,
        name: shop.name,
        shopId: shop.id,
        roles: [Role.OWNER], // 从数据库获取实际角色
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: new Date()
      };

      // 刷新会话
      await this.sessionManager.refreshSession(sessionId);

      return {
        success: true,
        sessionId,
        user,
        shop
      };

    } catch (error) {
      this.logger.error('会话验证失败', error);
      return {
        success: false,
        error: error.message || 'Session validation failed',
        requiresAuth: true
      };
    }
  }

  /**
   * 用户登出
   */
  async logout(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.sessionManager.deleteSession(sessionId);
      
      this.logger.info('用户登出成功', { sessionId });
      
      return { success: true };
    } catch (error) {
      this.logger.error('登出失败', error);
      return {
        success: false,
        error: error.message || 'Logout failed'
      };
    }
  }

  /**
   * 切换店铺
   */
  async switchShop(
    sessionId: string,
    newShopId: string
  ): Promise<AuthResult> {
    try {
      // 验证当前会话
      const currentValidation = await this.validateSession(sessionId);
      if (!currentValidation.success) {
        return currentValidation;
      }

      const currentUser = currentValidation.user!;

      // 尝试切换店铺
      const switchResult = await this.multiStoreManager.switchShop(
        currentUser.id,
        newShopId
      );

      if (!switchResult.success) {
        return {
          success: false,
          error: switchResult.error
        };
      }

      const newShop = switchResult.shop!;

      // 更新会话中的店铺信息
      const updateSuccess = await this.sessionManager.updateSession(sessionId, {
        shopId: newShop.id,
        accessToken: newShop.accessToken,
        scope: newShop.scope
      });

      if (!updateSuccess) {
        return {
          success: false,
          error: 'Failed to update session'
        };
      }

      // 创建新的用户对象
      const newUser: User = {
        ...currentUser,
        shopId: newShop.id
      };

      this.logger.info('店铺切换成功', {
        userId: currentUser.id,
        fromShopId: currentUser.shopId,
        toShopId: newShop.id
      });

      return {
        success: true,
        sessionId,
        user: newUser,
        shop: newShop
      };

    } catch (error) {
      this.logger.error('店铺切换失败', error);
      return {
        success: false,
        error: error.message || 'Shop switch failed'
      };
    }
  }

  /**
   * 获取用户权限
   */
  getUserPermissions(user: User): Permission[] {
    return this.permissionManager.getUserPermissions(user);
  }

  /**
   * 检查用户权限
   */
  checkPermission(user: User, permission: Permission | Permission[]): boolean {
    const result = this.permissionManager.checkPermission(user, permission);
    return result.allowed;
  }

  /**
   * 获取用户可访问的店铺列表
   */
  async getUserShops(userId: string): Promise<Shop[]> {
    try {
      return await this.multiStoreManager.getUserShops(userId);
    } catch (error) {
      this.logger.error('获取用户店铺列表失败', error);
      return [];
    }
  }

  /**
   * 验证Webhook HMAC
   */
  verifyWebhookHmac(data: string, hmacHeader: string): boolean {
    return this.shopifyAuth.verifyWebhookHmac(data, hmacHeader);
  }

  /**
   * 处理应用卸载
   */
  async handleAppUninstall(shopDomain: string): Promise<void> {
    try {
      this.logger.info('处理应用卸载', { shopDomain });

      // 停用店铺
      const shop = await this.multiStoreManager.getShopByDomain(shopDomain);
      if (shop) {
        await this.multiStoreManager.deactivateShop(shop.id, 'App uninstalled');
      }

      // 清理相关会话
      await this.sessionManager.deleteShopSessions(shopDomain);

      this.logger.info('应用卸载处理完成', { shopDomain });
    } catch (error) {
      this.logger.error('处理应用卸载失败', error);
    }
  }

  /**
   * 获取认证统计信息
   */
  getAuthStats(): {
    sessions: any;
    shops: Promise<any>;
  } {
    return {
      sessions: this.sessionManager.getSessionStats(),
      shops: this.multiStoreManager.getShopStats()
    };
  }

  /**
   * 生成CSRF令牌
   */
  private generateCsrfToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * 清理资源
   */
  async shutdown(): Promise<void> {
    await this.sessionManager.shutdown();
    this.logger.info('认证服务已关闭');
  }
}