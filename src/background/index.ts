import { Message, MessageType, MessageResponse } from '@/utils/messaging';
import { apiService } from '@/utils/api';
import { chromeStorageService } from '@/storage/chromeStorage';
import { networkMonitor } from '@/utils/networkMonitor';
import { AutoLoadRuleStorageService } from '@/storage/autoLoadRuleStorage';
import type { AutoLoadRule } from '@/types/autoLoadRule';
import { initializeConfigArchitecture } from '@/services/configInit';

console.log('Synergy AI background script loaded');

// Initialize API service with stored config
async function initializeAPIService() {
  const config = await chromeStorageService.loadUserConfig();
  if (config?.activeConfigurationId && config.savedConfigurations) {
    const activeConfig = config.savedConfigurations.find(
      c => c.id === config.activeConfigurationId
    );
    if (activeConfig) {
      const apiKey = activeConfig.credentials.apiKey || activeConfig.credentials.api_key;
      if (apiKey) {
        apiService.setApiKey(apiKey);
      }
      // Map provider ID to API service provider type
      const providerMap: Record<string, 'openai' | 'claude'> = {
        'anthropic': 'claude',
        'openai': 'openai',
        'our-models': 'claude', // Default for our models
      };
      const mappedProvider = providerMap[activeConfig.providerId] || 'claude';
      apiService.setProvider(mappedProvider);
      apiService.setModel(activeConfig.model);
    }
  }
}

// Initialize on startup
initializeAPIService();

// Initialize config-based architecture
initializeConfigArchitecture();

// Configure side panel for per-tab behavior
if (chrome.sidePanel) {
  // Disable panel globally by default - we'll enable per-tab when user clicks
  chrome.sidePanel.setOptions({ enabled: false })
    .then(() => console.log('Side panel disabled globally (will enable per-tab)'))
    .catch((error) => console.error('Error disabling side panel globally:', error));

  // Still allow icon click to trigger our handler
  if (chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
      .catch((error) => console.error('Error setting side panel behavior:', error));
  }
}

// Track active agents per tab
const activeAgentsPerTab = new Map<number, Set<string>>();

// Track connected side panels for disconnect detection
const connectedPanels = new Map<number, chrome.runtime.Port>();

// Handle side panel connection/disconnection
chrome.runtime.onConnect.addListener((port) => {
  if (port.name.startsWith('sidepanel-')) {
    const tabId = parseInt(port.name.split('-')[1]);
    if (!isNaN(tabId)) {
      connectedPanels.set(tabId, port);
      console.log(`[Background] Side panel connected for tab ${tabId}`);

      port.onDisconnect.addListener(() => {
        connectedPanels.delete(tabId);
        console.log(`[Background] Side panel disconnected for tab ${tabId}, turning off monitoring`);

        // Turn off monitoring for this tab when panel closes
        networkMonitor.setLevel('filtering-only', tabId);

        // Disable the side panel for this tab so it doesn't show on tab switch
        chrome.sidePanel.setOptions({ tabId, enabled: false })
          .catch(() => {}); // Tab may already be closed
      });
    }
  }
});

// Track page load history per tab (to detect reloads)
interface TabLoadHistory {
  url: string;
  loadCount: number;
  lastLoadTime: number;
  executedRules: Set<string>; // Rule IDs that have been executed
}
const tabLoadHistory = new Map<number, TabLoadHistory>();

/**
 * Check and activate auto-load rules for a given URL
 */
