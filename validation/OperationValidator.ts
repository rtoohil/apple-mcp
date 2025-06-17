/**
 * Generic validation system for MCP tool operations
 * Eliminates repetitive validation code across all handlers
 */

// Base types for validation
export interface OperationArgs {
  operation: string;
  [key: string]: any;
}

export interface FieldRule {
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  allowEmpty?: boolean;
  oneOf?: string[]; // For enum-like validation
  minLength?: number;
  maxLength?: number;
}

export interface OperationSchema {
  [operationName: string]: {
    [fieldName: string]: FieldRule;
  };
}

export interface ValidationConfig {
  operations: string[];
  operationSchema: OperationSchema;
  legacySupport?: {
    field: string;
    mapToOperation: string;
  };
}

export class OperationValidator {
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = config;
  }

  /**
   * Validates arguments against the configured schema
   */
  validate<T extends OperationArgs>(args: unknown): args is T {
    if (!this.isObject(args)) {
      return false;
    }

    const typedArgs = args as any;

    // Handle legacy support first
    if (this.config.legacySupport) {
      const { field, mapToOperation } = this.config.legacySupport;
      if (typedArgs[field] && !typedArgs.operation) {
        // Validate legacy field
        if (!this.validateField(typedArgs[field], { type: 'string', required: true })) {
          return false;
        }
        // Add the mapped operation for further validation
        typedArgs.operation = mapToOperation;
      }
    }

    // Validate operation field
    const { operation } = typedArgs;
    if (!this.validateField(operation, { type: 'string', required: true, oneOf: this.config.operations })) {
      return false;
    }

    // Validate operation-specific fields
    const operationSchema = this.config.operationSchema[operation];
    if (!operationSchema) {
      return true; // No specific validation for this operation
    }

    for (const [fieldName, rule] of Object.entries(operationSchema)) {
      const fieldValue = typedArgs[fieldName];
      if (!this.validateField(fieldValue, rule)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates a single field against its rule
   */
  private validateField(value: any, rule: FieldRule): boolean {
    // Handle required fields
    if (rule.required && (value === undefined || value === null)) {
      return false;
    }

    // If field is not required and undefined/null, it's valid
    if (!rule.required && (value === undefined || value === null)) {
      return true;
    }

    // Type validation
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') return false;
        if (!rule.allowEmpty && value === '') return false;
        if (rule.minLength && value.length < rule.minLength) return false;
        if (rule.maxLength && value.length > rule.maxLength) return false;
        if (rule.oneOf && !rule.oneOf.includes(value)) return false;
        break;

      case 'number':
        if (typeof value !== 'number') return false;
        break;

      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;

      case 'array':
        if (!Array.isArray(value)) return false;
        break;

      default:
        return false;
    }

    return true;
  }

  /**
   * Type guard for objects
   */
  private isObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null;
  }
}

/**
 * Helper function to create a validator with a more concise syntax
 */
export function createValidator(config: ValidationConfig) {
  return new OperationValidator(config);
}

/**
 * Common field rules for reuse across different tools
 */
export const CommonFields = {
  operation: (operations: string[]): FieldRule => ({ 
    type: 'string', 
    required: true, 
    oneOf: operations 
  }),
  
  searchText: (): FieldRule => ({ 
    type: 'string', 
    required: true, 
    allowEmpty: false 
  }),
  
  searchTerm: (): FieldRule => ({ 
    type: 'string', 
    required: true, 
    allowEmpty: false 
  }),
  
  limit: (): FieldRule => ({ 
    type: 'number', 
    required: false 
  }),
  
  email: (): FieldRule => ({ 
    type: 'string', 
    required: true, 
    allowEmpty: false 
  }),
  
  phoneNumber: (): FieldRule => ({ 
    type: 'string', 
    required: true, 
    allowEmpty: false 
  }),
  
  title: (): FieldRule => ({ 
    type: 'string', 
    required: true, 
    allowEmpty: false 
  }),
  
  body: (): FieldRule => ({ 
    type: 'string', 
    required: true 
  }),
  
  message: (): FieldRule => ({ 
    type: 'string', 
    required: true, 
    allowEmpty: false 
  }),
  
  optionalString: (): FieldRule => ({ 
    type: 'string', 
    required: false 
  }),
  
  requiredString: (): FieldRule => ({ 
    type: 'string', 
    required: true, 
    allowEmpty: false 
  }),
  
  optionalNumber: (): FieldRule => ({ 
    type: 'number', 
    required: false 
  }),
  
  optionalBoolean: (): FieldRule => ({ 
    type: 'boolean', 
    required: false 
  })
};