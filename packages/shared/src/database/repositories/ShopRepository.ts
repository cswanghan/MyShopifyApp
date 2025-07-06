import { PrismaClient } from '@prisma/client';
import { BaseRepository, QueryOptions } from './BaseRepository';
import { Shop } from '../models';

export interface ShopFilter {
  domain?: string;
  isActive?: boolean;
  isTest?: boolean;
  country?: string;
  plan?: string;
  installedAfter?: Date;
  installedBefore?: Date;
}

export interface ShopCreateData {
  shopifyId: string;
  domain: string;
  name: string;
  email: string;
  phone?: string;
  country: string;
  province?: string;
  city?: string;
  timezone?: string;
  currency?: string;
  plan: string;
  accessToken: string;
  scope: string[];
  isTest?: boolean;
}

export interface ShopUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  currency?: string;
  plan?: string;
  accessToken?: string;
  scope?: string[];
  isActive?: boolean;
  lastSyncAt?: Date;
}

export class ShopRepository extends BaseRepository<Shop> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'Shop');
  }

  protected getModel() {
    return this.prisma.shop;
  }

  /**
   * 根据域名查找店铺
   */
  async findByDomain(domain: string): Promise<Shop | null> {
    try {
      const shop = await this.getModel().findUnique({
        where: { domain },
        include: {
          users: true,
          settings: true
        }
      });

      if (shop) {
        this.logger.debug('Shop found by domain', { domain, shopId: shop.id });
      }

      return shop;
    } catch (error) {
      this.logger.error('Failed to find shop by domain', error, { domain });
      throw error;
    }
  }

  /**
   * 根据Shopify ID查找店铺
   */
  async findByShopifyId(shopifyId: string): Promise<Shop | null> {
    try {
      const shop = await this.getModel().findUnique({
        where: { shopifyId },
        include: {
          users: true,
          settings: true
        }
      });

      if (shop) {
        this.logger.debug('Shop found by Shopify ID', { shopifyId, shopId: shop.id });
      }

      return shop;
    } catch (error) {
      this.logger.error('Failed to find shop by Shopify ID', error, { shopifyId });
      throw error;
    }
  }

  /**
   * 根据过滤条件查找店铺
   */
  async findByFilter(filter: ShopFilter, options?: QueryOptions) {
    try {
      const where: any = {};

      if (filter.domain) {
        where.domain = { contains: filter.domain, mode: 'insensitive' };
      }

      if (filter.isActive !== undefined) {
        where.isActive = filter.isActive;
      }

      if (filter.isTest !== undefined) {
        where.isTest = filter.isTest;
      }

      if (filter.country) {
        where.country = filter.country;
      }

      if (filter.plan) {
        where.plan = filter.plan;
      }

      if (filter.installedAfter || filter.installedBefore) {
        where.installedAt = {};
        if (filter.installedAfter) {
          where.installedAt.gte = filter.installedAfter;
        }
        if (filter.installedBefore) {
          where.installedAt.lte = filter.installedBefore;
        }
      }

      return await this.findMany({
        ...options,
        where: { ...where, ...options?.where },
        include: {
          users: true,
          settings: true,
          ...options?.include
        }
      });
    } catch (error) {
      this.logger.error('Failed to find shops by filter', error, { filter });
      throw error;
    }
  }

  /**
   * 创建店铺
   */
  async createShop(data: ShopCreateData): Promise<Shop> {
    try {
      const shop = await this.create({
        shopifyId: data.shopifyId,
        domain: data.domain,
        name: data.name,
        email: data.email,
        phone: data.phone,
        country: data.country,
        province: data.province,
        city: data.city,
        timezone: data.timezone || 'UTC',
        currency: data.currency || 'USD',
        plan: data.plan,
        accessToken: data.accessToken,
        scope: data.scope,
        isTest: data.isTest || false,
        installedAt: new Date()
      });

      this.logger.info('Shop created', { 
        shopId: shop.id, 
        domain: data.domain,
        shopifyId: data.shopifyId 
      });

      return shop;
    } catch (error) {
      this.logger.error('Failed to create shop', error, { data });
      throw error;
    }
  }

  /**
   * 更新店铺信息
   */
  async updateShop(id: string, data: ShopUpdateData): Promise<Shop> {
    try {
      const shop = await this.update(id, data);

      this.logger.info('Shop updated', { 
        shopId: id, 
        updatedFields: Object.keys(data) 
      });

      return shop;
    } catch (error) {
      this.logger.error('Failed to update shop', error, { id, data });
      throw error;
    }
  }

  /**
   * 停用店铺
   */
  async deactivateShop(id: string, reason?: string): Promise<boolean> {
    try {
      await this.update(id, {
        isActive: false,
        uninstalledAt: new Date()
      });

      this.logger.info('Shop deactivated', { shopId: id, reason });
      return true;
    } catch (error) {
      this.logger.error('Failed to deactivate shop', error, { id, reason });
      return false;
    }
  }

  /**
   * 激活店铺
   */
  async activateShop(id: string): Promise<boolean> {
    try {
      await this.update(id, {
        isActive: true,
        uninstalledAt: null,
        lastSyncAt: new Date()
      });

      this.logger.info('Shop activated', { shopId: id });
      return true;
    } catch (error) {
      this.logger.error('Failed to activate shop', error, { id });
      return false;
    }
  }

  /**
   * 更新访问令牌
   */
  async updateAccessToken(id: string, accessToken: string, scope: string[]): Promise<boolean> {
    try {
      await this.update(id, {
        accessToken,
        scope,
        lastSyncAt: new Date()
      });

      this.logger.info('Shop access token updated', { shopId: id });
      return true;
    } catch (error) {
      this.logger.error('Failed to update shop access token', error, { id });
      return false;
    }
  }

  /**
   * 获取活跃店铺统计
   */
  async getActiveShopsStats(): Promise<{
    total: number;
    byCountry: Record<string, number>;
    byPlan: Record<string, number>;
    recentInstalls: number;
  }> {
    try {
      const [
        total,
        byCountry,
        byPlan,
        recentInstalls
      ] = await Promise.all([
        this.count({ isActive: true }),
        this.groupBy({
          by: ['country'],
          where: { isActive: true },
          _count: { country: true }
        }),
        this.groupBy({
          by: ['plan'],
          where: { isActive: true },
          _count: { plan: true }
        }),
        this.count({
          isActive: true,
          installedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
          }
        })
      ]);

      const countryStats = byCountry.reduce((acc: Record<string, number>, item: any) => {
        acc[item.country] = item._count.country;
        return acc;
      }, {});

      const planStats = byPlan.reduce((acc: Record<string, number>, item: any) => {
        acc[item.plan] = item._count.plan;
        return acc;
      }, {});

      return {
        total,
        byCountry: countryStats,
        byPlan: planStats,
        recentInstalls
      };
    } catch (error) {
      this.logger.error('Failed to get active shops stats', error);
      throw error;
    }
  }

  /**
   * 获取需要同步的店铺
   */
  async getShopsToSync(maxAge: number = 24): Promise<Shop[]> {
    try {
      const cutoffTime = new Date(Date.now() - maxAge * 60 * 60 * 1000);

      return await this.findMany({
        where: {
          isActive: true,
          OR: [
            { lastSyncAt: null },
            { lastSyncAt: { lt: cutoffTime } }
          ]
        },
        orderBy: {
          lastSyncAt: 'asc'
        }
      });
    } catch (error) {
      this.logger.error('Failed to get shops to sync', error, { maxAge });
      throw error;
    }
  }

  /**
   * 批量更新店铺同步时间
   */
  async updateSyncTime(shopIds: string[]): Promise<number> {
    try {
      const result = await this.updateMany(
        { id: { in: shopIds } },
        { lastSyncAt: new Date() }
      );

      this.logger.info('Batch updated shop sync time', { 
        count: result.count, 
        shopIds: shopIds.length 
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to batch update shop sync time', error, { shopIds });
      throw error;
    }
  }

  /**
   * 获取店铺设置
   */
  async getShopSettings(shopId: string, category?: string): Promise<any[]> {
    try {
      const where: any = { shopId };
      if (category) {
        where.category = category;
      }

      const settings = await this.prisma.shopSettings.findMany({
        where,
        orderBy: { key: 'asc' }
      });

      return settings;
    } catch (error) {
      this.logger.error('Failed to get shop settings', error, { shopId, category });
      throw error;
    }
  }

  /**
   * 更新店铺设置
   */
  async updateShopSettings(
    shopId: string, 
    category: string, 
    key: string, 
    value: any,
    updatedBy?: string
  ): Promise<any> {
    try {
      const setting = await this.prisma.shopSettings.upsert({
        where: {
          shopId_category_key: {
            shopId,
            category,
            key
          }
        },
        update: {
          value,
          updatedBy,
          updatedAt: new Date()
        },
        create: {
          shopId,
          category,
          key,
          value,
          updatedBy
        }
      });

      this.logger.info('Shop setting updated', { 
        shopId, 
        category, 
        key, 
        updatedBy 
      });

      return setting;
    } catch (error) {
      this.logger.error('Failed to update shop setting', error, { 
        shopId, 
        category, 
        key, 
        value 
      });
      throw error;
    }
  }

  /**
   * 删除过期的未激活店铺
   */
  async cleanupInactiveShops(daysOld: number = 90): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await this.deleteMany({
        isActive: false,
        uninstalledAt: {
          lt: cutoffTime
        }
      });

      this.logger.info('Cleaned up inactive shops', { 
        count: result.count, 
        daysOld 
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup inactive shops', error, { daysOld });
      throw error;
    }
  }
}