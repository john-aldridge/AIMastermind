import React, { useState } from 'react';
import { useAppStore, SubExtension } from '@/state/appStore';

interface CreateSubExtensionModalProps {
  planId: string;
  onClose: () => void;
}

export const CreateSubExtensionModal: React.FC<CreateSubExtensionModalProps> = ({
  planId,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const { addSubExtension } = useAppStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !prompt.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const newWidget: SubExtension = {
      id: `widget-${Date.now()}`,
      name: name.trim(),
      prompt: prompt.trim(),
      createdAt: Date.now(),
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
    };

    addSubExtension(planId, newWidget);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[350px] shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Create Widget</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Widget Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Code Reviewer"
              className="input-field"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what this widget should do..."
              className="input-field resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about what you want the AI to generate
            </p>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              Create Widget
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
