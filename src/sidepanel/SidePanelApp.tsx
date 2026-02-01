import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/state/appStore';
import { PlansView } from '@/popup/components/PlansView';
import { SettingsView } from '@/popup/components/SettingsView';
import { CreatePlanModal } from '@/popup/components/CreatePlanModal';
import { sendToBackground } from '@/utils/messaging';
import { MessageType } from '@/utils/messaging';
import { apiService } from '@/utils/api';

type View = 'plans' | 'settings';

export const SidePanelApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('plans');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { plans, userConfig, updateUserConfig } = useAppStore();

  useEffect(() => {
    // Load state from storage on mount
    loadState();
  }, []);

  const loadState = async () => {
    const response = await sendToBackground({ type: MessageType.LOAD_STATE });
    if (response.success && response.data) {
      // Update store with loaded data
      const { plans, userConfig, activePlanId } = response.data;
      if (plans) useAppStore.setState({ plans });
      if (userConfig) {
        updateUserConfig(userConfig);
        // Initialize API service with stored config
        if (userConfig.apiKey) {
          apiService.setApiKey(userConfig.apiKey);
          apiService.setProvider(userConfig.aiProvider || 'claude');
          if (userConfig.aiModel) {
            apiService.setModel(userConfig.aiModel);
          }
        }
      }
      if (activePlanId) useAppStore.setState({ activePlanId });
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
      },
    });
  };

  // Auto-save state changes
  useEffect(() => {
    saveState();
  }, [plans, userConfig]);

  const handleSwitchToPopup = async () => {
    // Save preference for popup mode
    updateUserConfig({ preferPopup: true });
    await saveState();

    // Show notification
    alert('Switched to Popup mode. Click the extension icon to open the popup.\n\nYou can switch back to Side Panel mode in Settings.');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">AI Mastermind</h1>
          <div className="text-xs">
            <span className="font-semibold">{userConfig.tokenBalance}</span> tokens
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
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

        {/* View Mode Indicator */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-primary-100">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span>Side Panel Mode</span>
          </div>
          <button
            onClick={handleSwitchToPopup}
            className="text-primary-100 hover:text-white underline"
          >
            Switch to Popup
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-auto">
        {currentView === 'plans' ? (
          <PlansView onCreatePlan={() => setShowCreateModal(true)} />
        ) : (
          <SettingsView />
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};
