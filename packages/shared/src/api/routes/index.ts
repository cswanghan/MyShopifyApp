import express, { Router } from 'express';
import { DatabaseManager } from '../../database/DatabaseManager';
import { ShopRepository } from '../../database/repositories/ShopRepository';
import { UserRepository } from '../../database/repositories/UserRepository';
import { OrderRepository } from '../../database/repositories/OrderRepository';
import { ShopController } from '../controllers/ShopController';
import { UserController } from '../controllers/UserController';
import { OrderController } from '../controllers/OrderController';
import { ExpressAuthMiddleware } from '../../middleware/ExpressAuthMiddleware';
import { 
  errorHandler, 
  requestIdMiddleware, 
  apiVersionMiddleware 
} from '../BaseController';
import { Logger } from '../../utils/logger';

/**
 * API路由配置
 */
export interface ApiRouterConfig {
  databaseManager: DatabaseManager;
  authMiddleware: ExpressAuthMiddleware;
  enableRequestLogging?: boolean;
  enableCors?: boolean;
  corsOptions?: any;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * API路由管理器
 */
export class ApiRouter {
  private logger = new Logger('ApiRouter');
  private router: Router;
  private config: ApiRouterConfig;
  
  // 仓储实例
  private shopRepository: ShopRepository;
  private userRepository: UserRepository;
  private orderRepository: OrderRepository;
  
  // 控制器实例
  private shopController: ShopController;
  private userController: UserController;
  private orderController: OrderController;

  constructor(config: ApiRouterConfig) {
    this.config = config;
    this.router = express.Router();
    
    // 初始化仓储
    this.initializeRepositories();
    
    // 初始化控制器
    this.initializeControllers();
    
    // 设置中间件
    this.setupMiddleware();
    
    // 设置路由
    this.setupRoutes();
    
    // 设置错误处理
    this.setupErrorHandling();
  }

  /**
   * 初始化仓储
   */
  private initializeRepositories(): void {
    const prisma = this.config.databaseManager.getClient();
    
    this.shopRepository = new ShopRepository(prisma);
    this.userRepository = new UserRepository(prisma);
    this.orderRepository = new OrderRepository(prisma);
  }

  /**
   * 初始化控制器
   */
  private initializeControllers(): void {
    this.shopController = new ShopController(this.shopRepository);
    this.userController = new UserController(this.userRepository);
    this.orderController = new OrderController(this.orderRepository);
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // 请求ID
    this.router.use(requestIdMiddleware);
    
    // API版本控制
    this.router.use(apiVersionMiddleware(['v1']));
    
    // CORS支持
    if (this.config.enableCors) {
      const cors = require('cors');
      this.router.use(cors(this.config.corsOptions));
    }
    
    // 请求日志
    if (this.config.enableRequestLogging) {
      this.router.use(this.requestLoggingMiddleware());
    }
    
    // 全局速率限制
    if (this.config.rateLimit) {
      this.router.use(this.config.authMiddleware.rateLimit(this.config.rateLimit));
    }
    
    // 安全头
    this.router.use(this.config.authMiddleware.securityHeaders());
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 健康检查路由（无需认证）
    this.router.get('/health', this.healthCheck);
    
    // 认证路由
    this.setupAuthRoutes();
    
    // 受保护的API路由
    this.router.use(this.config.authMiddleware.authenticate());
    
    // 店铺路由
    this.setupShopRoutes();
    
    // 用户路由
    this.setupUserRoutes();
    
    // 订单路由
    this.setupOrderRoutes();
    
    // API文档路由
    this.setupDocsRoutes();
  }

