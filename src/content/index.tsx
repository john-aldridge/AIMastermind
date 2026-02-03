import { createRoot } from 'react-dom/client';
import { ContentApp } from './ContentApp';
import '@/styles/globals.css';
import { MessageType } from '@/utils/messaging';
import { javascriptExtractor } from './javascriptExtractor';
import { cssExtractor } from './cssExtractor';
import { initializeProcessRegistry, getProcessRegistry } from '@/utils/processRegistry';
import { initializeAgentAPIBridge } from '@/bridge/contentScriptBridge';

// Inject network interceptor into page context
const injectInterceptor = () => {
  try {
    const script = document.createElement('script');
    const interceptorUrl = chrome.runtime.getURL('content/interceptor.js');

    console.log('%c[Synergy AI] Attempting to inject interceptor from:', interceptorUrl, 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 3px;');

    script.src = interceptorUrl;
    script.onload = () => {
      console.log('%c[Synergy AI] Network interceptor injected and loaded successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      script.remove(); // Clean up
    };
    script.onerror = (error) => {
      console.error('%c[Synergy AI] Failed to load network interceptor - this may be due to Content Security Policy (CSP) restrictions', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('%c[Synergy AI] Error injecting interceptor script:', error, 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;');
  }
};

// Listen for intercepted network data from page context
window.addEventListener('message', (event) => {
  // Only accept messages from same origin and our interceptor
  if (event.source !== window || event.data.source !== 'ai-mastermind-interceptor') {
    return;
  }

  if (event.data.type === 'NETWORK_INTERCEPTED') {
    const data = event.data.data;

    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      // Extension context invalidated (extension was reloaded/updated)
      // Silently ignore - this is expected during development
      return;
    }

    // Safe logging with type checking
    try {
      const requestType = typeof data.type === 'string' ? data.type.toUpperCase() : 'UNKNOWN';
      const method = data.request?.method || 'UNKNOWN';
      const url = data.request?.url || 'UNKNOWN';
      console.log(`%c[Synergy AI] Intercepted ${requestType} request: ${method} ${url}`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');
    } catch (err) {
      console.error('[Synergy AI] Error logging intercepted request:', err, data);
    }

    // Forward to background script
    chrome.runtime.sendMessage({
      type: MessageType.NETWORK_DATA_INTERCEPTED,
      payload: data
    }).catch(err => {
      // Only log if it's not a context invalidation error
      if (!err.message?.includes('Extension context invalidated')) {
        console.error('[Content] Error forwarding network data:', err);
      }
    });
  }
});

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Check if extension context is still valid
  if (!chrome.runtime?.id) {
    return false;
  }

  try {
    if (message.type === MessageType.EXTRACT_JAVASCRIPT) {
      console.log('[Content] Extracting JavaScript from page...');

      // Extract JavaScript asynchronously
      javascriptExtractor.extractAllJavaScript()
        .then(scripts => {
          if (!chrome.runtime?.id) return; // Check again before responding
          const summary = javascriptExtractor.formatSummary(scripts);
          sendResponse({ success: true, data: summary });
        })
        .catch(error => {
          if (!chrome.runtime?.id) return; // Context invalidated, ignore
          console.error('[Content] Error extracting JavaScript:', error);
          sendResponse({ success: false, error: String(error) });
        });

      // Return true to indicate async response
      return true;
    }

    if (message.type === MessageType.EXTRACT_CSS) {
      console.log('[Content] Extracting CSS from page...');

      // Extract CSS asynchronously
      cssExtractor.extractAllCSS()
        .then(styles => {
          if (!chrome.runtime?.id) return; // Check again before responding
          const summary = cssExtractor.formatSummary(styles);
          sendResponse({ success: true, data: summary });
        })
        .catch(error => {
          if (!chrome.runtime?.id) return; // Context invalidated, ignore
          console.error('[Content] Error extracting CSS:', error);
          sendResponse({ success: false, error: String(error) });
        });

      // Return true to indicate async response
      return true;
    }

    // Process Registry handlers
    if (message.type === MessageType.LIST_PROCESSES) {
      const registry = getProcessRegistry();
      if (!registry) {
        sendResponse({ success: false, error: 'Process registry not initialized' });
        return false;
      }

      const processes = registry.list();
      sendResponse({ success: true, data: processes });
      return false;
    }

    if (message.type === MessageType.STOP_PROCESS) {
      const registry = getProcessRegistry();
      if (!registry) {
        sendResponse({ success: false, error: 'Process registry not initialized' });
        return false;
      }

      const { processId } = message.payload;
      const stopped = registry.stop(processId);
      sendResponse({ success: stopped, data: { stopped } });
      return false;
    }

    if (message.type === MessageType.STOP_AGENT_PROCESSES) {
      const registry = getProcessRegistry();
      if (!registry) {
        sendResponse({ success: false, error: 'Process registry not initialized' });
        return false;
      }

      const { agentId } = message.payload;
      const stoppedCount = registry.stopAgent(agentId);
      sendResponse({ success: true, data: { stoppedCount } });
      return false;
    }

    if (message.type === MessageType.STOP_ALL_PROCESSES) {
      const registry = getProcessRegistry();
      if (!registry) {
        sendResponse({ success: false, error: 'Process registry not initialized' });
        return false;
      }

      const stoppedCount = registry.stopAll();
      sendResponse({ success: true, data: { stoppedCount } });
      return false;
    }
  } catch (error) {
    // Suppress context invalidation errors
    if (error instanceof Error && error.message.includes('Extension context invalidated')) {
      return false;
    }
    console.error('[Content] Unexpected error in message handler:', error);
    return false;
  }

  return false;
});

// Global error handler to suppress extension context errors
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('Extension context invalidated')) {
    event.preventDefault(); // Suppress the error from console
    return true;
  }
});

// Global unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Extension context invalidated')) {
    event.preventDefault(); // Suppress the error from console
    return true;
  }
});

// Create a container for the extension content
const initializeContentScript = () => {
  // Check if already initialized
  if (document.getElementById('ai-mastermind-root')) {
    console.log('%c[Synergy AI] Content script already initialized', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
    return;
  }

  console.log('%c[Synergy AI] Content script initializing...', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');

  // Initialize process registry for tracking long-running agent processes
  initializeProcessRegistry();

  // Initialize AgentAPI bridge for agents to access chrome APIs
  initializeAgentAPIBridge();

  // Inject network interceptor first
  injectInterceptor();

  // Create root container
  const rootContainer = document.createElement('div');
  rootContainer.id = 'ai-mastermind-root';
  rootContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
  `;

  // Append to body
  document.body.appendChild(rootContainer);

  // Render React app
  const root = createRoot(rootContainer);
  root.render(<ContentApp />);

  console.log('Synergy AI content script initialized');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  console.log('%c[Synergy AI] Waiting for DOM to load...', 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px;');
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  console.log('%c[Synergy AI] DOM already loaded, initializing immediately', 'background: #673AB7; color: white; padding: 2px 5px; border-radius: 3px;');
  initializeContentScript();
}
