import React, { useState, useEffect } from 'react';
import { AgentRegistry } from '@/agents';
import { AgentSourceStorageService } from '@/storage/agentSourceStorage';
import type { AgentMetadata } from '@/agents';
import type { AgentSourceStorage } from '@/types/agentSource';

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    agentId: string,
    agentName: string,
    urlPattern: string,
    description?: string,
    executeOnLoad?: boolean,
    watchForReloads?: boolean,
    capabilityName?: string,
    parameters?: Record<string, any>
  ) => void;
  editingRule?: {
    id: string;
    agentId: string;
    agentName: string;
    urlPattern: string;
    description?: string;
    executeOnLoad?: boolean;
    capabilityName?: string;
    parameters?: Record<string, any>;
  } | null;
}

export const AddRuleModal: React.FC<AddRuleModalProps> = ({ isOpen, onClose, onSave, editingRule }) => {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedAgentName, setSelectedAgentName] = useState('');
  const [urlPattern, setUrlPattern] = useState('');
  const [description, setDescription] = useState('');
  const [executeOnLoad, setExecuteOnLoad] = useState(false);
  const [watchForReloads, setWatchForReloads] = useState(false);
  const [capabilityName, setCapabilityName] = useState('');
  const [builtInAgents, setBuiltInAgents] = useState<AgentMetadata[]>([]);
  const [customAgents, setCustomAgents] = useState<AgentSourceStorage[]>([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [availableCapabilities] = useState<Array<{ name: string; description: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      loadAgents();
      getCurrentTabUrl();

      // Pre-fill if editing
      if (editingRule) {
        setSelectedAgentId(editingRule.agentId);
        setSelectedAgentName(editingRule.agentName);
        setUrlPattern(editingRule.urlPattern);
        setDescription(editingRule.description || '');
      } else {
        // Reset form for new rule
        setSelectedAgentId('');
        setSelectedAgentName('');
        setUrlPattern('');
        setDescription('');
      }
    }
  }, [isOpen, editingRule]);

  const loadAgents = async () => {
    const allBuiltIn = AgentRegistry.getAllMetadata();
    setBuiltInAgents(allBuiltIn);

    const allCustom = await AgentSourceStorageService.listAllAgents();
    setCustomAgents(allCustom);
  };

  const getCurrentTabUrl = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setCurrentUrl(tab.url);
      }
    } catch (error) {
      console.error('Failed to get current tab URL:', error);
    }
  };

  const handleAgentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [type, id] = value.split(':');

    setSelectedAgentId(id);

    if (type === 'builtin') {
      const agent = builtInAgents.find((a) => a.id === id);
      setSelectedAgentName(agent?.name || '');
    } else {
      const agent = customAgents.find((a) => a.agentId === id);
      setSelectedAgentName(agent?.name || '');
    }
  };

  const handleUseCurrentPage = () => {
    if (currentUrl) {
      try {
        const url = new URL(currentUrl);
        setUrlPattern(`${url.protocol}//${url.hostname}/*`);
      } catch (error) {
        console.error('Invalid URL:', error);
      }
    }
  };

  const handleSave = () => {
    if (!selectedAgentId || !urlPattern.trim()) {
      alert('Please select an agent and enter a URL pattern');
      return;
    }

    if (executeOnLoad && !capabilityName) {
      alert('Please select a capability to execute on page load');
      return;
    }

    onSave(
      selectedAgentId,
      selectedAgentName,
      urlPattern.trim(),
      description.trim() || undefined,
      executeOnLoad,
      watchForReloads,
      capabilityName || undefined,
      undefined // parameters - can be added later
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingRule ? 'Edit Auto-Load Rule' : 'Add New Auto-Load Rule'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Agent Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agent <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAgentId ? `${builtInAgents.some(a => a.id === selectedAgentId) ? 'builtin' : 'custom'}:${selectedAgentId}` : ''}
              onChange={handleAgentSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select an agent</option>
              {customAgents.length > 0 && (
                <optgroup label="Custom Agents">
                  {customAgents.map((agent) => (
                    <option key={agent.agentId} value={`custom:${agent.agentId}`}>
                      {agent.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {builtInAgents.length > 0 && (
                <optgroup label="Built-in Agents">
                  {builtInAgents.map((agent) => (
                    <option key={agent.id} value={`builtin:${agent.id}`}>
                      {agent.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* URL Pattern */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Pattern <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={urlPattern}
                onChange={(e) => setUrlPattern(e.target.value)}
                placeholder="e.g., https://example.com/* or *://logs.example.com/*"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {currentUrl && (
                <button
                  onClick={handleUseCurrentPage}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Use current page pattern
                </button>
              )}
              <p className="text-xs text-gray-500">
                Use * as wildcard. Examples: https://example.com/*, *.example.com, *://example.com/*
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about when to use this rule"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Execute on Load */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={executeOnLoad}
                onChange={(e) => setExecuteOnLoad(e.target.checked)}
                className="mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Execute capability on page load</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Run the selected capability automatically when the page first loads
                </p>
              </div>
            </label>

            {/* Watch for Reloads */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={watchForReloads}
                onChange={(e) => setWatchForReloads(e.target.checked)}
                className="mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Watch for page reloads</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Re-execute the capability automatically whenever the page reloads (F5, refresh, etc.)
                </p>
              </div>
            </label>
          </div>

          {/* Capability Selection (shown only if executeOnLoad is checked) */}
          {executeOnLoad && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capability to Execute <span className="text-red-500">*</span>
              </label>
              <select
                value={capabilityName}
                onChange={(e) => setCapabilityName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={!selectedAgentId}
              >
                <option value="">
                  {selectedAgentId ? 'Select a capability' : 'Select an agent first'}
                </option>
                {availableCapabilities.map((cap) => (
                  <option key={cap.name} value={cap.name}>
                    {cap.name} - {cap.description}
                  </option>
                ))}
              </select>
              {availableCapabilities.length === 0 && selectedAgentId && (
                <p className="text-xs text-orange-600 mt-1">
                  This agent has no capabilities defined. Make sure the agent has at least one capability.
                </p>
              )}
            </div>
          )}

          {/* Pattern Examples */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Pattern Examples:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li><code className="bg-white px-1 py-0.5 rounded">https://example.com/*</code> - All pages on example.com (HTTPS only)</li>
              <li><code className="bg-white px-1 py-0.5 rounded">*://example.com/*</code> - All pages on example.com (any protocol)</li>
              <li><code className="bg-white px-1 py-0.5 rounded">*.example.com</code> - All subdomains of example.com</li>
              <li><code className="bg-white px-1 py-0.5 rounded">https://example.com/admin/*</code> - All admin pages</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedAgentId || !urlPattern.trim()}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingRule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};
