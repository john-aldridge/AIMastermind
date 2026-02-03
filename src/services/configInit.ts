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

    // Check if we need to load example configs (first-time setup)
    const agentConfigs = await ConfigStorageService.listAgentConfigs();
    const clientConfigs = await ConfigStorageService.listClientConfigs();

    if (agentConfigs.length === 0 && clientConfigs.length === 0) {
      console.log('[ConfigInit] No configs found, loading examples...');

      // Save example configs to storage
      for (const config of ExampleConfigs.agents) {
        await ConfigStorageService.saveAgentConfig(config);
        registry.registerAgent(config);
      }

      for (const config of ExampleConfigs.clients) {
        await ConfigStorageService.saveClientConfig(config);
        registry.registerClient(config);
      }

      console.log('[ConfigInit] Loaded example configs');
    }

    console.log('[ConfigInit] Initialization complete');
    console.log(`[ConfigInit] Registered agents: ${registry.listAgents().length}`);
    console.log(`[ConfigInit] Registered clients: ${registry.listClients().length}`);
  } catch (error) {
    console.error('[ConfigInit] Initialization failed:', error);
  }
}
