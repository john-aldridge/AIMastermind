import { createRoot } from 'react-dom/client';
import { ContentApp } from './ContentApp';
import '@/styles/globals.css';
import { MessageType } from '@/utils/messaging';
import { javascriptExtractor } from './javascriptExtractor';
import { cssExtractor } from './cssExtractor';
import { initializeProcessRegistry, getProcessRegistry } from '@/utils/processRegistry';

// Track monitoring state
let interceptorInjected = false;
let consoleInterceptorInjected = false;
let messagingInterceptorInjected = false;
let extensionMessagingIntercepted = false;
let shouldForwardNetworkData = false;
let shouldForwardConsoleData = false;
let shouldForwardMessagingData = false;

// Store original chrome.runtime methods for extension messaging interception
const originalChromeRuntimeSendMessage = chrome.runtime?.sendMessage?.bind(chrome.runtime);

// Inject network interceptor into page context (only when needed)
const injectInterceptor = () => {
  if (interceptorInjected) return; // Already injected

  try {
    const script = document.createElement('script');
    const interceptorUrl = chrome.runtime.getURL('content/interceptor.js');

    script.src = interceptorUrl;
    script.onload = () => {
      console.log('%c[Synergy AI] Network interceptor injected (API monitoring enabled)', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;');
      script.remove(); // Clean up
      interceptorInjected = true;
    };
    script.onerror = (error) => {
      console.error('%c[Synergy AI] Failed to load network interceptor - CSP may be blocking it', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('%c[Synergy AI] Error injecting interceptor script:', error, 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;');
  }
};

// Inject console interceptor into page context
const injectConsoleInterceptor = () => {
  if (consoleInterceptorInjected) return;

  try {
    const script = document.createElement('script');
    const interceptorUrl = chrome.runtime.getURL('content/consoleInterceptor.js');

    script.src = interceptorUrl;
    script.onload = () => {
      console.log('%c[Synergy AI] Console interceptor injected', 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;');
      script.remove();
      consoleInterceptorInjected = true;
    };
    script.onerror = (error) => {
      console.error('%c[Synergy AI] Failed to load console interceptor', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('%c[Synergy AI] Error injecting console interceptor:', error, 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;');
  }
};

// Inject messaging interceptor into page context
const injectMessagingInterceptor = () => {
  if (messagingInterceptorInjected) return;

  try {
    const script = document.createElement('script');
    const interceptorUrl = chrome.runtime.getURL('content/messagingInterceptor.js');

    script.src = interceptorUrl;
    script.onload = () => {
      console.log('%c[Synergy AI] Messaging interceptor injected', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');
      script.remove();
      messagingInterceptorInjected = true;
    };
    script.onerror = (error) => {
      console.error('%c[Synergy AI] Failed to load messaging interceptor', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;', error);
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('%c[Synergy AI] Error injecting messaging interceptor:', error, 'background: #F44336; color: white; padding: 2px 5px; border-radius: 3px;');
  }
};

// Intercept chrome.runtime messaging (for monitoring extension communication)
const interceptExtensionMessaging = () => {
  if (extensionMessagingIntercepted || !originalChromeRuntimeSendMessage) return;

  // Helper to safely stringify
  const safeStringify = (obj: any, maxLength = 5000): string => {
    try {
      if (typeof obj === 'string') return obj.length > maxLength ? obj.substring(0, maxLength) + '...' : obj;
      const str = JSON.stringify(obj);
      return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    } catch {
      return '[Unable to stringify]';
    }
  };

  // Intercept chrome.runtime.sendMessage
  (chrome.runtime as any).sendMessage = function(
    messageOrExtensionId: any,
    optionsOrMessage?: any,
    responseCallback?: any
  ) {
    // Determine the actual message (handle both signatures)
    const message = typeof messageOrExtensionId === 'string' ? optionsOrMessage : messageOrExtensionId;

    // Don't intercept our own monitoring messages
    const isMonitoringMessage = message?.type?.includes?.('MESSAGING') ||
                                message?.type?.includes?.('CONSOLE') ||
                                message?.type?.includes?.('NETWORK') ||
                                message?.type?.includes?.('MONITORING');

    if (!isMonitoringMessage && shouldForwardMessagingData) {
      // Forward to background (using original to avoid recursion)
      originalChromeRuntimeSendMessage({
        type: MessageType.MESSAGING_DATA_INTERCEPTED,
        payload: {
          type: 'ExtensionMessage',
          direction: 'outgoing',
          target: 'runtime',
          message: safeStringify(message),
          messageType: message?.type,
          timestamp: Date.now(),
        }
      }).catch(() => {});
    }

    // Call original with the same arguments
    if (typeof messageOrExtensionId === 'string') {
      return originalChromeRuntimeSendMessage(messageOrExtensionId, optionsOrMessage, responseCallback);
    }
    return originalChromeRuntimeSendMessage(messageOrExtensionId, optionsOrMessage);
  };

  extensionMessagingIntercepted = true;
  console.log('%c[Synergy AI] Extension messaging interceptor enabled', 'background: #E91E63; color: white; padding: 2px 5px; border-radius: 3px;');
};

// Check if monitoring level requires network interception
const levelRequiresInterception = (level: string) => {
  return level === 'api-monitoring' || level === 'full-monitoring';
};

// Initialize monitoring state based on current level
const initializeMonitoringState = async () => {
  try {
    if (!chrome.runtime?.id) return;
    const response = await chrome.runtime.sendMessage({
      type: MessageType.GET_MONITORING_LEVEL
    });
    if (response?.success && response.data) {
      const level = response.data;
      shouldForwardNetworkData = levelRequiresInterception(level);
      if (shouldForwardNetworkData) {
        injectInterceptor();
      }
    }
  } catch (err) {
    // Silently ignore - extension context may be invalidated
  }
};

// Initialize console monitoring state
const initializeConsoleMonitoringState = async () => {
  try {
    if (!chrome.runtime?.id) return;
    const response = await chrome.runtime.sendMessage({
      type: MessageType.GET_CONSOLE_MONITORING_LEVEL
    });
    if (response?.success && response.data) {
      const level = response.data;
      // Enable for 'extension' or 'full' levels
      shouldForwardConsoleData = level === 'extension' || level === 'full';
      if (shouldForwardConsoleData) {
        // Inject console interceptor to capture page console logs
        // This works without debugger permission by running in page context
        injectConsoleInterceptor();
      }
    }
  } catch (err) {
    // Silently ignore - extension context may be invalidated
  }
};

// Initialize messaging monitoring state
const initializeMessagingMonitoringState = async () => {
  try {
    if (!chrome.runtime?.id) return;
    const response = await chrome.runtime.sendMessage({
      type: MessageType.GET_MESSAGING_MONITORING_ENABLED
    });
    if (response?.success && response.data) {
      shouldForwardMessagingData = response.data === true;
      if (shouldForwardMessagingData) {
        injectMessagingInterceptor();
        interceptExtensionMessaging();
      }
    }
  } catch (err) {
    // Silently ignore - extension context may be invalidated
  }
};

// Initialize on load
initializeMonitoringState();
initializeConsoleMonitoringState();
initializeMessagingMonitoringState();

// Listen for intercepted data from page context
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  // Handle network interception
  if (event.data.source === 'ai-mastermind-interceptor' && event.data.type === 'NETWORK_INTERCEPTED') {
    // Skip if monitoring level doesn't require network data
    if (!shouldForwardNetworkData) {
      return;
    }

    const data = event.data.data;

    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      return;
    }

    // Determine if this is the top frame or an iframe
    const isTopFrame = window === window.top;

    // Forward to background script (no verbose logging)
    chrome.runtime.sendMessage({
      type: MessageType.NETWORK_DATA_INTERCEPTED,
      payload: {
        ...data,
        frameType: isTopFrame ? 'top' : 'iframe',
        isIframe: !isTopFrame,
        frameUrl: window.location.href,
      }
    }).catch(err => {
      if (!err.message?.includes('Extension context invalidated')) {
        console.error('[Content] Error forwarding network data:', err);
      }
    });
  }

  // Handle console interception
  if (event.data.source === 'ai-mastermind-console' && event.data.type === 'CONSOLE_INTERCEPTED') {
    // Skip if console monitoring is disabled
    if (!shouldForwardConsoleData) {
      return;
    }

    const data = event.data.data;

    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      return;
    }

    // Determine if this is the top frame or an iframe
    const isTopFrame = window === window.top;
    const frameInfo = isTopFrame ? 'top' : 'iframe';

    // Forward to background/sidepanel
    chrome.runtime.sendMessage({
      type: MessageType.CONSOLE_LOG,
      payload: {
        ...data,
        frameType: frameInfo,
        isIframe: !isTopFrame,
        source: 'page',
        url: window.location.href,
      }
    }).catch(err => {
      if (!err.message?.includes('Extension context invalidated')) {
        // Silently ignore console forwarding errors
      }
    });
  }

  // Handle messaging interception (postMessage, MessageChannel, BroadcastChannel)
  if (event.data.source === 'ai-mastermind-messaging' && event.data.type === 'MESSAGING_INTERCEPTED') {
    // Skip if messaging monitoring is disabled
    if (!shouldForwardMessagingData) {
      return;
    }

    const data = event.data.data;

    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      return;
    }

    // Determine if this is the top frame or an iframe
    const isTopFrame = window === window.top;

    // Forward to background
    chrome.runtime.sendMessage({
      type: MessageType.MESSAGING_DATA_INTERCEPTED,
      payload: {
        ...data,
        frameType: isTopFrame ? 'top' : 'iframe',
        isIframe: !isTopFrame,
        frameUrl: window.location.href,
      }
    }).catch(err => {
      if (!err.message?.includes('Extension context invalidated')) {
        // Silently ignore messaging forwarding errors
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
    // Handle monitoring level changes
    if (message.type === MessageType.MONITORING_LEVEL_CHANGED) {
      const level = message.level;
      const wasForwarding = shouldForwardNetworkData;
      shouldForwardNetworkData = levelRequiresInterception(level);

      // Inject interceptor if we just enabled monitoring and haven't injected yet
      if (shouldForwardNetworkData && !interceptorInjected) {
        injectInterceptor();
      }

      if (wasForwarding !== shouldForwardNetworkData) {
        console.log(`%c[Synergy AI] Network monitoring ${shouldForwardNetworkData ? 'enabled' : 'disabled'}`,
          `background: ${shouldForwardNetworkData ? '#4CAF50' : '#FF9800'}; color: white; padding: 2px 5px; border-radius: 3px;`);
      }

      sendResponse({ success: true });
      return false;
    }

    // Handle console monitoring level changes
    if (message.type === MessageType.CONSOLE_MONITORING_LEVEL_CHANGED) {
      const level = message.level;
      const wasForwarding = shouldForwardConsoleData;
      shouldForwardConsoleData = level === 'extension' || level === 'full';

      // Inject console interceptor if enabled and not yet injected
      if (shouldForwardConsoleData && !consoleInterceptorInjected) {
        injectConsoleInterceptor();
      }

      if (wasForwarding !== shouldForwardConsoleData) {
        console.log(`%c[Synergy AI] Console monitoring ${shouldForwardConsoleData ? 'enabled' : 'disabled'}`,
          `background: ${shouldForwardConsoleData ? '#2196F3' : '#FF9800'}; color: white; padding: 2px 5px; border-radius: 3px;`);
      }

      sendResponse({ success: true });
      return false;
    }

    // Handle messaging monitoring changes
    if (message.type === MessageType.MESSAGING_MONITORING_CHANGED) {
      const enabled = message.enabled;
      const wasForwarding = shouldForwardMessagingData;
      shouldForwardMessagingData = enabled === true;

      // Inject messaging interceptor if enabled and not yet injected
      if (shouldForwardMessagingData && !messagingInterceptorInjected) {
        injectMessagingInterceptor();
      }

      // Enable extension messaging interception
      if (shouldForwardMessagingData && !extensionMessagingIntercepted) {
        interceptExtensionMessaging();
      }

      if (wasForwarding !== shouldForwardMessagingData) {
        console.log(`%c[Synergy AI] Messaging monitoring ${shouldForwardMessagingData ? 'enabled' : 'disabled'}`,
          `background: ${shouldForwardMessagingData ? '#9C27B0' : '#FF9800'}; color: white; padding: 2px 5px; border-radius: 3px;`);
      }

      sendResponse({ success: true });
      return false;
    }

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
  // Only initialize full content script UI in top frame
  // Iframes still get console/network interception but not the React overlay
  if (window !== window.top) {
    console.log('%c[Synergy AI] Iframe detected - skipping UI initialization', 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 3px;');
    return;
  }

  // Check if already initialized
  if (document.getElementById('ai-mastermind-root')) {
    console.log('%c[Synergy AI] Content script already initialized', 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;');
    return;
  }

  console.log('%c[Synergy AI] Content script initializing...', 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;');

  // Initialize process registry for tracking long-running agent processes
  initializeProcessRegistry();

  // Note: Network interceptor is injected on-demand when monitoring is enabled
  // via MONITORING_LEVEL_CHANGED message or initializeMonitoringState()

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
