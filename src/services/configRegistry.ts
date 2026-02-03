/**
 * Config Registry
 *
 * Manages registration and execution of config-based agents and clients.
 * Provides a unified interface for executing capabilities from configs.
 */

import { AgentConfig, CapabilityResult } from '../types/agentConfig';
import { ClientConfig, ClientCapabilityResult } from '../types/clientConfig';
import { ConfigStorageService } from '../storage/configStorage';
import { AgentEngine } from './agentEngine';
import { ClientEngine } from './clientEngine';

/**
 * Singleton registry for config-based agents and clients
 */
export class ConfigRegistry {
  private static instance: ConfigRegistry;

  private agents: Map<string, AgentConfig> = new Map();
  private clients: Map<string, ClientConfig> = new Map();
  private agentEngine: AgentEngine = new AgentEngine();
  private clientEngine: ClientEngine = new ClientEngine();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigRegistry {
    if (!ConfigRegistry.instance) {
      ConfigRegistry.instance = new ConfigRegistry();
    }
    return ConfigRegistry.instance;
  }

  // ===== Agent Management =====

  /**
   * Register an agent config
   */
  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, config);
    console.log(`[ConfigRegistry] Registered agent: ${config.id}`);
  }

  /**
   * Get an agent config by ID
   */
  getAgent(agentId: string): AgentConfig | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * List all registered agents
   */
  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Remove an agent from registry
   */
  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
    console.log(`[ConfigRegistry] Removed agent: ${agentId}`);
  }

  /**
   * Load agents from storage
   */
  async loadAgentsFromStorage(): Promise<void> {
    try {
      const configs = await ConfigStorageService.listAgentConfigs();
      for (const config of configs) {
        this.registerAgent(config);
      }
      console.log(`[ConfigRegistry] Loaded ${configs.length} agent(s) from storage`);
    } catch (error) {
      console.error('Failed to load agents from storage:', error);
    }
  }

  // ===== Client Management =====

  /**
   * Register a client config
   */
  registerClient(config: ClientConfig): void {
    this.clients.set(config.id, config);
    console.log(`[ConfigRegistry] Registered client: ${config.id}`);
  }

  /**
   * Get a client config by ID
   */
  getClient(clientId: string): ClientConfig | null {
    return this.clients.get(clientId) || null;
  }

  /**
   * List all registered clients
   */
  listClients(): ClientConfig[] {
    return Array.from(this.clients.values());
  }

  /**
   * Remove a client from registry
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[ConfigRegistry] Removed client: ${clientId}`);
  }

  /**
   * Load clients from storage
   */
  async loadClientsFromStorage(): Promise<void> {
    try {
      const configs = await ConfigStorageService.listClientConfigs();
      for (const config of configs) {
        this.registerClient(config);
      }
      console.log(`[ConfigRegistry] Loaded ${configs.length} client(s) from storage`);
    } catch (error) {
      console.error('Failed to load clients from storage:', error);
    }
  }

  // ===== Execution =====

  /**
   * Execute an agent capability
   */
  async executeAgentCapability(
    agentId: string,
    capabilityName: string,
    parameters: Record<string, any>,
    userConfig: Record<string, any> = {}
  ): Promise<CapabilityResult> {
    const config = this.getAgent(agentId);

    if (!config) {
      return {
        success: false,
        error: `Agent "${agentId}" not found in registry`,
      };
    }

    return await this.agentEngine.executeCapability(
      config,
      capabilityName,
      parameters,
      userConfig
    );
  }

  /**
   * Execute a client capability
   */
  async executeClientCapability(
    clientId: string,
    capabilityName: string,
    parameters: Record<string, any>,
    credentials: Record<string, string>
  ): Promise<ClientCapabilityResult> {
    const config = this.getClient(clientId);

    if (!config) {
      return {
        success: false,
        error: `Client "${clientId}" not found in registry`,
      };
    }

    return await this.clientEngine.executeCapability(
      config,
      capabilityName,
      parameters,
      credentials
    );
  }

  // ===== Initialization =====

  /**
   * Initialize the registry by loading configs from storage
   */
  async initialize(): Promise<void> {
    console.log('[ConfigRegistry] Initializing...');
    await Promise.all([
      this.loadAgentsFromStorage(),
      this.loadClientsFromStorage(),
    ]);
    console.log('[ConfigRegistry] Initialization complete');
  }

  /**
   * Get metadata for all agents and clients
   */
  getMetadata(): {
    agents: Array<{ id: string; name: string; description: string; containsJavaScript?: boolean }>;
    clients: Array<{ id: string; name: string; description: string; containsJavaScript?: boolean }>;
  } {
    const agents = this.listAgents().map(config => ({
      id: config.id,
      name: config.name,
      description: config.description,
      containsJavaScript: config.containsJavaScript,
    }));

    const clients = this.listClients().map(config => ({
      id: config.id,
      name: config.name,
      description: config.description,
      containsJavaScript: config.containsJavaScript,
    }));

    return { agents, clients };
  }
}
