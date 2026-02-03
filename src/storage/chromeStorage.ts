import { MasterPlan, UserConfig, ChatMessage } from '@/state/appStore';

/**
 * Chrome storage API wrapper for extension data
 *
 * SECURITY: User config (containing API keys) is stored in chrome.storage.local
 * to prevent sensitive credentials from syncing across devices.
 *
 * Storage strategy:
 * - chrome.storage.local: User config (API keys), plans, messages, active plan
 * - chrome.storage.sync: Currently unused (reserved for non-sensitive preferences)
 */

const STORAGE_KEYS = {
  PLANS: 'ai_mastermind_plans',
  USER_CONFIG: 'ai_mastermind_user_config',
  ACTIVE_PLAN: 'ai_mastermind_active_plan',
  CHAT_MESSAGES: 'ai_mastermind_chat_messages',
} as const;

export const chromeStorageService = {
  // Plans
  savePlans: async (plans: MasterPlan[]): Promise<void> => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.PLANS]: plans });
    } catch (error) {
      console.error('Error saving plans to chrome.storage:', error);
    }
  },

  loadPlans: async (): Promise<MasterPlan[]> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.PLANS);
      return result[STORAGE_KEYS.PLANS] || [];
    } catch (error) {
      console.error('Error loading plans from chrome.storage:', error);
      return [];
    }
  },

  // User config - SECURITY: Store locally only (contains API keys)
  saveUserConfig: async (config: UserConfig): Promise<void> => {
    try {
      // Store in local storage for security (API keys should not sync)
      await chrome.storage.local.set({ [STORAGE_KEYS.USER_CONFIG]: config });
    } catch (error) {
      console.error('Error saving user config to chrome.storage:', error);
    }
  },

  loadUserConfig: async (): Promise<UserConfig | null> => {
    try {
      // Load from local storage (API keys are stored locally for security)
      const result = await chrome.storage.local.get(STORAGE_KEYS.USER_CONFIG);
      return result[STORAGE_KEYS.USER_CONFIG] || null;
    } catch (error) {
      console.error('Error loading user config from chrome.storage:', error);
      return null;
    }
  },

  // Active plan
  saveActivePlan: async (planId: string): Promise<void> => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_PLAN]: planId });
    } catch (error) {
      console.error('Error saving active plan to chrome.storage:', error);
    }
  },

  loadActivePlan: async (): Promise<string | null> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_PLAN);
      return result[STORAGE_KEYS.ACTIVE_PLAN] || null;
    } catch (error) {
      console.error('Error loading active plan from chrome.storage:', error);
      return null;
    }
  },

  // Chat messages
  saveChatMessages: async (messages: ChatMessage[]): Promise<void> => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_MESSAGES]: messages });
    } catch (error) {
      console.error('Error saving chat messages to chrome.storage:', error);
    }
  },

  loadChatMessages: async (): Promise<ChatMessage[]> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CHAT_MESSAGES);
      return result[STORAGE_KEYS.CHAT_MESSAGES] || [
        {
          id: 'welcome',
          role: 'assistant' as const,
          content: 'Hello! Ask me anything about the current page you\'re viewing.',
          timestamp: Date.now(),
        },
      ];
    } catch (error) {
      console.error('Error loading chat messages from chrome.storage:', error);
      return [
        {
          id: 'welcome',
          role: 'assistant' as const,
          content: 'Hello! Ask me anything about the current page you\'re viewing.',
          timestamp: Date.now(),
        },
      ];
    }
  },

  // Clear all data
  clearAll: async (): Promise<void> => {
    try {
      await chrome.storage.local.clear();
      await chrome.storage.sync.clear();
    } catch (error) {
      console.error('Error clearing chrome.storage:', error);
    }
  },
};
