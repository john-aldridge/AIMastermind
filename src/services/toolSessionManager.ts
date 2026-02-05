/**
 * Tool Session Manager
 *
 * Manages active tools for the current chat session.
 * Tracks always-on, context-suggested, and user-pinned tools.
 */

import { contextDetector } from './contextDetector';
import { ClientRegistry } from '@/clients';
import { AgentRegistry } from '@/agents';

/**
 * Context-suggested tool entry
 */
export interface SuggestedTool {
  clientId: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  dismissed: boolean;
}

/**
 * Tool session state
 */
export interface ToolSession {
  alwaysOn: string[];  // ['browser'] - always available
  contextSuggested: SuggestedTool[];  // Auto-detected from page
  userPinned: string[];  // Explicitly enabled by user
  userRemoved: string[];  // Explicitly disabled by user for this session
  currentUrl?: string;  // Current page URL for context tracking
}

/**
 * Tool with its source information
 */
export interface ActiveTool {
  clientId: string;
  source: 'always-on' | 'context-suggested' | 'user-pinned';
  reason?: string;  // For context-suggested tools
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Subscriber callback type
 */
type SessionChangeCallback = (session: ToolSession) => void;

// Default always-on clients
const ALWAYS_ON_CLIENTS = ['browser'];

// Maximum tools to send to LLM (optimal for accuracy)
const MAX_TOOLS_LIMIT = 20;

/**
 * Tool Session Manager class
 */
class ToolSessionManagerClass {
  private session: ToolSession = {
    alwaysOn: [...ALWAYS_ON_CLIENTS],
    contextSuggested: [],
    userPinned: [],
    userRemoved: [],
  };

  private subscribers: Set<SessionChangeCallback> = new Set();
  private persistenceKey = 'toolSessionPreferences';

  constructor() {
    this.loadPersistedPreferences();
  }

  /**
   * Load persisted user preferences from storage
   */
  private async loadPersistedPreferences(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(this.persistenceKey);
      const prefs = data[this.persistenceKey];
      if (prefs) {
        this.session.userPinned = prefs.userPinned || [];
        // Note: userRemoved is session-only, not persisted
        console.log('[ToolSessionManager] Loaded preferences:', prefs);
      }
    } catch (error) {
      console.error('[ToolSessionManager] Error loading preferences:', error);
    }
  }

