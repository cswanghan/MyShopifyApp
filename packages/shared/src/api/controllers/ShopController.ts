import { Request, Response } from 'express';
import { BaseController, BadRequestError, NotFoundError, ForbiddenError } from '../BaseController';
import { ShopRepository, ShopFilter, ShopUpdateData } from '../../database/repositories/ShopRepository';
import { Permission } from '../../auth/PermissionManager';

export class ShopController extends BaseController {
  private shopRepository: ShopRepository;

  constructor(shopRepository: ShopRepository) {
    super('ShopController');
    this.shopRepository = shopRepository;
  }

  /**
   * 获取当前店铺信息
   * GET /api/shops/current
   */
  getCurrentShop = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    this.logApiAccess(req, 'GET_CURRENT_SHOP', currentShop.id);
    
    return this.success(res, currentShop);
  });

  /**
   * 获取店铺详情
   * GET /api/shops/:id
   */
  getShop = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    // 检查权限
    this.checkResourcePermission(req, id);

    const shop = await this.shopRepository.findById(id);
    if (!shop) {
      throw new NotFoundError('Shop not found');
    }

    this.logApiAccess(req, 'GET_SHOP', id);
    
    return this.success(res, shop);
  });

  /**
   * 获取店铺列表（仅管理员）
   * GET /api/shops
   */
  getShops = this.asyncHandler(async (req: Request, res: Response) => {
    const currentUser = this.getCurrentUser(req);
    
    // 检查管理员权限
    if (!req.auth?.permissions?.includes(Permission.ADMIN_ACCESS)) {
      throw new ForbiddenError('Admin access required');
    }

    const pagination = this.parsePaginationParams(req);
    const { 
      domain, 
      isActive, 
      isTest, 
      country, 
      plan,
      installedAfter,
      installedBefore 
    } = req.query;

    const filter: ShopFilter = {};
    
    if (domain) filter.domain = domain as string;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isTest !== undefined) filter.isTest = isTest === 'true';
    if (country) filter.country = country as string;
    if (plan) filter.plan = plan as string;
    if (installedAfter) filter.installedAfter = new Date(installedAfter as string);
    if (installedBefore) filter.installedBefore = new Date(installedBefore as string);

    const orderBy = this.parseOrderBy(
      pagination.orderBy,
      pagination.orderDirection,
      ['name', 'domain', 'installedAt', 'lastSyncAt', 'plan']
    );

    const shops = await this.shopRepository.findByFilter(filter, {
      orderBy: orderBy || { installedAt: 'desc' }
    });

    this.logApiAccess(req, 'LIST_SHOPS', undefined, { filterCount: Object.keys(filter).length });
    
    return this.success(res, shops);
  });

  /**
   * 更新店铺信息
   * PUT /api/shops/:id
   */
  updateShop = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    // 检查权限
    this.checkResourcePermission(req, id);

    // 验证权限
    if (!req.auth?.permissions?.includes(Permission.SHOP_SETTINGS_EDIT)) {
      throw new ForbiddenError('Shop settings edit permission required');
    }

    const updateData: ShopUpdateData = {};
    const { name, email, phone, timezone, currency, plan } = req.body;

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      this.validateEmail(email);
      updateData.email = email;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;
    if (plan !== undefined) updateData.plan = plan;

    // 只有管理员可以修改状态
    if (req.body.isActive !== undefined && 
        req.auth?.permissions?.includes(Permission.ADMIN_ACCESS)) {
      updateData.isActive = req.body.isActive;
    }

    const shop = await this.shopRepository.updateShop(id, updateData);

    this.logApiAccess(req, 'UPDATE_SHOP', id, { updatedFields: Object.keys(updateData) });
    
    return this.success(res, shop);
  });

  /**
   * 停用店铺（仅管理员）
   * POST /api/shops/:id/deactivate
   */
  deactivateShop = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    // 检查管理员权限
    if (!req.auth?.permissions?.includes(Permission.ADMIN_ACCESS)) {
      throw new ForbiddenError('Admin access required');
    }

    const { reason } = req.body;

    const success = await this.shopRepository.deactivateShop(id, reason);
    if (!success) {
      throw new NotFoundError('Shop not found');
    }

    this.logApiAccess(req, 'DEACTIVATE_SHOP', id, { reason });
    
    return this.success(res, { deactivated: true, reason });
  });

  /**
   * 激活店铺（仅管理员）
   * POST /api/shops/:id/activate
   */
  activateShop = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    // 检查管理员权限
    if (!req.auth?.permissions?.includes(Permission.ADMIN_ACCESS)) {
      throw new ForbiddenError('Admin access required');
    }

    const success = await this.shopRepository.activateShop(id);
    if (!success) {
      throw new NotFoundError('Shop not found');
    }

    this.logApiAccess(req, 'ACTIVATE_SHOP', id);
    
    return this.success(res, { activated: true });
  });

  /**
   * 获取店铺设置
   * GET /api/shops/:id/settings
   */
  getShopSettings = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    // 检查权限
    this.checkResourcePermission(req, id);

    if (!req.auth?.permissions?.includes(Permission.SHOP_SETTINGS_VIEW)) {
      throw new ForbiddenError('Shop settings view permission required');
    }

    const { category } = req.query;
    const settings = await this.shopRepository.getShopSettings(
      id, 
      category as string
    );

    this.logApiAccess(req, 'GET_SHOP_SETTINGS', id, { category });
    
    return this.success(res, settings);
  });

  /**
   * 更新店铺设置
   * PUT /api/shops/:id/settings
   */
  updateShopSettings = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    // 检查权限
    this.checkResourcePermission(req, id);

    if (!req.auth?.permissions?.includes(Permission.SHOP_SETTINGS_EDIT)) {
      throw new ForbiddenError('Shop settings edit permission required');
    }

    const { category, key, value } = req.body;
    this.validateRequired(req.body, ['category', 'key', 'value']);

    const currentUser = this.getCurrentUser(req);
    const setting = await this.shopRepository.updateShopSettings(
      id, 
      category, 
      key, 
      value,
      currentUser.id
    );

    this.logApiAccess(req, 'UPDATE_SHOP_SETTING', id, { category, key });
    
    return this.success(res, setting);
  });

  /**
   * 获取店铺统计信息
   * GET /api/shops/stats
   */
  getShopsStats = this.asyncHandler(async (req: Request, res: Response) => {
    // 检查管理员权限
    if (!req.auth?.permissions?.includes(Permission.ADMIN_ACCESS)) {
      throw new ForbiddenError('Admin access required');
    }

    const stats = await this.shopRepository.getActiveShopsStats();

    this.logApiAccess(req, 'GET_SHOPS_STATS');
    
    // 缓存统计数据
    this.setCacheHeaders(res, 300); // 5分钟缓存
    
    return this.success(res, stats);
  });

  /**
   * 同步店铺数据
   * POST /api/shops/:id/sync
   */
  syncShop = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    // 检查权限
    this.checkResourcePermission(req, id);

    if (!req.auth?.permissions?.includes(Permission.SHOP_SETTINGS_EDIT)) {
      throw new ForbiddenError('Shop settings edit permission required');
    }

    // 更新同步时间
    await this.shopRepository.updateSyncTime([id]);

    this.logApiAccess(req, 'SYNC_SHOP', id);
    
    return this.success(res, { 
      synced: true, 
      syncedAt: new Date().toISOString() 
    });
  });

  /**
   * 获取需要同步的店铺列表（仅管理员）
   * GET /api/shops/sync/pending
   */
  getShopsToSync = this.asyncHandler(async (req: Request, res: Response) => {
    // 检查管理员权限
    if (!req.auth?.permissions?.includes(Permission.ADMIN_ACCESS)) {
      throw new ForbiddenError('Admin access required');
    }

    const { maxAge } = req.query;
    const shops = await this.shopRepository.getShopsToSync(
      maxAge ? parseInt(maxAge as string) : undefined
    );

    this.logApiAccess(req, 'GET_SHOPS_TO_SYNC', undefined, { 
      count: shops.length,
      maxAge 
    });
    
    return this.success(res, shops);
  });

  /**
   * 批量同步店铺
   * POST /api/shops/sync/batch
   */
  batchSyncShops = this.asyncHandler(async (req: Request, res: Response) => {
    // 检查管理员权限
    if (!req.auth?.permissions?.includes(Permission.ADMIN_ACCESS)) {
      throw new ForbiddenError('Admin access required');
    }

    const { shopIds } = req.body;
    this.validateRequired(req.body, ['shopIds']);

    if (!Array.isArray(shopIds) || shopIds.length === 0) {
      throw new BadRequestError('shopIds must be a non-empty array');
    }

    // 验证所有shopIds格式
    shopIds.forEach((id: string) => this.validateUUID(id));

    const count = await this.shopRepository.updateSyncTime(shopIds);

    this.logApiAccess(req, 'BATCH_SYNC_SHOPS', undefined, { 
      requestedCount: shopIds.length,
      actualCount: count 
    });
    
    return this.success(res, { 
      synced: count,
      requested: shopIds.length,
      syncedAt: new Date().toISOString() 
    });
  });

  /**
   * 清理未激活店铺（仅管理员）
   * DELETE /api/shops/cleanup
   */
  cleanupInactiveShops = this.asyncHandler(async (req: Request, res: Response) => {
    // 检查管理员权限
    if (!req.auth?.permissions?.includes(Permission.ADMIN_SYSTEM)) {
      throw new ForbiddenError('System admin permission required');
    }

    const { daysOld } = req.query;
    const days = daysOld ? parseInt(daysOld as string) : 90;

    if (days < 30) {
      throw new BadRequestError('daysOld must be at least 30');
    }

    const count = await this.shopRepository.cleanupInactiveShops(days);

    this.logApiAccess(req, 'CLEANUP_INACTIVE_SHOPS', undefined, { 
      daysOld: days,
      deletedCount: count 
    });
    
    return this.success(res, { 
      cleaned: count,
      daysOld: days,
      cleanedAt: new Date().toISOString() 
    });
  });

  /**
   * 搜索店铺（仅管理员）
   * GET /api/shops/search
   */
  searchShops = this.asyncHandler(async (req: Request, res: Response) => {
    // 检查管理员权限
    if (!req.auth?.permissions?.includes(Permission.ADMIN_ACCESS)) {
      throw new ForbiddenError('Admin access required');
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw new BadRequestError('Search query must be at least 2 characters');
    }

    const filter: ShopFilter = {
      domain: q.trim()
    };

    const shops = await this.shopRepository.findByFilter(filter, {
      take: 20,
      orderBy: { name: 'asc' }
    });

    this.logApiAccess(req, 'SEARCH_SHOPS', undefined, { 
      query: q,
      resultCount: shops.length 
    });
    
    return this.success(res, shops);
  });

  /**
   * 健康检查
   * GET /api/shops/health
   */
  healthCheck = this.asyncHandler(async (req: Request, res: Response) => {
    try {
      // 简单的数据库连接测试
      await this.shopRepository.count({ isActive: true });
      
      return this.success(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'shop-service'
      });
    } catch (error) {
      throw new Error('Shop service unhealthy');
    }
  });
}