/**
 * Inject AgentAPI Bridge into Page Context
 *
 * This injects the AgentAPI class into the page so agents can use it
 * to access Chrome extension APIs via message passing.
 */

/**
 * Inject AgentAPI into a specific tab's page context
 */
export async function injectAgentAPIIntoPage(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN', // Page context
      func: initializeAgentAPIInPage
    });

    console.log(`✅ AgentAPI injected into tab ${tabId}`);
  } catch (error) {
    console.error(`❌ Failed to inject AgentAPI into tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * This function runs in the page context and sets up the AgentAPI
 * It's executed via chrome.scripting.executeScript
 */
function initializeAgentAPIInPage() {
  // Don't re-initialize if already present
  if ((window as any).__AgentAPI) {
    console.log('[AgentAPI] Already initialized');
    return;
  }

  // Define AgentAPI class in page context
  // This is a simplified version that will be used by agents
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

        const message = event.data;
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

    private async call(method: string, params: any): Promise<any> {
      const id = `api-${++this.messageId}`;

      return new Promise((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });

        window.postMessage({
          type: 'AGENT_API_CALL',
          id,
          method,
          params
        }, '*');

        // Timeout after 30 seconds
        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            reject(new Error(`API call timeout: ${method}`));
          }
        }, 30000);
      });
    }

    // Storage API
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

    // Tabs API
    tabs = {
      create: async (options: any): Promise<any> => {
        return this.call('tabs.create', { options });
      },
      update: async (tabId: number, options: any): Promise<any> => {
        return this.call('tabs.update', { tabId, options });
      },
      query: async (queryInfo: any): Promise<any[]> => {
        return this.call('tabs.query', { queryInfo });
      }
    };

    // Notifications API
    notifications = {
      create: async (options: any): Promise<string> => {
        return this.call('notifications.create', { options });
      },
      clear: async (notificationId: string): Promise<boolean> => {
        return this.call('notifications.clear', { notificationId });
      }
    };

    // Network API
    network = {
      onRequest: (callback: (request: any) => void) => {
        window.addEventListener('message', (event) => {
          if (event.source !== window) return;
          if (event.data.type === 'NETWORK_REQUEST') {
            callback(event.data.request);
          }
        });
      }
    };

    // Runtime API
    runtime = {
      sendMessage: async (message: any): Promise<any> => {
        return this.call('runtime.sendMessage', { message });
      }
    };
  }

  // Make AgentAPI available globally in page context
  (window as any).__AgentAPI = AgentAPI;
  (window as any).AgentAPI = AgentAPI;

  console.log('[AgentAPI] Initialized in page context');
}
