import { create } from 'zustand';
import { MonitoringLevel } from '@/utils/networkMonitor';
import type { ChatSession, ChatMessage, ChatSessionSummary } from '@/types/chat';

// Re-export for backward compatibility
export type { ChatMessage } from '@/types/chat';

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

// ChatMessage is now imported from @/types/chat
// Keeping this comment for clarity on the type's location

/**
 * Custom context rule for tool detection
 */
export interface CustomContextRule {
  id: string;
  clientId: string;
  patterns: string[];
  domainHints: string[];
  createdAt: number;
}

/**
 * Tool session preferences (persisted)
 */
export interface ToolSessionPreferences {
  pinnedTools: string[];  // Client IDs that user has explicitly pinned
  customRules: CustomContextRule[];  // User-defined context rules
}

/**
 * Debug context for error analysis
 */
export interface DebugContext {
  error: string;
  agentId?: string;
  toolName?: string;
  timestamp: number;
  consoleLogs?: string[];
  stackTrace?: string;
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

  // Tool session preferences
  toolSessionPreferences?: ToolSessionPreferences;

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

  // Chat sessions (replaces flat chatMessages)
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  sidebarCollapsed: boolean;

  // Legacy: kept for migration support
  chatMessages: ChatMessage[];

  // UI state
  isPopupOpen: boolean;
  activeWidgets: SubExtension[];

  // Debug state
  debugContext: DebugContext | null;
  pendingDebugNavigation: boolean;

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

  // Chat session management
  createNewSession: (tabUrl?: string, editorContext?: { agentId: string; agentName: string }) => ChatSession;
  switchSession: (id: string) => void;
  addMessageToActiveSession: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage | null;
  deleteSession: (id: string) => void;
  setSessionTitle: (id: string, title: string) => void;
  updateSessionEditorContext: (id: string, editorContext: { agentId: string; agentName: string }) => void;
  getActiveSession: () => ChatSession | null;
  getSessionSummaries: () => ChatSessionSummary[];
  searchSessions: (query: string) => ChatSessionSummary[];
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatSessions: (sessions: ChatSession[]) => void;
  setActiveSessionId: (id: string | null) => void;

  // Legacy chat management (for backward compatibility)
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;

  // Tool session preferences
  pinTool: (clientId: string) => void;
  unpinTool: (clientId: string) => void;
  addCustomContextRule: (rule: CustomContextRule) => void;
  removeCustomContextRule: (ruleId: string) => void;
  getToolSessionPreferences: () => ToolSessionPreferences;

  setPopupOpen: (open: boolean) => void;
  addActiveWidget: (widget: SubExtension) => void;
  removeActiveWidget: (widgetId: string) => void;
  updateWidgetPosition: (widgetId: string, position: { x: number; y: number }) => void;

  // Debug actions
  setDebugContext: (context: DebugContext | null) => void;
  requestDebugNavigation: (context: DebugContext) => void;
  clearDebugNavigation: () => void;
}

// Helper to create welcome message
const createWelcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  content: "Hello! Ask me anything about the current page you're viewing.",
  timestamp: Date.now(),
});

// Helper to generate title from first message
const generateSessionTitle = (content: string): string => {
  const cleaned = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 50) return cleaned;
  const truncated = cleaned.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 30 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
};

