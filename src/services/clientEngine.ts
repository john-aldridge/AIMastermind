/**
 * Client Engine - Interprets and executes client configs
 *
 * The engine runs in extension context, allowing:
 * - No CORS restrictions for API calls
 * - Direct access to stored credentials
 * - Secure auth header injection
 */

import {
  ClientConfig,
  ClientCapabilityConfig,
  ClientCapabilityResult,
  RequestTransform,
  ResponseTransform,
  AuthConfig,
} from '../types/clientConfig';
import { SettingsService } from './settingsService';

/**
 * Client Engine - Executes client configs
 */
export class ClientEngine {
  /**
   * Execute a capability from a client config
   */
  async executeCapability(
    config: ClientConfig,
    capabilityName: string,
    parameters: Record<string, any>,
    credentials: Record<string, string>
  ): Promise<ClientCapabilityResult> {
    try {
      // Check if execution is allowed
      const canExecute = await SettingsService.canExecuteClientConfig(config);
      if (!canExecute.allowed) {
        return {
          success: false,
          error: canExecute.reason,
        };
      }

      // Find the capability
      const capability = config.capabilities.find(c => c.name === capabilityName);
      if (!capability) {
        return {
          success: false,
          error: `Capability "${capabilityName}" not found in client "${config.id}"`,
        };
      }

      // Validate required parameters
      const missingParams = capability.parameters
        .filter(p => p.required && !(p.name in parameters))
        .map(p => p.name);

      if (missingParams.length > 0) {
        return {
          success: false,
          error: `Missing required parameters: ${missingParams.join(', ')}`,
        };
      }

      // Build request
      const request = this.buildRequest(capability, parameters, credentials, config);

      // Execute request (in extension context - no CORS!)
      const response = await fetch(request.url, request.options);

      // Check for errors
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          status: response.status,
        };
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let responseData: any;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Transform response
      const result = this.transformResponse(responseData, capability.responseTransform);

      return {
        success: true,
        data: result,
        status: response.status,
      };
    } catch (error) {
      console.error('Client engine execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build HTTP request from capability config
   */
  private buildRequest(
    capability: ClientCapabilityConfig,
    parameters: Record<string, any>,
    credentials: Record<string, string>,
    config: ClientConfig
  ): { url: string; options: RequestInit } {
    // Build URL
    let url = this.buildUrl(capability, parameters, config);

    // Build headers
    const headers = this.buildHeaders(config.auth, credentials, capability);

    // Build body
    const body = this.buildBody(capability, parameters);

    return {
      url,
      options: {
        method: capability.method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      },
    };
  }

  /**
   * Build URL with path and query parameters
   */
  private buildUrl(
    capability: ClientCapabilityConfig,
    parameters: Record<string, any>,
    config: ClientConfig
  ): string {
    let path = capability.path;
    const queryParams: Record<string, string> = {};

    // Process parameters by location
    for (const param of capability.parameters) {
      const value = parameters[param.name];

      if (value === undefined) continue;

      if (param.location === 'path') {
        // Substitute in path
        path = path.replace(`{{${param.name}}}`, encodeURIComponent(String(value)));
      } else if (param.location === 'query') {
        // Add to query params
        queryParams[param.name] = String(value);
      }
    }

    // Build full URL
    const baseUrl = config.baseUrl || '';
    let fullUrl = `${baseUrl}${path}`;

    // Add query parameters
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    if (queryString) {
      fullUrl += `?${queryString}`;
    }

    return fullUrl;
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(
    auth: AuthConfig,
    credentials: Record<string, string>,
    capability: ClientCapabilityConfig
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth headers
    switch (auth.type) {
      case 'bearer': {
        const token = credentials.token || credentials.access_token;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;
      }

      case 'apikey': {
        const apiKey = credentials.api_key || credentials.apiKey;
        const headerName = credentials.header_name || 'X-API-Key';
        if (apiKey) {
          headers[headerName] = apiKey;
        }
        break;
      }

      case 'basic': {
        const username = credentials.username;
        const password = credentials.password;
        if (username && password) {
          const encoded = btoa(`${username}:${password}`);
          headers['Authorization'] = `Basic ${encoded}`;
        }
        break;
      }

      case 'oauth2': {
        const accessToken = credentials.access_token;
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        break;
      }

      case 'none':
      default:
        // No auth
        break;
    }

    // Add custom headers from capability
    if (capability.requestTransform?.headers) {
      Object.assign(headers, capability.requestTransform.headers);
    }

    // Add header parameters
    for (const param of capability.parameters) {
      if (param.location === 'header') {
        const value = credentials[param.name];
        if (value) {
          headers[param.name] = value;
        }
      }
    }

    return headers;
  }

  /**
   * Build request body from parameters
   */
  private buildBody(
    capability: ClientCapabilityConfig,
    parameters: Record<string, any>
  ): any {
    // Only include body for methods that support it
    if (!['POST', 'PUT', 'PATCH'].includes(capability.method)) {
      return undefined;
    }

    // If there's a body template, use it
    if (capability.requestTransform?.body) {
      return this.substituteTemplate(capability.requestTransform.body, parameters);
    }

    // Otherwise, collect body parameters
    const body: Record<string, any> = {};

    for (const param of capability.parameters) {
      if (param.location === 'body') {
        const value = parameters[param.name];
        if (value !== undefined) {
          body[param.name] = value;
        }
      }
    }

    return Object.keys(body).length > 0 ? body : undefined;
  }

  /**
   * Substitute {{param}} references in a template
   */
  private substituteTemplate(template: any, parameters: Record<string, any>): any {
    if (typeof template === 'string') {
      return template.replace(/\{\{([^}]+)\}\}/g, (match, paramName) => {
        const value = parameters[paramName.trim()];
        return value !== undefined ? String(value) : match;
      });
    } else if (Array.isArray(template)) {
      return template.map(item => this.substituteTemplate(item, parameters));
    } else if (typeof template === 'object' && template !== null) {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.substituteTemplate(value, parameters);
      }
      return result;
    }

    return template;
  }

  /**
   * Transform response data
   */
  private transformResponse(data: any, transform?: ResponseTransform): any {
    if (!transform) {
      return data;
    }

    let result = data;

    // Extract data using JSONPath (simplified implementation)
    if (transform.extract) {
      result = this.extractJsonPath(data, transform.extract);
    }

    // Map fields
    if (transform.map) {
      result = this.mapFields(result, transform.map);
    }

    return result;
  }

  /**
   * Extract data using simplified JSONPath
   * Supports: $, $.field, $.field.nested, $.array[0], $.field[*]
   */
  private extractJsonPath(data: any, path: string): any {
    if (path === '$') {
      return data;
    }

    // Remove leading $. if present
    const cleanPath = path.startsWith('$.') ? path.substring(2) : path;

    // Split by dots, but handle array notation
    const parts = cleanPath.split(/\.(?![^\[]*\])/);

    let result = data;

    for (const part of parts) {
      if (!result) return null;

      // Handle array index: field[0]
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, field, index] = arrayMatch;
        result = result[field]?.[parseInt(index, 10)];
        continue;
      }

      // Handle array wildcard: field[*]
      const wildcardMatch = part.match(/^(.+)\[\*\]$/);
      if (wildcardMatch) {
        const [, field] = wildcardMatch;
        result = result[field];
        continue;
      }

      // Regular field access
      result = result[part];
    }

    return result;
  }

  /**
   * Map fields from source to target structure
   */
  private mapFields(data: any, mapping: Record<string, string>): any {
    if (Array.isArray(data)) {
      return data.map(item => this.mapFields(item, mapping));
    }

    const result: Record<string, any> = {};

    for (const [targetField, sourcePath] of Object.entries(mapping)) {
      result[targetField] = this.extractJsonPath(data, sourcePath);
    }

    return result;
  }
}
