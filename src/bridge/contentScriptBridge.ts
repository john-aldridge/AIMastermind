/**
 * Content Script Bridge
 *
 * Forwards messages between page context (where agents run) and
 * background service worker (where privileged APIs are available).
 */

import type { AgentAPIMessage, AgentAPIResponse } from './AgentAPI';

/**
 * Initialize the bridge in the content script
 * This forwards API calls from page context to background
 */
export function initializeAgentAPIBridge() {
  // Listen for messages from page context (agents)
  window.addEventListener('message', async (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;

    const message = event.data as AgentAPIMessage;
    if (message.type !== 'AGENT_API_CALL') return;

    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        type: 'AGENT_API_CALL',
        id: message.id,
        method: message.method,
        params: message.params
      });

      // Send response back to page context
      window.postMessage({
        type: 'AGENT_API_RESPONSE',
        id: message.id,
        success: response.success,
        result: response.result,
        error: response.error
      } as AgentAPIResponse, '*');

    } catch (error) {
      // Send error response back to page context
      window.postMessage({
        type: 'AGENT_API_RESPONSE',
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as AgentAPIResponse, '*');
    }
  });

  console.log('[AgentAPI Bridge] Initialized in content script');
}

/**
 * Forward network events from background to page context
 */
export function forwardNetworkEvent(request: any) {
  window.postMessage({
    type: 'NETWORK_REQUEST',
    request
  }, '*');
}
