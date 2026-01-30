import { Message, MessageType, MessageResponse } from '@/utils/messaging';
import { apiService } from '@/utils/api';
import { chromeStorageService } from '@/storage/chromeStorage';

console.log('AI Mastermind background script loaded');

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('AI Mastermind installed');
    // Initialize default settings
    chromeStorageService.saveUserConfig({
      useOwnKey: false,
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
  sender: chrome.runtime.MessageSender
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
    return {
      success: true,
      data: { plans, userConfig, activePlanId },
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
