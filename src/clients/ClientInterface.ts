/**
 * Client Plugin System
 *
 * This defines the interface that all API clients must implement.
 * Clients are executable code modules that can make API calls,
 * provide custom UI, and expose capabilities to the AI agent.
 */

import React from 'react';

/**
 * Capability definition - what the client can do
 */
export interface ClientCapabilityDefinition {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    default?: any;
  }[];
}

/**
 * Credential field definition
 */
export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  placeholder?: string;
  required: boolean;
  helpText?: string;
  options?: { label: string; value: string }[];
}

/**
 * Result of a capability execution
 */
export interface CapabilityResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration?: number;
    tokensUsed?: number;
    [key: string]: any;
  };
}

/**
 * Client metadata
 */
export interface ClientMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon?: string; // URL or data URI
  homepage?: string;
  tags: string[];
}

/**
 * Abstract base class for all API clients
 *
 * To create a new client:
 * 1. Extend this class
 * 2. Implement all abstract methods
 * 3. Register in ClientRegistry
 */
export abstract class APIClientBase {
  protected credentials: Record<string, string> = {};
  protected isInitialized: boolean = false;

  /**
   * Get client metadata
   */
  abstract getMetadata(): ClientMetadata;

  /**
   * Get list of credentials this client needs
   */
  abstract getCredentialFields(): CredentialField[];

  /**
   * Get list of capabilities this client provides
   */
  abstract getCapabilities(): ClientCapabilityDefinition[];

  /**
   * Optional: Get a custom React component for credential configuration
   * If not provided, a default form will be generated from getCredentialFields()
   */
  getCredentialUI?(): React.ComponentType<{
    credentials: Record<string, string>;
    onChange: (credentials: Record<string, string>) => void;
    onSave: () => void;
    onCancel: () => void;
  }>;

  /**
   * Set credentials for this client
   */
  setCredentials(credentials: Record<string, string>): void {
    this.credentials = credentials;
  }

  /**
   * Get current credentials
   */
  getCredentials(): Record<string, string> {
    return { ...this.credentials };
  }

  /**
   * Validate credentials (optional override)
   * Default implementation checks if all required fields are present
   */
  async validateCredentials(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const fields = this.getCredentialFields();

    for (const field of fields) {
      if (field.required && !this.credentials[field.key]) {
        errors.push(`Missing required credential: ${field.label}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Initialize the client (called after credentials are set)
   * Use this to set up connections, validate credentials, etc.
   */
  async initialize(): Promise<void> {
    const validation = await this.validateCredentials();
    if (!validation.valid) {
      throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
    }
    this.isInitialized = true;
  }

  /**
   * Check if client is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Execute a capability
   *
   * @param capabilityName - Name of the capability to execute
   * @param parameters - Parameters for the capability
   */
  abstract executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult>;

  /**
   * Cleanup resources (optional override)
   */
  async destroy(): Promise<void> {
    this.isInitialized = false;
    this.credentials = {};
  }

  /**
   * Helper method to make HTTP requests with automatic auth header injection
   */
  protected async makeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.isInitialized) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    // Subclasses can override this to add auth headers
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Format capability for AI consumption
   * Returns a JSON schema-compatible tool definition
   */
  formatCapabilityForAI(capability: ClientCapabilityDefinition): any {
    return {
      type: 'function',
      function: {
        name: capability.name,
        description: capability.description,
        parameters: {
          type: 'object',
          properties: capability.parameters.reduce((acc, param) => {
            acc[param.name] = {
              type: param.type,
              description: param.description,
            };
            return acc;
          }, {} as Record<string, any>),
          required: capability.parameters
            .filter(p => p.required)
            .map(p => p.name),
        },
      },
    };
  }

  /**
   * Get all capabilities formatted for AI
   */
  getCapabilitiesForAI(): any[] {
    return this.getCapabilities().map(cap => this.formatCapabilityForAI(cap));
  }
}
