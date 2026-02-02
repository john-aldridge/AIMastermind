import React, { useState } from 'react';
import { useAppStore, APIClient, ClientCapability } from '@/state/appStore';

interface CreateClientModalProps {
  onClose: () => void;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({ onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('');
  const [step, setStep] = useState<'basic' | 'capabilities'>('basic');
  const [capabilities, setCapabilities] = useState<ClientCapability[]>([]);
  const { addClient } = useAppStore();

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a client name');
      return;
    }

    if (!provider.trim()) {
      alert('Please enter a provider name');
      return;
    }

    setStep('capabilities');
  };

  const handleAddCapability = () => {
    const newCapability: ClientCapability = {
      name: '',
      description: '',
      method: 'GET',
      endpoint: '',
    };
    setCapabilities([...capabilities, newCapability]);
  };

  const handleUpdateCapability = (index: number, updates: Partial<ClientCapability>) => {
    setCapabilities(capabilities.map((cap, i) => i === index ? { ...cap, ...updates } : cap));
  };

  const handleRemoveCapability = (index: number) => {
    setCapabilities(capabilities.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = () => {
    const newClient: APIClient = {
      id: `client-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      provider: provider.trim(),
      credentials: {},
      capabilities: capabilities.filter(cap => cap.name.trim() && cap.endpoint.trim()),
      isActive: false,
      isPurchased: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addClient(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {step === 'basic' ? 'Create API Client' : 'Configure Capabilities'}
        </h2>

        {step === 'basic' ? (
          <form onSubmit={handleBasicSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., GitHub API Client"
                className="input-field"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider *
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="e.g., GitHub, Slack, Custom"
                className="input-field"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this client do?"
                className="input-field resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">
                Next: Add Capabilities
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
        ) : (
          <div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">API Capabilities</span>
                <button
                  onClick={handleAddCapability}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  + Add Capability
                </button>
              </div>

              {capabilities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No capabilities added yet. Add at least one to define what this client can do.
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {capabilities.map((capability, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Capability {index + 1}
                        </span>
                        <button
                          onClick={() => handleRemoveCapability(index)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        type="text"
                        value={capability.name}
                        onChange={(e) => handleUpdateCapability(index, { name: e.target.value })}
                        placeholder="Capability name (e.g., 'List repositories')"
                        className="input-field text-sm mb-2"
                      />

                      <textarea
                        value={capability.description}
                        onChange={(e) => handleUpdateCapability(index, { description: e.target.value })}
                        placeholder="Description"
                        className="input-field text-sm mb-2 resize-none"
                        rows={2}
                      />

                      <div className="flex gap-2">
                        <select
                          value={capability.method}
                          onChange={(e) => handleUpdateCapability(index, { method: e.target.value })}
                          className="input-field text-sm flex-shrink-0 w-24"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                          <option value="PATCH">PATCH</option>
                        </select>

                        <input
                          type="text"
                          value={capability.endpoint}
                          onChange={(e) => handleUpdateCapability(index, { endpoint: e.target.value })}
                          placeholder="Endpoint (e.g., /user/repos)"
                          className="input-field text-sm flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep('basic')}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button
                onClick={handleFinalSubmit}
                className="btn-primary flex-1"
              >
                Create Client
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
