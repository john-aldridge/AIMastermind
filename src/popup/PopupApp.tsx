import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/state/appStore';
import { ChatView } from './components/ChatView';
import { PlansView } from './components/PlansView';
import { SettingsView } from './components/SettingsView';
import { CreatePlanModal } from './components/CreatePlanModal';
import { sendToBackground } from '@/utils/messaging';
import { MessageType } from '@/utils/messaging';
import { apiService } from '@/utils/api';
import { networkMonitor } from '@/utils/networkMonitor';

type View = 'chat' | 'plans' | 'settings';

export const PopupApp: React.FC = () => {
  console.log('🟣 [Popup] PopupApp component rendered');
  const [currentView, setCurrentView] = useState<View>('chat');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { plans, userConfig, updateUserConfig, chatMessages } = useAppStore();

  useEffect(() => {
    console.log('🟣 [Popup] PopupApp mounted at', new Date().toISOString());
    // Load state from storage on mount
    loadState();

    // Log if popup is about to close
    window.addEventListener('beforeunload', () => {
      console.log('🟣 [Popup] beforeunload event - popup is closing');
    });

    return () => {
      console.log('🟣 [Popup] PopupApp unmounted at', new Date().toISOString());
    };
  }, []);

  const loadState = async () => {
    console.log('🟣 [Popup] loadState called');
    try {
      const response = await sendToBackground({ type: MessageType.LOAD_STATE });
      console.log('🟣 [Popup] loadState response:', response.success);
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
      console.log('🟣 [Popup] loadState completed');
      // Mark initial load as complete
      setIsInitialLoad(false);
    } catch (error) {
      console.error('❌ [Popup] loadState error:', error);
      setIsInitialLoad(false);
    }
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
      console.log('🟣 [Popup] Auto-saving state changes');
      saveState();
    } else {
      console.log('🟣 [Popup] Skipping auto-save during initial load');
    }
  }, [plans, userConfig, chatMessages]);

  return (
    <div className="w-[400px] h-[600px] bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Mastermind</h1>
          <div className="text-xs">
            <span className="font-semibold">{userConfig.tokenBalance}</span> tokens
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mt-3">
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
            onClick={() => setCurrentView('plans')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'plans'
                ? 'bg-white text-primary-700'
                : 'bg-primary-500 hover:bg-primary-400 text-white'
            }`}
          >
            Plans
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

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentView === 'chat' && <ChatView />}
        {currentView === 'plans' && (
          <div className="overflow-auto flex-1">
            <PlansView onCreatePlan={() => setShowCreateModal(true)} />
          </div>
        )}
        {currentView === 'settings' && (
          <div className="overflow-auto flex-1">
            <SettingsView />
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};
