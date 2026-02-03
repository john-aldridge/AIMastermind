/**
 * Chrome extension messaging utilities
 * Handles communication between popup, content scripts, and background
 */

export enum MessageType {
  // Widget management
  CREATE_WIDGET = 'CREATE_WIDGET',
  UPDATE_WIDGET = 'UPDATE_WIDGET',
  REMOVE_WIDGET = 'REMOVE_WIDGET',
  GET_ACTIVE_WIDGETS = 'GET_ACTIVE_WIDGETS',

  // AI generation
  GENERATE_CONTENT = 'GENERATE_CONTENT',

  // Storage sync
  SYNC_STATE = 'SYNC_STATE',
  LOAD_STATE = 'LOAD_STATE',

  // Token management
  UPDATE_TOKENS = 'UPDATE_TOKENS',
  PURCHASE_TOKENS = 'PURCHASE_TOKENS',

  // Auth
  AUTHENTICATE = 'AUTHENTICATE',
  LOGOUT = 'LOGOUT',

  // Downloads
  GET_RECENT_DOWNLOADS = 'GET_RECENT_DOWNLOADS',

  // Network interception
  NETWORK_DATA_INTERCEPTED = 'NETWORK_DATA_INTERCEPTED',
  GET_NETWORK_SUMMARY = 'GET_NETWORK_SUMMARY',
  GET_NETWORK_REQUESTS = 'GET_NETWORK_REQUESTS',
  EXTRACT_JAVASCRIPT = 'EXTRACT_JAVASCRIPT',
  EXTRACT_CSS = 'EXTRACT_CSS',

  // Auto-load rules
  GET_ACTIVE_AGENTS = 'GET_ACTIVE_AGENTS',
  CHECK_AUTO_LOAD_RULES = 'CHECK_AUTO_LOAD_RULES',

  // Process registry
  LIST_PROCESSES = 'LIST_PROCESSES',
  STOP_PROCESS = 'STOP_PROCESS',
  STOP_AGENT_PROCESSES = 'STOP_AGENT_PROCESSES',
  STOP_ALL_PROCESSES = 'STOP_ALL_PROCESSES',
}

export interface Message<T = any> {
  type: MessageType;
  payload?: T;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Send message to background script
 */
export async function sendToBackground<T = any>(
  message: Message
): Promise<MessageResponse<T>> {
  try {
    const response = await chrome.runtime.sendMessage(message);
    return response;
  } catch (error) {
    console.error('Error sending message to background:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send message to content script
 */
export async function sendToContent<T = any>(
  tabId: number,
  message: Message
): Promise<MessageResponse<T>> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    console.error('Error sending message to content script:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send message to popup
 */
export async function sendToPopup<T = any>(
  message: Message
): Promise<MessageResponse<T>> {
  try {
    const response = await chrome.runtime.sendMessage(message);
    return response;
  } catch (error) {
    console.error('Error sending message to popup:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Broadcast message to all tabs
 */
export async function broadcast(message: Message): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map(tab => {
        if (tab.id) {
          return chrome.tabs.sendMessage(tab.id, message).catch(err => {
            // Ignore errors for tabs that don't have content scripts
            console.log(`Could not send to tab ${tab.id}:`, err);
          });
        }
      })
    );
  } catch (error) {
    console.error('Error broadcasting message:', error);
  }
}
