/**
 * Plugin Registration
 *
 * This file imports and registers all available plugins.
 * Add new plugins here to make them available to the extension.
 */

import { PluginRegistry } from './PluginRegistry';
import { CapsuleWardrobePlugin } from './CapsuleWardrobePlugin';

/**
 * Register all plugins
 * Call this on extension startup
 */
export function registerAllPlugins(): void {
  console.log('[Plugins] Registering all plugins...');

  // Register built-in plugins
  PluginRegistry.register(CapsuleWardrobePlugin);

  // Add more plugins here as they're created:
  // PluginRegistry.register(RecipeCollectionPlugin);
  // PluginRegistry.register(TravelPlannerPlugin);

  console.log(`[Plugins] Registered ${PluginRegistry.getAllIds().length} plugins`);
}

// Export everything needed by other parts of the app
export { PluginRegistry } from './PluginRegistry';
export { PluginBase } from './PluginInterface';
export type {
  PluginMetadata,
  ConfigField,
  PluginCapabilityDefinition,
  CapabilityResult,
} from './PluginInterface';
