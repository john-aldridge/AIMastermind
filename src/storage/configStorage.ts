/**
 * Config Storage Service
 *
 * Manages storage and retrieval of agent and client configs.
 */

import { AgentConfig, Action } from '../types/agentConfig';
import { ClientConfig } from '../types/clientConfig';

/**
 * Storage keys
 */
const AGENT_CONFIGS_KEY = 'agent_configs';
const CLIENT_CONFIGS_KEY = 'client_configs';

/**
 * Service for managing config storage
 */
export class ConfigStorageService {
  // ===== Agent Config Management =====

  /**
   * Save an agent config
   */
  static async saveAgentConfig(config: AgentConfig): Promise<void> {
    try {
      // Validate config
      const validation = this.validateAgentConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid agent config: ${validation.errors.join(', ')}`);
      }

      // Detect if config contains JavaScript
      config.containsJavaScript = this.detectJavaScriptInAgent(config);

      // Get existing configs
      const configs = await this.listAgentConfigs();

      // Replace or add
      const index = configs.findIndex(c => c.id === config.id);
      if (index >= 0) {
        configs[index] = config;
      } else {
        configs.push(config);
      }

      // Save
      await chrome.storage.local.set({ [AGENT_CONFIGS_KEY]: configs });
    } catch (error) {
      console.error('Failed to save agent config:', error);
      throw error;
    }
  }

  /**
   * Load an agent config by ID
   */
  static async loadAgentConfig(agentId: string): Promise<AgentConfig | null> {
    try {
      const configs = await this.listAgentConfigs();
      return configs.find(c => c.id === agentId) || null;
    } catch (error) {
      console.error('Failed to load agent config:', error);
      return null;
    }
  }

  /**
   * List all agent configs
   */
  static async listAgentConfigs(): Promise<AgentConfig[]> {
    try {
      const result = await chrome.storage.local.get(AGENT_CONFIGS_KEY);
      return result[AGENT_CONFIGS_KEY] || [];
    } catch (error) {
      console.error('Failed to list agent configs:', error);
      return [];
    }
  }

  /**
   * Delete an agent config
   */
  static async deleteAgentConfig(agentId: string): Promise<void> {
    try {
      const configs = await this.listAgentConfigs();
      const filtered = configs.filter(c => c.id !== agentId);
      await chrome.storage.local.set({ [AGENT_CONFIGS_KEY]: filtered });
    } catch (error) {
      console.error('Failed to delete agent config:', error);
      throw error;
    }
  }

  // ===== Client Config Management =====

  /**
   * Save a client config
   */
  static async saveClientConfig(config: ClientConfig): Promise<void> {
    try {
      // Validate config
      const validation = this.validateClientConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid client config: ${validation.errors.join(', ')}`);
      }

      // Detect if config contains JavaScript
      config.containsJavaScript = this.detectJavaScriptInClient(config);

      // Get existing configs
      const configs = await this.listClientConfigs();

      // Replace or add
      const index = configs.findIndex(c => c.id === config.id);
      if (index >= 0) {
        configs[index] = config;
      } else {
        configs.push(config);
      }

