/**
 * Background API Handlers
 *
 * Handles AgentAPI calls from page context (via content script bridge)
 * and executes them with extension privileges.
 */

interface AgentAPICallMessage {
  type: 'AGENT_API_CALL';
  id: string;
  method: string;
  params: any;
}

interface AgentAPICallResponse {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Handle an AgentAPI call from the content script bridge
 */
export async function handleAgentAPICall(message: AgentAPICallMessage): Promise<AgentAPICallResponse> {
  const { method, params } = message;

  try {
    // Route to appropriate handler based on method
    const [api, action] = method.split('.');

    switch (api) {
      case 'storage':
        return await handleStorageAPI(action, params);

      case 'tabs':
        return await handleTabsAPI(action, params);

      case 'notifications':
        return await handleNotificationsAPI(action, params);

      case 'runtime':
        return await handleRuntimeAPI(action, params);

      default:
        return {
          success: false,
          error: `Unknown API: ${api}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle chrome.storage API calls
 */
async function handleStorageAPI(action: string, params: any): Promise<AgentAPICallResponse> {
  try {
    switch (action) {
      case 'get': {
        const result = await chrome.storage.local.get(params.keys);
        return { success: true, result };
      }

      case 'set': {
        await chrome.storage.local.set(params.items);
        return { success: true };
      }

      case 'remove': {
        await chrome.storage.local.remove(params.keys);
        return { success: true };
      }

      case 'clear': {
        await chrome.storage.local.clear();
        return { success: true };
      }

      default:
        return {
          success: false,
          error: `Unknown storage action: ${action}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Storage operation failed'
    };
  }
}

/**
 * Handle chrome.tabs API calls
 */
async function handleTabsAPI(action: string, params: any): Promise<AgentAPICallResponse> {
  try {
    switch (action) {
      case 'create': {
        const tab = await chrome.tabs.create(params.options);
        return { success: true, result: tab };
      }

      case 'update': {
        const tab = await chrome.tabs.update(params.tabId, params.options);
        return { success: true, result: tab };
      }

      case 'query': {
        const tabs = await chrome.tabs.query(params.queryInfo);
        return { success: true, result: tabs };
      }

      case 'getCurrent': {
        // This needs to be called from content script context
        // For now, return error - agents should use window.location instead
        return {
          success: false,
          error: 'tabs.getCurrent not available from page context. Use window.location instead.'
        };
      }

      default:
        return {
          success: false,
          error: `Unknown tabs action: ${action}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tabs operation failed'
    };
  }
}

/**
 * Handle chrome.notifications API calls
 */
async function handleNotificationsAPI(action: string, params: any): Promise<AgentAPICallResponse> {
  try {
    switch (action) {
      case 'create': {
        const notificationId = await chrome.notifications.create(params.options);
        return { success: true, result: notificationId };
      }

      case 'clear': {
        const wasCleared = await chrome.notifications.clear(params.notificationId);
        return { success: true, result: wasCleared };
      }

      default:
        return {
          success: false,
          error: `Unknown notifications action: ${action}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Notifications operation failed'
    };
  }
}

/**
 * Handle chrome.runtime API calls
 */
async function handleRuntimeAPI(action: string, params: any): Promise<AgentAPICallResponse> {
  try {
    switch (action) {
      case 'sendMessage': {
        const response = await chrome.runtime.sendMessage(params.message);
        return { success: true, result: response };
      }

      default:
        return {
          success: false,
          error: `Unknown runtime action: ${action}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Runtime operation failed'
    };
  }
}
