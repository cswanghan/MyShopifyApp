import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';

/**
 * 基础仓储接口
 */
export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findMany(filter?: any): Promise<T[]>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(filter?: any): Promise<number>;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  skip?: number;
  take?: number;
  orderBy?: any;
  include?: any;
  where?: any;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 基础仓储抽象类
 */
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected logger: Logger;
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
    this.logger = new Logger(`${modelName}Repository`);
  }

  /**
   * 获取模型委托
   */
  protected abstract getModel(): any;

  /**
   * 根据ID查找单个记录
   */
  async findById(id: string): Promise<T | null> {
    try {
      const result = await this.getModel().findUnique({
        where: { id }
      });
      
      if (result) {
        this.logger.debug('Record found', { id, modelName: this.modelName });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Failed to find record by ID', error, { id, modelName: this.modelName });
      throw error;
    }
  }

  /**
   * 查找多个记录
   */
  async findMany(options?: QueryOptions): Promise<T[]> {
    try {
      const result = await this.getModel().findMany({
        where: options?.where,
        skip: options?.skip,
        take: options?.take,
        orderBy: options?.orderBy,
        include: options?.include
      });
      
      this.logger.debug('Records found', { 
        count: result.length, 
        modelName: this.modelName,
        options 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to find records', error, { modelName: this.modelName, options });
      throw error;
    }
  }

  /**
   * 分页查询
   */
  async findManyPaginated(options: QueryOptions & { page: number; limit: number }): Promise<PaginatedResult<T>> {
    try {
      const { page, limit, ...queryOptions } = options;
      const skip = (page - 1) * limit;
      
      const [data, total] = await Promise.all([
        this.getModel().findMany({
          ...queryOptions,
          skip,
          take: limit
        }),
        this.getModel().count({
          where: queryOptions.where
        })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      const result: PaginatedResult<T> = {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };
      
      this.logger.debug('Paginated query completed', {
        modelName: this.modelName,
        page,
        limit,
        total,
        totalPages
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to execute paginated query', error, { 
        modelName: this.modelName, 
        options 
      });
      throw error;
    }
  }

  /**
   * 创建新记录
   */
  async create(data: any): Promise<T> {
    try {
      const result = await this.getModel().create({
        data
      });
      
      this.logger.info('Record created', { 
        id: result.id, 
        modelName: this.modelName 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create record', error, { 
        modelName: this.modelName, 
        data 
      });
      throw error;
    }
  }

  /**
   * 批量创建记录
   */
  async createMany(data: any[]): Promise<{ count: number }> {
    try {
      const result = await this.getModel().createMany({
        data,
        skipDuplicates: true
      });
      
      this.logger.info('Records created in batch', { 
        count: result.count, 
        modelName: this.modelName 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to create records in batch', error, { 
        modelName: this.modelName, 
        dataCount: data.length 
      });
      throw error;
    }
  }

  /**
   * 更新记录
   */
  async update(id: string, data: any): Promise<T> {
    try {
      const result = await this.getModel().update({
        where: { id },
        data
      });
      
      this.logger.info('Record updated', { 
        id, 
        modelName: this.modelName,
        updatedFields: Object.keys(data)
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to update record', error, { 
        id, 
        modelName: this.modelName, 
        data 
      });
      throw error;
    }
  }

  /**
   * 批量更新记录
   */
  async updateMany(where: any, data: any): Promise<{ count: number }> {
    try {
      const result = await this.getModel().updateMany({
        where,
        data
      });
      
      this.logger.info('Records updated in batch', { 
        count: result.count, 
        modelName: this.modelName 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to update records in batch', error, { 
        modelName: this.modelName, 
        where, 
        data 
      });
      throw error;
    }
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.getModel().delete({
        where: { id }
      });
      
      this.logger.info('Record deleted', { 
        id, 
        modelName: this.modelName 
      });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to delete record', error, { 
        id, 
        modelName: this.modelName 
      });
      return false;
    }
  }

  /**
   * 批量删除记录
   */
  async deleteMany(where: any): Promise<{ count: number }> {
    try {
      const result = await this.getModel().deleteMany({
        where
      });
      
      this.logger.info('Records deleted in batch', { 
        count: result.count, 
        modelName: this.modelName 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Failed to delete records in batch', error, { 
        modelName: this.modelName, 
        where 
      });
      throw error;
    }
  }

  /**
   * 计数
   */
  async count(where?: any): Promise<number> {
    try {
      const count = await this.getModel().count({
        where
      });
      
      this.logger.debug('Count query completed', { 
        count, 
        modelName: this.modelName, 
        where 
      });
      
      return count;
    } catch (error) {
      this.logger.error('Failed to count records', error, { 
        modelName: this.modelName, 
        where 
      });
      throw error;
    }
  }

  /**
   * 检查记录是否存在
   */
  async exists(where: any): Promise<boolean> {
    try {
      const count = await this.getModel().count({
        where,
        take: 1
      });
      
      return count > 0;
    } catch (error) {
      this.logger.error('Failed to check if record exists', error, { 
        modelName: this.modelName, 
        where 
      });
      throw error;
    }
  }

  /**
   * 软删除（如果模型支持）
   */
  async softDelete(id: string): Promise<boolean> {
    try {
      await this.getModel().update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      
      this.logger.info('Record soft deleted', { 
        id, 
        modelName: this.modelName 
      });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to soft delete record', error, { 
        id, 
        modelName: this.modelName 
      });
      return false;
    }
  }

  /**
   * 事务执行
   */
  async transaction<R>(fn: (tx: PrismaClient) => Promise<R>): Promise<R> {
    try {
      return await this.prisma.$transaction(fn);
    } catch (error) {
      this.logger.error('Transaction failed', error, { modelName: this.modelName });
      throw error;
    }
  }

  /**
   * 原始查询
   */
  async raw(query: string, params?: any[]): Promise<any> {
    try {
      const result = await this.prisma.$queryRawUnsafe(query, ...params || []);
      
      this.logger.debug('Raw query executed', { 
        query, 
        paramsCount: params?.length || 0 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Raw query failed', error, { query, params });
      throw error;
    }
  }

  /**
   * 聚合查询
   */
  async aggregate(options: any): Promise<any> {
    try {
      const result = await this.getModel().aggregate(options);
      
      this.logger.debug('Aggregate query completed', { 
        modelName: this.modelName, 
        options 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Aggregate query failed', error, { 
        modelName: this.modelName, 
        options 
      });
      throw error;
    }
  }

  /**
   * 分组查询
   */
  async groupBy(options: any): Promise<any> {
    try {
      const result = await this.getModel().groupBy(options);
      
      this.logger.debug('Group by query completed', { 
        modelName: this.modelName, 
        options 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Group by query failed', error, { 
        modelName: this.modelName, 
        options 
      });
      throw error;
    }
  }
}