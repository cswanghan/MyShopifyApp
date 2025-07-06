/**
 * 序列化选项
 */
export interface SerializationOptions {
  include?: string[];
  exclude?: string[];
  relations?: string[];
  transform?: Record<string, (value: any) => any>;
  dateFormat?: 'iso' | 'timestamp' | 'unix';
  includePrivate?: boolean;
  nested?: Record<string, SerializationOptions>;
}

/**
 * 序列化字段配置
 */
export interface FieldConfig {
  expose?: boolean;
  private?: boolean;
  transform?: (value: any) => any;
  serialize?: (value: any, options?: SerializationOptions) => any;
  alias?: string;
}

/**
 * 序列化元数据
 */
export interface SerializationMeta {
  fields: Record<string, FieldConfig>;
  relations: Record<string, string>; // 关联字段映射
}

/**
 * 基础序列化器
 */
export class BaseSerializer {
  /**
   * 序列化单个对象
   */
  static serialize<T>(
    data: T,
    options: SerializationOptions = {}
  ): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.serialize(item, options));
    }

    if (typeof data !== 'object') {
      return this.transformValue(data, options);
    }

    const result: any = {};
    const obj = data as any;

    // 获取所有可序列化的字段
    const fields = this.getSerializableFields(obj, options);

    for (const field of fields) {
      const value = obj[field];
      const fieldOptions = options.nested?.[field];
      
      if (value !== undefined) {
        result[field] = this.serializeField(value, fieldOptions || options);
      }
    }

    return result;
  }

  /**
   * 序列化字段值
   */
  private static serializeField(
    value: any,
    options: SerializationOptions
  ): any {
    if (value === null || value === undefined) {
      return value;
    }

    // 日期处理
    if (value instanceof Date) {
      return this.serializeDate(value, options.dateFormat);
    }

    // 数组处理
    if (Array.isArray(value)) {
      return value.map(item => this.serializeField(item, options));
    }

    // 对象处理
    if (typeof value === 'object') {
      return this.serialize(value, options);
    }

    return this.transformValue(value, options);
  }

  /**
   * 获取可序列化的字段
   */
  private static getSerializableFields(
    obj: any,
    options: SerializationOptions
  ): string[] {
    const allFields = Object.keys(obj);
    let fields = allFields;

    // 应用包含过滤器
    if (options.include && options.include.length > 0) {
      fields = fields.filter(field => 
        options.include!.includes(field) ||
        options.include!.some(pattern => this.matchPattern(field, pattern))
      );
    }

    // 应用排除过滤器
    if (options.exclude && options.exclude.length > 0) {
      fields = fields.filter(field => 
        !options.exclude!.includes(field) &&
        !options.exclude!.some(pattern => this.matchPattern(field, pattern))
      );
    }

    // 过滤私有字段
    if (!options.includePrivate) {
      fields = fields.filter(field => !this.isPrivateField(field));
    }

    // 添加关联字段
    if (options.relations && options.relations.length > 0) {
      const relationFields = options.relations.filter(relation => 
        allFields.includes(relation)
      );
      fields = [...new Set([...fields, ...relationFields])];
    }

    return fields;
  }

  /**
   * 模式匹配
   */
  private static matchPattern(field: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(field);
    }
    return field === pattern;
  }

  /**
   * 检查是否为私有字段
   */
  private static isPrivateField(field: string): boolean {
    // 常见的私有字段模式
    const privatePatterns = [
      /^_/,          // 下划线开头
      /password/i,   // 包含password
      /secret/i,     // 包含secret
      /token/i,      // 包含token
      /key$/i,       // 以key结尾
      /hash$/i       // 以hash结尾
    ];

    return privatePatterns.some(pattern => pattern.test(field));
  }

  /**
   * 序列化日期
   */
  private static serializeDate(
    date: Date,
    format: 'iso' | 'timestamp' | 'unix' = 'iso'
  ): string | number {
    switch (format) {
      case 'timestamp':
        return date.getTime();
      case 'unix':
        return Math.floor(date.getTime() / 1000);
      case 'iso':
      default:
        return date.toISOString();
    }
  }

  /**
   * 转换值
   */
  private static transformValue(
    value: any,
    options: SerializationOptions
  ): any {
    // 应用全局转换
    if (options.transform) {
      for (const [pattern, transformer] of Object.entries(options.transform)) {
        if (this.matchPattern(typeof value, pattern)) {
          return transformer(value);
        }
      }
    }

    return value;
  }

  /**
   * 创建序列化器类
   */
  static createSerializer(meta: SerializationMeta) {
    return class CustomSerializer extends BaseSerializer {
      static serialize<T>(
        data: T,
        options: SerializationOptions = {}
      ): any {
        // 合并元数据配置
        const mergedOptions = this.mergeWithMeta(options, meta);
        return super.serialize(data, mergedOptions);
      }

      private static mergeWithMeta(
        options: SerializationOptions,
        meta: SerializationMeta
      ): SerializationOptions {
        const merged = { ...options };

        // 处理字段配置
        for (const [field, config] of Object.entries(meta.fields)) {
          if (!config.expose && !merged.include?.includes(field)) {
            merged.exclude = merged.exclude || [];
            if (!merged.exclude.includes(field)) {
              merged.exclude.push(field);
            }
          }

          if (config.private && !merged.includePrivate) {
            merged.exclude = merged.exclude || [];
            if (!merged.exclude.includes(field)) {
              merged.exclude.push(field);
            }
          }

          if (config.transform) {
            merged.transform = merged.transform || {};
            merged.transform[field] = config.transform;
          }
        }

        return merged;
      }
    };
  }
}

