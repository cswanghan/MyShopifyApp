import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { PaginatedResult } from '../database/repositories/BaseRepository';

/**
 * API响应基础接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

/**
 * API错误类
 */
export class ApiError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * 常见API错误
 */
export class BadRequestError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'BAD_REQUEST', 400, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 422, details);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super(message, 'TOO_MANY_REQUESTS', 429);
  }
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * 基础控制器类
 */
export abstract class BaseController {
  protected logger: Logger;

  constructor(controllerName: string) {
    this.logger = new Logger(controllerName);
  }

  /**
   * 成功响应
   */
  protected success<T>(
    res: Response,
    data?: T,
    meta?: any,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId,
        ...meta
      }
    };

    return res.status(statusCode).json(response);
  }

  /**
   * 分页响应
   */
  protected paginated<T>(
    res: Response,
    result: PaginatedResult<T>,
    statusCode: number = 200
  ): Response {
    return this.success(res, result.data, {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev
      }
    }, statusCode);
  }

  /**
   * 错误响应
   */
  protected error(
    res: Response,
    error: ApiError | Error,
    requestId?: string
  ): Response {
    let apiError: ApiError;

    if (error instanceof ApiError) {
      apiError = error;
    } else {
      // 未知错误，包装为内部服务器错误
      apiError = new ApiError(
        process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        'INTERNAL_ERROR',
        500
      );
    }

    // 记录错误日志
    this.logger.error('API错误', apiError, {
      requestId,
      statusCode: apiError.statusCode,
      code: apiError.code
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    return res.status(apiError.statusCode).json(response);
  }

  /**
   * 异步处理器包装器
   */
  protected asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * 解析分页参数
   */
  protected parsePaginationParams(req: Request): PaginationParams {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100, 
      Math.max(1, parseInt(req.query.limit as string) || 20)
    );
    const orderBy = req.query.orderBy as string;
    const orderDirection = (req.query.orderDirection as string) === 'desc' ? 'desc' : 'asc';

    return {
      page,
      limit,
      orderBy,
      orderDirection
    };
  }

  /**
   * 解析排序参数
   */
  protected parseOrderBy(
    orderBy?: string,
    orderDirection: 'asc' | 'desc' = 'asc',
    allowedFields?: string[]
  ): any {
    if (!orderBy) return undefined;

    // 检查字段是否允许
    if (allowedFields && !allowedFields.includes(orderBy)) {
      throw new BadRequestError(`Invalid orderBy field: ${orderBy}`);
    }

    return { [orderBy]: orderDirection };
  }

  /**
   * 验证必需参数
   */
  protected validateRequired(
    data: any,
    requiredFields: string[]
  ): void {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        { missingFields }
      );
    }
  }

  /**
   * 验证UUID格式
   */
  protected validateUUID(id: string, fieldName: string = 'id'): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      throw new BadRequestError(`Invalid ${fieldName} format`);
    }
  }

  /**
   * 验证邮箱格式
   */
  protected validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * 验证日期范围
   */
  protected validateDateRange(
    startDate?: string | Date,
    endDate?: string | Date
  ): { startDate?: Date; endDate?: Date } {
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid start date format');
      }
    }

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid end date format');
      }
    }

    if (start && end && start > end) {
      throw new ValidationError('Start date must be before end date');
    }

    return { startDate: start, endDate: end };
  }

  /**
   * 检查资源权限
   */
  protected checkResourcePermission(
    req: Request,
    resourceShopId: string
  ): void {
    if (!req.auth?.shop) {
      throw new UnauthorizedError();
    }

    if (req.auth.shop.id !== resourceShopId) {
      throw new ForbiddenError('Access denied to this resource');
    }
  }

  /**
   * 获取当前用户信息
   */
  protected getCurrentUser(req: Request) {
    if (!req.auth?.user) {
      throw new UnauthorizedError();
    }
    return req.auth.user;
  }

  /**
   * 获取当前店铺信息
   */
  protected getCurrentShop(req: Request) {
    if (!req.auth?.shop) {
      throw new UnauthorizedError();
    }
    return req.auth.shop;
  }

  /**
   * 缓存响应头设置
   */
  protected setCacheHeaders(
    res: Response,
    maxAge: number = 300, // 5分钟默认缓存
    isPrivate: boolean = true
  ): void {
    const cacheControl = isPrivate 
      ? `private, max-age=${maxAge}` 
      : `public, max-age=${maxAge}`;
    
    res.set({
      'Cache-Control': cacheControl,
      'ETag': `W/"${Date.now()}"`,
      'Last-Modified': new Date().toUTCString()
    });
  }

  /**
   * 设置安全响应头
   */
  protected setSecurityHeaders(res: Response): void {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });
  }

  /**
   * 记录API访问日志
   */
  protected logApiAccess(
    req: Request,
    action: string,
    resourceId?: string,
    extra?: any
  ): void {
    this.logger.info('API访问', {
      action,
      resourceId,
      userId: req.auth?.user?.id,
      shopId: req.auth?.shop?.id,
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...extra
    });
  }
}

/**
 * 错误处理中间件
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const controller = new (class extends BaseController {
    constructor() {
      super('ErrorHandler');
    }

    public handleError(error: any, res: Response, requestId?: string) {
      return this.error(res, error, requestId);
    }
  })();

  controller.handleError(error, res, res.locals.requestId);
}

/**
 * 请求ID中间件
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.get('X-Request-ID') || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.locals.requestId = requestId;
  res.set('X-Request-ID', requestId);
  
  next();
}

/**
 * API版本控制中间件
 */
export function apiVersionMiddleware(supportedVersions: string[] = ['v1']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = req.get('API-Version') || req.query.version as string || 'v1';
    
    if (!supportedVersions.includes(version)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `Unsupported API version: ${version}. Supported versions: ${supportedVersions.join(', ')}`
        }
      });
    }
    
    req.apiVersion = version;
    next();
  };
}

// 扩展Express Request接口
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}