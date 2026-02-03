/**
 * AgentAPI Bridge
 *
 * This class runs in the page context (MAIN world) and provides a bridge
 * for agents to access Chrome extension APIs via message passing.
 *
 * Agents use this.api.* instead of chrome.* to access privileged functionality.
 */

export interface AgentAPIMessage {
  type: 'AGENT_API_CALL';
  id: string;
  method: string;
  params: any;
}

export interface AgentAPIResponse {
  type: 'AGENT_API_RESPONSE';
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * AgentAPI - Provides bridge to Chrome extension APIs from page context
 * This class is injected into the page and used by agents
 */
class AgentAPI {
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  private messageId = 0;

  constructor() {
    // Listen for responses from content script
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;

      const message = event.data as AgentAPIResponse;
      if (message.type === 'AGENT_API_RESPONSE') {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          if (message.success) {
            pending.resolve(message.result);
          } else {
            pending.reject(new Error(message.error));
          }
          this.pendingRequests.delete(message.id);
        }
      }
    });
  }

  /**
   * Send a message to the extension and wait for response
   */
  private async call(method: string, params: any): Promise<any> {
    const id = `api-${++this.messageId}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Post message to content script
      window.postMessage({
        type: 'AGENT_API_CALL',
        id,
        method,
        params
      } as AgentAPIMessage, '*');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`API call timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Storage API bridge
   */
  storage = {
    get: async (keys?: string | string[] | null): Promise<any> => {
      return this.call('storage.get', { keys });
    },

    set: async (items: Record<string, any>): Promise<void> => {
      return this.call('storage.set', { items });
    },

    remove: async (keys: string | string[]): Promise<void> => {
      return this.call('storage.remove', { keys });
    },

    clear: async (): Promise<void> => {
      return this.call('storage.clear', {});
    }
  };

  /**
   * Tabs API bridge
   */
  tabs = {
    create: async (options: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> => {
      return this.call('tabs.create', { options });
    },

    update: async (tabId: number, options: chrome.tabs.UpdateProperties): Promise<chrome.tabs.Tab> => {
      return this.call('tabs.update', { tabId, options });
    },

    query: async (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
      return this.call('tabs.query', { queryInfo });
    },

    getCurrent: async (): Promise<chrome.tabs.Tab> => {
      return this.call('tabs.getCurrent', {});
    }
  };

  /**
   * Notifications API bridge
   */
  notifications = {
    create: async (options: chrome.notifications.NotificationOptions<true>): Promise<string> => {
      return this.call('notifications.create', { options });
    },

    clear: async (notificationId: string): Promise<boolean> => {
      return this.call('notifications.clear', { notificationId });
    }
  };

  /**
   * Network monitoring API bridge
   */
  network = {
    /**
     * Register a callback for network requests
     * The callback will be invoked when network events are forwarded from background
     */
    onRequest: (callback: (request: any) => void) => {
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data.type === 'NETWORK_REQUEST') {
          callback(event.data.request);
        }
      });
    }
  };

  /**
   * Runtime API bridge
   */
  runtime = {
    sendMessage: async (message: any): Promise<any> => {
      return this.call('runtime.sendMessage', { message });
    },

    getURL: (_path: string): string => {
      // This needs to be cached from extension context
      // For now, return empty - will be populated during injection
      return '';
    }
  };
}

// Export the class for use in injection
export { AgentAPI };
