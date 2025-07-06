import { PrismaClient } from '@prisma/client';
import { BaseRepository, QueryOptions, PaginatedResult } from './BaseRepository';
import { Order, Address } from '../models';

export interface OrderFilter {
  shopId?: string;
  status?: string;
  fulfillmentStatus?: string;
  financialStatus?: string;
  customerEmail?: string;
  orderDateFrom?: Date;
  orderDateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  currency?: string;
  shippingCountry?: string;
}

export interface OrderCreateData {
  shopifyOrderId: string;
  orderNumber: string;
  shopId: string;
  customerId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  status: string;
  fulfillmentStatus?: string;
  financialStatus: string;
  totalAmount: number;
  subtotalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount?: number;
  currency: string;
  billingAddress: Address;
  shippingAddress: Address;
  orderDate: Date;
  orderItems: OrderItemCreateData[];
  metadata?: Record<string, any>;
}

export interface OrderItemCreateData {
  productId: string;
  variantId?: string;
  sku: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  compareAtPrice?: number;
  hsCode?: string;
  category?: string;
  weight?: number;
  weightUnit?: string;
}

export interface OrderUpdateData {
  status?: string;
  fulfillmentStatus?: string;
  financialStatus?: string;
  processedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  metadata?: Record<string, any>;
}

export interface OrderStats {
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
  byStatus: Record<string, number>;
  byCountry: Record<string, number>;
  byCurrency: Record<string, number>;
  recentOrders: number;
}

