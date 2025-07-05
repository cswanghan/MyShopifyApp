import { Logger } from '../utils/logger';

/**
 * 权限定义
 */
export enum Permission {
  // 仪表盘权限
  DASHBOARD_VIEW = 'dashboard:view',
  
  // 订单管理权限
  ORDERS_VIEW = 'orders:view',
  ORDERS_EDIT = 'orders:edit',
  ORDERS_DELETE = 'orders:delete',
  ORDERS_EXPORT = 'orders:export',
  
  // 税费设置权限
  TAX_SETTINGS_VIEW = 'tax_settings:view',
  TAX_SETTINGS_EDIT = 'tax_settings:edit',
  TAX_CALCULATE = 'tax:calculate',
  
  // 物流设置权限
  LOGISTICS_SETTINGS_VIEW = 'logistics_settings:view',
  LOGISTICS_SETTINGS_EDIT = 'logistics_settings:edit',
  LOGISTICS_CALCULATE = 'logistics:calculate',
  
  // 合规申报权限
  COMPLIANCE_VIEW = 'compliance:view',
  COMPLIANCE_SUBMIT = 'compliance:submit',
  COMPLIANCE_REPORTS = 'compliance:reports',
  
  // 报表权限
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  REPORTS_ADVANCED = 'reports:advanced',
  
  // 用户管理权限
  USERS_VIEW = 'users:view',
  USERS_INVITE = 'users:invite',
  USERS_EDIT = 'users:edit',
  USERS_DELETE = 'users:delete',
  
  // 店铺管理权限
  SHOP_SETTINGS_VIEW = 'shop_settings:view',
  SHOP_SETTINGS_EDIT = 'shop_settings:edit',
  SHOP_BILLING = 'shop:billing',
  
  // 系统管理权限
  ADMIN_ACCESS = 'admin:access',
  ADMIN_LOGS = 'admin:logs',
  ADMIN_SYSTEM = 'admin:system'
}

/**
 * 角色定义
 */
export enum Role {
  OWNER = 'owner',           // 店铺所有者
  ADMIN = 'admin',           // 管理员
  MANAGER = 'manager',       // 经理
  OPERATOR = 'operator',     // 操作员
  VIEWER = 'viewer',         // 查看者
  ACCOUNTANT = 'accountant', // 财务
  LOGISTICS = 'logistics'    // 物流专员
}

/**
 * 用户信息接口
 */
export interface User {
  id: string;
  email: string;
  name: string;
  shopId: string;
  roles: Role[];
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  userPermissions?: Permission[];
}

/**
 * 权限管理器
 */
export class PermissionManager {
  private logger = new Logger('PermissionManager');
  
