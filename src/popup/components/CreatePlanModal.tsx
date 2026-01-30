import React, { useState } from 'react';
import { useAppStore, MasterPlan } from '@/state/appStore';

interface CreatePlanModalProps {
  onClose: () => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { addPlan } = useAppStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a plan name');
      return;
    }

    const newPlan: MasterPlan = {
      id: `plan-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      subExtensions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addPlan(newPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[350px] shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Create Master Plan</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Research Assistant"
              className="input-field"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this plan for?"
              className="input-field resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              Create Plan
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
