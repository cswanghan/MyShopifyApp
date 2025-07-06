import { Request, Response } from 'express';
import { BaseController, BadRequestError, NotFoundError, ForbiddenError } from '../BaseController';
import { UserRepository, UserFilter, UserCreateData, UserUpdateData } from '../../database/repositories/UserRepository';
import { Permission, Role } from '../../auth/PermissionManager';

export class UserController extends BaseController {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    super('UserController');
    this.userRepository = userRepository;
  }

  /**
   * 获取当前用户信息
   * GET /api/users/me
   */
  getCurrentUser = this.asyncHandler(async (req: Request, res: Response) => {
    const currentUser = this.getCurrentUser(req);
    
    this.logApiAccess(req, 'GET_CURRENT_USER', currentUser.id);
    
    return this.success(res, currentUser);
  });

  /**
   * 更新当前用户信息
   * PUT /api/users/me
   */
  updateCurrentUser = this.asyncHandler(async (req: Request, res: Response) => {
    const currentUser = this.getCurrentUser(req);
    
    const updateData: UserUpdateData = {};
    const { name, phone, avatar } = req.body;

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    const user = await this.userRepository.updateUser(currentUser.id, updateData);

    this.logApiAccess(req, 'UPDATE_CURRENT_USER', currentUser.id, { 
      updatedFields: Object.keys(updateData) 
    });
    
    return this.success(res, user);
  });

  /**
   * 获取用户列表
   * GET /api/users
   */
  getUsers = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_VIEW)) {
      throw new ForbiddenError('Users view permission required');
    }

    const pagination = this.parsePaginationParams(req);
    const { 
      email, 
      isActive, 
      emailVerified, 
      roles,
      lastLoginAfter,
      lastLoginBefore 
    } = req.query;

    const filter: UserFilter = {
      shopId: currentShop.id
    };
    
    if (email) filter.email = email as string;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (emailVerified !== undefined) filter.emailVerified = emailVerified === 'true';
    if (roles) {
      filter.roles = (roles as string).split(',').map(r => r.trim());
    }

    // 验证和解析日期范围
    if (lastLoginAfter || lastLoginBefore) {
      const dateRange = this.validateDateRange(lastLoginAfter as string, lastLoginBefore as string);
      filter.lastLoginAfter = dateRange.startDate;
      filter.lastLoginBefore = dateRange.endDate;
    }

    const orderBy = this.parseOrderBy(
      pagination.orderBy,
      pagination.orderDirection,
      ['name', 'email', 'createdAt', 'lastLoginAt']
    );

    const users = await this.userRepository.findByFilter(filter, {
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      orderBy: orderBy || { createdAt: 'desc' }
    });

    this.logApiAccess(req, 'LIST_USERS', undefined, { 
      filterCount: Object.keys(filter).length - 1, // -1 for shopId
      resultCount: users.length
    });
    
    return this.success(res, users);
  });

  /**
   * 获取用户详情
   * GET /api/users/:id
   */
  getUser = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_VIEW)) {
      throw new ForbiddenError('Users view permission required');
    }

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 检查用户是否属于当前店铺
    if (user.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    this.logApiAccess(req, 'GET_USER', id);
    
    return this.success(res, user);
  });

  /**
   * 创建用户
   * POST /api/users
   */
  createUser = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    const currentUser = this.getCurrentUser(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_INVITE)) {
      throw new ForbiddenError('Users invite permission required');
    }

    // 验证必需字段
    this.validateRequired(req.body, ['email', 'name']);

    const {
      email,
      name,
      phone,
      avatar,
      roles = [Role.VIEWER],
      permissions = [],
      isActive = true,
      emailVerified = false
    } = req.body;

    // 验证邮箱格式
    this.validateEmail(email);

    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findByEmail(email, currentShop.id);
    if (existingUser) {
      throw new BadRequestError('User with this email already exists');
    }

    // 验证角色权限
    if (roles && Array.isArray(roles)) {
      for (const role of roles) {
        if (!Object.values(Role).includes(role)) {
          throw new BadRequestError(`Invalid role: ${role}`);
        }
        
        // 检查当前用户是否可以分配这个角色
        if (!this.canAssignRole(currentUser, role)) {
          throw new ForbiddenError(`Cannot assign role: ${role}`);
        }
      }
    }

    const userData: UserCreateData = {
      email,
      name,
      phone,
      avatar,
      shopId: currentShop.id,
      roles,
      permissions,
      isActive,
      emailVerified
    };

    const user = await this.userRepository.createUser(userData);

    this.logApiAccess(req, 'CREATE_USER', user.id, { 
      email,
      roles,
      invitedBy: currentUser.id
    });
    
    return this.success(res, user, undefined, 201);
  });

  /**
   * 更新用户信息
   * PUT /api/users/:id
   */
  updateUser = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    const currentUser = this.getCurrentUser(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_EDIT)) {
      throw new ForbiddenError('Users edit permission required');
    }

    // 检查用户是否存在并属于当前店铺
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (existingUser.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    // 检查是否可以修改目标用户
    const roles = await this.userRepository.getUserRoles(existingUser.id);
    if (!this.canModifyUser(currentUser, { ...existingUser, roles } as any)) {
      throw new ForbiddenError('Cannot modify this user');
    }

    const updateData: UserUpdateData = {};
    const { name, phone, avatar, isActive, emailVerified } = req.body;

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestError('No valid fields to update');
    }

    const user = await this.userRepository.updateUser(id, updateData);

    this.logApiAccess(req, 'UPDATE_USER', id, { 
      updatedFields: Object.keys(updateData) 
    });
    
    return this.success(res, user);
  });

  /**
   * 删除用户
   * DELETE /api/users/:id
   */
  deleteUser = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    const currentUser = this.getCurrentUser(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_DELETE)) {
      throw new ForbiddenError('Users delete permission required');
    }

    // 不能删除自己
    if (id === currentUser.id) {
      throw new BadRequestError('Cannot delete yourself');
    }

    // 检查用户是否存在并属于当前店铺
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (existingUser.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    // 检查是否可以删除目标用户
    const roles = await this.userRepository.getUserRoles(existingUser.id);
    if (!this.canModifyUser(currentUser, { ...existingUser, roles } as any)) {
      throw new ForbiddenError('Cannot delete this user');
    }

    const success = await this.userRepository.delete(id);
    if (!success) {
      throw new Error('Failed to delete user');
    }

    this.logApiAccess(req, 'DELETE_USER', id, { deletedEmail: existingUser.email });
    
    return this.success(res, { deleted: true });
  });

  /**
   * 停用用户
   * POST /api/users/:id/deactivate
   */
  deactivateUser = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    const currentUser = this.getCurrentUser(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_EDIT)) {
      throw new ForbiddenError('Users edit permission required');
    }

    // 不能停用自己
    if (id === currentUser.id) {
      throw new BadRequestError('Cannot deactivate yourself');
    }

    // 检查用户是否存在并属于当前店铺
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (existingUser.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    const success = await this.userRepository.deactivateUser(id);
    if (!success) {
      throw new Error('Failed to deactivate user');
    }

    this.logApiAccess(req, 'DEACTIVATE_USER', id);
    
    return this.success(res, { deactivated: true });
  });

  /**
   * 激活用户
   * POST /api/users/:id/activate
   */
  activateUser = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_EDIT)) {
      throw new ForbiddenError('Users edit permission required');
    }

    // 检查用户是否存在并属于当前店铺
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (existingUser.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    const success = await this.userRepository.activateUser(id);
    if (!success) {
      throw new Error('Failed to activate user');
    }

    this.logApiAccess(req, 'ACTIVATE_USER', id);
    
    return this.success(res, { activated: true });
  });

  /**
   * 分配角色
   * POST /api/users/:id/roles
   */
  assignRole = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    const currentUser = this.getCurrentUser(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_EDIT)) {
      throw new ForbiddenError('Users edit permission required');
    }

    const { role } = req.body;
    this.validateRequired(req.body, ['role']);

    if (!Object.values(Role).includes(role)) {
      throw new BadRequestError(`Invalid role: ${role}`);
    }

    // 检查用户是否存在并属于当前店铺
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (existingUser.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    // 检查当前用户是否可以分配这个角色
    if (!this.canAssignRole(currentUser, role)) {
      throw new ForbiddenError(`Cannot assign role: ${role}`);
    }

    const success = await this.userRepository.assignRole(id, role, currentUser.id);
    if (!success) {
      throw new Error('Failed to assign role');
    }

    this.logApiAccess(req, 'ASSIGN_ROLE', id, { role });
    
    return this.success(res, { assigned: true, role });
  });

  /**
   * 移除角色
   * DELETE /api/users/:id/roles/:role
   */
  removeRole = this.asyncHandler(async (req: Request, res: Response) => {
    const { id, role } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    const currentUser = this.getCurrentUser(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_EDIT)) {
      throw new ForbiddenError('Users edit permission required');
    }

    if (!Object.values(Role).includes(role as Role)) {
      throw new BadRequestError(`Invalid role: ${role}`);
    }

    // 检查用户是否存在并属于当前店铺
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (existingUser.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    // 检查当前用户是否可以移除这个角色
    if (!this.canAssignRole(currentUser, role as Role)) {
      throw new ForbiddenError(`Cannot remove role: ${role}`);
    }

    const success = await this.userRepository.removeRole(id, role);
    if (!success) {
      throw new Error('Failed to remove role');
    }

    this.logApiAccess(req, 'REMOVE_ROLE', id, { role });
    
    return this.success(res, { removed: true, role });
  });

  /**
   * 获取用户角色
   * GET /api/users/:id/roles
   */
  getUserRoles = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_VIEW)) {
      throw new ForbiddenError('Users view permission required');
    }

    // 检查用户是否存在并属于当前店铺
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (existingUser.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    const roles = await this.userRepository.getUserRoles(id);

    this.logApiAccess(req, 'GET_USER_ROLES', id);
    
    return this.success(res, { roles });
  });

  /**
   * 获取用户权限
   * GET /api/users/:id/permissions
   */
  getUserPermissions = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_VIEW)) {
      throw new ForbiddenError('Users view permission required');
    }

    // 检查用户是否存在并属于当前店铺
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (existingUser.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this user');
    }

    const permissions = await this.userRepository.getUserPermissions(id);

    this.logApiAccess(req, 'GET_USER_PERMISSIONS', id);
    
    return this.success(res, { permissions });
  });

  /**
   * 搜索用户
   * GET /api/users/search
   */
  searchUsers = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_VIEW)) {
      throw new ForbiddenError('Users view permission required');
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw new BadRequestError('Search query must be at least 2 characters');
    }

    const pagination = this.parsePaginationParams(req);
    
    const users = await this.userRepository.searchUsers(
      q.trim(),
      currentShop.id,
      {
        take: pagination.limit,
        skip: (pagination.page - 1) * pagination.limit
      }
    );

    this.logApiAccess(req, 'SEARCH_USERS', undefined, { 
      query: q,
      resultCount: users.length 
    });
    
    return this.success(res, users);
  });

  /**
   * 获取用户统计信息
   * GET /api/users/stats
   */
  getUserStats = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.USERS_VIEW)) {
      throw new ForbiddenError('Users view permission required');
    }

    const stats = await this.userRepository.getUserStats(currentShop.id);

    this.logApiAccess(req, 'GET_USER_STATS');
    
    // 缓存统计数据
    this.setCacheHeaders(res, 300); // 5分钟缓存
    
    return this.success(res, stats);
  });

  /**
   * 检查当前用户是否可以分配指定角色
   */
  private canAssignRole(currentUser: any, targetRole: Role): boolean {
    const currentRoles = currentUser.roles || [];
    
    // 只有所有者可以分配所有者角色
    if (targetRole === Role.OWNER) {
      return currentRoles.includes(Role.OWNER);
    }
    
    // 管理员和所有者可以分配非所有者角色
    if (currentRoles.includes(Role.OWNER) || currentRoles.includes(Role.ADMIN)) {
      return true;
    }
    
    // 经理可以分配部分角色
    if (currentRoles.includes(Role.MANAGER)) {
      return [Role.OPERATOR, Role.VIEWER, Role.ACCOUNTANT, Role.LOGISTICS].includes(targetRole);
    }
    
    return false;
  }

  /**
   * 检查当前用户是否可以修改目标用户
   */
  private canModifyUser(currentUser: any, targetUser: any): boolean {
    const currentRoles = currentUser.roles || [];
    const targetRoles = targetUser.roles || [];
    
    // 不能修改自己（在调用处检查）
    if (currentUser.id === targetUser.id) {
      return false;
    }
    
    // 只有所有者可以修改所有者
    if (targetRoles.includes(Role.OWNER)) {
      return currentRoles.includes(Role.OWNER);
    }
    
    // 管理员和所有者可以修改非所有者用户
    if (currentRoles.includes(Role.OWNER) || currentRoles.includes(Role.ADMIN)) {
      return true;
    }
    
    // 经理可以修改部分用户
    if (currentRoles.includes(Role.MANAGER)) {
      return targetRoles.every((role: Role) => 
        [Role.OPERATOR, Role.VIEWER, Role.ACCOUNTANT, Role.LOGISTICS].includes(role)
      );
    }
    
    return false;
  }
}