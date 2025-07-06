import { BaseSerializer, SerializationOptions, SerializationMeta } from './BaseSerializer';

/**
 * 店铺序列化器
 */
export class ShopSerializer extends BaseSerializer {
  private static meta: SerializationMeta = {
    fields: {
      accessToken: { private: true },
      metadata: { expose: true }
    },
    relations: {
      users: 'UserSerializer',
      settings: 'ShopSettingsSerializer'
    }
  };

  static serialize(data: any, options: SerializationOptions = {}): any {
    const defaultOptions: SerializationOptions = {
      exclude: options.includePrivate ? [] : ['accessToken'],
      dateFormat: 'iso',
      ...options
    };

    return super.serialize(data, defaultOptions);
  }

  /**
   * 公开序列化（排除敏感信息）
   */
  static serializePublic(data: any): any {
    return this.serialize(data, {
      exclude: ['accessToken', 'scope', 'metadata'],
      relations: []
    });
  }

  /**
   * 简单序列化（基本信息）
   */
  static serializeBasic(data: any): any {
    return this.serialize(data, {
      include: ['id', 'domain', 'name', 'currency', 'timezone', 'country', 'isActive'],
      relations: []
    });
  }

  /**
   * 管理员序列化（包含敏感信息）
   */
  static serializeForAdmin(data: any): any {
    return this.serialize(data, {
      includePrivate: true,
      relations: ['users', 'settings']
    });
  }
}

/**
 * 用户序列化器
 */
export class UserSerializer extends BaseSerializer {
  private static meta: SerializationMeta = {
    fields: {
      passwordHash: { private: true },
      metadata: { expose: true }
    },
    relations: {
      shop: 'ShopSerializer',
      roles: 'UserRoleSerializer',
      permissions: 'UserPermissionSerializer'
    }
  };

  static serialize(data: any, options: SerializationOptions = {}): any {
    const defaultOptions: SerializationOptions = {
      exclude: options.includePrivate ? [] : ['passwordHash'],
      dateFormat: 'iso',
      transform: {
        avatar: (url: string) => url ? this.transformImageUrl(url) : null
      },
      ...options
    };

    return super.serialize(data, defaultOptions);
  }

  /**
   * 当前用户序列化
   */
  static serializeCurrentUser(data: any): any {
    return this.serialize(data, {
      relations: ['shop', 'roles', 'permissions'],
      nested: {
        shop: { include: ['id', 'domain', 'name', 'currency', 'timezone'] }
      }
    });
  }

  /**
   * 用户列表序列化
   */
  static serializeForList(data: any): any {
    return this.serialize(data, {
      include: ['id', 'email', 'name', 'isActive', 'emailVerified', 'lastLoginAt', 'createdAt'],
      relations: ['roles']
    });
  }

  /**
   * 公开用户信息序列化
   */
  static serializePublic(data: any): any {
    return this.serialize(data, {
      include: ['id', 'name', 'avatar'],
      relations: []
    });
  }

  /**
   * 转换图片URL
   */
  private static transformImageUrl(url: string): string {
    // 如果是相对路径，转换为绝对路径
    if (url.startsWith('/')) {
      return `${process.env.CDN_BASE_URL || ''}${url}`;
    }
    return url;
  }
}

/**
 * 订单序列化器
 */
export class OrderSerializer extends BaseSerializer {
  static serialize(data: any, options: SerializationOptions = {}): any {
    const defaultOptions: SerializationOptions = {
      dateFormat: 'iso',
      transform: {
        totalAmount: (amount: number) => this.formatCurrency(amount),
        subtotalAmount: (amount: number) => this.formatCurrency(amount),
        taxAmount: (amount: number) => this.formatCurrency(amount),
        shippingAmount: (amount: number) => this.formatCurrency(amount),
        discountAmount: (amount: number) => this.formatCurrency(amount)
      },
      ...options
    };

    return super.serialize(data, defaultOptions);
  }

  /**
   * 订单列表序列化
   */
  static serializeForList(data: any): any {
    return this.serialize(data, {
      include: [
        'id', 'orderNumber', 'shopifyOrderId', 'customerEmail', 'customerName',
        'status', 'financialStatus', 'totalAmount', 'currency', 'orderDate'
      ],
      relations: []
    });
  }

  /**
   * 订单详情序列化
   */
  static serializeForDetails(data: any): any {
    return this.serialize(data, {
      relations: ['orderItems', 'taxCalculations', 'shippingCalculations'],
      nested: {
        orderItems: { 
          include: ['id', 'sku', 'title', 'quantity', 'price', 'hsCode'] 
        }
      }
    });
  }

  /**
   * 导出序列化
   */
  static serializeForExport(data: any): any {
    return this.serialize(data, {
      include: [
        'orderNumber', 'shopifyOrderId', 'customerEmail', 'customerName',
        'status', 'financialStatus', 'fulfillmentStatus', 'totalAmount', 
        'taxAmount', 'shippingAmount', 'currency', 'orderDate',
        'billingAddress', 'shippingAddress'
      ],
      transform: {
        orderDate: (date: Date) => date.toISOString().split('T')[0],
        billingAddress: (addr: any) => this.formatAddress(addr),
        shippingAddress: (addr: any) => this.formatAddress(addr)
      }
    });
  }

  /**
   * 格式化货币
   */
  private static formatCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * 格式化地址
   */
  private static formatAddress(address: any): string {
    if (!address) return '';
    
    const parts = [
      address.address1,
      address.address2,
      address.city,
      address.province,
      address.country,
      address.zip
    ].filter(Boolean);
    
    return parts.join(', ');
  }
}

