import React from 'react';
import { useAppStore } from '@/state/appStore';
import { PlanCard } from './PlanCard';

interface PlansViewProps {
  onCreatePlan: () => void;
}

export const PlansView: React.FC<PlansViewProps> = ({ onCreatePlan }) => {
  const { plans } = useAppStore();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Master Plugins</h2>
        <button
          onClick={onCreatePlan}
          className="btn-primary text-sm py-1.5 px-3"
        >
          + New Plugin
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No master plugins yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Create a plugin to organize your AI-powered widgets
          </p>
          <button onClick={onCreatePlan} className="btn-primary">
            Create Your First Plugin
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
};