  // 角色默认权限映射
  private rolePermissions: Map<Role, Permission[]> = new Map([
    [Role.OWNER, [
      // 所有者拥有所有权限
      ...Object.values(Permission)
    ]],
    
    [Role.ADMIN, [
      Permission.DASHBOARD_VIEW,
      Permission.ORDERS_VIEW,
      Permission.ORDERS_EDIT,
      Permission.ORDERS_EXPORT,
      Permission.TAX_SETTINGS_VIEW,
      Permission.TAX_SETTINGS_EDIT,
      Permission.TAX_CALCULATE,
      Permission.LOGISTICS_SETTINGS_VIEW,
      Permission.LOGISTICS_SETTINGS_EDIT,
      Permission.LOGISTICS_CALCULATE,
      Permission.COMPLIANCE_VIEW,
      Permission.COMPLIANCE_SUBMIT,
      Permission.COMPLIANCE_REPORTS,
      Permission.REPORTS_VIEW,
      Permission.REPORTS_EXPORT,
      Permission.REPORTS_ADVANCED,
      Permission.USERS_VIEW,
      Permission.USERS_INVITE,
      Permission.USERS_EDIT,
      Permission.SHOP_SETTINGS_VIEW,
      Permission.SHOP_SETTINGS_EDIT
    ]],
    
    [Role.MANAGER, [
      Permission.DASHBOARD_VIEW,
      Permission.ORDERS_VIEW,
      Permission.ORDERS_EDIT,
      Permission.ORDERS_EXPORT,
      Permission.TAX_SETTINGS_VIEW,
      Permission.TAX_CALCULATE,
      Permission.LOGISTICS_SETTINGS_VIEW,
      Permission.LOGISTICS_CALCULATE,
      Permission.COMPLIANCE_VIEW,
      Permission.COMPLIANCE_SUBMIT,
      Permission.COMPLIANCE_REPORTS,
      Permission.REPORTS_VIEW,
      Permission.REPORTS_EXPORT,
      Permission.USERS_VIEW
    ]],
    
    [Role.OPERATOR, [
      Permission.DASHBOARD_VIEW,
      Permission.ORDERS_VIEW,
      Permission.ORDERS_EDIT,
      Permission.TAX_CALCULATE,
      Permission.LOGISTICS_CALCULATE,
      Permission.COMPLIANCE_VIEW,
      Permission.REPORTS_VIEW
    ]],
    
    [Role.VIEWER, [
      Permission.DASHBOARD_VIEW,
      Permission.ORDERS_VIEW,
      Permission.TAX_SETTINGS_VIEW,
      Permission.LOGISTICS_SETTINGS_VIEW,
      Permission.COMPLIANCE_VIEW,
      Permission.REPORTS_VIEW
    ]],
    
    [Role.ACCOUNTANT, [
      Permission.DASHBOARD_VIEW,
      Permission.ORDERS_VIEW,
      Permission.TAX_SETTINGS_VIEW,
      Permission.TAX_CALCULATE,
      Permission.COMPLIANCE_VIEW,
      Permission.COMPLIANCE_SUBMIT,
      Permission.COMPLIANCE_REPORTS,
      Permission.REPORTS_VIEW,
      Permission.REPORTS_EXPORT,
      Permission.REPORTS_ADVANCED
    ]],
    
    [Role.LOGISTICS, [
      Permission.DASHBOARD_VIEW,
      Permission.ORDERS_VIEW,
      Permission.ORDERS_EDIT,
      Permission.LOGISTICS_SETTINGS_VIEW,
      Permission.LOGISTICS_SETTINGS_EDIT,
      Permission.LOGISTICS_CALCULATE,
      Permission.REPORTS_VIEW
    ]]
  ]);

  /**
   * 获取用户权限
   */
  getUserPermissions(user: User): Permission[] {
    const allPermissions = new Set<Permission>();
    
    // 添加角色权限
    for (const role of user.roles) {
      const rolePerms = this.rolePermissions.get(role) || [];
      rolePerms.forEach(perm => allPermissions.add(perm));
    }
    
    // 添加直接分配的权限
    user.permissions.forEach(perm => allPermissions.add(perm));
    
    return Array.from(allPermissions);
  }

  /**
   * 检查用户是否拥有指定权限
   */
  hasPermission(user: User, permission: Permission): boolean {
    const userPermissions = this.getUserPermissions(user);
    return userPermissions.includes(permission);
  }

  /**
   * 检查用户是否拥有任一权限
   */
  hasAnyPermission(user: User, permissions: Permission[]): boolean {
    const userPermissions = this.getUserPermissions(user);
    return permissions.some(perm => userPermissions.includes(perm));
  }

  /**
   * 检查用户是否拥有所有权限
   */
  hasAllPermissions(user: User, permissions: Permission[]): boolean {
    const userPermissions = this.getUserPermissions(user);
    return permissions.every(perm => userPermissions.includes(perm));
  }