/**
 * 序列化装饰器
 */
export function Expose(alias?: string) {
  return function (target: any, propertyKey: string) {
    const meta = getOrCreateMeta(target.constructor);
    meta.fields[propertyKey] = {
      ...meta.fields[propertyKey],
      expose: true,
      alias
    };
  };
}

export function Exclude() {
  return function (target: any, propertyKey: string) {
    const meta = getOrCreateMeta(target.constructor);
    meta.fields[propertyKey] = {
      ...meta.fields[propertyKey],
      expose: false
    };
  };
}

export function Transform(transformer: (value: any) => any) {
  return function (target: any, propertyKey: string) {
    const meta = getOrCreateMeta(target.constructor);
    meta.fields[propertyKey] = {
      ...meta.fields[propertyKey],
      transform: transformer
    };
  };
}

export function Private() {
  return function (target: any, propertyKey: string) {
    const meta = getOrCreateMeta(target.constructor);
    meta.fields[propertyKey] = {
      ...meta.fields[propertyKey],
      private: true
    };
  };
}

export function Relation(target: string) {
  return function (targetClass: any, propertyKey: string) {
    const meta = getOrCreateMeta(targetClass.constructor);
    meta.relations[propertyKey] = target;
  };
}

/**
 * 获取或创建元数据
 */
function getOrCreateMeta(target: any): SerializationMeta {
  if (!target._serializationMeta) {
    target._serializationMeta = {
      fields: {},
      relations: {}
    };
  }
  return target._serializationMeta;
}

/**
 * 获取类的序列化元数据
 */
export function getSerializationMeta(target: any): SerializationMeta | undefined {
  return target._serializationMeta;
}

/**
 * 分页数据序列化器
 */
export class PaginationSerializer extends BaseSerializer {
  static serialize(data: any, options: SerializationOptions = {}): any {
    const { data: items, ...pagination } = data;
    
    return {
      data: super.serialize(items, options),
      pagination
    };
  }
}

/**
 * API响应序列化器
 */
export class ApiResponseSerializer extends BaseSerializer {
  static serialize(data: any, options: SerializationOptions = {}): any {
    const { success, data: responseData, error, meta } = data;
    
    return {
      success,
      data: responseData ? super.serialize(responseData, options) : undefined,
      error,
      meta
    };
  }
}

/**
 * 安全序列化器（自动排除敏感字段）
 */
export class SecureSerializer extends BaseSerializer {
  private static sensitiveFields = [
    'password',
    'passwordHash',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'privateKey',
    'sessionId'
  ];

  static serialize<T>(
    data: T,
    options: SerializationOptions = {}
  ): any {
    const secureOptions = {
      ...options,
      exclude: [
        ...(options.exclude || []),
        ...this.sensitiveFields
      ]
    };

    return super.serialize(data, secureOptions);
  }
}