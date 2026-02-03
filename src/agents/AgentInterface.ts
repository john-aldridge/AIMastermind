/**
 * Agent Interface
 *
 * Agents are high-level features that can depend on one or more clients.
 * Unlike clients, agents don't require authentication - they use configured clients as dependencies.
 */

import type { ProcessType } from '@/types/processRegistry';

export interface AgentMetadata {
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

export interface AgentCapabilityDefinition {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
  }>;
  /**
   * Optional: Indicates if this capability starts long-running processes
   * that should be tracked in the process registry.
   * When true, agents should use registerProcess() to track cleanup functions.
   */
  isLongRunning?: boolean;
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

export abstract class AgentBase {
  protected config: Record<string, any> = {};
  protected dependencies: Map<string, any> = new Map();
  private activeProcesses: Set<string> = new Set(); // Track process IDs for cleanup

  /**
   * API bridge for accessing Chrome extension APIs from page context
   * This provides access to chrome.storage, chrome.tabs, etc. via message passing
   *
   * @example
   * // Storage API
   * const data = await this.api.storage.get('myKey');
   * await this.api.storage.set({ myKey: 'value' });
   *
   * @example
   * // Tabs API
   * await this.api.tabs.create({ url: 'https://example.com' });
   *
   * @example
   * // Notifications API
   * await this.api.notifications.create({
   *   type: 'basic',
   *   title: 'Alert',
   *   message: 'Task complete'
   * });
   */
  protected get api(): any {
    // In page context, AgentAPI is available globally
    if (typeof window !== 'undefined' && (window as any).__AgentAPI) {
      // Return a singleton instance
      if (!(window as any).__agentAPIInstance) {
        (window as any).__agentAPIInstance = new (window as any).__AgentAPI();
      }
      return (window as any).__agentAPIInstance;
    }

    // Fallback for environments where AgentAPI isn't available
    console.warn('[AgentBase] AgentAPI not available in this context');
    return {
      storage: {},
      tabs: {},
      notifications: {},
      network: {},
      runtime: {}
    };
  }

  /**
   * Get agent metadata (ID, name, description, etc.)
   */
  abstract getMetadata(): AgentMetadata;

  /**
   * Get configuration fields needed by this agent
   */
  abstract getConfigFields(): ConfigField[];

  /**
   * Get list of client IDs this agent depends on
   */
  abstract getDependencies(): string[];

  /**
   * Get capabilities exposed by this agent
   */
  abstract getCapabilities(): AgentCapabilityDefinition[];

  /**
   * Execute a capability
   */
  abstract executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult>;

  /**
   * Initialize the agent (optional override)
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

  /**
   * Register a long-running process for cleanup tracking
   *
   * @example
   * // Register a MutationObserver
   * const observer = new MutationObserver((mutations) => { ... });
   * observer.observe(document.body, { childList: true, subtree: true });
   * this.registerProcess('watch_dom', {
   *   type: 'mutation-observer',
   *   cleanup: () => observer.disconnect(),
   *   metadata: { target: 'document.body', description: 'Watch for DOM changes' }
   * });
   *
   * @example
   * // Register a setInterval
   * const intervalId = setInterval(() => { ... }, 1000);
   * this.registerProcess('poll_status', {
   *   type: 'interval',
   *   cleanup: () => clearInterval(intervalId),
   *   metadata: { interval: 1000, description: 'Poll status every second' }
   * });
   */
  protected registerProcess(
    capabilityName: string,
    process: {
      type: ProcessType;
      cleanup: () => void;
      metadata?: Record<string, any>;
    }
  ): string | null {
    if (typeof window === 'undefined' || !window.__agentProcessRegistry) {
      console.warn('[AgentBase] Process registry not available');
      return null;
    }

    const processId = window.__agentProcessRegistry.register(
      this.getMetadata().id,
      capabilityName,
      process
    );

    this.activeProcesses.add(processId);
    return processId;
  }

  /**
   * Stop a specific process by ID
   */
  protected stopProcess(processId: string): boolean {
    if (typeof window === 'undefined' || !window.__agentProcessRegistry) {
      return false;
    }

    const stopped = window.__agentProcessRegistry.stop(processId);
    if (stopped) {
      this.activeProcesses.delete(processId);
    }
    return stopped;
  }

  /**
   * Stop all processes for a specific capability
   */
  protected stopCapabilityProcesses(capabilityName: string): number {
    if (typeof window === 'undefined' || !window.__agentProcessRegistry) {
      return 0;
    }

    const stopped = window.__agentProcessRegistry.stopCapability(
      this.getMetadata().id,
      capabilityName
    );

    // Rebuild active processes set
    const remaining = window.__agentProcessRegistry.getByAgent(this.getMetadata().id);
    this.activeProcesses = new Set(remaining.map(proc => proc.id));

    return stopped;
  }

  /**
   * Stop all processes started by this agent
   */
  protected stopAllProcesses(): number {
    if (typeof window === 'undefined' || !window.__agentProcessRegistry) {
      return 0;
    }

    const stopped = window.__agentProcessRegistry.stopAgent(this.getMetadata().id);
    this.activeProcesses.clear();
    return stopped;
  }

  /**
   * Check if a specific process is still active
   */
  protected isProcessActive(processId: string): boolean {
    if (typeof window === 'undefined' || !window.__agentProcessRegistry) {
      return false;
    }

    return window.__agentProcessRegistry.has(processId);
  }

  /**
   * Get all active processes for this agent
   */
  protected getActiveProcesses() {
    if (typeof window === 'undefined' || !window.__agentProcessRegistry) {
      return [];
    }

    return window.__agentProcessRegistry.getByAgent(this.getMetadata().id);
  }

  /**
   * Get active processes for a specific capability
   */
  protected getCapabilityProcesses(capabilityName: string) {
    if (typeof window === 'undefined' || !window.__agentProcessRegistry) {
      return [];
    }

    return window.__agentProcessRegistry.getByCapability(
      this.getMetadata().id,
      capabilityName
    );
  }
}