  /**
   * 检查用户权限并返回详细结果
   */
  checkPermission(user: User, requiredPermissions: Permission | Permission[]): PermissionCheckResult {
    if (!user.isActive) {
      return {
        allowed: false,
        reason: 'User account is inactive'
      };
    }

    const permsToCheck = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const userPermissions = this.getUserPermissions(user);
    
    const hasAllPerms = permsToCheck.every(perm => userPermissions.includes(perm));

    if (hasAllPerms) {
      return { allowed: true };
    }

    const missingPermissions = permsToCheck.filter(perm => !userPermissions.includes(perm));

    return {
      allowed: false,
      reason: `Missing required permissions: ${missingPermissions.join(', ')}`,
      requiredPermissions: permsToCheck,
      userPermissions
    };
  }

  /**
   * 检查用户是否拥有指定角色
   */
  hasRole(user: User, role: Role): boolean {
    return user.roles.includes(role);
  }

  /**
   * 检查用户是否拥有任一角色
   */
  hasAnyRole(user: User, roles: Role[]): boolean {
    return roles.some(role => user.roles.includes(role));
  }

  /**
   * 为用户添加角色
   */
  addRole(user: User, role: Role): User {
    if (!user.roles.includes(role)) {
      user.roles.push(role);
      this.logger.info('角色已添加', { userId: user.id, role });
    }
    return user;
  }

  /**
   * 从用户移除角色
   */
  removeRole(user: User, role: Role): User {
    const index = user.roles.indexOf(role);
    if (index > -1) {
      user.roles.splice(index, 1);
      this.logger.info('角色已移除', { userId: user.id, role });
    }
    return user;
  }

  /**
   * 为用户添加权限
   */
  addPermission(user: User, permission: Permission): User {
    if (!user.permissions.includes(permission)) {
      user.permissions.push(permission);
      this.logger.info('权限已添加', { userId: user.id, permission });
    }
    return user;
  }

  /**
   * 从用户移除权限
   */
  removePermission(user: User, permission: Permission): User {
    const index = user.permissions.indexOf(permission);
    if (index > -1) {
      user.permissions.splice(index, 1);
      this.logger.info('权限已移除', { userId: user.id, permission });
    }
    return user;
  }

  /**
   * 获取角色的默认权限
   */
  getRolePermissions(role: Role): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  /**
   * 更新角色的默认权限
   */
  updateRolePermissions(role: Role, permissions: Permission[]): void {
    this.rolePermissions.set(role, permissions);
    this.logger.info('角色权限已更新', { role, permissions });
  }

  /**
   * 验证权限层级（防止权限提升攻击）
   */
  canUserModifyTarget(currentUser: User, targetUser: User): boolean {
    // 只有所有者可以修改所有者
    if (targetUser.roles.includes(Role.OWNER)) {
      return currentUser.roles.includes(Role.OWNER);
    }

    // 管理员可以修改非所有者用户
    if (currentUser.roles.includes(Role.ADMIN) || currentUser.roles.includes(Role.OWNER)) {
      return true;
    }

    // 经理可以修改操作员和查看者
    if (currentUser.roles.includes(Role.MANAGER)) {
      return targetUser.roles.every(role => 
        [Role.OPERATOR, Role.VIEWER, Role.ACCOUNTANT, Role.LOGISTICS].includes(role)
      );
    }

    return false;
  }

  /**
   * 生成权限矩阵（用于前端显示）
   */
  generatePermissionMatrix(): Record<string, Record<string, boolean>> {
    const matrix: Record<string, Record<string, boolean>> = {};
    
    for (const [role, permissions] of this.rolePermissions.entries()) {
      matrix[role] = {};
      for (const permission of Object.values(Permission)) {
        matrix[role][permission] = permissions.includes(permission);
      }
    }
    
    return matrix;
  }

