/**
 * Client Registration
 *
 * This file imports and registers all available clients.
 * Add new clients here to make them available to the extension.
 */

import { ClientRegistry } from './ClientRegistry';
import { JiraClient } from './JiraClient';
import { ConfluenceClient } from './ConfluenceClient';
import { PinterestClient } from './PinterestClient';
import { BrowserClient } from './BrowserClient';

/**
 * Register all clients
 * Call this on extension startup
 */
export function registerAllClients(): void {
  console.log('[Clients] Registering all clients...');

  // Register built-in clients
  ClientRegistry.register(JiraClient);
  ClientRegistry.register(ConfluenceClient);
  ClientRegistry.register(PinterestClient);
  ClientRegistry.register(BrowserClient);

  // Add more clients here as they're created:
  // ClientRegistry.register(GitHubClient);
  // ClientRegistry.register(SlackClient);

  console.log(`[Clients] Registered ${ClientRegistry.getAllIds().length} clients`);
}

// Export everything needed by other parts of the app
export { ClientRegistry } from './ClientRegistry';
export { APIClientBase } from './ClientInterface';
export type {
  ClientMetadata,
  CredentialField,
  ClientCapabilityDefinition,
  CapabilityResult,
} from './ClientInterface';
