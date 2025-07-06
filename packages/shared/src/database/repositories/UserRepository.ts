import { PrismaClient } from '@prisma/client';
import { BaseRepository, QueryOptions } from './BaseRepository';
import { User } from '../models';

export interface UserFilter {
  email?: string;
  shopId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  roles?: string[];
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface UserCreateData {
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  shopId: string;
  roles?: string[];
  permissions?: string[];
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UserUpdateData {
  name?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAt?: Date;
  loginCount?: number;
}

export class UserRepository extends BaseRepository<User> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'User');
  }

  protected getModel() {
    return this.prisma.user;
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string, shopId?: string): Promise<User | null> {
    try {
      const where: any = { email };
      if (shopId) {
        where.shopId = shopId;
      }

      const user = await this.getModel().findFirst({
        where,
        include: {
          shop: true,
          roles: true,
          permissions: true,
          sessions: {
            where: { isActive: true },
            orderBy: { lastActiveAt: 'desc' }
          }
        }
      });

      if (user) {
        this.logger.debug('User found by email', { email, userId: user.id, shopId });
      }

      return user;
    } catch (error) {
      this.logger.error('Failed to find user by email', error, { email, shopId });
      throw error;
    }
  }

  /**
   * 根据店铺ID查找用户
   */
  async findByShopId(shopId: string, options?: QueryOptions): Promise<User[]> {
    try {
      return await this.findMany({
        ...options,
        where: { shopId, ...options?.where },
        include: {
          roles: true,
          permissions: true,
          ...options?.include
        }
      });
    } catch (error) {
      this.logger.error('Failed to find users by shop ID', error, { shopId });
      throw error;
    }
  }

  /**
   * 根据过滤条件查找用户
   */
  async findByFilter(filter: UserFilter, options?: QueryOptions) {
    try {
      const where: any = {};

      if (filter.email) {
        where.email = { contains: filter.email, mode: 'insensitive' };
      }

      if (filter.shopId) {
        where.shopId = filter.shopId;
      }

      if (filter.isActive !== undefined) {
        where.isActive = filter.isActive;
      }

      if (filter.emailVerified !== undefined) {
        where.emailVerified = filter.emailVerified;
      }

      if (filter.roles && filter.roles.length > 0) {
        where.roles = {
          some: {
            role: { in: filter.roles }
          }
        };
      }

      if (filter.lastLoginAfter || filter.lastLoginBefore) {
        where.lastLoginAt = {};
        if (filter.lastLoginAfter) {
          where.lastLoginAt.gte = filter.lastLoginAfter;
        }
        if (filter.lastLoginBefore) {
          where.lastLoginAt.lte = filter.lastLoginBefore;
        }
      }

      return await this.findMany({
        ...options,
        where: { ...where, ...options?.where },
        include: {
          shop: true,
          roles: true,
          permissions: true,
          ...options?.include
        }
      });
    } catch (error) {
      this.logger.error('Failed to find users by filter', error, { filter });
      throw error;
    }
  }

  /**
   * 创建用户
   */
  async createUser(data: UserCreateData): Promise<User> {
    try {
      return await this.transaction(async (tx) => {
        // 创建用户
        const user = await tx.user.create({
          data: {
            email: data.email,
            name: data.name,
            phone: data.phone,
            avatar: data.avatar,
            shopId: data.shopId,
            isActive: data.isActive ?? true,
            emailVerified: data.emailVerified ?? false,
            loginCount: 0
          }
        });

        // 分配角色
        if (data.roles && data.roles.length > 0) {
          await tx.userRole.createMany({
            data: data.roles.map(role => ({
              userId: user.id,
              role,
              assignedAt: new Date()
            }))
          });
        }

        // 分配权限
        if (data.permissions && data.permissions.length > 0) {
          await tx.userPermission.createMany({
            data: data.permissions.map(permission => ({
              userId: user.id,
              permission,
              assignedAt: new Date()
            }))
          });
        }

        this.logger.info('User created', { 
          userId: user.id, 
          email: data.email,
          shopId: data.shopId,
          roles: data.roles,
          permissions: data.permissions
        });

        return user;
      });
    } catch (error) {
      this.logger.error('Failed to create user', error, { data });
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, data: UserUpdateData): Promise<User> {
    try {
      const user = await this.update(id, data);

      this.logger.info('User updated', { 
        userId: id, 
        updatedFields: Object.keys(data) 
      });

      return user;
    } catch (error) {
      this.logger.error('Failed to update user', error, { id, data });
      throw error;
    }
  }

  /**
   * 更新用户登录信息
   */
  async updateLoginInfo(id: string): Promise<boolean> {
    try {
      await this.getModel().update({
        where: { id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 }
        }
      });

      this.logger.debug('User login info updated', { userId: id });
      return true;
    } catch (error) {
      this.logger.error('Failed to update user login info', error, { id });
      return false;
    }
  }

  /**
   * 分配用户角色
   */
  async assignRole(userId: string, role: string, assignedBy?: string): Promise<boolean> {
    try {
      await this.prisma.userRole.upsert({
        where: {
          userId_role: { userId, role }
        },
        update: {
          assignedBy,
          assignedAt: new Date()
        },
        create: {
          userId,
          role,
          assignedBy,
          assignedAt: new Date()
        }
      });

      this.logger.info('Role assigned to user', { userId, role, assignedBy });
      return true;
    } catch (error) {
      this.logger.error('Failed to assign role to user', error, { userId, role });
      return false;
    }
  }

  /**
   * 移除用户角色
   */
  async removeRole(userId: string, role: string): Promise<boolean> {
    try {
      await this.prisma.userRole.delete({
        where: {
          userId_role: { userId, role }
        }
      });

      this.logger.info('Role removed from user', { userId, role });
      return true;
    } catch (error) {
      this.logger.error('Failed to remove role from user', error, { userId, role });
      return false;
    }
  }

  /**
   * 分配用户权限
   */
  async assignPermission(
    userId: string, 
    permission: string, 
    resource?: string,
    assignedBy?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      await this.prisma.userPermission.upsert({
        where: {
          userId_permission_resource: { 
            userId, 
            permission, 
            resource: resource || null 
          }
        },
        update: {
          assignedBy,
          assignedAt: new Date(),
          expiresAt
        },
        create: {
          userId,
          permission,
          resource,
          assignedBy,
          assignedAt: new Date(),
          expiresAt
        }
      });

      this.logger.info('Permission assigned to user', { 
        userId, 
        permission, 
        resource, 
        assignedBy 
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to assign permission to user', error, { 
        userId, 
        permission, 
        resource 
      });
      return false;
    }
  }

  /**
   * 移除用户权限
   */
  async removePermission(userId: string, permission: string, resource?: string): Promise<boolean> {
    try {
      await this.prisma.userPermission.delete({
        where: {
          userId_permission_resource: { 
            userId, 
            permission, 
            resource: resource || null 
          }
        }
      });

      this.logger.info('Permission removed from user', { userId, permission, resource });
      return true;
    } catch (error) {
      this.logger.error('Failed to remove permission from user', error, { 
        userId, 
        permission, 
        resource 
      });
      return false;
    }
  }

  /**
   * 获取用户角色
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
      const roles = await this.prisma.userRole.findMany({
        where: { 
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        select: { role: true }
      });

      return roles.map(r => r.role);
    } catch (error) {
      this.logger.error('Failed to get user roles', error, { userId });
      throw error;
    }
  }

  /**
   * 获取用户权限
   */
  async getUserPermissions(userId: string): Promise<Array<{ permission: string; resource?: string }>> {
    try {
      const permissions = await this.prisma.userPermission.findMany({
        where: { 
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        select: { permission: true, resource: true }
      });

      return permissions.map(p => ({
        permission: p.permission,
        resource: p.resource || undefined
      }));
    } catch (error) {
      this.logger.error('Failed to get user permissions', error, { userId });
      throw error;
    }
  }

  /**
   * 检查用户是否有指定角色
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    try {
      const count = await this.prisma.userRole.count({
        where: { 
          userId, 
          role,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check user role', error, { userId, role });
      throw error;
    }
  }

  /**
   * 检查用户是否有指定权限
   */
  async hasPermission(userId: string, permission: string, resource?: string): Promise<boolean> {
    try {
      const where: any = { 
        userId, 
        permission,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      };

      if (resource) {
        where.resource = resource;
      }

      const count = await this.prisma.userPermission.count({ where });

      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check user permission', error, { userId, permission, resource });
      throw error;
    }
  }

  /**
   * 停用用户
   */
  async deactivateUser(id: string): Promise<boolean> {
    try {
      await this.update(id, { isActive: false });

      // 停用所有活跃会话
      await this.prisma.userSession.updateMany({
        where: { userId: id, isActive: true },
        data: { isActive: false }
      });

      this.logger.info('User deactivated', { userId: id });
      return true;
    } catch (error) {
      this.logger.error('Failed to deactivate user', error, { id });
      return false;
    }
  }

  /**
   * 激活用户
   */
  async activateUser(id: string): Promise<boolean> {
    try {
      await this.update(id, { isActive: true });

      this.logger.info('User activated', { userId: id });
      return true;
    } catch (error) {
      this.logger.error('Failed to activate user', error, { id });
      return false;
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(shopId?: string): Promise<{
    total: number;
    active: number;
    verified: number;
    byRole: Record<string, number>;
    recentLogins: number;
  }> {
    try {
      const where = shopId ? { shopId } : {};

      const [
        total,
        active,
        verified,
        byRole,
        recentLogins
      ] = await Promise.all([
        this.count(where),
        this.count({ ...where, isActive: true }),
        this.count({ ...where, emailVerified: true }),
        this.prisma.userRole.groupBy({
          by: ['role'],
          where: { user: where },
          _count: { role: true }
        }),
        this.count({
          ...where,
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
          }
        })
      ]);

      const roleStats = byRole.reduce((acc: Record<string, number>, item: any) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {});

      return {
        total,
        active,
        verified,
        byRole: roleStats,
        recentLogins
      };
    } catch (error) {
      this.logger.error('Failed to get user stats', error, { shopId });
      throw error;
    }
  }

  /**
   * 清理过期权限
   */
  async cleanupExpiredPermissions(): Promise<number> {
    try {
      const result = await this.prisma.userPermission.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      this.logger.info('Cleaned up expired permissions', { count: result.count });
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired permissions', error);
      throw error;
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(
    query: string, 
    shopId?: string, 
    options?: QueryOptions
  ): Promise<User[]> {
    try {
      const where: any = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      };

      if (shopId) {
        where.shopId = shopId;
      }

      return await this.findMany({
        ...options,
        where: { ...where, ...options?.where },
        include: {
          shop: true,
          roles: true,
          permissions: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to search users', error, { query, shopId });
      throw error;
    }
  }
}