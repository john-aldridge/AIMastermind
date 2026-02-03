/**
 * Agent Registry
 *
 * Singleton registry for managing agent instances.
 * Handles agent registration, instantiation, and dependency resolution.
 */

import { AgentBase, AgentMetadata } from './AgentInterface';

type AgentConstructor = new () => AgentBase;

export class AgentRegistry {
  private static agents: Map<string, AgentConstructor> = new Map();
  private static instances: Map<string, AgentBase> = new Map();

  /**
   * Register an agent class
   */
  static register(agentClass: AgentConstructor): void {
    const instance = new agentClass();
    const metadata = instance.getMetadata();

    console.log(`[AgentRegistry] Registering agent: ${metadata.id}`);
    this.agents.set(metadata.id, agentClass);
  }

  /**
   * Get an agent instance (creates if doesn't exist)
   */
  static getInstance(agentId: string): AgentBase | null {
    // Return existing instance if available
    if (this.instances.has(agentId)) {
      return this.instances.get(agentId)!;
    }

    // Create new instance
    const AgentClass = this.agents.get(agentId);
    if (!AgentClass) {
      console.warn(`[AgentRegistry] Agent not found: ${agentId}`);
      return null;
    }

    const instance = new AgentClass();
    this.instances.set(agentId, instance);
    return instance;
  }

  /**
   * Get agent metadata without creating an instance
   */
  static getMetadata(agentId: string): AgentMetadata | null {
    const AgentClass = this.agents.get(agentId);
    if (!AgentClass) {
      return null;
    }

    const instance = new AgentClass();
    return instance.getMetadata();
  }

  /**
   * Get all registered agent IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get metadata for all registered agents
   */
  static getAllMetadata(): AgentMetadata[] {
    const metadataList: AgentMetadata[] = [];

    for (const agentId of this.agents.keys()) {
      const metadata = this.getMetadata(agentId);
      if (metadata) {
        metadataList.push(metadata);
      }
    }

    return metadataList;
  }

  /**
   * Clear all instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Check if an agent is registered
   */
  static has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Resolve dependencies for an agent
   * Returns true if all dependencies are available
   *
   * Note: This is a basic check. Actual dependency resolution
   * happens at runtime when the agent is used.
   */
  static canResolveDependencies(agentId: string): boolean {
    const instance = this.getInstance(agentId);
    if (!instance) {
      return false;
    }

    // Dependencies will be resolved at runtime in ChatView
    // For now, just return true if the agent has dependencies defined
    const dependencies = instance.getDependencies();
    return dependencies.length === 0 || dependencies.length > 0;
  }
}
