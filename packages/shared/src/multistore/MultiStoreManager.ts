import { Logger } from '../utils/logger';
import { UserSession } from '../auth/SessionManager';

/**
 * 店铺信息接口
 */
export interface Shop {
  id: string;
  domain: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  country: string;
  province?: string;
  accessToken: string;
  scope: string[];
  plan: string;
  isActive: boolean;
  installedAt: Date;
  lastSyncAt?: Date;
  settings: ShopSettings;
  metadata?: Record<string, any>;
}

/**
 * 店铺设置接口
 */
export interface ShopSettings {
  taxSettings: {
    iossNumber?: string;
    ukVatNumber?: string;
    euVatNumbers?: Record<string, string>;
    enableAutoCalculation: boolean;
    defaultTaxInclusive: boolean;
  };
  logisticsSettings: {
    providers: Array<{
      name: string;
      apiKey: string;
      isEnabled: boolean;
      config: Record<string, any>;
    }>;
    defaultProvider?: string;
    enableAutoSelection: boolean;
  };
  complianceSettings: {
    enableIOSS: boolean;
    enableUKVAT: boolean;
    enableSection321: boolean;
    autoSubmitReports: boolean;
  };
  notificationSettings: {
    email: string;
    enableOrderNotifications: boolean;
    enableComplianceAlerts: boolean;
    enableSystemUpdates: boolean;
  };
}

/**
 * 多店铺上下文
 */
export interface MultiStoreContext {
  currentShop: Shop;
  availableShops: Shop[];
  canSwitchShops: boolean;
  permissions: string[];
}

/**
 * 店铺存储接口
 */
export interface ShopStore {
  get(shopId: string): Promise<Shop | null>;
  getByDomain(domain: string): Promise<Shop | null>;
  getByUser(userId: string): Promise<Shop[]>;
  save(shop: Shop): Promise<void>;
  delete(shopId: string): Promise<void>;
  list(filters?: {
    isActive?: boolean;
    plan?: string;
    country?: string;
  }): Promise<Shop[]>;
  updateSettings(shopId: string, settings: Partial<ShopSettings>): Promise<void>;
}

/**
 * 内存店铺存储实现
 */
export class MemoryShopStore implements ShopStore {
  private shops = new Map<string, Shop>();
  private userShops = new Map<string, string[]>(); // userId -> shopIds[]
  private logger = new Logger('MemoryShopStore');

  async get(shopId: string): Promise<Shop | null> {
    return this.shops.get(shopId) || null;
  }

  async getByDomain(domain: string): Promise<Shop | null> {
    for (const shop of this.shops.values()) {
      if (shop.domain === domain) {
        return shop;
      }
    }
    return null;
  }

  async getByUser(userId: string): Promise<Shop[]> {
    const shopIds = this.userShops.get(userId) || [];
    const shops: Shop[] = [];
    
    for (const shopId of shopIds) {
      const shop = await this.get(shopId);
      if (shop) {
        shops.push(shop);
      }
    }
    
    return shops;
  }

  async save(shop: Shop): Promise<void> {
    this.shops.set(shop.id, shop);
    this.logger.debug('店铺已保存', { shopId: shop.id, domain: shop.domain });
  }

  async delete(shopId: string): Promise<void> {
    const deleted = this.shops.delete(shopId);
    if (deleted) {
      // 清理用户关联
      for (const [userId, shopIds] of this.userShops.entries()) {
        const index = shopIds.indexOf(shopId);
        if (index > -1) {
          shopIds.splice(index, 1);
          this.userShops.set(userId, shopIds);
        }
      }
      this.logger.info('店铺已删除', { shopId });
    }
  }

  async list(filters?: {
    isActive?: boolean;
    plan?: string;
    country?: string;
  }): Promise<Shop[]> {
    let shops = Array.from(this.shops.values());
    
    if (filters) {
      if (filters.isActive !== undefined) {
        shops = shops.filter(shop => shop.isActive === filters.isActive);
      }
      if (filters.plan) {
        shops = shops.filter(shop => shop.plan === filters.plan);
      }
      if (filters.country) {
        shops = shops.filter(shop => shop.country === filters.country);
      }
    }
    
    return shops;
  }

  async updateSettings(shopId: string, settings: Partial<ShopSettings>): Promise<void> {
    const shop = await this.get(shopId);
    if (shop) {
      shop.settings = { ...shop.settings, ...settings };
      await this.save(shop);
      this.logger.info('店铺设置已更新', { shopId, updatedFields: Object.keys(settings) });
    }
  }

