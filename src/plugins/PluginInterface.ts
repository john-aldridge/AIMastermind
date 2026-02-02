/**
 * Plugin Interface
 *
 * Plugins are high-level features that can depend on one or more clients.
 * Unlike clients, plugins don't require authentication - they use configured clients as dependencies.
 */

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon?: string;
  homepage?: string;
  tags: string[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'url' | 'select' | 'number' | 'textarea';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
  default?: any;
}

export interface PluginCapabilityDefinition {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
  }>;
}

export interface CapabilityResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration?: number;
    [key: string]: any;
  };
}

export abstract class PluginBase {
  protected config: Record<string, any> = {};
  protected dependencies: Map<string, any> = new Map();

  /**
   * Get plugin metadata (ID, name, description, etc.)
   */
  abstract getMetadata(): PluginMetadata;

  /**
   * Get configuration fields needed by this plugin
   */
  abstract getConfigFields(): ConfigField[];

  /**
   * Get list of client IDs this plugin depends on
   */
  abstract getDependencies(): string[];

  /**
   * Get capabilities exposed by this plugin
   */
  abstract getCapabilities(): PluginCapabilityDefinition[];

  /**
   * Execute a capability
   */
  abstract executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult>;

  /**
   * Initialize the plugin (optional override)
   */
  async initialize(): Promise<void> {
    // Optional initialization logic
  }

  /**
   * Validate configuration (optional override)
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const fields = this.getConfigFields();

    for (const field of fields) {
      if (field.required && !this.config[field.key]) {
        errors.push(`${field.label} is required`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Set configuration
   */
  setConfig(config: Record<string, any>): void {
    this.config = config;
  }

  /**
   * Get configuration
   */
  getConfig(): Record<string, any> {
    return this.config;
  }

  /**
   * Set a dependency (client instance)
   */
  setDependency(clientId: string, client: any): void {
    this.dependencies.set(clientId, client);
  }

  /**
   * Get a dependency (client instance)
   */
  getDependency(clientId: string): any {
    return this.dependencies.get(clientId);
  }

  /**
   * Check if all dependencies are satisfied
   */
  hasDependencies(): boolean {
    const required = this.getDependencies();
    return required.every(dep => this.dependencies.has(dep));
  }
}
