/**
 * Agent Registration
 *
 * This file imports and registers all available agents.
 * Add new agents here to make them available to the extension.
 */

import { AgentRegistry } from './AgentRegistry';
import { CapsuleWardrobeAgent } from './CapsuleWardrobeAgent';

/**
 * Register all agents
 * Call this on extension startup
 */
export function registerAllAgents(): void {
  console.log('[Agents] Registering all agents...');

  // Register built-in agents
  AgentRegistry.register(CapsuleWardrobeAgent);

  // Add more agents here as they're created:
  // AgentRegistry.register(RecipeCollectionAgent);
  // AgentRegistry.register(TravelPlannerAgent);

  console.log(`[Agents] Registered ${AgentRegistry.getAllIds().length} agents`);
}

// Export everything needed by other parts of the app
export { AgentRegistry } from './AgentRegistry';
export { AgentBase } from './AgentInterface';
export type {
  AgentMetadata,
  ConfigField,
  AgentCapabilityDefinition,
  CapabilityResult,
} from './AgentInterface';