/**
 * 订单商品序列化器
 */
export class OrderItemSerializer extends BaseSerializer {
  static serialize(data: any, options: SerializationOptions = {}): any {
    const defaultOptions: SerializationOptions = {
      transform: {
        price: (amount: number) => Math.round(amount * 100) / 100,
        compareAtPrice: (amount: number) => amount ? Math.round(amount * 100) / 100 : null,
        weight: (weight: number) => weight ? Math.round(weight * 1000) / 1000 : null
      },
      ...options
    };

    return super.serialize(data, defaultOptions);
  }
}

/**
 * 税费计算序列化器
 */
export class TaxCalculationSerializer extends BaseSerializer {
  static serialize(data: any, options: SerializationOptions = {}): any {
    const defaultOptions: SerializationOptions = {
      transform: {
        taxRate: (rate: number) => Math.round(rate * 10000) / 10000, // 保留4位小数
        taxableAmount: (amount: number) => Math.round(amount * 100) / 100,
        taxAmount: (amount: number) => Math.round(amount * 100) / 100
      },
      ...options
    };

    return super.serialize(data, defaultOptions);
  }
}

/**
 * 物流计算序列化器
 */
export class ShippingCalculationSerializer extends BaseSerializer {
  static serialize(data: any, options: SerializationOptions = {}): any {
    const defaultOptions: SerializationOptions = {
      transform: {
        cost: (amount: number) => Math.round(amount * 100) / 100,
        weight: (weight: number) => Math.round(weight * 1000) / 1000
      },
      ...options
    };

    return super.serialize(data, defaultOptions);
  }
}

/**
 * 合规报告序列化器
 */
export class ComplianceReportSerializer extends BaseSerializer {
  static serialize(data: any, options: SerializationOptions = {}): any {
    const defaultOptions: SerializationOptions = {
      transform: {
        totalValue: (amount: number) => Math.round(amount * 100) / 100,
        totalTax: (amount: number) => Math.round(amount * 100) / 100
      },
      ...options
    };

    return super.serialize(data, defaultOptions);
  }

  /**
   * 报告列表序列化
   */
  static serializeForList(data: any): any {
    return this.serialize(data, {
      include: [
        'id', 'reportType', 'period', 'status', 'totalOrders', 
        'totalValue', 'totalTax', 'currency', 'submittedAt'
      ]
    });
  }
}

/**
 * 统计数据序列化器
 */
export class StatsSerializer extends BaseSerializer {
  static serialize(data: any, options: SerializationOptions = {}): any {
    const defaultOptions: SerializationOptions = {
      transform: {
        // 格式化百分比
        '*Rate': (value: number) => Math.round(value * 100) / 100,
        '*Percentage': (value: number) => Math.round(value * 100) / 100,
        // 格式化金额
        '*Amount': (value: number) => Math.round(value * 100) / 100,
        '*Value': (value: number) => Math.round(value * 100) / 100
      },
      ...options
    };

    return super.serialize(data, defaultOptions);
  }
}

/**
 * 错误序列化器
 */
export class ErrorSerializer extends BaseSerializer {
  static serialize(error: any, options: SerializationOptions = {}): any {
    const errorData = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details || null,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    return super.serialize(errorData, {
      exclude: process.env.NODE_ENV === 'production' ? ['stack'] : [],
      ...options
    });
  }
}

/**
 * 分页响应序列化器
 */
export class PaginatedResponseSerializer extends BaseSerializer {
  static serialize(
    data: any, 
    serializer: typeof BaseSerializer,
    options: SerializationOptions = {}
  ): any {
    const { data: items, total, page, limit, totalPages, hasNext, hasPrev } = data;
    
    return {
      data: serializer.serialize(items, options),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  }
}

/**
 * 序列化器工厂
 */
export class SerializerFactory {
  private static serializers = new Map<string, typeof BaseSerializer>([
    ['Shop', ShopSerializer],
    ['User', UserSerializer],
    ['Order', OrderSerializer],
    ['OrderItem', OrderItemSerializer],
    ['TaxCalculation', TaxCalculationSerializer],
    ['ShippingCalculation', ShippingCalculationSerializer],
    ['ComplianceReport', ComplianceReportSerializer],
    ['Stats', StatsSerializer],
    ['Error', ErrorSerializer]
  ]);

  /**
   * 获取序列化器
   */
  static getSerializer(type: string): typeof BaseSerializer {
    return this.serializers.get(type) || BaseSerializer;
  }

  /**
   * 注册序列化器
   */
  static registerSerializer(type: string, serializer: typeof BaseSerializer): void {
    this.serializers.set(type, serializer);
  }

  /**
   * 序列化数据
   */
  static serialize(
    type: string, 
    data: any, 
    options: SerializationOptions = {}
  ): any {
    const serializer = this.getSerializer(type);
    return serializer.serialize(data, options);
  }
}

/**
 * 默认序列化选项
 */
export const DefaultSerializationOptions = {
  public: {
    dateFormat: 'iso' as const,
    includePrivate: false
  },
  admin: {
    dateFormat: 'iso' as const,
    includePrivate: true
  },
  export: {
    dateFormat: 'iso' as const,
    includePrivate: false
  },
  api: {
    dateFormat: 'iso' as const,
    includePrivate: false
  }
} as const;