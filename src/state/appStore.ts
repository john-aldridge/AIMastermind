import { create } from 'zustand';

export interface SubExtension {
  id: string;
  name: string;
  prompt: string;
  createdAt: number;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface MasterPlan {
  id: string;
  name: string;
  description: string;
  subExtensions: SubExtension[];
  createdAt: number;
  updatedAt: number;
}

export interface UserConfig {
  apiKey?: string;
  useOwnKey: boolean;
  tokenBalance: number;
  dailyTokenUsage: number;
  lastResetDate: string;
  isPremium: boolean;
}

interface AppState {
  // Master plans
  plans: MasterPlan[];
  activePlanId: string | null;

  // User configuration
  userConfig: UserConfig;

  // UI state
  isPopupOpen: boolean;
  activeWidgets: SubExtension[];

  // Actions
  addPlan: (plan: MasterPlan) => void;
  updatePlan: (id: string, updates: Partial<MasterPlan>) => void;
  deletePlan: (id: string) => void;
  setActivePlan: (id: string) => void;

  addSubExtension: (planId: string, subExtension: SubExtension) => void;
  updateSubExtension: (planId: string, subExtId: string, updates: Partial<SubExtension>) => void;
  deleteSubExtension: (planId: string, subExtId: string) => void;

  updateUserConfig: (config: Partial<UserConfig>) => void;
  consumeTokens: (amount: number) => void;
  resetDailyUsage: () => void;

  setPopupOpen: (open: boolean) => void;
  addActiveWidget: (widget: SubExtension) => void;
  removeActiveWidget: (widgetId: string) => void;
  updateWidgetPosition: (widgetId: string, position: { x: number; y: number }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  plans: [],
  activePlanId: null,

  userConfig: {
    useOwnKey: false,
    tokenBalance: 1000, // Free starter tokens
    dailyTokenUsage: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    isPremium: false,
  },

  isPopupOpen: false,
  activeWidgets: [],

  addPlan: (plan) => set((state) => ({ plans: [...state.plans, plan] })),

  updatePlan: (id, updates) => set((state) => ({
    plans: state.plans.map((p) => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p),
  })),

  deletePlan: (id) => set((state) => ({
    plans: state.plans.filter((p) => p.id !== id),
    activePlanId: state.activePlanId === id ? null : state.activePlanId,
  })),

  setActivePlan: (id) => set({ activePlanId: id }),

  addSubExtension: (planId, subExtension) => set((state) => ({
    plans: state.plans.map((p) =>
      p.id === planId
        ? { ...p, subExtensions: [...p.subExtensions, subExtension], updatedAt: Date.now() }
        : p
    ),
  })),

  updateSubExtension: (planId, subExtId, updates) => set((state) => ({
    plans: state.plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            subExtensions: p.subExtensions.map((s) =>
              s.id === subExtId ? { ...s, ...updates } : s
            ),
            updatedAt: Date.now(),
          }
        : p
    ),
  })),

  deleteSubExtension: (planId, subExtId) => set((state) => ({
    plans: state.plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            subExtensions: p.subExtensions.filter((s) => s.id !== subExtId),
            updatedAt: Date.now(),
          }
        : p
    ),
  })),

  updateUserConfig: (config) => set((state) => ({
    userConfig: { ...state.userConfig, ...config },
  })),

  consumeTokens: (amount) => set((state) => ({
    userConfig: {
      ...state.userConfig,
      tokenBalance: state.userConfig.tokenBalance - amount,
      dailyTokenUsage: state.userConfig.dailyTokenUsage + amount,
    },
  })),

  resetDailyUsage: () => set((state) => ({
    userConfig: {
      ...state.userConfig,
      dailyTokenUsage: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
    },
  })),

  setPopupOpen: (open) => set({ isPopupOpen: open }),

  addActiveWidget: (widget) => set((state) => ({
    activeWidgets: [...state.activeWidgets, widget],
  })),

  removeActiveWidget: (widgetId) => set((state) => ({
    activeWidgets: state.activeWidgets.filter((w) => w.id !== widgetId),
  })),

  updateWidgetPosition: (widgetId, position) => set((state) => ({
    activeWidgets: state.activeWidgets.map((w) =>
      w.id === widgetId ? { ...w, position } : w
    ),
  })),
}));
