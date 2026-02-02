import React, { useState } from 'react';
import { MasterPlan, useAppStore } from '@/state/appStore';
import { CreateSubExtensionModal } from './CreateSubExtensionModal';
import { sendToContent } from '@/utils/messaging';
import { MessageType } from '@/utils/messaging';

interface PlanCardProps {
  plan: MasterPlan;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const [expanded, setExpanded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { activePlanId, setActivePlan, deletePlan } = useAppStore();

  const isActive = activePlanId === plan.id;

  const handleActivate = async () => {
    setActivePlan(plan.id);

    // Send widgets to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      plan.subExtensions.forEach(async (widget) => {
        await sendToContent(tab.id!, {
          type: MessageType.CREATE_WIDGET,
          payload: widget,
        });
      });
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete plugin "${plan.name}"?`)) {
      deletePlan(plan.id);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">{plan.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{plan.subExtensions.length} widgets</span>
              {isActive && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {!isActive && (
            <button
              onClick={handleActivate}
              className="btn-primary text-xs py-1 px-3 flex-1"
            >
              Activate
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn-secondary text-xs py-1 px-3 flex-1"
          >
            {expanded ? 'Hide' : 'Show'} Widgets
          </button>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-xs px-2"
          >
            Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Widgets</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              + Add Widget
            </button>
          </div>

          {plan.subExtensions.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              No widgets yet
            </p>
          ) : (
            <div className="space-y-2">
              {plan.subExtensions.map((widget) => (
                <div
                  key={widget.id}
                  className="bg-white rounded p-2 text-xs border border-gray-200"
                >
                  <div className="font-medium text-gray-700">{widget.name}</div>
                  <div className="text-gray-500 mt-1 line-clamp-2">
                    {widget.prompt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateSubExtensionModal
          planId={plan.id}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};