  /**
   * 获取资源访问权限
   */
  getResourcePermissions(user: User, resourceType: string): {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
  } {
    const userPermissions = this.getUserPermissions(user);
    
    // 根据资源类型映射权限
    const permissionMappings: Record<string, {
      view: Permission[];
      edit: Permission[];
      delete: Permission[];
      export: Permission[];
    }> = {
      orders: {
        view: [Permission.ORDERS_VIEW],
        edit: [Permission.ORDERS_EDIT],
        delete: [Permission.ORDERS_DELETE],
        export: [Permission.ORDERS_EXPORT]
      },
      tax_settings: {
        view: [Permission.TAX_SETTINGS_VIEW],
        edit: [Permission.TAX_SETTINGS_EDIT],
        delete: [Permission.TAX_SETTINGS_EDIT],
        export: [Permission.REPORTS_EXPORT]
      },
      logistics_settings: {
        view: [Permission.LOGISTICS_SETTINGS_VIEW],
        edit: [Permission.LOGISTICS_SETTINGS_EDIT],
        delete: [Permission.LOGISTICS_SETTINGS_EDIT],
        export: [Permission.REPORTS_EXPORT]
      },
      reports: {
        view: [Permission.REPORTS_VIEW],
        edit: [Permission.REPORTS_ADVANCED],
        delete: [Permission.REPORTS_ADVANCED],
        export: [Permission.REPORTS_EXPORT]
      },
      users: {
        view: [Permission.USERS_VIEW],
        edit: [Permission.USERS_EDIT],
        delete: [Permission.USERS_DELETE],
        export: [Permission.USERS_VIEW]
      }
    };

    const resourcePerms = permissionMappings[resourceType];
    if (!resourcePerms) {
      return { canView: false, canEdit: false, canDelete: false, canExport: false };
    }

    return {
      canView: resourcePerms.view.some(perm => userPermissions.includes(perm)),
      canEdit: resourcePerms.edit.some(perm => userPermissions.includes(perm)),
      canDelete: resourcePerms.delete.some(perm => userPermissions.includes(perm)),
      canExport: resourcePerms.export.some(perm => userPermissions.includes(perm))
    };
  }

  /**
   * 检查API权限
   */
  checkApiPermission(user: User, apiEndpoint: string, method: string): PermissionCheckResult {
    // API权限映射
    const apiPermissions: Record<string, Record<string, Permission[]>> = {
      '/api/orders': {
        'GET': [Permission.ORDERS_VIEW],
        'POST': [Permission.ORDERS_EDIT],
        'PUT': [Permission.ORDERS_EDIT],
        'DELETE': [Permission.ORDERS_DELETE]
      },
      '/api/tax': {
        'GET': [Permission.TAX_SETTINGS_VIEW],
        'POST': [Permission.TAX_CALCULATE],
        'PUT': [Permission.TAX_SETTINGS_EDIT]
      },
      '/api/logistics': {
        'GET': [Permission.LOGISTICS_SETTINGS_VIEW],
        'POST': [Permission.LOGISTICS_CALCULATE],
        'PUT': [Permission.LOGISTICS_SETTINGS_EDIT]
      },
      '/api/compliance': {
        'GET': [Permission.COMPLIANCE_VIEW],
        'POST': [Permission.COMPLIANCE_SUBMIT]
      },
      '/api/reports': {
        'GET': [Permission.REPORTS_VIEW],
        'POST': [Permission.REPORTS_EXPORT]
      },
      '/api/users': {
        'GET': [Permission.USERS_VIEW],
        'POST': [Permission.USERS_INVITE],
        'PUT': [Permission.USERS_EDIT],
        'DELETE': [Permission.USERS_DELETE]
      }
    };

    const endpointPerms = apiPermissions[apiEndpoint];
    if (!endpointPerms) {
      return { allowed: false, reason: 'Unknown API endpoint' };
    }

    const methodPerms = endpointPerms[method.toUpperCase()];
    if (!methodPerms) {
      return { allowed: false, reason: 'Method not allowed' };
    }

    return this.checkPermission(user, methodPerms);
  }
}