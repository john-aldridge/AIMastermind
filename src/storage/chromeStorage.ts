import { MasterPlan, UserConfig } from '@/state/appStore';

/**
 * Chrome storage API wrapper for extension data
 * Uses chrome.storage.sync for cross-device sync (100KB limit)
 * Falls back to chrome.storage.local for larger data
 */

const STORAGE_KEYS = {
  PLANS: 'ai_mastermind_plans',
  USER_CONFIG: 'ai_mastermind_user_config',
  ACTIVE_PLAN: 'ai_mastermind_active_plan',
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

  // User config
  saveUserConfig: async (config: UserConfig): Promise<void> => {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.USER_CONFIG]: config });
    } catch (error) {
      console.error('Error saving user config to chrome.storage:', error);
    }
  },

  loadUserConfig: async (): Promise<UserConfig | null> => {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.USER_CONFIG);
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
