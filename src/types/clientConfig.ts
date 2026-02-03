/**
 * Type definitions for config-based clients
 *
 * Clients are defined as JSON configs for REST APIs,
 * executed by the client engine in extension context.
 */

import type { CredentialField } from '../clients/ClientInterface';

/**
 * Top-level client configuration
 */
export interface ClientConfig {
  // Metadata
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon?: string;
  homepage?: string;
  tags: string[];

  // Security flags
  containsJavaScript?: boolean;         // True if client uses JS for transforms

  // Authentication
  auth: AuthConfig;

  // Base configuration
  baseUrl?: string;                     // Base URL for all requests

  // Capabilities
  capabilities: ClientCapabilityConfig[];
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  type: 'none' | 'bearer' | 'apikey' | 'basic' | 'oauth2';
  fields: CredentialField[];            // Same as current APIClientBase
}

/**
 * A capability that a client can perform (e.g., API endpoint)
 */
export interface ClientCapabilityConfig {
  name: string;                         // "jira_search"
  description: string;

  // HTTP Request
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;                         // "/rest/api/2/search" (can use {{params}})

  // Parameters
  parameters: ClientParameterConfig[];

  // Request/Response mapping
  requestTransform?: RequestTransform;
  responseTransform?: ResponseTransform;
}

/**
 * Parameter definition for a client capability
 */
export interface ClientParameterConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  location: 'path' | 'query' | 'body' | 'header';
}

/**
 * Request transformation configuration
 */
export interface RequestTransform {
  body?: Record<string, any>;           // Template with {{param}} substitutions
  headers?: Record<string, string>;
}

/**
 * Response transformation configuration
 */
export interface ResponseTransform {
  extract?: string;                     // JSONPath to extract (e.g., "$.issues")
  map?: Record<string, string>;         // Field mapping
}

/**
 * Result returned by client capability execution
 */
export interface ClientCapabilityResult {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}
