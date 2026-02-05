import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/state/appStore';
import { ChatView } from './components/ChatView';
import { AgentsView } from './components/AgentsView';
import { ClientsView } from './components/ClientsView';
import { SettingsView } from './components/SettingsView';
import { EditorApp } from '../editor/EditorApp';
import { sendToBackground } from '@/utils/messaging';
import { MessageType } from '@/utils/messaging';
import { apiService } from '@/utils/api';
import { networkMonitor } from '@/utils/networkMonitor';
import { registerAllClients } from '@/clients';
import { registerAllAgents } from '@/agents';
import { chromeStorageService } from '@/storage/chromeStorage';

type View = 'chat' | 'agents' | 'clients' | 'settings' | 'editor';
type AgentsViewTab = 'my-agents' | 'purchased' | 'sample-agents';

// Timing helper for performance logging
const logTiming = (label: string, startTime?: number) => {
  const now = performance.now();
  if (startTime !== undefined) {
    console.log(`[SidePanelApp] ⏱️ ${label}: ${(now - startTime).toFixed(1)}ms`);
  } else {
    console.log(`[SidePanelApp] ⏱️ ${label} started at ${now.toFixed(1)}ms`);
  }
  return now;
};

export const SidePanelApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [editorAgentId, setEditorAgentId] = useState<string | null>(null);
  const [editorIsNew, setEditorIsNew] = useState(false);
  const [agentsViewTab, setAgentsViewTab] = useState<AgentsViewTab>('purchased');
  const {
    plans,
    userConfig,
    updateUserConfig,
    chatSessions,
    activeSessionId,
    sidebarCollapsed,
    setChatSessions,
    setActiveSessionId,
    setSidebarCollapsed,
    createNewSession,
    debugContext,
    pendingDebugNavigation,
    clearDebugNavigation,
  } = useAppStore();
  const lastTabIdRef = useRef<number | null>(null);

  // Function to open editor in sidepanel
  const openEditorInSidepanel = (agentId: string | null, isNew: boolean = false) => {
    setEditorAgentId(agentId);
    setEditorIsNew(isNew);
    setCurrentView('editor');
  };

  // Function to close editor and return to agents view
  const closeEditor = () => {
    setEditorAgentId(null);
    setEditorIsNew(false);
    setCurrentView('agents');
  };

  useEffect(() => {
    const initAll = async () => {
      console.log('[SidePanelApp] 🚀 Initialization starting...');
      const totalStart = performance.now();

      // Register all built-in clients and agents
      let stepStart = logTiming('Registering clients');
      registerAllClients();
      logTiming('Registering clients complete', stepStart);

      stepStart = logTiming('Registering agents');
      registerAllAgents();
      logTiming('Registering agents complete', stepStart);

      // Auto-configure BrowserClient (no credentials needed)
      stepStart = logTiming('Auto-configure BrowserClient');
      await autoConfigureBrowserClient();
      logTiming('Auto-configure BrowserClient complete', stepStart);

      // Load state from storage on mount
      stepStart = logTiming('Loading state from storage');
      await loadState();
      logTiming('Loading state complete', stepStart);

      // Initialize session based on current tab
      stepStart = logTiming('Initializing session');
      await initializeSession();
      logTiming('Session initialized', stepStart);

      console.log(`[SidePanelApp] ✅ Total initialization: ${(performance.now() - totalStart).toFixed(1)}ms`);
    };

    initAll();
  }, []);

  // Handle debug navigation request
  useEffect(() => {
    if (pendingDebugNavigation && debugContext?.agentId) {
      openEditorInSidepanel(debugContext.agentId, false);
      clearDebugNavigation();
    }
  }, [pendingDebugNavigation, debugContext]);

  const autoConfigureBrowserClient = async () => {
    // Check if browser client is already configured
    const data = await chrome.storage.local.get('client:browser');
    if (!data['client:browser']) {
      // Auto-configure it since it needs no credentials
      await chrome.storage.local.set({
        'client:browser': {
          clientId: 'browser',
          credentials: {},
          isActive: true,
          configuredAt: Date.now(),
        },
      });
      console.log('[SidePanelApp] Auto-configured BrowserClient');
    }
  };

  /**
   * Initialize session based on current tab.
   * Creates a new session if:
   * 1. No sessions exist
   * 2. Sidepanel was opened on a new tab (different from last active)
   */
  const initializeSession = async () => {
    try {
      // Get current active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTabId = activeTab?.id;

      if (!currentTabId) return;

      // Check if we should create a new session
      // This is determined by comparing with the last tab ID stored in session storage
      const lastTabIdResult = await chrome.storage.session.get('lastActiveTabId');
      const lastTabId = lastTabIdResult.lastActiveTabId;

      lastTabIdRef.current = currentTabId;

      // Store current tab ID for future comparisons
      await chrome.storage.session.set({ lastActiveTabId: currentTabId });

      // Wait for sessions to be loaded
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = useAppStore.getState();

      // Create new session if:
      // 1. No sessions exist, OR
      // 2. Last tab ID is different (user opened sidepanel on a new tab)
      if (state.chatSessions.length === 0 || (lastTabId && lastTabId !== currentTabId)) {
        console.log('[SidePanelApp] Creating new session for tab', currentTabId);
        createNewSession(activeTab?.url);
        // Always collapse sidebar when opening on a new tab
        setSidebarCollapsed(true);
      }
    } catch (error) {
      console.error('[SidePanelApp] Error initializing session:', error);
    }
  };

  const loadState = async () => {
    let stepStart = logTiming('sendToBackground LOAD_STATE');
    const response = await sendToBackground({ type: MessageType.LOAD_STATE });
    logTiming('sendToBackground LOAD_STATE complete', stepStart);

    if (response.success && response.data) {
      // Update store with loaded data
      const { plans, userConfig, activePlanId, chatMessages } = response.data;

      stepStart = logTiming('Updating store with plans/userConfig');
      if (plans) useAppStore.setState({ plans });
      if (userConfig) {
        updateUserConfig(userConfig);
        // Initialize API service from active configuration
        if (userConfig.activeConfigurationId && userConfig.savedConfigurations) {
          const activeConfig = userConfig.savedConfigurations.find(
            (c: any) => c.id === userConfig.activeConfigurationId
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
        // Initialize network monitoring
        const monitoringLevel = userConfig.networkMonitoringLevel || 'filtering-only';
        if (monitoringLevel !== 'filtering-only') {
          networkMonitor.setLevel(monitoringLevel);
        }
      }
      if (activePlanId) useAppStore.setState({ activePlanId });
      logTiming('Store updated', stepStart);

      // Load chat sessions from storage
      stepStart = logTiming('Loading chat sessions');
      const sessionState = await chromeStorageService.loadChatSessions();
      logTiming('Chat sessions loaded', stepStart);

      if (sessionState.sessions.length > 0) {
        setChatSessions(sessionState.sessions);
        setActiveSessionId(sessionState.activeSessionId);
      }

      // Load sidebar collapsed state
      stepStart = logTiming('Loading sidebar state');
      const sidebarState = await chromeStorageService.loadSidebarCollapsed();
      setSidebarCollapsed(sidebarState);
      logTiming('Sidebar state loaded', stepStart);

      // Migrate legacy chat messages if needed (only if no sessions exist)
      if (chatMessages && chatMessages.length > 0 && sessionState.sessions.length === 0) {
        const hasContent = chatMessages.some(
          (m: any) => m.id !== 'welcome' && m.role === 'user'
        );
        if (hasContent) {
          console.log('[SidePanelApp] Migrating legacy chat messages to session format');
          // Create session from legacy messages
          const firstUserMessage = chatMessages.find((m: any) => m.role === 'user');
          const title = firstUserMessage
            ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
            : 'Imported Chat';
          const newSession = {
            id: crypto.randomUUID(),
            title,
            createdAt: chatMessages[0]?.timestamp || Date.now(),
            updatedAt: chatMessages[chatMessages.length - 1]?.timestamp || Date.now(),
            messages: chatMessages,
          };
          setChatSessions([newSession]);
          setActiveSessionId(newSession.id);
          // Clear legacy messages after migration
          await chromeStorageService.clearLegacyChatMessages();
        }
      }
    } else {
      console.warn('[SidePanelApp] ⚠️ LOAD_STATE failed or returned no data:', response);
    }
    // Mark initial load as complete
    console.log('[SidePanelApp] ✅ Initial load complete, rendering UI');
    setIsInitialLoad(false);
  };

  const saveState = async () => {
    const state = useAppStore.getState();
    await sendToBackground({
      type: MessageType.SYNC_STATE,
      payload: {
        plans: state.plans,
        userConfig: state.userConfig,
        activePlanId: state.activePlanId,
        // Don't send legacy chatMessages anymore
      },
    });
  };

  // Save chat sessions separately (more frequent updates)
  const saveChatSessions = async () => {
    const state = useAppStore.getState();
    await chromeStorageService.saveChatSessions({
      sessions: state.chatSessions,
      activeSessionId: state.activeSessionId,
    });
  };

  // Save sidebar collapsed state
  const saveSidebarState = async () => {
    const state = useAppStore.getState();
    await chromeStorageService.saveSidebarCollapsed(state.sidebarCollapsed);
  };

  // Auto-save state changes (but skip on initial render)
  useEffect(() => {
    if (!isInitialLoad) {
      saveState();
    }
  }, [plans, userConfig]);

  // Auto-save chat sessions
  useEffect(() => {
    if (!isInitialLoad) {
      saveChatSessions();
    }
  }, [chatSessions, activeSessionId]);

  // Auto-save sidebar state
  useEffect(() => {
    if (!isInitialLoad) {
      saveSidebarState();
    }
  }, [sidebarCollapsed]);

  // Show loading state while initializing
  if (isInitialLoad) {
    return (
      <div className="h-screen w-full flex flex-col bg-gray-50">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-3 shadow-lg flex-shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-primary-500 text-white text-center">
              Loading...
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600 mb-3"></div>
            <p className="text-gray-500 text-sm">Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-3 shadow-lg flex-shrink-0">
        {/* Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentView('chat')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'chat'
                ? 'bg-white text-primary-700'
                : 'bg-primary-500 hover:bg-primary-400 text-white'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setCurrentView('agents')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'agents'
                ? 'bg-white text-primary-700'
                : 'bg-primary-500 hover:bg-primary-400 text-white'
            }`}
          >
            Agents
          </button>
          <button
            onClick={() => setCurrentView('clients')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'clients'
                ? 'bg-white text-primary-700'
                : 'bg-primary-500 hover:bg-primary-400 text-white'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'settings'
                ? 'bg-white text-primary-700'
                : 'bg-primary-500 hover:bg-primary-400 text-white'
            }`}
          >
            Settings
          </button>
        </div>

      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentView === 'chat' && <ChatView />}
        {currentView === 'agents' && (
          <div className="overflow-auto flex-1">
            <AgentsView
              onOpenEditor={openEditorInSidepanel}
              activeTab={agentsViewTab}
              onTabChange={setAgentsViewTab}
            />
          </div>
        )}
        {currentView === 'clients' && (
          <div className="overflow-auto flex-1">
            <ClientsView />
          </div>
        )}
        {currentView === 'settings' && (
          <div className="overflow-auto flex-1">
            <SettingsView />
          </div>
        )}
        {currentView === 'editor' && (
          <EditorApp
            mode="embedded"
            agentId={editorAgentId}
            isNew={editorIsNew}
            onClose={closeEditor}
          />
        )}
      </div>
    </div>
  );
};
