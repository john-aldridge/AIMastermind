import { MasterPlan, UserConfig } from '@/state/appStore';
import type { ChatStorageState } from '@/types/chat';

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
  CHAT_MESSAGES: 'ai_mastermind_chat_messages', // Legacy, kept for migration
  CHAT_SESSIONS: 'ai_mastermind_chat_sessions',
  SIDEBAR_COLLAPSED: 'ai_mastermind_sidebar_collapsed',
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

  // Legacy chat messages (kept for migration support)
  saveChatMessages: async (messages: any[]): Promise<void> => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_MESSAGES]: messages });
    } catch (error) {
      console.error('Error saving chat messages to chrome.storage:', error);
    }
  },

  // Legacy: load old messages for migration
  loadChatMessages: async (): Promise<any[]> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CHAT_MESSAGES);
      return result[STORAGE_KEYS.CHAT_MESSAGES] || [];
    } catch (error) {
      console.error('Error loading chat messages from chrome.storage:', error);
      return [];
    }
  },

  // Clear legacy chat messages after migration
  clearLegacyChatMessages: async (): Promise<void> => {
    try {
      await chrome.storage.local.remove(STORAGE_KEYS.CHAT_MESSAGES);
    } catch (error) {
      console.error('Error clearing legacy chat messages:', error);
    }
  },

  // Chat sessions - new session-based storage
  saveChatSessions: async (state: ChatStorageState): Promise<void> => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_SESSIONS]: state });
    } catch (error) {
      console.error('Error saving chat sessions to chrome.storage:', error);
    }
  },

  loadChatSessions: async (): Promise<ChatStorageState> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CHAT_SESSIONS);
      return result[STORAGE_KEYS.CHAT_SESSIONS] || {
        sessions: [],
        activeSessionId: null,
      };
    } catch (error) {
      console.error('Error loading chat sessions from chrome.storage:', error);
      return {
        sessions: [],
        activeSessionId: null,
      };
    }
  },

  // Sidebar collapsed state
  saveSidebarCollapsed: async (collapsed: boolean): Promise<void> => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.SIDEBAR_COLLAPSED]: collapsed });
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  },

  loadSidebarCollapsed: async (): Promise<boolean> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SIDEBAR_COLLAPSED);
      return result[STORAGE_KEYS.SIDEBAR_COLLAPSED] ?? true; // Default collapsed
    } catch (error) {
      console.error('Error loading sidebar state:', error);
      return true;
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
