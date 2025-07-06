import { ValidationError } from '../api/BaseController';

/**
 * 验证规则接口
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'uuid' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  nested?: ValidationSchema;
  arrayOf?: ValidationRule;
}

/**
 * 验证模式接口
 */
export interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetail[];
  data?: any;
}

/**
 * 验证错误详情
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  rule?: string;
}

/**
 * 基础验证器类
 */
export class BaseValidator {
  /**
   * 验证数据
   */
  static validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: ValidationErrorDetail[] = [];
    const cleanData: any = {};

    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(field, value, rule);
      
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      } else if (value !== undefined) {
        cleanData[field] = this.transformValue(value, rule);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? cleanData : undefined
    };
  }

  /**
   * 验证单个字段
   */
  private static validateField(field: string, value: any, rule: ValidationRule): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    // 检查必需字段
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        message: `${field} is required`,
        rule: 'required'
      });
      return errors; // 如果必需字段缺失，跳过其他验证
    }

    // 如果值为空且不是必需的，跳过验证
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // 类型验证
    if (rule.type) {
      const typeError = this.validateType(field, value, rule.type);
      if (typeError) {
        errors.push(typeError);
        return errors; // 类型错误时跳过其他验证
      }
    }

    // 字符串长度验证
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.minLength} characters long`,
          value,
          rule: 'minLength'
        });
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field,
          message: `${field} must be at most ${rule.maxLength} characters long`,
          value,
          rule: 'maxLength'
        });
      }
    }

    // 数值范围验证
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.min}`,
          value,
          rule: 'min'
        });
      }

      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field,
          message: `${field} must be at most ${rule.max}`,
          value,
          rule: 'max'
        });
      }
    }

    // 正则表达式验证
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push({
          field,
          message: `${field} format is invalid`,
          value,
          rule: 'pattern'
        });
      }
    }

    // 枚举值验证
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field,
        message: `${field} must be one of: ${rule.enum.join(', ')}`,
        value,
        rule: 'enum'
      });
    }

    // 数组验证
    if (rule.type === 'array' && Array.isArray(value) && rule.arrayOf) {
      value.forEach((item, index) => {
        const itemErrors = this.validateField(`${field}[${index}]`, item, rule.arrayOf!);
        errors.push(...itemErrors);
      });
    }

    // 嵌套对象验证
    if (rule.nested && typeof value === 'object' && value !== null) {
      const nestedResult = this.validate(value, rule.nested);
      nestedResult.errors.forEach(error => {
        errors.push({
          ...error,
          field: `${field}.${error.field}`
        });
      });
    }

    // 自定义验证
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push({
          field,
          message: typeof customResult === 'string' ? customResult : `${field} is invalid`,
          value,
          rule: 'custom'
        });
      }
    }

    return errors;
  }

  /**
   * 验证数据类型
   */
  private static validateType(field: string, value: any, type: string): ValidationErrorDetail | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field,
            message: `${field} must be a string`,
            value,
            rule: 'type'
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            field,
            message: `${field} must be a number`,
            value,
            rule: 'type'
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field,
            message: `${field} must be a boolean`,
            value,
            rule: 'type'
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field,
            message: `${field} must be an array`,
            value,
            rule: 'type'
          };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return {
            field,
            message: `${field} must be an object`,
            value,
            rule: 'type'
          };
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          return {
            field,
            message: `${field} must be a valid email address`,
            value,
            rule: 'type'
          };
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !this.isValidUrl(value)) {
          return {
            field,
            message: `${field} must be a valid URL`,
            value,
            rule: 'type'
          };
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !this.isValidUuid(value)) {
          return {
            field,
            message: `${field} must be a valid UUID`,
            value,
            rule: 'type'
          };
        }
        break;

      case 'date':
        if (!this.isValidDate(value)) {
          return {
            field,
            message: `${field} must be a valid date`,
            value,
            rule: 'type'
          };
        }
        break;
    }

    return null;
  }

  /**
   * 转换值
   */
  private static transformValue(value: any, rule: ValidationRule): any {
    if (rule.type === 'number' && typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    }

    if (rule.type === 'boolean' && typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }

    if (rule.type === 'date') {
      if (typeof value === 'string') {
        return new Date(value);
      }
    }

    return value;
  }

  /**
   * 验证邮箱格式
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证URL格式
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证UUID格式
   */
  private static isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * 验证日期格式
   */
  private static isValidDate(date: any): boolean {
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }

    if (typeof date === 'string') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }

    return false;
  }

  /**
   * 验证并抛出错误
   */
  static validateAndThrow(data: any, schema: ValidationSchema): any {
    const result = this.validate(data, schema);
    
    if (!result.isValid) {
      const errorMessage = result.errors.map(e => e.message).join('; ');
      throw new ValidationError(
        `Validation failed: ${errorMessage}`,
        result.errors
      );
    }

    return result.data;
  }

  /**
   * 创建中间件
   */
  static middleware(schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: any, res: any, next: any) => {
      try {
        const data = req[source];
        const cleanData = this.validateAndThrow(data, schema);
        req[source] = cleanData;
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}