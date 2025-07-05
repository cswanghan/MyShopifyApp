import crypto from 'crypto';
import { Logger } from '../utils/logger';

/**
 * 用户会话信息接口
 */
export interface UserSession {
  id: string;
  shopId: string;
  shopDomain: string;
  userId?: string;
  accessToken: string;
  scope: string[];
  expiresAt?: Date;
  createdAt: Date;
  lastActiveAt: Date;
  metadata?: Record<string, any>;
}

/**
 * 会话存储接口
 */
export interface SessionStore {
  get(sessionId: string): Promise<UserSession | null>;
  set(sessionId: string, session: UserSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  deleteByShop(shopDomain: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * 内存会话存储实现
 */
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, UserSession>();
  private logger = new Logger('MemorySessionStore');

  async get(sessionId: string): Promise<UserSession | null> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // 检查会话是否过期
      if (session.expiresAt && session.expiresAt < new Date()) {
        await this.delete(sessionId);
        return null;
      }
      
      // 更新最后活跃时间
      session.lastActiveAt = new Date();
      this.sessions.set(sessionId, session);
    }
    
    return session || null;
  }

  async set(sessionId: string, session: UserSession): Promise<void> {
    this.sessions.set(sessionId, session);
    this.logger.debug('会话已保存', { sessionId, shopDomain: session.shopDomain });
  }

  async delete(sessionId: string): Promise<void> {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.logger.debug('会话已删除', { sessionId });
    }
  }

  async deleteByShop(shopDomain: string): Promise<void> {
    const deletedSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.shopDomain === shopDomain) {
        this.sessions.delete(sessionId);
        deletedSessions.push(sessionId);
      }
    }
    
    this.logger.info('店铺相关会话已清理', { 
      shopDomain, 
      deletedCount: deletedSessions.length 
    });
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    const deletedSessions: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      // 删除过期会话
      if (session.expiresAt && session.expiresAt < now) {
        this.sessions.delete(sessionId);
        deletedSessions.push(sessionId);
        continue;
      }
      
      // 删除长时间未活跃的会话（30天）
      const inactiveTime = now.getTime() - session.lastActiveAt.getTime();
      if (inactiveTime > 30 * 24 * 60 * 60 * 1000) {
        this.sessions.delete(sessionId);
        deletedSessions.push(sessionId);
      }
    }
    
    if (deletedSessions.length > 0) {
      this.logger.info('清理过期会话', { deletedCount: deletedSessions.length });
    }
  }

  // 获取会话统计信息
  getStats(): {
    totalSessions: number;
    activeShops: number;
    expiredSessions: number;
  } {
    const now = new Date();
    const shops = new Set<string>();
    let expiredCount = 0;
    
    for (const session of this.sessions.values()) {
      shops.add(session.shopDomain);
      
      if (session.expiresAt && session.expiresAt < now) {
        expiredCount++;
      }
    }
    
    return {
      totalSessions: this.sessions.size,
      activeShops: shops.size,
      expiredSessions: expiredCount
    };
  }
}

/**
 * 会话管理器
 */
