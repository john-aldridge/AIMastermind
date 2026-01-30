import { MasterPlan, UserConfig } from '@/state/appStore';

const STORAGE_KEYS = {
  PLANS: 'ai_mastermind_plans',
  USER_CONFIG: 'ai_mastermind_user_config',
  ACTIVE_PLAN: 'ai_mastermind_active_plan',
} as const;

export const localStorageService = {
  // Plans
  savePlans: (plans: MasterPlan[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
    } catch (error) {
      console.error('Error saving plans to localStorage:', error);
    }
  },

  loadPlans: (): MasterPlan[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PLANS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading plans from localStorage:', error);
      return [];
    }
  },

  // User config
  saveUserConfig: (config: UserConfig): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving user config to localStorage:', error);
    }
  },

  loadUserConfig: (): UserConfig | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_CONFIG);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading user config from localStorage:', error);
      return null;
    }
  },

  // Active plan
  saveActivePlan: (planId: string): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PLAN, planId);
    } catch (error) {
      console.error('Error saving active plan to localStorage:', error);
    }
  },

  loadActivePlan: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_PLAN);
    } catch (error) {
      console.error('Error loading active plan from localStorage:', error);
      return null;
    }
  },

  // Clear all data
  clearAll: (): void => {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};
