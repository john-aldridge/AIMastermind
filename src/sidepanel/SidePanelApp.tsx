import React, { useEffect, useState } from 'react';
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

type View = 'chat' | 'agents' | 'clients' | 'settings' | 'editor';
type AgentsViewTab = 'my-agents' | 'purchased' | 'sample-agents';

export const SidePanelApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('chat');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [editorAgentId, setEditorAgentId] = useState<string | null>(null);
  const [editorIsNew, setEditorIsNew] = useState(false);
  const [agentsViewTab, setAgentsViewTab] = useState<AgentsViewTab>('purchased');
  const { plans, userConfig, updateUserConfig, chatMessages } = useAppStore();

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
    // Register all built-in clients and agents
    registerAllClients();
    registerAllAgents();

    // Auto-configure BrowserClient (no credentials needed)
    autoConfigureBrowserClient();

    // Load state from storage on mount
    loadState();
  }, []);

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

  const loadState = async () => {
    const response = await sendToBackground({ type: MessageType.LOAD_STATE });
    if (response.success && response.data) {
      // Update store with loaded data
      const { plans, userConfig, activePlanId, chatMessages } = response.data;
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
      if (chatMessages) useAppStore.setState({ chatMessages });
    }
    // Mark initial load as complete
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
        chatMessages: state.chatMessages,
      },
    });
  };

  // Auto-save state changes (but skip on initial render)
  useEffect(() => {
    if (!isInitialLoad) {
      saveState();
    }
  }, [plans, userConfig, chatMessages]);

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