  /**
   * Save user preferences to storage
   */
  private async savePersistedPreferences(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.persistenceKey]: {
          userPinned: this.session.userPinned,
        },
      });
    } catch (error) {
      console.error('[ToolSessionManager] Error saving preferences:', error);
    }
  }

  /**
   * Subscribe to session changes
   */
  subscribe(callback: SessionChangeCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of session changes
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.session));
  }

  /**
   * Get current session state
   */
  getSession(): ToolSession {
    return { ...this.session };
  }

  /**
   * Update context when tab/page changes
   * Detects relevant tools based on URL and optional content
   */
  updateContext(url: string, content?: string): void {
    console.log('[ToolSessionManager] Updating context for URL:', url);
    this.session.currentUrl = url;

    // Detect context matches
    const matches = contextDetector.detectContext(url, content);
    console.log('[ToolSessionManager] Context matches:', matches);

    // Update suggested tools, preserving dismissed state
    const existingDismissed = new Set(
      this.session.contextSuggested
        .filter(s => s.dismissed)
        .map(s => s.clientId)
    );

    this.session.contextSuggested = matches.map(match => ({
      clientId: match.clientId,
      reason: contextDetector.getDisplayReason(match),
      confidence: match.confidence,
      dismissed: existingDismissed.has(match.clientId),
    }));

    this.notifySubscribers();
  }

  /**
   * Pin a tool (explicitly enable for session and persist)
   */
  pinTool(clientId: string): void {
    if (!this.session.userPinned.includes(clientId)) {
      this.session.userPinned.push(clientId);
    }
    // Remove from removed list if present
    this.session.userRemoved = this.session.userRemoved.filter(id => id !== clientId);

    this.savePersistedPreferences();
    this.notifySubscribers();
  }

  /**
   * Unpin a tool (remove from pinned list)
   */
  unpinTool(clientId: string): void {
    this.session.userPinned = this.session.userPinned.filter(id => id !== clientId);
    this.savePersistedPreferences();
    this.notifySubscribers();
  }

  /**
   * Dismiss a context suggestion (for this session)
   */
  dismissSuggestion(clientId: string): void {
    const suggestion = this.session.contextSuggested.find(s => s.clientId === clientId);
    if (suggestion) {
      suggestion.dismissed = true;
    }
    // Also add to removed list to prevent re-suggestion in this session
    if (!this.session.userRemoved.includes(clientId)) {
      this.session.userRemoved.push(clientId);
    }
    this.notifySubscribers();
  }

  /**
   * Remove a tool from session (user explicitly disabled)
   */
  removeTool(clientId: string): void {
    // Can't remove always-on tools
    if (this.session.alwaysOn.includes(clientId)) {
      console.warn('[ToolSessionManager] Cannot remove always-on tool:', clientId);
      return;
    }

    // Add to removed list
    if (!this.session.userRemoved.includes(clientId)) {
      this.session.userRemoved.push(clientId);
    }

    // Remove from pinned if present
    this.session.userPinned = this.session.userPinned.filter(id => id !== clientId);

    // Mark as dismissed if it was suggested
    const suggestion = this.session.contextSuggested.find(s => s.clientId === clientId);
    if (suggestion) {
      suggestion.dismissed = true;
    }

    this.savePersistedPreferences();
    this.notifySubscribers();
  }

  /**
   * Re-enable a previously removed tool
   */
  restoreTool(clientId: string): void {
    this.session.userRemoved = this.session.userRemoved.filter(id => id !== clientId);

    // Undismiss if it was a suggested tool
    const suggestion = this.session.contextSuggested.find(s => s.clientId === clientId);
    if (suggestion) {
      suggestion.dismissed = false;
    }

    this.notifySubscribers();
  }

  /**
   * Check if a configured agent wraps this client
   * Returns the agent ID if found, null otherwise
   */
  private async getAgentForClient(clientId: string): Promise<string | null> {
    const agentIds = AgentRegistry.getAllIds();
    for (const agentId of agentIds) {
      const agent = AgentRegistry.getInstance(agentId);
      if (!agent) continue;

      const deps = agent.getDependencies();
      if (!deps.includes(clientId)) continue;

      // Check if the underlying client dependency is configured
      // (the agent needs the client to be set up with credentials)
      const clientConfigured = await this.isClientConfigured(clientId);
      if (!clientConfigured) continue;

      // Check if agent is configured (its own config fields)
      const storageKey = `plugin:${agentId}`;
      const data = await chrome.storage.local.get(storageKey);
      const config = data[storageKey];

      // Check required config fields
      const configFields = agent.getConfigFields() || [];
      const requiredFields = configFields.filter(f => f.required);
      const hasNoRequired = requiredFields.length === 0;
      const allFilled = requiredFields.every(f => config?.config?.[f.key]);

      if (hasNoRequired || allFilled) {
        return agentId;
      }
    }
    return null;
  }

  /**
   * Check if a client is configured and active in storage
   */
  private async isClientConfigured(clientId: string): Promise<boolean> {
    try {
      // Check if it's a registered client
      if (ClientRegistry.has(clientId)) {
        const storageKey = `client:${clientId}`;
        const data = await chrome.storage.local.get(storageKey);
        const clientConfig = data[storageKey];

        const clientInstance = ClientRegistry.getInstance(clientId);
        if (!clientInstance) return false;

        const credentialFields = clientInstance.getCredentialFields();
        const requiresCredentials = credentialFields.length > 0;

        if (requiresCredentials) {
          return !!clientConfig?.credentials && Object.keys(clientConfig.credentials).length > 0 && clientConfig?.isActive;
        } else {
          return !!clientConfig && clientConfig?.isActive !== false;
        }
      }

      // Check if it's a registered plugin/agent
      if (AgentRegistry.has(clientId)) {
        const storageKey = `plugin:${clientId}`;
        const data = await chrome.storage.local.get(storageKey);
        const pluginConfig = data[storageKey];

        // Agent is configured if it's active AND either:
        // 1. Has no required config fields, OR
        // 2. Has config with required fields filled
        if (!pluginConfig?.isActive) return false;

        const agentInstance = AgentRegistry.getInstance(clientId);
        const configFields = agentInstance?.getConfigFields() || [];
        const requiredFields = configFields.filter(f => f.required);

        if (requiredFields.length === 0) {
          return true; // No required fields, just needs to be active
        }

        // Check if all required fields are filled
        return requiredFields.every(f => pluginConfig?.config?.[f.key]);
      }

      return false;
    } catch (error) {
      console.error(`[ToolSessionManager] Error checking client config for ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Get list of active client IDs for loading tools
   * Returns merged list of always-on + non-dismissed suggestions + pinned,
   * filtered by what's actually configured.
   * Automatically substitutes agents for their dependent clients when available.
   */
  async getActiveClientIds(): Promise<string[]> {
    const collectedIds = new Set<string>();

    // Add always-on tools
    for (const id of this.session.alwaysOn) {
      if (await this.isClientConfigured(id)) {
        collectedIds.add(id);
      }
    }

    // Add non-dismissed context suggestions
    for (const suggestion of this.session.contextSuggested) {
      if (!suggestion.dismissed && !this.session.userRemoved.includes(suggestion.clientId)) {
        if (await this.isClientConfigured(suggestion.clientId)) {
          collectedIds.add(suggestion.clientId);
        }
      }
    }

    // Add user-pinned tools
    for (const id of this.session.userPinned) {
      if (!this.session.userRemoved.includes(id)) {
        if (await this.isClientConfigured(id)) {
          collectedIds.add(id);
        }
      }
    }

    // Substitute agents for clients when available
    const finalIds = new Set<string>();
    for (const id of collectedIds) {
      // Check if this is a client that has a configured agent
      if (ClientRegistry.has(id)) {
        const agentId = await this.getAgentForClient(id);
        if (agentId && !this.session.userRemoved.includes(agentId)) {
          finalIds.add(agentId);
          continue;
        }
      }
      finalIds.add(id);
    }

    return Array.from(finalIds);
  }

  /**
   * Get active tools with their source information
   * Automatically substitutes agents for their dependent clients when available.
   */
  async getActiveTools(): Promise<ActiveTool[]> {
    const collectedTools: ActiveTool[] = [];
    const added = new Set<string>();

    // Add always-on tools first
    for (const id of this.session.alwaysOn) {
      if (await this.isClientConfigured(id)) {
        collectedTools.push({ clientId: id, source: 'always-on' });
        added.add(id);
      }
    }

    // Add user-pinned tools (high priority)
    for (const id of this.session.userPinned) {
      if (!added.has(id) && !this.session.userRemoved.includes(id)) {
        if (await this.isClientConfigured(id)) {
          collectedTools.push({ clientId: id, source: 'user-pinned' });
          added.add(id);
        }
      }
    }

    // Add non-dismissed context suggestions
    for (const suggestion of this.session.contextSuggested) {
      if (!added.has(suggestion.clientId) && !suggestion.dismissed && !this.session.userRemoved.includes(suggestion.clientId)) {
        if (await this.isClientConfigured(suggestion.clientId)) {
          collectedTools.push({
            clientId: suggestion.clientId,
            source: 'context-suggested',
            reason: suggestion.reason,
            confidence: suggestion.confidence,
          });
          added.add(suggestion.clientId);
        }
      }
    }

    // Substitute agents for clients when available
    const finalTools: ActiveTool[] = [];
    const finalAdded = new Set<string>();
    for (const tool of collectedTools) {
      // Check if this is a client that has a configured agent
      if (ClientRegistry.has(tool.clientId)) {
        const agentId = await this.getAgentForClient(tool.clientId);
        if (agentId && !this.session.userRemoved.includes(agentId) && !finalAdded.has(agentId)) {
          finalTools.push({
            clientId: agentId,
            source: tool.source,
            reason: tool.reason,
            confidence: tool.confidence,
          });
          finalAdded.add(agentId);
          continue;
        }
      }
      if (!finalAdded.has(tool.clientId)) {
        finalTools.push(tool);
        finalAdded.add(tool.clientId);
      }
    }

    return finalTools;
  }

  /**
   * Get all available (configured) clients that could be added
   */
  async getAvailableClients(): Promise<{ clientId: string; name: string; isActive: boolean; source?: 'always-on' | 'context-suggested' | 'user-pinned' }[]> {
    const result: { clientId: string; name: string; isActive: boolean; source?: 'always-on' | 'context-suggested' | 'user-pinned' }[] = [];
    const activeTools = await this.getActiveTools();
    const activeMap = new Map(activeTools.map(t => [t.clientId, t.source]));

    // Get all registered clients
    const clientIds = ClientRegistry.getAllIds();
    for (const id of clientIds) {
      const metadata = ClientRegistry.getMetadata(id);
      if (metadata) {
        const isConfigured = await this.isClientConfigured(id);
        if (isConfigured) {
          result.push({
            clientId: id,
            name: metadata.name,
            isActive: activeMap.has(id),
            source: activeMap.get(id),
          });
        }
      }
    }

    // Get all registered plugins
    const pluginIds = AgentRegistry.getAllIds();
    for (const id of pluginIds) {
      const metadata = AgentRegistry.getMetadata(id);
      if (metadata) {
        const isConfigured = await this.isClientConfigured(id);
        if (isConfigured) {
          result.push({
            clientId: id,
            name: metadata.name,
            isActive: activeMap.has(id),
            source: activeMap.get(id),
          });
        }
      }
    }

    return result;
  }

  /**
   * Check if tools count is within optimal limit
   */
  isWithinLimit(toolCount: number): boolean {
    return toolCount <= MAX_TOOLS_LIMIT;
  }

  /**
   * Get the maximum tools limit
   */
  getMaxToolsLimit(): number {
    return MAX_TOOLS_LIMIT;
  }

  /**
   * Reset session (clear suggestions and removed, keep pinned)
   */
  resetSession(): void {
    this.session.contextSuggested = [];
    this.session.userRemoved = [];
    this.session.currentUrl = undefined;
    this.notifySubscribers();
  }

  /**
   * Check if a tool is currently active
   */
  async isToolActive(clientId: string): Promise<boolean> {
    const activeIds = await this.getActiveClientIds();
    return activeIds.includes(clientId);
  }
}

// Export singleton instance
export const toolSessionManager = new ToolSessionManagerClass();

// Also export the class for testing
export { ToolSessionManagerClass };
