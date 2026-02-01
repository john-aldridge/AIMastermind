import { Message, MessageType, MessageResponse } from '@/utils/messaging';
import { apiService } from '@/utils/api';
import { chromeStorageService } from '@/storage/chromeStorage';

console.log('AI Mastermind background script loaded');

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
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('download-')) {
    // Open side panel to analyze the download
    chrome.windows.getCurrent((window) => {
      if (window.id && chrome.sidePanel) {
        chrome.sidePanel.open({ windowId: window.id });
      }
    });

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

// Handle extension icon click - only fires when popup is disabled (side panel mode)
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, opening side panel...');
  try {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      if (tab.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        console.log('✅ Side panel opened successfully');
      } else {
        console.error('❌ No windowId available');
      }
    } else {
      console.error('❌ chrome.sidePanel API not available');
    }
  } catch (error) {
    console.error('❌ Error opening side panel:', error);
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AI Mastermind installed');

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

    handleMessage(message)
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
  message: Message
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