async function checkAndActivateAutoLoadRules(tabId: number, url: string) {
  try {
    // Get matching rules for this URL
    const matchingRules = await AutoLoadRuleStorageService.getMatchingRules(url);

    if (matchingRules.length === 0) {
      // Clear any previously active agents for this tab
      activeAgentsPerTab.delete(tabId);
      tabLoadHistory.delete(tabId);
      return;
    }

    // Track load history for reload detection
    let history = tabLoadHistory.get(tabId);
    const isReload = history && history.url === url;

    if (!history || history.url !== url) {
      // New URL or first load
      history = {
        url,
        loadCount: 1,
        lastLoadTime: Date.now(),
        executedRules: new Set<string>()
      };
      tabLoadHistory.set(tabId, history);
    } else {
      // Same URL - this is a reload
      history.loadCount++;
      history.lastLoadTime = Date.now();
    }

    // Get or create the set of active agents for this tab
    let activeAgents = activeAgentsPerTab.get(tabId);
    if (!activeAgents) {
      activeAgents = new Set<string>();
      activeAgentsPerTab.set(tabId, activeAgents);
    }

    // Track newly activated agents
    const newlyActivated: AutoLoadRule[] = [];

    // Activate each matching rule's agent
    for (const rule of matchingRules) {
      const isFirstLoad = !activeAgents.has(rule.agentId);
      const shouldExecute =
        (isFirstLoad && rule.executeOnLoad && rule.capabilityName) ||
        (isReload && rule.watchForReloads && (rule.reloadCapabilityName || rule.capabilityName));

      if (isFirstLoad) {
        activeAgents.add(rule.agentId);
        newlyActivated.push(rule);
        console.log(`[Auto-Load] Activated agent "${rule.agentName}" for tab ${tabId} (matched: ${rule.urlPattern})`);
      }

      // Execute capability if configured
      if (shouldExecute) {
        try {
          const capabilityToExecute = isReload
            ? (rule.reloadCapabilityName || rule.capabilityName)
            : rule.capabilityName;

          console.log(
            `[Auto-Load] ${isReload ? 'Re-executing on reload' : 'Executing'} capability "${capabilityToExecute}" for agent "${rule.agentName}"`
          );

          // Send message to content script or side panel to execute the capability
          await chrome.tabs.sendMessage(tabId, {
            type: 'EXECUTE_AGENT_CAPABILITY',
            payload: {
              agentId: rule.agentId,
              capabilityName: capabilityToExecute,
              parameters: rule.parameters || {},
              isReload: isReload
            }
          }).catch(() => {
            console.log(`[Auto-Load] Could not execute via content script, trying side panel...`);
            // If content script isn't available, try side panel
            chrome.runtime.sendMessage({
              type: 'EXECUTE_AGENT_CAPABILITY',
              payload: {
                agentId: rule.agentId,
                capabilityName: capabilityToExecute,
                parameters: rule.parameters || {},
                tabId: tabId,
                isReload: isReload
              }
            }).catch(sideErr => {
              console.error(`[Auto-Load] Failed to execute capability:`, sideErr);
            });
          });

          // Track that this rule was executed
          history.executedRules.add(rule.id);
        } catch (error) {
          console.error(`[Auto-Load] Error executing capability for agent "${rule.agentName}":`, error);
        }
      }
    }

    // Show notification if new agents were activated
    if (newlyActivated.length > 0) {
      const agentNames = newlyActivated.map(r => r.agentName).join(', ');
      chrome.notifications.create(`auto-load-${tabId}-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Agents Auto-Loaded',
        message: `Activated: ${agentNames}`,
        priority: 0,
        requireInteraction: false
      });

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        chrome.notifications.clear(`auto-load-${tabId}-${Date.now()}`);
      }, 3000);

      // Send message to side panel to update UI
      try {
        await chrome.runtime.sendMessage({
          type: 'AUTO_LOAD_ACTIVATED',
          payload: {
            tabId,
            url,
            rules: newlyActivated
          }
        });
      } catch (error) {
        // Side panel might not be open, that's okay
        console.log('[Auto-Load] Side panel not available for notification');
      }
    }
  } catch (error) {
    console.error('[Auto-Load] Error checking rules:', error);
  }
}

/**
 * Monitor tab updates for auto-load rules
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only check when the URL changes and is complete
  if (changeInfo.status === 'complete' && tab.url) {
    // Ignore chrome:// and other internal URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      return;
    }

    console.log(`[Auto-Load] Tab ${tabId} updated to: ${tab.url}`);
    checkAndActivateAutoLoadRules(tabId, tab.url);
  }
});

/**
 * Clean up when tabs are closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  activeAgentsPerTab.delete(tabId);
  tabLoadHistory.delete(tabId);
  networkMonitor.removeTabLevel(tabId);
  connectedPanels.delete(tabId);
  console.log(`[Auto-Load] Cleaned up agents, history, monitoring level, and panel state for closed tab ${tabId}`);

  // Notify sidepanel of tab removal
  notifyTabChange();
});

/**
 * Notify sidepanel of tab changes for auto-updating tab list
 */
const notifyTabChange = () => {
  chrome.runtime.sendMessage({ type: MessageType.TAB_CHANGED }).catch(() => {
    // Sidepanel might not be open, ignore error
  });
};

// Listen for tab created events
chrome.tabs.onCreated.addListener(() => {
  notifyTabChange();
});

// Listen for tab activated (switched) events
chrome.tabs.onActivated.addListener(() => {
  notifyTabChange();
});

// Listen for tab updated events (URL, title, favicon changes)
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  // Only notify on meaningful changes (title, URL, favicon)
  if (changeInfo.title || changeInfo.url || changeInfo.favIconUrl) {
    notifyTabChange();
  }
});

/**
 * Get active agents for a tab
 */
async function getActiveAgentsForTab(tabId: number): Promise<string[]> {
  const activeAgents = activeAgentsPerTab.get(tabId);
  return activeAgents ? Array.from(activeAgents) : [];
}

// Track recent downloads for analysis
interface DownloadInfo {
  id: number;
  filePath: string;  // Full path to the downloaded file
  url: string;
  fileSize: number;
  mime: string;
  downloadTime: number;
}

const recentDownloads: DownloadInfo[] = [];
const MAX_RECENT_DOWNLOADS = 10;

// Monitor downloads
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log('Download started:', downloadItem.filename);
});

chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state?.current === 'complete') {
    // Get full download info
    chrome.downloads.search({ id: delta.id }, (results) => {
      if (results.length > 0) {
        const download = results[0];

        // Store download info
        const downloadInfo: DownloadInfo = {
          id: download.id,
          filePath: download.filename,  // Chrome's filename is actually the full path
          url: download.url,
          fileSize: download.fileSize,
          mime: download.mime,
          downloadTime: Date.now()
        };

        recentDownloads.unshift(downloadInfo);
        if (recentDownloads.length > MAX_RECENT_DOWNLOADS) {
          recentDownloads.pop();
        }

        // Show notification
        const filename = download.filename.split(/[\\/]/).pop() || download.filename;
        chrome.notifications.create(`download-${download.id}`, {
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'File Downloaded',
          message: `${filename}\nClick to analyze with AI`,
          priority: 1,
          requireInteraction: false
        });
      }
    });
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith('download-')) {
    // Open side panel for the active tab to analyze the download
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id && chrome.sidePanel) {
        await chrome.sidePanel.open({ tabId: activeTab.id });
      }
    } catch (error) {
      console.error('Error opening side panel from notification:', error);
    }

    // Clear the notification
    chrome.notifications.clear(notificationId);
  }
});

// Initialize on startup - ensure action popup is cleared so clicking icon opens side panel
setTimeout(async () => {
  console.log('🟡 [Background] Initializing on startup...');
  console.log('🟡 [Background] Clearing action popup (icon will open side panel)');
  await chrome.action.setPopup({ popup: '' });
}, 500);

// Handle extension icon click - opens side panel for this specific tab only
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked, opening side panel for tab:', tab.id);
  if (chrome.sidePanel && chrome.sidePanel.open && tab.id) {
    // Set options and open synchronously - both must be in user gesture context
    // (using await breaks the user gesture chain and causes open() to fail)
    chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'src/sidepanel/index.html',
      enabled: true
    });
    chrome.sidePanel.open({ tabId: tab.id })
      .then(() => console.log('✅ Side panel opened for tab', tab.id))
      .catch((error) => console.error('❌ Error opening side panel:', error));
  } else {
    console.error('❌ chrome.sidePanel API not available or no tabId');
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Synergy AI installed');

    // Create default "Free Model" configuration
    const freeModelConfig = {
      id: 'free-model',
      name: 'Free Model',
      providerId: 'our-models',
      providerName: 'Our Models',
      credentials: {},
      model: 'anthropic/claude-sonnet-4-5',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Initialize default settings
    chromeStorageService.saveUserConfig({
      useOwnKey: false,
      aiProvider: 'claude',
      savedConfigurations: [freeModelConfig],
      activeConfigurationId: 'free-model',
      tokenBalance: 1000,
      dailyTokenUsage: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      isPremium: false,
    });
  }
});

// Handle messages
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (response: MessageResponse) => void) => {
    console.log('📨 [Background] Received message:', message.type, 'from:', sender.tab?.id || sender.id || 'extension');

    handleMessage(message, sender)
      .then(sendResponse)
      .catch((error) => {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: String(error) });
      });

    // Return true to indicate async response
    return true;
  }
);

async function handleMessage(
  message: Message,
  sender?: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  switch (message.type) {
    case MessageType.GENERATE_CONTENT:
      return handleGenerateContent(message.payload);

    case MessageType.UPDATE_TOKENS:
      return handleUpdateTokens(message.payload);

    case MessageType.PURCHASE_TOKENS:
      return handlePurchaseTokens(message.payload);

    case MessageType.SYNC_STATE:
      return handleSyncState(message.payload);

    case MessageType.LOAD_STATE:
      return handleLoadState();

    case MessageType.AUTHENTICATE:
      return handleAuthenticate(message.payload);

    case MessageType.GET_RECENT_DOWNLOADS:
      return handleGetRecentDownloads();

    case MessageType.NETWORK_DATA_INTERCEPTED:
      return handleNetworkDataIntercepted(message.payload, sender?.tab?.id);

    case MessageType.GET_NETWORK_SUMMARY:
      return handleGetNetworkSummary(message.payload);

    case MessageType.GET_NETWORK_REQUESTS:
      return handleGetNetworkRequests(message.payload);

    case MessageType.GET_MONITORING_LEVEL:
      // Return level for the specific tab if sender is a content script
      const monitoringTabId = sender?.tab?.id;
      return { success: true, data: networkMonitor.getLevel(monitoringTabId) };

    case MessageType.SET_MONITORING_LEVEL:
      return handleSetMonitoringLevel(message.payload);

    case MessageType.GET_ACTIVE_AGENTS:
      return handleGetActiveAgents(message.payload);

    case MessageType.CHECK_AUTO_LOAD_RULES:
      return handleCheckAutoLoadRules(message.payload);

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

async function handleGenerateContent(payload: any): Promise<MessageResponse> {
  try {
    const { prompt, useOwnKey } = payload;
    const response = await apiService.generateContent({ prompt }, useOwnKey);
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleUpdateTokens(payload: any): Promise<MessageResponse> {
  try {
    const { amount } = payload;
    const config = await chromeStorageService.loadUserConfig();
    if (config) {
      config.tokenBalance = Math.max(0, config.tokenBalance - amount);
      config.dailyTokenUsage += amount;
      await chromeStorageService.saveUserConfig(config);
      return { success: true, data: config };
    }
    return { success: false, error: 'Config not found' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handlePurchaseTokens(payload: any): Promise<MessageResponse> {
  try {
    const result = await apiService.purchaseTokens(payload);
    if (result.success) {
      const config = await chromeStorageService.loadUserConfig();
      if (config) {
        config.tokenBalance += result.newBalance;
        await chromeStorageService.saveUserConfig(config);
      }
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleSyncState(payload: any): Promise<MessageResponse> {
  try {
    await chromeStorageService.savePlans(payload.plans);
    await chromeStorageService.saveUserConfig(payload.userConfig);
    if (payload.activePlanId) {
      await chromeStorageService.saveActivePlan(payload.activePlanId);
    }
    if (payload.chatMessages) {
      await chromeStorageService.saveChatMessages(payload.chatMessages);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleLoadState(): Promise<MessageResponse> {
  try {
    const plans = await chromeStorageService.loadPlans();
    const userConfig = await chromeStorageService.loadUserConfig();
    const activePlanId = await chromeStorageService.loadActivePlan();
    const chatMessages = await chromeStorageService.loadChatMessages();
    return {
      success: true,
      data: { plans, userConfig, activePlanId, chatMessages },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleAuthenticate(payload: any): Promise<MessageResponse> {
  try {
    // TODO: Implement actual authentication
    console.log('Authenticating user:', payload);
    return { success: true, data: { userId: 'user123' } };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleGetRecentDownloads(): Promise<MessageResponse> {
  try {
    return { success: true, data: recentDownloads };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleNetworkDataIntercepted(payload: any, tabId?: number): Promise<MessageResponse> {
  try {
    // Pass intercepted data to network monitor with tab ID
    networkMonitor.handleInterceptedRequest(payload, tabId);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleGetNetworkSummary(payload: any): Promise<MessageResponse> {
  try {
    const { tabIds } = payload || {};
    const summary = networkMonitor.getRequestSummary(tabIds);
    return { success: true, data: summary };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleGetNetworkRequests(payload: any): Promise<MessageResponse> {
  try {
    const { tabIds } = payload || {};
    const requests = networkMonitor.getRequests(tabIds);
    return { success: true, data: requests };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleGetActiveAgents(payload: any): Promise<MessageResponse> {
  try {
    const { tabId } = payload;
    if (!tabId) {
      return { success: false, error: 'Tab ID required' };
    }
    const activeAgents = await getActiveAgentsForTab(tabId);
    return { success: true, data: activeAgents };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleCheckAutoLoadRules(payload: any): Promise<MessageResponse> {
  try {
    const { tabId, url } = payload;
    if (!tabId || !url) {
      return { success: false, error: 'Tab ID and URL required' };
    }
    await checkAndActivateAutoLoadRules(tabId, url);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function handleSetMonitoringLevel(payload: any): Promise<MessageResponse> {
  try {
    const { level, tabId } = payload;
    if (!level) {
      return { success: false, error: 'Level is required' };
    }
    const result = await networkMonitor.setLevel(level, tabId);
    return result;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

