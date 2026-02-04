/**
 * Operation Validator - Validates and sanitizes LLM-returned operations
 *
 * Ensures that operations returned by the LLM:
 * 1. Are in the allowed whitelist
 * 2. Have valid parameters
 * 3. Don't contain malicious content (e.g., JS in selectors)
 */

import { SafeOperation } from '../types/agentConfig';

/**
 * Operation parameter definition
 */
interface OperationParamDef {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'object';
  required: boolean;
  validator?: (value: any) => boolean;
  sanitizer?: (value: any) => any;
}

/**
 * Operation definition with parameter specs
 */
interface OperationDef {
  name: string;
  parameters: OperationParamDef[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedOperation?: SafeOperation;
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
  valid: boolean;
  errors: string[];
  validOperations: SafeOperation[];
  invalidOperations: Array<{ operation: SafeOperation; errors: string[] }>;
}

/**
 * CSS selector sanitizer - removes potentially dangerous content
 */
function sanitizeSelector(selector: string): string {
  // Remove any JavaScript-like content
  const jsPatterns = [
    /javascript:/gi,
    /on\w+\s*=/gi,           // onclick=, onload=, etc.
    /\beval\s*\(/gi,
    /\bFunction\s*\(/gi,
    /<script/gi,
    /\{\{.*\}\}/g,           // Template injection
    /\$\{.*\}/g,             // Template literal injection
  ];

  let sanitized = selector;
  for (const pattern of jsPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate a CSS selector is safe and well-formed
 */
function isValidSelector(selector: string): boolean {
  if (!selector || typeof selector !== 'string') {
    return false;
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /javascript:/i,
    /on\w+\s*=/i,
    /\beval\b/i,
    /\bFunction\s*\(/i,
    /<script/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(selector)) {
      return false;
    }
  }

  // Try to validate selector syntax by using native API
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    // Invalid selector syntax - but we might be in a service worker context
    // Do basic validation instead
    return selector.length > 0 && selector.length < 1000;
  }
}

/**
 * Whitelisted safe operations with parameter definitions
 */
const SAFE_OPERATIONS: Record<string, OperationDef> = {
  browser_remove_element: {
    name: 'browser_remove_element',
    parameters: [
      {
        name: 'selector',
        type: 'string',
        required: true,
        validator: isValidSelector,
        sanitizer: sanitizeSelector,
      },
      {
        name: 'all',
        type: 'boolean',
        required: false,
      },
    ],
  },
  browser_click_element: {
    name: 'browser_click_element',
    parameters: [
      {
        name: 'selector',
        type: 'string',
        required: true,
        validator: isValidSelector,
        sanitizer: sanitizeSelector,
      },
    ],
  },
  browser_modify_style: {
    name: 'browser_modify_style',
    parameters: [
      {
        name: 'selector',
        type: 'string',
        required: true,
        validator: isValidSelector,
        sanitizer: sanitizeSelector,
      },
      {
        name: 'styles',
        type: 'object',
        required: true,
        validator: (styles) => {
          if (!styles || typeof styles !== 'object') return false;
          // Validate style values don't contain JS
          for (const [key, value] of Object.entries(styles)) {
            if (typeof value === 'string' && /javascript:|expression\s*\(/i.test(value)) {
              return false;
            }
            // Validate property name is a valid CSS property
            if (typeof key !== 'string' || key.length > 100) {
              return false;
            }
          }
          return true;
        },
      },
    ],
  },
  browser_restore_scroll: {
    name: 'browser_restore_scroll',
    parameters: [],
  },
  browser_get_element_text: {
    name: 'browser_get_element_text',
    parameters: [
      {
        name: 'selector',
        type: 'string',
        required: true,
        validator: isValidSelector,
        sanitizer: sanitizeSelector,
      },
    ],
  },
  browser_scroll_to: {
    name: 'browser_scroll_to',
    parameters: [
      {
        name: 'selector',
        type: 'string',
        required: true,
        validator: isValidSelector,
        sanitizer: sanitizeSelector,
      },
      {
        name: 'behavior',
        type: 'string',
        required: false,
        validator: (value) => !value || ['smooth', 'auto'].includes(value),
      },
    ],
  },
  browser_fill_input: {
    name: 'browser_fill_input',
    parameters: [
      {
        name: 'selector',
        type: 'string',
        required: true,
        validator: isValidSelector,
        sanitizer: sanitizeSelector,
      },
      {
        name: 'value',
        type: 'string',
        required: true,
      },
    ],
  },
  browser_inspect_page: {
    name: 'browser_inspect_page',
    parameters: [
      {
        name: 'find_overlays',
        type: 'boolean',
        required: false,
      },
    ],
  },
};

/**
 * Operation Validator class
 */
export class OperationValidator {
  private allowedOperations: Set<string>;

  constructor(allowedOperations?: string[]) {
    // If specific operations provided, use those; otherwise allow all safe operations
    if (allowedOperations && allowedOperations.length > 0) {
      // Only allow operations that are in our whitelist
      this.allowedOperations = new Set(
        allowedOperations.filter(op => op in SAFE_OPERATIONS)
      );
    } else {
      this.allowedOperations = new Set(Object.keys(SAFE_OPERATIONS));
    }
  }

  /**
   * Get list of all safe operations
   */
  static getSafeOperations(): string[] {
    return Object.keys(SAFE_OPERATIONS);
  }

  /**
   * Check if an operation is in the whitelist
   */
  isOperationAllowed(operationName: string): boolean {
    return this.allowedOperations.has(operationName);
  }

  /**
   * Validate a single operation
   */
  validateOperation(operation: SafeOperation): ValidationResult {
    const errors: string[] = [];

    // Check if operation exists
    if (!operation || typeof operation !== 'object') {
      return { valid: false, errors: ['Invalid operation object'] };
    }

    // Check operation name
    const opName = operation.operation;
    if (!opName || typeof opName !== 'string') {
      return { valid: false, errors: ['Missing operation name'] };
    }

    // Check if operation is in whitelist
    if (!this.isOperationAllowed(opName)) {
      return {
        valid: false,
        errors: [`Operation "${opName}" is not allowed. Allowed: ${Array.from(this.allowedOperations).join(', ')}`],
      };
    }

    // Get operation definition
    const opDef = SAFE_OPERATIONS[opName];
    if (!opDef) {
      return { valid: false, errors: [`Unknown operation: ${opName}`] };
    }

    // Validate parameters
    const params = operation.parameters || {};
    console.log(`[OperationValidator] Validating ${opName} with params:`, JSON.stringify(params));
    const sanitizedParams: Record<string, any> = {};

    for (const paramDef of opDef.parameters) {
      const value = params[paramDef.name];

      // Check required parameters
      if (paramDef.required && (value === undefined || value === null)) {
        errors.push(`Missing required parameter: ${paramDef.name}`);
        continue;
      }

      // Skip if not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (paramDef.type === 'object') {
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`Parameter "${paramDef.name}" must be an object`);
          continue;
        }
      } else if (typeof value !== paramDef.type) {
        errors.push(`Parameter "${paramDef.name}" must be of type ${paramDef.type}`);
        continue;
      }

      // Custom validator
      if (paramDef.validator && !paramDef.validator(value)) {
        errors.push(`Parameter "${paramDef.name}" failed validation`);
        continue;
      }

      // Sanitize value if sanitizer provided
      sanitizedParams[paramDef.name] = paramDef.sanitizer
        ? paramDef.sanitizer(value)
        : value;
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Return sanitized operation
    return {
      valid: true,
      errors: [],
      sanitizedOperation: {
        operation: opName,
        parameters: sanitizedParams,
        reason: operation.reason,
        priority: operation.priority,
      },
    };
  }

  /**
   * Validate a batch of operations
   */
  validateOperations(operations: SafeOperation[]): BatchValidationResult {
    if (!Array.isArray(operations)) {
      return {
        valid: false,
        errors: ['Operations must be an array'],
        validOperations: [],
        invalidOperations: [],
      };
    }

    const validOperations: SafeOperation[] = [];
    const invalidOperations: Array<{ operation: SafeOperation; errors: string[] }> = [];

    for (const operation of operations) {
      const result = this.validateOperation(operation);
      if (result.valid && result.sanitizedOperation) {
        validOperations.push(result.sanitizedOperation);
      } else {
        invalidOperations.push({
          operation,
          errors: result.errors,
        });
      }
    }

    // Sort by priority (lower = first)
    validOperations.sort((a, b) => (a.priority || 999) - (b.priority || 999));

    return {
      valid: invalidOperations.length === 0,
      errors: invalidOperations.flatMap(inv => inv.errors),
      validOperations,
      invalidOperations,
    };
  }

  /**
   * Normalize an operation to ensure parameters are in the correct structure
   * LLMs sometimes return flat structures instead of nested parameters
   */
  static normalizeOperation(op: any): SafeOperation {
    if (!op || typeof op !== 'object' || !op.operation) {
      return op;
    }

    // If parameters already exists and has content, use it
    if (op.parameters && typeof op.parameters === 'object' && Object.keys(op.parameters).length > 0) {
      return op as SafeOperation;
    }

    // Otherwise, extract parameters from top-level properties
    const knownMetaFields = ['operation', 'parameters', 'reason', 'priority'];
    const extractedParams: Record<string, any> = {};

    for (const [key, value] of Object.entries(op)) {
      if (!knownMetaFields.includes(key)) {
        extractedParams[key] = value;
      }
    }

    return {
      operation: op.operation,
      parameters: Object.keys(extractedParams).length > 0 ? extractedParams : (op.parameters || {}),
      reason: op.reason,
      priority: op.priority,
    };
  }

  /**
   * Parse LLM response to extract operations
   */
  static parseOperationsFromResponse(response: string): SafeOperation[] {
    let operations: SafeOperation[] = [];

    // Strip markdown code fences if present
    let cleanResponse = response.trim();
    const codeBlockMatch = cleanResponse.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (codeBlockMatch) {
      cleanResponse = codeBlockMatch[1].trim();
    }

    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(cleanResponse);
      if (Array.isArray(parsed)) {
        operations = parsed;
      } else if (parsed.operations && Array.isArray(parsed.operations)) {
        operations = parsed.operations;
      } else if (parsed.operation) {
        // Single operation
        operations = [parsed];
      }
    } catch {
      // Not valid JSON, try to extract JSON from response
    }

    // If no operations found yet, try to find JSON array in the response (greedy match)
    if (operations.length === 0) {
      // Use greedy match to get the full array
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            operations = parsed;
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }

    // If still no operations, try to find individual operation objects
    if (operations.length === 0) {
      // Use regex with global flag and track positions properly
      const regex = /\{[^{}]*"operation"\s*:\s*"[^"]+"/g;
      let match;
      let lastEndIdx = 0;

      while ((match = regex.exec(cleanResponse)) !== null) {
        const startIdx = match.index;

        // Skip if this overlaps with a previous match
        if (startIdx < lastEndIdx) continue;

        // Find the complete object by counting braces
        let depth = 0;
        let endIdx = startIdx;

        for (let i = startIdx; i < cleanResponse.length; i++) {
          if (cleanResponse[i] === '{') depth++;
          if (cleanResponse[i] === '}') depth--;
          if (depth === 0) {
            endIdx = i + 1;
            break;
          }
        }

        try {
          const jsonStr = cleanResponse.substring(startIdx, endIdx);
          const op = JSON.parse(jsonStr);
          if (op.operation) {
            operations.push(op);
            lastEndIdx = endIdx;
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }

    // Normalize all operations to ensure parameters are structured correctly
    return operations.map(op => this.normalizeOperation(op));
  }
}