export class OrderRepository extends BaseRepository<Order> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'Order');
  }

  protected getModel() {
    return this.prisma.order;
  }

  /**
   * 根据Shopify订单ID查找订单
   */
  async findByShopifyOrderId(shopifyOrderId: string): Promise<Order | null> {
    try {
      const order = await this.getModel().findUnique({
        where: { shopifyOrderId },
        include: {
          shop: true,
          orderItems: true,
          taxCalculations: true,
          shippingCalculations: true,
          complianceReports: true
        }
      });

      if (order) {
        this.logger.debug('Order found by Shopify order ID', { 
          shopifyOrderId, 
          orderId: order.id 
        });
      }

      return order;
    } catch (error) {
      this.logger.error('Failed to find order by Shopify order ID', error, { shopifyOrderId });
      throw error;
    }
  }

  /**
   * 根据订单号查找订单
   */
  async findByOrderNumber(orderNumber: string, shopId?: string): Promise<Order | null> {
    try {
      const where: any = { orderNumber };
      if (shopId) {
        where.shopId = shopId;
      }

      const order = await this.getModel().findFirst({
        where,
        include: {
          shop: true,
          orderItems: true,
          taxCalculations: true,
          shippingCalculations: true
        }
      });

      if (order) {
        this.logger.debug('Order found by order number', { 
          orderNumber, 
          orderId: order.id,
          shopId 
        });
      }

      return order;
    } catch (error) {
      this.logger.error('Failed to find order by order number', error, { orderNumber, shopId });
      throw error;
    }
  }

  /**
   * 根据过滤条件查找订单
   */
  async findByFilter(
    filter: OrderFilter, 
    options?: QueryOptions
  ): Promise<Order[]> {
    try {
      const where: any = {};

      if (filter.shopId) {
        where.shopId = filter.shopId;
      }

      if (filter.status) {
        where.status = filter.status;
      }

      if (filter.fulfillmentStatus) {
        where.fulfillmentStatus = filter.fulfillmentStatus;
      }

      if (filter.financialStatus) {
        where.financialStatus = filter.financialStatus;
      }

      if (filter.customerEmail) {
        where.customerEmail = { 
          contains: filter.customerEmail, 
          mode: 'insensitive' 
        };
      }

      if (filter.orderDateFrom || filter.orderDateTo) {
        where.orderDate = {};
        if (filter.orderDateFrom) {
          where.orderDate.gte = filter.orderDateFrom;
        }
        if (filter.orderDateTo) {
          where.orderDate.lte = filter.orderDateTo;
        }
      }

      if (filter.amountMin || filter.amountMax) {
        where.totalAmount = {};
        if (filter.amountMin) {
          where.totalAmount.gte = filter.amountMin;
        }
        if (filter.amountMax) {
          where.totalAmount.lte = filter.amountMax;
        }
      }

      if (filter.currency) {
        where.currency = filter.currency;
      }

      if (filter.shippingCountry) {
        where.shippingAddress = {
          path: ['country'],
          equals: filter.shippingCountry
        };
      }

      return await this.findMany({
        ...options,
        where: { ...where, ...options?.where },
        include: {
          shop: true,
          orderItems: true,
          taxCalculations: true,
          shippingCalculations: true,
          ...options?.include
        }
      });
    } catch (error) {
      this.logger.error('Failed to find orders by filter', error, { filter });
      throw error;
    }
  }

  /**
   * 分页查询订单
   */
  async findOrdersPaginated(
    filter: OrderFilter,
    page: number = 1,
    limit: number = 20,
    orderBy?: any
  ): Promise<PaginatedResult<Order>> {
    try {
      const where: any = this.buildWhereClause(filter);

      return await this.findManyPaginated({
        where,
        page,
        limit,
        orderBy: orderBy || { orderDate: 'desc' },
        include: {
          shop: true,
          orderItems: true,
          taxCalculations: true,
          shippingCalculations: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to find orders paginated', error, { filter, page, limit });
      throw error;
    }
  }

  /**
   * 创建订单
   */
  async createOrder(data: OrderCreateData): Promise<Order> {
    try {
      return await this.transaction(async (tx) => {
        // 创建订单
        const order = await tx.order.create({
          data: {
            shopifyOrderId: data.shopifyOrderId,
            orderNumber: data.orderNumber,
            shopId: data.shopId,
            customerId: data.customerId,
            customerEmail: data.customerEmail,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            status: data.status,
            fulfillmentStatus: data.fulfillmentStatus,
            financialStatus: data.financialStatus,
            totalAmount: data.totalAmount,
            subtotalAmount: data.subtotalAmount,
            taxAmount: data.taxAmount,
            shippingAmount: data.shippingAmount,
            discountAmount: data.discountAmount || 0,
            currency: data.currency,
            billingAddress: data.billingAddress,
            shippingAddress: data.shippingAddress,
            orderDate: data.orderDate,
            metadata: data.metadata
          }
        });

        // 创建订单商品
        if (data.orderItems && data.orderItems.length > 0) {
          await tx.orderItem.createMany({
            data: data.orderItems.map(item => ({
              orderId: order.id,
              productId: item.productId,
              variantId: item.variantId,
              sku: item.sku,
              title: item.title,
              variantTitle: item.variantTitle,
              quantity: item.quantity,
              price: item.price,
              compareAtPrice: item.compareAtPrice,
              hsCode: item.hsCode,
              category: item.category,
              weight: item.weight,
              weightUnit: item.weightUnit
            }))
          });
        }

        this.logger.info('Order created', { 
          orderId: order.id,
          shopifyOrderId: data.shopifyOrderId,
          orderNumber: data.orderNumber,
          shopId: data.shopId,
          itemCount: data.orderItems?.length || 0
        });

        return order;
      });
    } catch (error) {
      this.logger.error('Failed to create order', error, { data });
      throw error;
    }
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(id: string, data: OrderUpdateData): Promise<Order> {
    try {
      const order = await this.update(id, data);

      this.logger.info('Order status updated', { 
        orderId: id, 
        updatedFields: Object.keys(data) 
      });

      return order;
    } catch (error) {
      this.logger.error('Failed to update order status', error, { id, data });
      throw error;
    }
  }

  /**
   * 批量更新订单状态
   */
  async batchUpdateStatus(
    orderIds: string[], 
    statusUpdate: Partial<OrderUpdateData>
  ): Promise<number> {
    try {
      const result = await this.updateMany(
        { id: { in: orderIds } },
        statusUpdate
      );

      this.logger.info('Batch updated order status', { 
        count: result.count, 
        orderIds: orderIds.length,
        statusUpdate 
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to batch update order status', error, { 
        orderIds, 
        statusUpdate 
      });
      throw error;
    }
  }

  /**
   * 获取订单统计信息
   */
  async getOrderStats(
    filter?: OrderFilter, 
    dateRange?: { from: Date; to: Date }
  ): Promise<OrderStats> {
    try {
      const where = this.buildWhereClause(filter);
      
      if (dateRange) {
        where.orderDate = {
          gte: dateRange.from,
          lte: dateRange.to
        };
      }

      const [
        totalOrders,
        totalValueResult,
        byStatus,
        byCountry,
        byCurrency,
        recentOrders
      ] = await Promise.all([
        this.count(where),
        this.aggregate({
          where,
          _sum: { totalAmount: true },
          _avg: { totalAmount: true }
        }),
        this.groupBy({
          by: ['status'],
          where,
          _count: { status: true }
        }),
        this.raw(`
          SELECT 
            shipping_address->>'country' as country,
            COUNT(*) as count
          FROM orders 
          WHERE ${this.buildSqlWhereClause(where)}
          GROUP BY shipping_address->>'country'
        `),
        this.groupBy({
          by: ['currency'],
          where,
          _count: { currency: true }
        }),
        this.count({
          ...where,
          orderDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
          }
        })
      ]);

      const statusStats = byStatus.reduce((acc: Record<string, number>, item: any) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {});

      const countryStats = byCountry.reduce((acc: Record<string, number>, item: any) => {
        acc[item.country || 'Unknown'] = parseInt(item.count);
        return acc;
      }, {});

      const currencyStats = byCurrency.reduce((acc: Record<string, number>, item: any) => {
        acc[item.currency] = item._count.currency;
        return acc;
      }, {});

      return {
        totalOrders,
        totalValue: totalValueResult._sum.totalAmount || 0,
        averageOrderValue: totalValueResult._avg.totalAmount || 0,
        byStatus: statusStats,
        byCountry: countryStats,
        byCurrency: currencyStats,
        recentOrders
      };
    } catch (error) {
      this.logger.error('Failed to get order stats', error, { filter, dateRange });
      throw error;
    }
  }

  /**
   * 获取客户订单历史
   */
  async getCustomerOrderHistory(
    customerEmail: string, 
    shopId?: string,
    limit: number = 10
  ): Promise<Order[]> {
    try {
      const where: any = { customerEmail };
      if (shopId) {
        where.shopId = shopId;
      }

      return await this.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        take: limit,
        include: {
          orderItems: true,
          taxCalculations: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to get customer order history', error, { 
        customerEmail, 
        shopId 
      });
      throw error;
    }
  }

  /**
   * 获取需要税费计算的订单
   */
  async getOrdersForTaxCalculation(shopId: string, limit: number = 50): Promise<Order[]> {
    try {
      return await this.findMany({
        where: {
          shopId,
          status: { in: ['pending', 'processing'] },
          taxCalculations: { none: {} }
        },
        orderBy: { orderDate: 'asc' },
        take: limit,
        include: {
          orderItems: true,
          shop: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to get orders for tax calculation', error, { shopId });
      throw error;
    }
  }

  /**
   * 获取需要物流计算的订单
   */
  async getOrdersForShippingCalculation(shopId: string, limit: number = 50): Promise<Order[]> {
    try {
      return await this.findMany({
        where: {
          shopId,
          status: { in: ['pending', 'processing'] },
          shippingCalculations: { none: {} }
        },
        orderBy: { orderDate: 'asc' },
        take: limit,
        include: {
          orderItems: true,
          shop: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to get orders for shipping calculation', error, { shopId });
      throw error;
    }
  }

  /**
   * 搜索订单
   */
  async searchOrders(
    query: string, 
    shopId?: string,
    options?: QueryOptions
  ): Promise<Order[]> {
    try {
      const where: any = {
        OR: [
          { orderNumber: { contains: query, mode: 'insensitive' } },
          { customerEmail: { contains: query, mode: 'insensitive' } },
          { customerName: { contains: query, mode: 'insensitive' } },
          { shopifyOrderId: { contains: query, mode: 'insensitive' } }
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
          orderItems: true,
          taxCalculations: true,
          shippingCalculations: true
        }
      });
    } catch (error) {
      this.logger.error('Failed to search orders', error, { query, shopId });
      throw error;
    }
  }

  /**
   * 删除旧订单数据
   */
  async cleanupOldOrders(daysOld: number = 365): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const result = await this.deleteMany({
        orderDate: { lt: cutoffTime },
        status: { in: ['delivered', 'cancelled'] }
      });

      this.logger.info('Cleaned up old orders', { 
        count: result.count, 
        daysOld 
      });

      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup old orders', error, { daysOld });
      throw error;
    }
  }

  /**
   * 构建where子句
   */
  private buildWhereClause(filter?: OrderFilter): any {
    if (!filter) return {};

    const where: any = {};

    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        switch (key) {
          case 'customerEmail':
            where.customerEmail = { contains: value, mode: 'insensitive' };
            break;
          case 'orderDateFrom':
            where.orderDate = { ...where.orderDate, gte: value };
            break;
          case 'orderDateTo':
            where.orderDate = { ...where.orderDate, lte: value };
            break;
          case 'amountMin':
            where.totalAmount = { ...where.totalAmount, gte: value };
            break;
          case 'amountMax':
            where.totalAmount = { ...where.totalAmount, lte: value };
            break;
          case 'shippingCountry':
            where.shippingAddress = { path: ['country'], equals: value };
            break;
          default:
            where[key] = value;
        }
      }
    });

    return where;
  }

  /**
   * 构建SQL where子句（用于原始查询）
   */
  private buildSqlWhereClause(where: any): string {
    // 简化实现，实际应用中应该更完善
    const conditions: string[] = [];

    if (where.shopId) {
      conditions.push(`shop_id = '${where.shopId}'`);
    }

    if (where.status) {
      conditions.push(`status = '${where.status}'`);
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
  }
}