export const useAppStore = create<AppState>((set, get) => ({
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

  // New session-based chat state
  chatSessions: [],
  activeSessionId: null,
  sidebarCollapsed: true,

  // Legacy chat messages (kept for migration)
  chatMessages: [createWelcomeMessage()],

  isPopupOpen: false,
  activeWidgets: [],
  debugContext: null,
  pendingDebugNavigation: false,

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

  // Session management actions
  createNewSession: (tabUrl?: string, editorContext?: { agentId: string; agentName: string }) => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tabUrl,
      messages: [createWelcomeMessage()],
      editorContext,
    };

    set((state) => ({
      chatSessions: [newSession, ...state.chatSessions],
      activeSessionId: newSession.id,
    }));

    return newSession;
  },

  switchSession: (id: string) => {
    const state = get();
    const session = state.chatSessions.find((s) => s.id === id);
    if (session) {
      set({ activeSessionId: id });
    }
  },

  addMessageToActiveSession: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const state = get();
    const sessionIndex = state.chatSessions.findIndex(
      (s) => s.id === state.activeSessionId
    );

    if (sessionIndex === -1) return null;

    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const session = state.chatSessions[sessionIndex];
    const updatedSession = {
      ...session,
      messages: [...session.messages, newMessage],
      updatedAt: Date.now(),
      // Auto-generate title from first user message
      title:
        session.title === 'New Chat' && message.role === 'user'
          ? generateSessionTitle(message.content)
          : session.title,
    };

    // Move updated session to top
    const updatedSessions = [...state.chatSessions];
    updatedSessions.splice(sessionIndex, 1);
    updatedSessions.unshift(updatedSession);

    set({ chatSessions: updatedSessions });

    return newMessage;
  },

  deleteSession: (id: string) => {
    set((state) => {
      const filteredSessions = state.chatSessions.filter((s) => s.id !== id);
      const newActiveId =
        state.activeSessionId === id
          ? filteredSessions.length > 0
            ? filteredSessions[0].id
            : null
          : state.activeSessionId;

      return {
        chatSessions: filteredSessions,
        activeSessionId: newActiveId,
      };
    });
  },

  setSessionTitle: (id: string, title: string) => {
    set((state) => ({
      chatSessions: state.chatSessions.map((s) =>
        s.id === id ? { ...s, title, updatedAt: Date.now() } : s
      ),
    }));
  },

  updateSessionEditorContext: (id: string, editorContext: { agentId: string; agentName: string }) => {
    set((state) => ({
      chatSessions: state.chatSessions.map((s) =>
        s.id === id ? { ...s, editorContext, updatedAt: Date.now() } : s
      ),
    }));
  },

  getActiveSession: () => {
    const state = get();
    return state.chatSessions.find((s) => s.id === state.activeSessionId) || null;
  },

  getSessionSummaries: (): ChatSessionSummary[] => {
    const state = get();
    return state.chatSessions.map((session) => {
      const firstUserMessage = session.messages.find((m) => m.role === 'user');
      return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
        preview: firstUserMessage?.content.substring(0, 100),
        editorContext: session.editorContext,
      };
    });
  },

  searchSessions: (query: string): ChatSessionSummary[] => {
    const state = get();
    const lowerQuery = query.toLowerCase();

    return state.chatSessions
      .filter((session) => {
        if (session.title.toLowerCase().includes(lowerQuery)) return true;
        return session.messages.some((m) =>
          m.content.toLowerCase().includes(lowerQuery)
        );
      })
      .map((session) => {
        const firstUserMessage = session.messages.find((m) => m.role === 'user');
        return {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          messageCount: session.messages.length,
          preview: firstUserMessage?.content.substring(0, 100),
          editorContext: session.editorContext,
        };
      });
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  setChatSessions: (sessions: ChatSession[]) => {
    set({ chatSessions: sessions });
  },

  setActiveSessionId: (id: string | null) => {
    set({ activeSessionId: id });
  },

  // Legacy chat actions (for backward compatibility during migration)
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message],
  })),

  clearChatMessages: () => set({
    chatMessages: [createWelcomeMessage()],
  }),

  pinTool: (clientId) => set((state) => {
    const currentPrefs = state.userConfig.toolSessionPreferences || {
      pinnedTools: [],
      customRules: [],
    };

    if (currentPrefs.pinnedTools.includes(clientId)) {
      return state; // Already pinned
    }

    return {
      userConfig: {
        ...state.userConfig,
        toolSessionPreferences: {
          ...currentPrefs,
          pinnedTools: [...currentPrefs.pinnedTools, clientId],
        },
      },
    };
  }),

  unpinTool: (clientId) => set((state) => {
    const currentPrefs = state.userConfig.toolSessionPreferences || {
      pinnedTools: [],
      customRules: [],
    };

    return {
      userConfig: {
        ...state.userConfig,
        toolSessionPreferences: {
          ...currentPrefs,
          pinnedTools: currentPrefs.pinnedTools.filter(id => id !== clientId),
        },
      },
    };
  }),

  addCustomContextRule: (rule) => set((state) => {
    const currentPrefs = state.userConfig.toolSessionPreferences || {
      pinnedTools: [],
      customRules: [],
    };

    return {
      userConfig: {
        ...state.userConfig,
        toolSessionPreferences: {
          ...currentPrefs,
          customRules: [...currentPrefs.customRules, rule],
        },
      },
    };
  }),

  removeCustomContextRule: (ruleId) => set((state) => {
    const currentPrefs = state.userConfig.toolSessionPreferences || {
      pinnedTools: [],
      customRules: [],
    };

    return {
      userConfig: {
        ...state.userConfig,
        toolSessionPreferences: {
          ...currentPrefs,
          customRules: currentPrefs.customRules.filter(r => r.id !== ruleId),
        },
      },
    };
  }),

  getToolSessionPreferences: (): ToolSessionPreferences => {
    const state = get();
    return state.userConfig.toolSessionPreferences || {
      pinnedTools: [],
      customRules: [],
    };
  },

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

  setDebugContext: (context) => set({ debugContext: context }),

  requestDebugNavigation: (context) => set({
    debugContext: context,
    pendingDebugNavigation: true,
  }),

  clearDebugNavigation: () => set({
    pendingDebugNavigation: false,
  }),
}));