  /**
   * 设置认证路由
   */
  private setupAuthRoutes(): void {
    const authRouter = express.Router();
    
    // 登录
    authRouter.post('/login', this.config.authMiddleware.loginEndpoint());
    
    // OAuth回调
    authRouter.get('/callback', this.config.authMiddleware.callbackEndpoint());
    
    // 登出（需要认证）
    authRouter.post('/logout', 
      this.config.authMiddleware.authenticate(),
      this.config.authMiddleware.logoutEndpoint()
    );
    
    // 店铺切换（需要认证）
    authRouter.post('/switch-shop', 
      this.config.authMiddleware.authenticate(),
      this.config.authMiddleware.switchShopEndpoint()
    );
    
    this.router.use('/auth', authRouter);
  }

  /**
   * 设置店铺路由
   */
  private setupShopRoutes(): void {
    const shopRouter = express.Router();
    
    // 当前店铺
    shopRouter.get('/current', this.shopController.getCurrentShop);
    
    // 店铺统计（仅管理员）
    shopRouter.get('/stats', this.shopController.getShopsStats);
    
    // 搜索店铺（仅管理员）
    shopRouter.get('/search', this.shopController.searchShops);
    
    // 需要同步的店铺（仅管理员）
    shopRouter.get('/sync/pending', this.shopController.getShopsToSync);
    
    // 批量同步（仅管理员）
    shopRouter.post('/sync/batch', this.shopController.batchSyncShops);
    
    // 清理无效店铺（仅管理员）
    shopRouter.delete('/cleanup', this.shopController.cleanupInactiveShops);
    
    // 店铺列表（仅管理员）
    shopRouter.get('/', this.shopController.getShops);
    
    // 特定店铺操作
    shopRouter.get('/:id', this.shopController.getShop);
    shopRouter.put('/:id', this.shopController.updateShop);
    shopRouter.post('/:id/deactivate', this.shopController.deactivateShop);
    shopRouter.post('/:id/activate', this.shopController.activateShop);
    shopRouter.post('/:id/sync', this.shopController.syncShop);
    
    // 店铺设置
    shopRouter.get('/:id/settings', this.shopController.getShopSettings);
    shopRouter.put('/:id/settings', this.shopController.updateShopSettings);
    
    // 健康检查
    shopRouter.get('/health', this.shopController.healthCheck);
    
    this.router.use('/shops', shopRouter);
  }

  /**
   * 设置用户路由
   */
  private setupUserRoutes(): void {
    const userRouter = express.Router();
    
    // 当前用户
    userRouter.get('/me', this.userController.getCurrentUser);
    userRouter.put('/me', this.userController.updateCurrentUser);
    
    // 用户统计
    userRouter.get('/stats', this.userController.getUserStats);
    
    // 搜索用户
    userRouter.get('/search', this.userController.searchUsers);
    
    // 用户列表和创建
    userRouter.get('/', this.userController.getUsers);
    userRouter.post('/', this.userController.createUser);
    
    // 特定用户操作
    userRouter.get('/:id', this.userController.getUser);
    userRouter.put('/:id', this.userController.updateUser);
    userRouter.delete('/:id', this.userController.deleteUser);
    userRouter.post('/:id/deactivate', this.userController.deactivateUser);
    userRouter.post('/:id/activate', this.userController.activateUser);
    
    // 用户角色管理
    userRouter.get('/:id/roles', this.userController.getUserRoles);
    userRouter.post('/:id/roles', this.userController.assignRole);
    userRouter.delete('/:id/roles/:role', this.userController.removeRole);
    
    // 用户权限查看
    userRouter.get('/:id/permissions', this.userController.getUserPermissions);
    
    this.router.use('/users', userRouter);
  }

