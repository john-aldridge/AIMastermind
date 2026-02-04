/**
 * Config Architecture Initialization
 *
 * Initializes the config registry and loads example configs.
 * Called on extension startup.
 */

import { ConfigRegistry } from './configRegistry';
import { ConfigStorageService } from '../storage/configStorage';
import { ExampleConfigs } from '../examples/configExamples';

/**
 * Initialize the config-based architecture
 */
export async function initializeConfigArchitecture(): Promise<void> {
  console.log('[ConfigInit] Initializing config-based architecture...');

  try {
    // Get the registry instance
    const registry = ConfigRegistry.getInstance();

    // Load configs from storage first
    await registry.initialize();

    // Ensure example configs are available and up to date
    const existingAgents = registry.listAgents();
    const existingClients = registry.listClients();

    // Add or update example agents (always update to latest version)
    for (const config of ExampleConfigs.agents) {
      const existing = existingAgents.find(a => a.id === config.id);
      if (!existing) {
        console.log(`[ConfigInit] Registering example agent: ${config.id}`);
        await ConfigStorageService.saveAgentConfig(config);
        registry.registerAgent(config);
      } else if (existing.version !== config.version || existing.source !== 'example') {
        // Update to latest version
        console.log(`[ConfigInit] Updating example agent: ${config.id} to v${config.version}`);
        await ConfigStorageService.saveAgentConfig(config);
        registry.registerAgent(config);
      }
    }

    // Add or update example clients
    for (const config of ExampleConfigs.clients) {
      const existing = existingClients.find(c => c.id === config.id);
      if (!existing) {
        console.log(`[ConfigInit] Registering example client: ${config.id}`);
        await ConfigStorageService.saveClientConfig(config);
        registry.registerClient(config);
      }
    }

    console.log('[ConfigInit] Initialization complete');
    console.log(`[ConfigInit] Registered agents: ${registry.listAgents().length}`);
    console.log(`[ConfigInit] Registered clients: ${registry.listClients().length}`);
  } catch (error) {
    console.error('[ConfigInit] Initialization failed:', error);
  }
}