  // 添加用户和店铺的关联
  async linkUserToShop(userId: string, shopId: string): Promise<void> {
    const shopIds = this.userShops.get(userId) || [];
    if (!shopIds.includes(shopId)) {
      shopIds.push(shopId);
      this.userShops.set(userId, shopIds);
      this.logger.info('用户店铺关联已创建', { userId, shopId });
    }
  }

  // 移除用户和店铺的关联
  async unlinkUserFromShop(userId: string, shopId: string): Promise<void> {
    const shopIds = this.userShops.get(userId) || [];
    const index = shopIds.indexOf(shopId);
    if (index > -1) {
      shopIds.splice(index, 1);
      this.userShops.set(userId, shopIds);
      this.logger.info('用户店铺关联已移除', { userId, shopId });
    }
  }
}

/**
 * 多店铺管理器
 */
export class MultiStoreManager {
  private logger = new Logger('MultiStoreManager');
  private shopStore: ShopStore;

  constructor(config: {
    shopStore?: ShopStore;
  } = {}) {
    this.shopStore = config.shopStore || new MemoryShopStore();
  }

  /**
   * 注册新店铺
   */
  async registerShop(shopData: {
    domain: string;
    accessToken: string;
    scope: string[];
    shopInfo: any; // 从Shopify API获取的店铺信息
  }): Promise<Shop> {
    const { domain, accessToken, scope, shopInfo } = shopData;

    // 检查店铺是否已存在
    const existingShop = await this.shopStore.getByDomain(domain);
    if (existingShop) {
      // 更新现有店铺信息
      existingShop.accessToken = accessToken;
      existingShop.scope = scope;
      existingShop.lastSyncAt = new Date();
      existingShop.isActive = true;
      
      await this.shopStore.save(existingShop);
      this.logger.info('店铺信息已更新', { shopId: existingShop.id, domain });
      return existingShop;
    }

    // 创建新店铺
    const shop: Shop = {
      id: `shop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      domain,
      name: shopInfo.name || domain,
      email: shopInfo.email || '',
      currency: shopInfo.currency || 'USD',
      timezone: shopInfo.timezone || 'UTC',
      country: shopInfo.country_code || 'US',
      province: shopInfo.province_code,
      accessToken,
      scope,
      plan: shopInfo.plan_name || 'basic',
      isActive: true,
      installedAt: new Date(),
      lastSyncAt: new Date(),
      settings: this.getDefaultSettings(),
      metadata: {
        shopifyId: shopInfo.id,
        shopifyPlan: shopInfo.plan_name,
        myshopifyDomain: shopInfo.myshopify_domain
      }
    };

    await this.shopStore.save(shop);
    this.logger.info('新店铺已注册', { shopId: shop.id, domain });

    return shop;
  }

  /**
   * 获取店铺信息
   */
  async getShop(shopId: string): Promise<Shop | null> {
    return await this.shopStore.get(shopId);
  }

  /**
   * 根据域名获取店铺
   */
  async getShopByDomain(domain: string): Promise<Shop | null> {
    return await this.shopStore.getByDomain(domain);
  }

  /**
   * 获取用户可访问的店铺列表
   */
  async getUserShops(userId: string): Promise<Shop[]> {
    return await this.shopStore.getByUser(userId);
  }

  /**
   * 创建多店铺上下文
   */
  async createContext(session: UserSession, currentShopId?: string): Promise<MultiStoreContext> {
    const availableShops = await this.getUserShops(session.userId || '');
    
    let currentShop: Shop;
    if (currentShopId) {
      const shop = await this.getShop(currentShopId);
      if (!shop || !availableShops.find(s => s.id === shop.id)) {
        throw new Error('Shop not found or access denied');
      }
      currentShop = shop;
    } else {
      // 使用会话中的店铺或第一个可用店铺
      const sessionShop = availableShops.find(s => s.id === session.shopId);
      currentShop = sessionShop || availableShops[0];
      if (!currentShop) {
        throw new Error('No accessible shops found');
      }
    }

    return {
      currentShop,
      availableShops,
      canSwitchShops: availableShops.length > 1,
      permissions: session.scope || []
    };
  }

  /**
   * 切换当前店铺
   */
  async switchShop(userId: string, newShopId: string): Promise<{
    success: boolean;
    shop?: Shop;
    error?: string;
  }> {
    try {
      // 验证用户是否有权访问目标店铺
      const userShops = await this.getUserShops(userId);
      const targetShop = userShops.find(shop => shop.id === newShopId);
      
      if (!targetShop) {
        return {
          success: false,
          error: 'Shop not found or access denied'
        };
      }

      if (!targetShop.isActive) {
        return {
          success: false,
          error: 'Shop is inactive'
        };
      }

      this.logger.info('店铺切换成功', { userId, newShopId, shopDomain: targetShop.domain });

      return {
        success: true,
        shop: targetShop
      };

    } catch (error) {
      this.logger.error('店铺切换失败', error, { userId, newShopId });
      return {
        success: false,
        error: error.message || 'Shop switch failed'
      };
    }
  }

  /**
   * 更新店铺设置
   */
  async updateShopSettings(
    shopId: string, 
    settings: Partial<ShopSettings>,
    userId?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // 验证店铺存在
      const shop = await this.getShop(shopId);
      if (!shop) {
        return { success: false, error: 'Shop not found' };
      }

      // 验证用户权限（如果提供了userId）
      if (userId) {
        const userShops = await this.getUserShops(userId);
        if (!userShops.find(s => s.id === shopId)) {
          return { success: false, error: 'Access denied' };
        }
      }

      await this.shopStore.updateSettings(shopId, settings);
      
      this.logger.info('店铺设置已更新', { 
        shopId, 
        userId, 
        updatedFields: Object.keys(settings) 
      });

      return { success: true };

    } catch (error) {
      this.logger.error('更新店铺设置失败', error, { shopId, userId });
      return {
        success: false,
        error: error.message || 'Settings update failed'
      };
    }
  }

  /**
   * 停用店铺
   */
  async deactivateShop(shopId: string, reason?: string): Promise<void> {
    const shop = await this.getShop(shopId);
    if (shop) {
      shop.isActive = false;
      shop.metadata = {
        ...shop.metadata,
        deactivatedAt: new Date().toISOString(),
        deactivationReason: reason
      };
      
      await this.shopStore.save(shop);
      this.logger.info('店铺已停用', { shopId, reason });
    }
  }

  /**
   * 激活店铺
   */
  async activateShop(shopId: string): Promise<void> {
    const shop = await this.getShop(shopId);
    if (shop) {
      shop.isActive = true;
      shop.lastSyncAt = new Date();
      
      // 清理停用相关的元数据
      if (shop.metadata) {
        delete shop.metadata.deactivatedAt;
        delete shop.metadata.deactivationReason;
      }
      
      await this.shopStore.save(shop);
      this.logger.info('店铺已激活', { shopId });
    }
  }

  /**
   * 同步店铺信息
   */
  async syncShopInfo(shopId: string, shopInfo: any): Promise<void> {
    const shop = await this.getShop(shopId);
    if (shop) {
      // 更新可变信息
      shop.name = shopInfo.name || shop.name;
      shop.email = shopInfo.email || shop.email;
      shop.currency = shopInfo.currency || shop.currency;
      shop.timezone = shopInfo.timezone || shop.timezone;
      shop.plan = shopInfo.plan_name || shop.plan;
      shop.lastSyncAt = new Date();
      
      await this.shopStore.save(shop);
      this.logger.debug('店铺信息已同步', { shopId });
    }
  }

  /**
   * 获取店铺统计信息
   */
  async getShopStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byPlan: Record<string, number>;
    byCountry: Record<string, number>;
  }> {
    const allShops = await this.shopStore.list();
    
    const stats = {
      total: allShops.length,
      active: allShops.filter(shop => shop.isActive).length,
      inactive: allShops.filter(shop => !shop.isActive).length,
      byPlan: {} as Record<string, number>,
      byCountry: {} as Record<string, number>
    };

    // 按计划统计
    for (const shop of allShops) {
      stats.byPlan[shop.plan] = (stats.byPlan[shop.plan] || 0) + 1;
      stats.byCountry[shop.country] = (stats.byCountry[shop.country] || 0) + 1;
    }

    return stats;
  }

  /**
   * 获取默认店铺设置
   */
  private getDefaultSettings(): ShopSettings {
    return {
      taxSettings: {
        enableAutoCalculation: true,
        defaultTaxInclusive: false
      },
      logisticsSettings: {
        providers: [],
        enableAutoSelection: true
      },
      complianceSettings: {
        enableIOSS: true,
        enableUKVAT: true,
        enableSection321: true,
        autoSubmitReports: false
      },
      notificationSettings: {
        email: '',
        enableOrderNotifications: true,
        enableComplianceAlerts: true,
        enableSystemUpdates: true
      }
    };
  }
}