import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/state/appStore';
import { PlansView } from './components/PlansView';
import { SettingsView } from './components/SettingsView';
import { CreatePlanModal } from './components/CreatePlanModal';
import { sendToBackground } from '@/utils/messaging';
import { MessageType } from '@/utils/messaging';

type View = 'plans' | 'settings';

export const PopupApp: React.FC = () => {
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
      if (userConfig) updateUserConfig(userConfig);
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
