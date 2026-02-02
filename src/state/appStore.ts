import { create } from 'zustand';
import { MonitoringLevel } from '@/utils/networkMonitor';

export interface SubExtension {
  id: string;
  name: string;
  prompt: string;
  createdAt: number;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface ClientCapability {
  name: string;
  description: string;
  method: string;
  endpoint: string;
  parameters?: Record<string, any>;
  inputSchema?: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: any;
    }>;
    required?: string[];
  };
}

export interface APIClient {
  id: string;
  name: string;
  description: string;
  provider: string; // e.g., "github", "slack", "custom"
  iconUrl?: string;
  credentials: Record<string, string>; // API keys, tokens, etc.
  capabilities: ClientCapability[];
  isActive: boolean;
  isPurchased: boolean; // true if from store, false if custom
  createdAt: number;
  updatedAt: number;
}

export interface MasterPlan {
  id: string;
  name: string;
  description: string;
  subExtensions: SubExtension[];
  createdAt: number;
  updatedAt: number;
}

export interface SavedConfiguration {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  credentials: Record<string, string>;
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface UserConfig {
  // Legacy fields (for backward compatibility)
  apiKey?: string;
  aiProvider?: 'openai' | 'claude';
  aiModel?: string;

  // New flexible provider system
  useOwnKey: boolean;
  providerId?: string; // ID from providers.ts
  providerCredentials?: Record<string, string>; // Flexible credentials storage

  // Saved configurations
  savedConfigurations: SavedConfiguration[];
  activeConfigurationId?: string;

  // Network monitoring
  networkMonitoringLevel?: MonitoringLevel;
  extractJavaScript?: boolean; // For full-monitoring mode
  extractCSS?: boolean; // For full-monitoring mode

  // Token management
  tokenBalance: number;
  dailyTokenUsage: number;
  lastResetDate: string;
  isPremium: boolean;
}

interface AppState {
  // Master plans
  plans: MasterPlan[];
  activePlanId: string | null;

  // API Clients
  clients: APIClient[];

  // User configuration
  userConfig: UserConfig;

  // Chat messages
  chatMessages: ChatMessage[];

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

  // Client actions
  addClient: (client: APIClient) => void;
  updateClient: (id: string, updates: Partial<APIClient>) => void;
  deleteClient: (id: string) => void;
  toggleClientActive: (id: string) => void;

  updateUserConfig: (config: Partial<UserConfig>) => void;
  consumeTokens: (amount: number) => void;
  resetDailyUsage: () => void;

  // Configuration management
  addConfiguration: (config: SavedConfiguration) => void;
  updateConfiguration: (id: string, updates: Partial<SavedConfiguration>) => void;
  deleteConfiguration: (id: string) => void;
  activateConfiguration: (id: string) => void;

  // Chat management
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;

  setPopupOpen: (open: boolean) => void;
  addActiveWidget: (widget: SubExtension) => void;
  removeActiveWidget: (widgetId: string) => void;
  updateWidgetPosition: (widgetId: string, position: { x: number; y: number }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  plans: [],
  activePlanId: null,
  clients: [],

  userConfig: {
    useOwnKey: false,
    aiProvider: 'claude',
    savedConfigurations: [
      {
        id: 'free-model',
        name: 'Free Model',
        providerId: 'our-models',
        providerName: 'Our Models',
        credentials: {},
        model: 'anthropic/claude-sonnet-4-5',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    activeConfigurationId: 'free-model',
    networkMonitoringLevel: 'filtering-only',
    extractJavaScript: true, // Default enabled for full-monitoring
    extractCSS: true, // Default enabled for full-monitoring
    tokenBalance: 1000, // Free starter tokens
    dailyTokenUsage: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    isPremium: false,
  },

  chatMessages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! Ask me anything about the current page you\'re viewing.',
      timestamp: Date.now(),
    },
  ],

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

  addConfiguration: (config) => set((state) => ({
    userConfig: {
      ...state.userConfig,
      savedConfigurations: [...state.userConfig.savedConfigurations, config],
    },
  })),

  updateConfiguration: (id, updates) => set((state) => ({
    userConfig: {
      ...state.userConfig,
      savedConfigurations: state.userConfig.savedConfigurations.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    },
  })),

  deleteConfiguration: (id) => set((state) => {
    // Prevent deletion of the free model configuration
    if (id === 'free-model') {
      console.warn('Cannot delete the Free Model configuration');
      return state;
    }

    return {
      userConfig: {
        ...state.userConfig,
        savedConfigurations: state.userConfig.savedConfigurations.filter((c) => c.id !== id),
        activeConfigurationId: state.userConfig.activeConfigurationId === id ? undefined : state.userConfig.activeConfigurationId,
      },
    };
  }),

  activateConfiguration: (id) => set((state) => {
    const config = state.userConfig.savedConfigurations.find((c) => c.id === id);
    if (!config) return state;

    return {
      userConfig: {
        ...state.userConfig,
        activeConfigurationId: id,
        providerId: config.providerId,
        providerCredentials: config.credentials,
        aiModel: config.model,
        useOwnKey: true,
      },
    };
  }),

  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message],
  })),

  clearChatMessages: () => set({
    chatMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! Ask me anything about the current page you\'re viewing.',
        timestamp: Date.now(),
      },
    ],
  }),

  addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),

  updateClient: (id, updates) => set((state) => ({
    clients: state.clients.map((c) => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c),
  })),

  deleteClient: (id) => set((state) => ({
    clients: state.clients.filter((c) => c.id !== id),
  })),

  toggleClientActive: (id) => set((state) => ({
    clients: state.clients.map((c) => c.id === id ? { ...c, isActive: !c.isActive, updatedAt: Date.now() } : c),
  })),
}));
