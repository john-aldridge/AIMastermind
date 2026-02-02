/**
 * Client Registry
 *
 * Central registry for all API clients in the extension.
 * Handles registration, discovery, and lifecycle management.
 */

import { APIClientBase, ClientMetadata } from './ClientInterface';

/**
 * Registered client entry
 */
interface RegisteredClient {
  metadata: ClientMetadata;
  ClientClass: new () => APIClientBase;
  instance?: APIClientBase;
}

/**
 * Client Registry - Singleton pattern
 */
class ClientRegistryClass {
  private clients: Map<string, RegisteredClient> = new Map();

  /**
   * Register a new client
   */
  register(ClientClass: new () => APIClientBase): void {
    const instance = new ClientClass();
    const metadata = instance.getMetadata();

    if (this.clients.has(metadata.id)) {
      console.warn(`Client ${metadata.id} is already registered. Overwriting.`);
    }

    this.clients.set(metadata.id, {
      metadata,
      ClientClass,
    });

    console.log(`[ClientRegistry] Registered client: ${metadata.name} (${metadata.id})`);
  }

  /**
   * Get a client instance by ID
   * Creates a new instance if one doesn't exist
   */
  getInstance(clientId: string): APIClientBase | undefined {
    const registered = this.clients.get(clientId);
    if (!registered) {
      console.error(`[ClientRegistry] Client not found: ${clientId}`);
      return undefined;
    }

    // Create instance if it doesn't exist
    if (!registered.instance) {
      registered.instance = new registered.ClientClass();
    }

    return registered.instance;
  }

  /**
   * Create a new instance (useful for multiple instances of same client)
   */
  createInstance(clientId: string): APIClientBase | undefined {
    const registered = this.clients.get(clientId);
    if (!registered) {
      console.error(`[ClientRegistry] Client not found: ${clientId}`);
      return undefined;
    }

    return new registered.ClientClass();
  }

  /**
   * Get all registered client metadata
   */
  getAllMetadata(): ClientMetadata[] {
    return Array.from(this.clients.values()).map(c => c.metadata);
  }

  /**
   * Search clients by tag
   */
  searchByTag(tag: string): ClientMetadata[] {
    return this.getAllMetadata().filter(metadata =>
      metadata.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  /**
   * Get client metadata by ID
   */
  getMetadata(clientId: string): ClientMetadata | undefined {
    return this.clients.get(clientId)?.metadata;
  }

  /**
   * Check if a client is registered
   */
  has(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  /**
   * Unregister a client
   */
  unregister(clientId: string): boolean {
    const registered = this.clients.get(clientId);
    if (!registered) {
      return false;
    }

    // Cleanup instance if exists
    if (registered.instance) {
      registered.instance.destroy().catch(err => {
        console.error(`[ClientRegistry] Error destroying client ${clientId}:`, err);
      });
    }

    this.clients.delete(clientId);
    console.log(`[ClientRegistry] Unregistered client: ${clientId}`);
    return true;
  }

  /**
   * Get all client IDs
   */
  getAllIds(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Clear all clients (useful for testing)
   */
  clear(): void {
    this.clients.forEach((_, id) => this.unregister(id));
  }
}

// Export singleton instance
export const ClientRegistry = new ClientRegistryClass();
