/**
 * Plugin Registry
 *
 * Singleton registry for managing plugin instances.
 * Handles plugin registration, instantiation, and dependency resolution.
 */

import { PluginBase, PluginMetadata } from './PluginInterface';

type PluginConstructor = new () => PluginBase;

export class PluginRegistry {
  private static plugins: Map<string, PluginConstructor> = new Map();
  private static instances: Map<string, PluginBase> = new Map();

  /**
   * Register a plugin class
   */
  static register(pluginClass: PluginConstructor): void {
    const instance = new pluginClass();
    const metadata = instance.getMetadata();

    console.log(`[PluginRegistry] Registering plugin: ${metadata.id}`);
    this.plugins.set(metadata.id, pluginClass);
  }

  /**
   * Get a plugin instance (creates if doesn't exist)
   */
  static getInstance(pluginId: string): PluginBase | null {
    // Return existing instance if available
    if (this.instances.has(pluginId)) {
      return this.instances.get(pluginId)!;
    }

    // Create new instance
    const PluginClass = this.plugins.get(pluginId);
    if (!PluginClass) {
      console.warn(`[PluginRegistry] Plugin not found: ${pluginId}`);
      return null;
    }

    const instance = new PluginClass();
    this.instances.set(pluginId, instance);
    return instance;
  }

  /**
   * Get plugin metadata without creating an instance
   */
  static getMetadata(pluginId: string): PluginMetadata | null {
    const PluginClass = this.plugins.get(pluginId);
    if (!PluginClass) {
      return null;
    }

    const instance = new PluginClass();
    return instance.getMetadata();
  }

  /**
   * Get all registered plugin IDs
   */
  static getAllIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get metadata for all registered plugins
   */
  static getAllMetadata(): PluginMetadata[] {
    const metadataList: PluginMetadata[] = [];

    for (const pluginId of this.plugins.keys()) {
      const metadata = this.getMetadata(pluginId);
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
   * Check if a plugin is registered
   */
  static has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Resolve dependencies for a plugin
   * Returns true if all dependencies are available
   *
   * Note: This is a basic check. Actual dependency resolution
   * happens at runtime when the plugin is used.
   */
  static canResolveDependencies(pluginId: string): boolean {
    const instance = this.getInstance(pluginId);
    if (!instance) {
      return false;
    }

    // Dependencies will be resolved at runtime in ChatView
    // For now, just return true if the plugin has dependencies defined
    const dependencies = instance.getDependencies();
    return dependencies.length === 0 || dependencies.length > 0;
  }
}
