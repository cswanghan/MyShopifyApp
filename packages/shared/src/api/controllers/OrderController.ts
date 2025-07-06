import { Request, Response } from 'express';
import { BaseController, BadRequestError, NotFoundError, ForbiddenError, ValidationError } from '../BaseController';
import { OrderRepository, OrderFilter, OrderCreateData, OrderUpdateData } from '../../database/repositories/OrderRepository';
import { Permission } from '../../auth/PermissionManager';

export class OrderController extends BaseController {
  private orderRepository: OrderRepository;

  constructor(orderRepository: OrderRepository) {
    super('OrderController');
    this.orderRepository = orderRepository;
  }

  /**
   * 获取订单列表
   * GET /api/orders
   */
  getOrders = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_VIEW)) {
      throw new ForbiddenError('Orders view permission required');
    }

    const pagination = this.parsePaginationParams(req);
    const { 
      status, 
      fulfillmentStatus, 
      financialStatus,
      customerEmail,
      orderDateFrom,
      orderDateTo,
      amountMin,
      amountMax,
      currency,
      shippingCountry
    } = req.query;

    const filter: OrderFilter = {
      shopId: currentShop.id
    };
    
    if (status) filter.status = status as string;
    if (fulfillmentStatus) filter.fulfillmentStatus = fulfillmentStatus as string;
    if (financialStatus) filter.financialStatus = financialStatus as string;
    if (customerEmail) filter.customerEmail = customerEmail as string;
    if (currency) filter.currency = currency as string;
    if (shippingCountry) filter.shippingCountry = shippingCountry as string;

    // 验证和解析日期范围
    if (orderDateFrom || orderDateTo) {
      const dateRange = this.validateDateRange(orderDateFrom as string, orderDateTo as string);
      filter.orderDateFrom = dateRange.startDate;
      filter.orderDateTo = dateRange.endDate;
    }

    // 验证和解析金额范围
    if (amountMin) {
      const min = parseFloat(amountMin as string);
      if (isNaN(min) || min < 0) {
        throw new ValidationError('Invalid amountMin value');
      }
      filter.amountMin = min;
    }

    if (amountMax) {
      const max = parseFloat(amountMax as string);
      if (isNaN(max) || max < 0) {
        throw new ValidationError('Invalid amountMax value');
      }
      filter.amountMax = max;
    }

    const orderBy = this.parseOrderBy(
      pagination.orderBy,
      pagination.orderDirection,
      ['orderDate', 'totalAmount', 'status', 'customerName', 'orderNumber']
    );

    const result = await this.orderRepository.findOrdersPaginated(
      filter,
      pagination.page,
      pagination.limit,
      orderBy || { orderDate: 'desc' }
    );

    this.logApiAccess(req, 'LIST_ORDERS', undefined, { 
      filterCount: Object.keys(filter).length - 1, // -1 for shopId
      resultCount: result.data.length
    });
    
    return this.paginated(res, result);
  });

  /**
   * 获取订单详情
   * GET /api/orders/:id
   */
  getOrder = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_VIEW)) {
      throw new ForbiddenError('Orders view permission required');
    }

    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // 检查订单是否属于当前店铺
    if (order.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this order');
    }

    this.logApiAccess(req, 'GET_ORDER', id);
    
    return this.success(res, order);
  });

  /**
   * 根据Shopify订单ID获取订单
   * GET /api/orders/shopify/:shopifyOrderId
   */
  getOrderByShopifyId = this.asyncHandler(async (req: Request, res: Response) => {
    const { shopifyOrderId } = req.params;
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_VIEW)) {
      throw new ForbiddenError('Orders view permission required');
    }

    const order = await this.orderRepository.findByShopifyOrderId(shopifyOrderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // 检查订单是否属于当前店铺
    if (order.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this order');
    }

    this.logApiAccess(req, 'GET_ORDER_BY_SHOPIFY_ID', order.id, { shopifyOrderId });
    
    return this.success(res, order);
  });

  /**
   * 创建订单
   * POST /api/orders
   */
  createOrder = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_EDIT)) {
      throw new ForbiddenError('Orders edit permission required');
    }

    // 验证必需字段
    this.validateRequired(req.body, [
      'shopifyOrderId',
      'orderNumber',
      'customerEmail',
      'customerName',
      'financialStatus',
      'totalAmount',
      'subtotalAmount',
      'taxAmount',
      'shippingAmount',
      'currency',
      'billingAddress',
      'shippingAddress',
      'orderDate',
      'orderItems'
    ]);

    const {
      shopifyOrderId,
      orderNumber,
      customerId,
      customerEmail,
      customerName,
      customerPhone,
      status = 'pending',
      fulfillmentStatus,
      financialStatus,
      totalAmount,
      subtotalAmount,
      taxAmount,
      shippingAmount,
      discountAmount = 0,
      currency,
      billingAddress,
      shippingAddress,
      orderDate,
      orderItems,
      metadata
    } = req.body;

    // 验证邮箱格式
    this.validateEmail(customerEmail);

    // 验证金额
    if (totalAmount <= 0 || subtotalAmount <= 0) {
      throw new ValidationError('Order amounts must be positive');
    }

    // 验证订单商品
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      throw new ValidationError('Order must have at least one item');
    }

    // 检查订单是否已存在
    const existingOrder = await this.orderRepository.findByShopifyOrderId(shopifyOrderId);
    if (existingOrder) {
      throw new BadRequestError('Order with this Shopify ID already exists');
    }

    const orderData: OrderCreateData = {
      shopifyOrderId,
      orderNumber,
      shopId: currentShop.id,
      customerId,
      customerEmail,
      customerName,
      customerPhone,
      status,
      fulfillmentStatus,
      financialStatus,
      totalAmount: parseFloat(totalAmount),
      subtotalAmount: parseFloat(subtotalAmount),
      taxAmount: parseFloat(taxAmount),
      shippingAmount: parseFloat(shippingAmount),
      discountAmount: parseFloat(discountAmount),
      currency,
      billingAddress,
      shippingAddress,
      orderDate: new Date(orderDate),
      orderItems,
      metadata
    };

    const order = await this.orderRepository.createOrder(orderData);

    this.logApiAccess(req, 'CREATE_ORDER', order.id, { 
      shopifyOrderId,
      orderNumber,
      itemCount: orderItems.length
    });
    
    return this.success(res, order, undefined, 201);
  });

  /**
   * 更新订单状态
   * PATCH /api/orders/:id/status
   */
  updateOrderStatus = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_EDIT)) {
      throw new ForbiddenError('Orders edit permission required');
    }

    // 检查订单是否存在并属于当前店铺
    const existingOrder = await this.orderRepository.findById(id);
    if (!existingOrder) {
      throw new NotFoundError('Order not found');
    }

    if (existingOrder.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this order');
    }

    const updateData: OrderUpdateData = {};
    const { 
      status, 
      fulfillmentStatus, 
      financialStatus,
      processedAt,
      shippedAt,
      deliveredAt,
      cancelledAt,
      metadata 
    } = req.body;

    if (status !== undefined) updateData.status = status;
    if (fulfillmentStatus !== undefined) updateData.fulfillmentStatus = fulfillmentStatus;
    if (financialStatus !== undefined) updateData.financialStatus = financialStatus;
    if (processedAt !== undefined) updateData.processedAt = new Date(processedAt);
    if (shippedAt !== undefined) updateData.shippedAt = new Date(shippedAt);
    if (deliveredAt !== undefined) updateData.deliveredAt = new Date(deliveredAt);
    if (cancelledAt !== undefined) updateData.cancelledAt = new Date(cancelledAt);
    if (metadata !== undefined) updateData.metadata = metadata;

    const order = await this.orderRepository.updateOrderStatus(id, updateData);

    this.logApiAccess(req, 'UPDATE_ORDER_STATUS', id, { 
      updatedFields: Object.keys(updateData) 
    });
    
    return this.success(res, order);
  });

  /**
   * 批量更新订单状态
   * PATCH /api/orders/batch/status
   */
  batchUpdateOrderStatus = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_EDIT)) {
      throw new ForbiddenError('Orders edit permission required');
    }

    const { orderIds, statusUpdate } = req.body;
    this.validateRequired(req.body, ['orderIds', 'statusUpdate']);

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new BadRequestError('orderIds must be a non-empty array');
    }

    if (orderIds.length > 100) {
      throw new BadRequestError('Cannot update more than 100 orders at once');
    }

    // 验证所有orderIds格式
    orderIds.forEach((id: string) => this.validateUUID(id));

    // 验证所有订单都属于当前店铺
    const orders = await this.orderRepository.findMany({
      where: { 
        id: { in: orderIds },
        shopId: currentShop.id 
      }
    });

    if (orders.length !== orderIds.length) {
      throw new BadRequestError('Some orders not found or access denied');
    }

    const count = await this.orderRepository.batchUpdateStatus(orderIds, statusUpdate);

    this.logApiAccess(req, 'BATCH_UPDATE_ORDER_STATUS', undefined, { 
      requestedCount: orderIds.length,
      actualCount: count,
      statusUpdate 
    });
    
    return this.success(res, { 
      updated: count,
      requested: orderIds.length 
    });
  });

  /**
   * 获取订单统计信息
   * GET /api/orders/stats
   */
  getOrderStats = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.REPORTS_VIEW)) {
      throw new ForbiddenError('Reports view permission required');
    }

    const { dateFrom, dateTo } = req.query;
    let dateRange;
    
    if (dateFrom || dateTo) {
      dateRange = this.validateDateRange(dateFrom as string, dateTo as string);
    }

    const filter: OrderFilter = {
      shopId: currentShop.id
    };

    const stats = await this.orderRepository.getOrderStats(filter, dateRange);

    this.logApiAccess(req, 'GET_ORDER_STATS', undefined, { dateRange });
    
    // 缓存统计数据
    this.setCacheHeaders(res, 300); // 5分钟缓存
    
    return this.success(res, stats);
  });

  /**
   * 搜索订单
   * GET /api/orders/search
   */
  searchOrders = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_VIEW)) {
      throw new ForbiddenError('Orders view permission required');
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      throw new BadRequestError('Search query must be at least 2 characters');
    }

    const pagination = this.parsePaginationParams(req);
    
    const orders = await this.orderRepository.searchOrders(
      q.trim(),
      currentShop.id,
      {
        take: pagination.limit,
        skip: (pagination.page - 1) * pagination.limit,
        orderBy: { orderDate: 'desc' }
      }
    );

    this.logApiAccess(req, 'SEARCH_ORDERS', undefined, { 
      query: q,
      resultCount: orders.length 
    });
    
    return this.success(res, orders);
  });

  /**
   * 获取客户订单历史
   * GET /api/orders/customer/:email/history
   */
  getCustomerOrderHistory = this.asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.params;
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_VIEW)) {
      throw new ForbiddenError('Orders view permission required');
    }

    this.validateEmail(email);

    const { limit } = req.query;
    const maxLimit = Math.min(50, parseInt(limit as string) || 10);

    const orders = await this.orderRepository.getCustomerOrderHistory(
      email,
      currentShop.id,
      maxLimit
    );

    this.logApiAccess(req, 'GET_CUSTOMER_ORDER_HISTORY', undefined, { 
      customerEmail: email,
      resultCount: orders.length 
    });
    
    return this.success(res, orders);
  });

  /**
   * 获取需要税费计算的订单
   * GET /api/orders/tax/pending
   */
  getOrdersForTaxCalculation = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.TAX_CALCULATE)) {
      throw new ForbiddenError('Tax calculation permission required');
    }

    const { limit } = req.query;
    const maxLimit = Math.min(100, parseInt(limit as string) || 50);

    const orders = await this.orderRepository.getOrdersForTaxCalculation(
      currentShop.id,
      maxLimit
    );

    this.logApiAccess(req, 'GET_ORDERS_FOR_TAX_CALCULATION', undefined, { 
      resultCount: orders.length 
    });
    
    return this.success(res, orders);
  });

  /**
   * 获取需要物流计算的订单
   * GET /api/orders/shipping/pending
   */
  getOrdersForShippingCalculation = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.LOGISTICS_CALCULATE)) {
      throw new ForbiddenError('Logistics calculation permission required');
    }

    const { limit } = req.query;
    const maxLimit = Math.min(100, parseInt(limit as string) || 50);

    const orders = await this.orderRepository.getOrdersForShippingCalculation(
      currentShop.id,
      maxLimit
    );

    this.logApiAccess(req, 'GET_ORDERS_FOR_SHIPPING_CALCULATION', undefined, { 
      resultCount: orders.length 
    });
    
    return this.success(res, orders);
  });

  /**
   * 导出订单数据
   * GET /api/orders/export
   */
  exportOrders = this.asyncHandler(async (req: Request, res: Response) => {
    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_EXPORT)) {
      throw new ForbiddenError('Orders export permission required');
    }

    const { 
      format = 'csv',
      dateFrom,
      dateTo,
      status,
      limit = '1000'
    } = req.query;

    if (!['csv', 'json'].includes(format as string)) {
      throw new BadRequestError('Invalid export format. Supported: csv, json');
    }

    const maxLimit = Math.min(10000, parseInt(limit as string));
    
    const filter: OrderFilter = {
      shopId: currentShop.id
    };

    if (status) filter.status = status as string;
    if (dateFrom || dateTo) {
      const dateRange = this.validateDateRange(dateFrom as string, dateTo as string);
      filter.orderDateFrom = dateRange.startDate;
      filter.orderDateTo = dateRange.endDate;
    }

    const orders = await this.orderRepository.findByFilter(filter, {
      take: maxLimit,
      orderBy: { orderDate: 'desc' }
    });

    this.logApiAccess(req, 'EXPORT_ORDERS', undefined, { 
      format,
      resultCount: orders.length,
      filter 
    });

    // 设置响应头
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `orders-${currentShop.domain}-${timestamp}.${format}`;
    
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    if (format === 'csv') {
      // 简化的CSV导出
      const csv = this.convertToCSV(orders);
      return res.send(csv);
    } else {
      return res.json(orders);
    }
  });

  /**
   * 删除订单（仅管理员）
   * DELETE /api/orders/:id
   */
  deleteOrder = this.asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    this.validateUUID(id);

    const currentShop = this.getCurrentShop(req);
    
    if (!req.auth?.permissions?.includes(Permission.ORDERS_DELETE)) {
      throw new ForbiddenError('Orders delete permission required');
    }

    // 检查订单是否存在并属于当前店铺
    const existingOrder = await this.orderRepository.findById(id);
    if (!existingOrder) {
      throw new NotFoundError('Order not found');
    }

    if (existingOrder.shopId !== currentShop.id) {
      throw new ForbiddenError('Access denied to this order');
    }

    const success = await this.orderRepository.delete(id);
    if (!success) {
      throw new Error('Failed to delete order');
    }

    this.logApiAccess(req, 'DELETE_ORDER', id);
    
    return this.success(res, { deleted: true });
  });

  /**
   * 转换为CSV格式
   */
  private convertToCSV(orders: any[]): string {
    if (orders.length === 0) return '';

    const headers = [
      'Order Number',
      'Shopify Order ID',
      'Customer Email',
      'Customer Name',
      'Status',
      'Financial Status',
      'Total Amount',
      'Currency',
      'Order Date',
      'Shipping Country'
    ];

    const rows = orders.map(order => [
      order.orderNumber,
      order.shopifyOrderId,
      order.customerEmail,
      order.customerName,
      order.status,
      order.financialStatus,
      order.totalAmount,
      order.currency,
      order.orderDate.toISOString(),
      order.shippingAddress?.country || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}