export class SessionManager {
  private logger = new Logger('SessionManager');
  private store: SessionStore;
  private sessionTimeout: number; // 会话超时时间（毫秒）
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: {
    store?: SessionStore;
    sessionTimeout?: number; // 默认24小时
    enableAutoCleanup?: boolean;
  } = {}) {
    this.store = config.store || new MemorySessionStore();
    this.sessionTimeout = config.sessionTimeout || 24 * 60 * 60 * 1000; // 24小时
    
    // 启用自动清理
    if (config.enableAutoCleanup !== false) {
      this.startAutoCleanup();
    }
  }

  /**
   * 创建新会话
   */
  async createSession(params: {
    shopId: string;
    shopDomain: string;
    userId?: string;
    accessToken: string;
    scope: string[];
    metadata?: Record<string, any>;
  }): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: UserSession = {
      id: sessionId,
      shopId: params.shopId,
      shopDomain: params.shopDomain,
      userId: params.userId,
      accessToken: params.accessToken,
      scope: params.scope,
      expiresAt: new Date(now.getTime() + this.sessionTimeout),
      createdAt: now,
      lastActiveAt: now,
      metadata: params.metadata || {}
    };

    await this.store.set(sessionId, session);
    
    this.logger.info('会话已创建', {
      sessionId,
      shopDomain: params.shopDomain,
      userId: params.userId,
      scope: params.scope
    });

    return sessionId;
  }

  /**
   * 获取会话
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    if (!sessionId) return null;
    
    try {
      const session = await this.store.get(sessionId);
      
      if (session) {
        this.logger.debug('会话获取成功', {
          sessionId,
          shopDomain: session.shopDomain
        });
      }
      
      return session;
    } catch (error) {
      this.logger.error('获取会话失败', error, { sessionId });
      return null;
    }
  }

  /**
   * 更新会话
   */
  async updateSession(
    sessionId: string, 
    updates: Partial<Pick<UserSession, 'accessToken' | 'scope' | 'metadata' | 'userId'>>
  ): Promise<boolean> {
    try {
      const session = await this.store.get(sessionId);
      if (!session) {
        this.logger.warn('尝试更新不存在的会话', { sessionId });
        return false;
      }

      // 更新会话信息
      const updatedSession: UserSession = {
        ...session,
        ...updates,
        lastActiveAt: new Date()
      };

      await this.store.set(sessionId, updatedSession);
      
      this.logger.info('会话已更新', {
        sessionId,
        shopDomain: session.shopDomain,
        updatedFields: Object.keys(updates)
      });

      return true;
    } catch (error) {
      this.logger.error('更新会话失败', error, { sessionId });
      return false;
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.store.delete(sessionId);
      this.logger.info('会话已删除', { sessionId });
    } catch (error) {
      this.logger.error('删除会话失败', error, { sessionId });
    }
  }

  /**
   * 删除店铺的所有会话
   */
  async deleteShopSessions(shopDomain: string): Promise<void> {
    try {
      await this.store.deleteByShop(shopDomain);
      this.logger.info('店铺会话已清理', { shopDomain });
    } catch (error) {
      this.logger.error('清理店铺会话失败', error, { shopDomain });
    }
  }

  /**
   * 验证会话有效性
   */
  async validateSession(sessionId: string): Promise<{
    valid: boolean;
    session?: UserSession;
    reason?: string;
  }> {
    if (!sessionId) {
      return { valid: false, reason: 'Missing session ID' };
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    // 检查会话是否过期
    if (session.expiresAt && session.expiresAt < new Date()) {
      await this.deleteSession(sessionId);
      return { valid: false, reason: 'Session expired' };
    }

    // 检查访问令牌是否存在
    if (!session.accessToken) {
      return { valid: false, reason: 'Missing access token' };
    }

    return { valid: true, session };
  }

  /**
   * 刷新会话过期时间
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.store.get(sessionId);
      if (!session) return false;

      const now = new Date();
      session.expiresAt = new Date(now.getTime() + this.sessionTimeout);
      session.lastActiveAt = now;

      await this.store.set(sessionId, session);
      
      this.logger.debug('会话已刷新', { sessionId });
      return true;
    } catch (error) {
      this.logger.error('刷新会话失败', error, { sessionId });
      return false;
    }
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(): any {
    if (this.store instanceof MemorySessionStore) {
      return this.store.getStats();
    }
    return null;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(): void {
    // 每小时清理一次过期会话
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.store.cleanup();
      } catch (error) {
        this.logger.error('自动清理会话失败', error);
      }
    }, 60 * 60 * 1000);

    this.logger.info('会话自动清理已启动');
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.info('会话自动清理已停止');
    }
  }

  /**
   * 手动清理过期会话
   */
  async cleanupSessions(): Promise<void> {
    try {
      await this.store.cleanup();
      this.logger.info('会话清理完成');
    } catch (error) {
      this.logger.error('会话清理失败', error);
    }
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    this.stopAutoCleanup();
    await this.cleanupSessions();
    this.logger.info('会话管理器已关闭');
  }
}