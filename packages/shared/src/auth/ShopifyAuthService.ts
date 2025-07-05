import crypto from 'crypto';
import { Logger } from '../utils/logger';

/**
 * Shopify OAuth认证服务
 * 处理Shopify App的OAuth流程和令牌管理
 */
export class ShopifyAuthService {
  private logger = new Logger('ShopifyAuthService');
  private clientId: string;
  private clientSecret: string;
  private scopes: string[];
  private redirectUri: string;

  constructor(config: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
    redirectUri: string;
  }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.scopes = config.scopes;
    this.redirectUri = config.redirectUri;
  }

  /**
   * 生成OAuth授权URL
   */
  generateAuthUrl(shop: string, state?: string): {
    authUrl: string;
    state: string;
  } {
    // 生成随机状态参数防止CSRF攻击
    const stateParam = state || crypto.randomBytes(32).toString('hex');
    
    // 验证店铺域名格式
    const shopDomain = this.validateShopDomain(shop);
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: this.scopes.join(','),
      redirect_uri: this.redirectUri,
      state: stateParam,
      'grant_options[]': 'per-user' // 支持用户级别授权
    });

    const authUrl = `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;

    this.logger.info('生成OAuth授权URL', {
      shop: shopDomain,
      scopes: this.scopes,
      state: stateParam
    });

    return {
      authUrl,
      state: stateParam
    };
  }

  /**
   * 验证授权回调
   */
  async validateCallback(params: {
    code: string;
    shop: string;
    state?: string;
    hmac: string;
    timestamp: string;
  }): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      // 验证店铺域名
      const shopDomain = this.validateShopDomain(params.shop);

      // 验证HMAC签名
      const isValidHmac = this.verifyHmac(params);
      if (!isValidHmac) {
        return {
          valid: false,
          error: 'Invalid HMAC signature'
        };
      }

      // 验证时间戳（防止重放攻击）
      const timestamp = parseInt(params.timestamp);
      const now = Math.floor(Date.now() / 1000);
      if (now - timestamp > 3600) { // 1小时过期
        return {
          valid: false,
          error: 'Request timestamp expired'
        };
      }

      this.logger.info('OAuth回调验证成功', {
        shop: shopDomain,
        timestamp: params.timestamp
      });

      return { valid: true };

    } catch (error) {
      this.logger.error('OAuth回调验证失败', error);
      return {
        valid: false,
        error: error.message || 'Callback validation failed'
      };
    }
  }

  /**
   * 交换访问令牌
   */
  async exchangeAccessToken(code: string, shop: string): Promise<{
    accessToken?: string;
    scope?: string;
    error?: string;
  }> {
    try {
      const shopDomain = this.validateShopDomain(shop);

      const tokenRequest = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code
      };

      const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(tokenRequest)
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }

      const tokenData = await response.json();

      this.logger.info('访问令牌交换成功', {
        shop: shopDomain,
        scope: tokenData.scope
      });

      return {
        accessToken: tokenData.access_token,
        scope: tokenData.scope
      };

    } catch (error) {
      this.logger.error('访问令牌交换失败', error);
      return {
        error: error.message || 'Token exchange failed'
      };
    }
  }

  /**
   * 验证访问令牌
   */
  async validateAccessToken(accessToken: string, shop: string): Promise<{
    valid: boolean;
    shopInfo?: any;
    error?: string;
  }> {
    try {
      const shopDomain = this.validateShopDomain(shop);

      const response = await fetch(`https://${shopDomain}/admin/api/2023-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            valid: false,
            error: 'Invalid or expired access token'
          };
        }
        throw new Error(`Token validation failed: ${response.status}`);
      }

      const data = await response.json();

      this.logger.info('访问令牌验证成功', {
        shop: shopDomain,
        shopId: data.shop.id
      });

      return {
        valid: true,
        shopInfo: data.shop
      };

    } catch (error) {
      this.logger.error('访问令牌验证失败', error);
      return {
        valid: false,
        error: error.message || 'Token validation failed'
      };
    }
  }

  /**
   * 生成应用卸载URL
   */
  generateUninstallUrl(shop: string): string {
    const shopDomain = this.validateShopDomain(shop);
    return `https://${shopDomain}/admin/api/2023-10/webhooks.json`;
  }

  /**
   * 验证Webhook HMAC
   */
  verifyWebhookHmac(data: string, hmacHeader: string): boolean {
    const hmac = crypto
      .createHmac('sha256', this.clientSecret)
      .update(data, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'base64'),
      Buffer.from(hmacHeader, 'base64')
    );
  }

  /**
   * 验证店铺域名格式
   */
  private validateShopDomain(shop: string): string {
    // 移除协议和路径
    let cleanShop = shop.replace(/^https?:\/\//, '').split('/')[0];
    
    // 如果没有.myshopify.com后缀，则添加
    if (!cleanShop.endsWith('.myshopify.com')) {
      cleanShop = `${cleanShop}.myshopify.com`;
    }

    // 验证域名格式
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]\.myshopify\.com$/;
    if (!shopRegex.test(cleanShop)) {
      throw new Error(`Invalid shop domain: ${shop}`);
    }

    return cleanShop;
  }

  /**
   * 验证HMAC签名
   */
  private verifyHmac(params: Record<string, string>): boolean {
    const { hmac, ...queryParams } = params;

    // 构建查询字符串（排除hmac和signature参数）
    const sortedParams = Object.keys(queryParams)
      .filter(key => key !== 'signature')
      .sort()
      .map(key => `${key}=${queryParams[key]}`)
      .join('&');

    // 计算HMAC
    const calculatedHmac = crypto
      .createHmac('sha256', this.clientSecret)
      .update(sortedParams)
      .digest('hex');

    // 安全比较
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac, 'hex'),
      Buffer.from(hmac, 'hex')
    );
  }

  /**
   * 刷新访问令牌（如果支持）
   */
  async refreshAccessToken(refreshToken: string, shop: string): Promise<{
    accessToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    // Shopify App访问令牌通常不会过期，此方法为扩展预留
    try {
      // 对于Shopify App，通常需要重新授权而不是刷新令牌
      this.logger.warn('Shopify App访问令牌不支持刷新，需要重新授权', { shop });
      
      return {
        error: 'Shopify App tokens do not support refresh, re-authorization required'
      };

    } catch (error) {
      this.logger.error('令牌刷新失败', error);
      return {
        error: error.message || 'Token refresh failed'
      };
    }
  }

  /**
   * 获取应用信息
   */
  async getAppInfo(accessToken: string, shop: string): Promise<{
    app?: any;
    error?: string;
  }> {
    try {
      const shopDomain = this.validateShopDomain(shop);

      const response = await fetch(`https://${shopDomain}/admin/api/2023-10/application_credits.json`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`App info request failed: ${response.status}`);
      }

      const data = await response.json();
      return { app: data };

    } catch (error) {
      this.logger.error('获取应用信息失败', error);
      return {
        error: error.message || 'Failed to get app info'
      };
    }
  }

  /**
   * 检查应用权限
   */
  async checkPermissions(accessToken: string, shop: string, requiredScopes: string[]): Promise<{
    hasPermission: boolean;
    missingScopes?: string[];
    error?: string;
  }> {
    try {
      // 获取当前授权的作用域
      const validation = await this.validateAccessToken(accessToken, shop);
      
      if (!validation.valid) {
        return {
          hasPermission: false,
          error: validation.error
        };
      }

      // 这里需要从Shopify API获取当前的作用域
      // 由于Shopify不直接提供获取当前作用域的API，我们使用间接方法
      const currentScopes = this.scopes; // 假设使用配置的作用域

      const missingScopes = requiredScopes.filter(scope => !currentScopes.includes(scope));

      return {
        hasPermission: missingScopes.length === 0,
        missingScopes: missingScopes.length > 0 ? missingScopes : undefined
      };

    } catch (error) {
      this.logger.error('检查权限失败', error);
      return {
        hasPermission: false,
        error: error.message || 'Permission check failed'
      };
    }
  }
}