      // Save
      await chrome.storage.local.set({ [CLIENT_CONFIGS_KEY]: configs });
    } catch (error) {
      console.error('Failed to save client config:', error);
      throw error;
    }
  }

  /**
   * Load a client config by ID
   */
  static async loadClientConfig(clientId: string): Promise<ClientConfig | null> {
    try {
      const configs = await this.listClientConfigs();
      return configs.find(c => c.id === clientId) || null;
    } catch (error) {
      console.error('Failed to load client config:', error);
      return null;
    }
  }

  /**
   * List all client configs
   */
  static async listClientConfigs(): Promise<ClientConfig[]> {
    try {
      const result = await chrome.storage.local.get(CLIENT_CONFIGS_KEY);
      return result[CLIENT_CONFIGS_KEY] || [];
    } catch (error) {
      console.error('Failed to list client configs:', error);
      return [];
    }
  }

  /**
   * Delete a client config
   */
  static async deleteClientConfig(clientId: string): Promise<void> {
    try {
      const configs = await this.listClientConfigs();
      const filtered = configs.filter(c => c.id !== clientId);
      await chrome.storage.local.set({ [CLIENT_CONFIGS_KEY]: filtered });
    } catch (error) {
      console.error('Failed to delete client config:', error);
      throw error;
    }
  }

  // ===== Validation =====

  /**
   * Validate an agent config
   */
  static validateAgentConfig(config: AgentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!config.id) errors.push('id is required');
    if (!config.name) errors.push('name is required');
    if (!config.description) errors.push('description is required');
    if (!config.version) errors.push('version is required');
    if (!config.author) errors.push('author is required');
    if (!Array.isArray(config.tags)) errors.push('tags must be an array');
    if (!Array.isArray(config.configFields)) errors.push('configFields must be an array');
    if (!Array.isArray(config.dependencies)) errors.push('dependencies must be an array');
    if (!Array.isArray(config.capabilities)) errors.push('capabilities must be an array');

    // Validate capabilities
    if (Array.isArray(config.capabilities)) {
      config.capabilities.forEach((cap, index) => {
        if (!cap.name) errors.push(`capabilities[${index}].name is required`);
        if (!cap.description) errors.push(`capabilities[${index}].description is required`);
        if (!Array.isArray(cap.parameters)) errors.push(`capabilities[${index}].parameters must be an array`);
        if (!Array.isArray(cap.actions)) errors.push(`capabilities[${index}].actions must be an array`);
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a client config
   */
  static validateClientConfig(config: ClientConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!config.id) errors.push('id is required');
    if (!config.name) errors.push('name is required');
    if (!config.description) errors.push('description is required');
    if (!config.version) errors.push('version is required');
    if (!config.author) errors.push('author is required');
    if (!Array.isArray(config.tags)) errors.push('tags must be an array');
    if (!config.auth) errors.push('auth is required');
    if (!Array.isArray(config.capabilities)) errors.push('capabilities must be an array');

    // Validate auth
    if (config.auth) {
      if (!config.auth.type) errors.push('auth.type is required');
      if (!Array.isArray(config.auth.fields)) errors.push('auth.fields must be an array');
    }

    // Validate capabilities
    if (Array.isArray(config.capabilities)) {
      config.capabilities.forEach((cap, index) => {
        if (!cap.name) errors.push(`capabilities[${index}].name is required`);
        if (!cap.description) errors.push(`capabilities[${index}].description is required`);
        if (!cap.method) errors.push(`capabilities[${index}].method is required`);
        if (!cap.path) errors.push(`capabilities[${index}].path is required`);
        if (!Array.isArray(cap.parameters)) errors.push(`capabilities[${index}].parameters must be an array`);
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ===== JavaScript Detection =====

  /**
   * Detect if an agent config contains JavaScript
   */
  static detectJavaScriptInAgent(config: AgentConfig): boolean {
    // Check all capabilities for executeScript actions
    for (const capability of config.capabilities) {
      if (this.hasExecuteScriptAction(capability.actions)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Recursively check actions for executeScript
   */
  private static hasExecuteScriptAction(actions: Action[]): boolean {
    for (const action of actions) {
      if (action.type === 'executeScript') {
        return true;
      }

      // Check nested actions in control flow
      if (action.type === 'if') {
        if (this.hasExecuteScriptAction(action.then)) return true;
        if (action.else && this.hasExecuteScriptAction(action.else)) return true;
      } else if (action.type === 'forEach') {
        if (this.hasExecuteScriptAction(action.do)) return true;
      } else if (action.type === 'while') {
        if (this.hasExecuteScriptAction(action.do)) return true;
      } else if (action.type === 'startProcess') {
        if (this.hasExecuteScriptAction(action.actions)) return true;
      } else if (action.type === 'registerCleanup') {
        if (this.hasExecuteScriptAction(action.actions)) return true;
      }
    }

    return false;
  }

  /**
   * Detect if a client config contains JavaScript
   */
  static detectJavaScriptInClient(_config: ClientConfig): boolean {
    // For now, clients don't support JavaScript
    // In the future, this could check for JS in transforms
    return false;
  }
}