  /**
   * 设置订单路由
   */
  private setupOrderRoutes(): void {
    const orderRouter = express.Router();
    
    // 订单统计
    orderRouter.get('/stats', this.orderController.getOrderStats);
    
    // 搜索订单
    orderRouter.get('/search', this.orderController.searchOrders);
    
    // 导出订单
    orderRouter.get('/export', this.orderController.exportOrders);
    
    // 批量操作
    orderRouter.patch('/batch/status', this.orderController.batchUpdateOrderStatus);
    
    // 税费和物流计算队列
    orderRouter.get('/tax/pending', this.orderController.getOrdersForTaxCalculation);
    orderRouter.get('/shipping/pending', this.orderController.getOrdersForShippingCalculation);
    
    // 客户订单历史
    orderRouter.get('/customer/:email/history', this.orderController.getCustomerOrderHistory);
    
    // 根据Shopify ID获取订单
    orderRouter.get('/shopify/:shopifyOrderId', this.orderController.getOrderByShopifyId);
    
    // 订单列表和创建
    orderRouter.get('/', this.orderController.getOrders);
    orderRouter.post('/', this.orderController.createOrder);
    
    // 特定订单操作
    orderRouter.get('/:id', this.orderController.getOrder);
    orderRouter.patch('/:id/status', this.orderController.updateOrderStatus);
    orderRouter.delete('/:id', this.orderController.deleteOrder);
    
    this.router.use('/orders', orderRouter);
  }

  /**
   * 设置文档路由
   */
  private setupDocsRoutes(): void {
    const docsRouter = express.Router();
    
    // API文档
    docsRouter.get('/', (req, res) => {
      res.json({
        name: 'DTax-Bridge API',
        version: 'v1',
        description: 'Cross-border tax and logistics management API',
        endpoints: {
          auth: '/api/auth',
          shops: '/api/shops',
          users: '/api/users',
          orders: '/api/orders',
          health: '/api/health'
        },
        documentation: 'https://docs.dtax-bridge.com/api'
      });
    });
    
    // OpenAPI规范
    docsRouter.get('/openapi.json', (req, res) => {
      res.json(this.generateOpenApiSpec());
    });
    
    this.router.use('/docs', docsRouter);
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 404处理
    this.router.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `API endpoint not found: ${req.method} ${req.path}`
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    });
    
    // 全局错误处理
    this.router.use(errorHandler);
  }

  /**
   * 健康检查端点
   */
  private healthCheck = async (req: express.Request, res: express.Response) => {
    try {
      const dbHealth = await this.config.databaseManager.healthCheck();
      
      const health = {
        status: dbHealth.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || 'v1',
        environment: process.env.NODE_ENV || 'development',
        services: {
          database: {
            status: dbHealth.healthy ? 'up' : 'down',
            latency: dbHealth.latency
          },
          api: {
            status: 'up'
          }
        },
        uptime: process.uptime()
      };
      
      const statusCode = dbHealth.healthy ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  };

  /**
   * 请求日志中间件
   */
  private requestLoggingMiddleware() {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        
        this.logger.info('API请求', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.auth?.user?.id,
          shopId: req.auth?.shop?.id
        });
      });
      
      next();
    };
  }

  /**
   * 生成OpenAPI规范
   */
  private generateOpenApiSpec(): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'DTax-Bridge API',
        version: '1.0.0',
        description: 'Cross-border tax and logistics management API'
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:3001/api',
          description: 'API服务器'
        }
      ],
      paths: {
        '/health': {
          get: {
            summary: '健康检查',
            responses: {
              '200': {
                description: '服务健康'
              }
            }
          }
        },
        '/shops/current': {
          get: {
            summary: '获取当前店铺信息',
            security: [{ bearerAuth: [] }],
            responses: {
              '200': {
                description: '店铺信息'
              }
            }
          }
        }
        // ... 更多端点定义
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer'
          }
        }
      }
    };
  }

  /**
   * 获取路由器实例
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * 获取仓储实例
   */
  getRepositories() {
    return {
      shopRepository: this.shopRepository,
      userRepository: this.userRepository,
      orderRepository: this.orderRepository
    };
  }

  /**
   * 获取控制器实例
   */
  getControllers() {
    return {
      shopController: this.shopController,
      userController: this.userController,
      orderController: this.orderController
    };
  }
}

/**
 * 创建API路由器的便捷函数
 */
export function createApiRouter(config: ApiRouterConfig): Router {
  const apiRouter = new ApiRouter(config);
  return apiRouter.getRouter();
}