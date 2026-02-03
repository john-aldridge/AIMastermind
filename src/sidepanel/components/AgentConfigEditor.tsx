/**
 * Agent Configuration Editor
 *
 * Handles configuration for agents.
 * Uses the agent's getConfigFields() to build the form dynamically.
 */

import React, { useState } from 'react';
import type { AgentMetadata } from '@/agents';
import type { AgentBase } from '@/agents';
import { ClientRegistry } from '@/clients';

interface AgentConfigEditorProps {
  agent: AgentMetadata;
  agentInstance: AgentBase;
  onClose: () => void;
}

export const AgentConfigEditor: React.FC<AgentConfigEditorProps> = ({
  agent,
  agentInstance,
  onClose,
}) => {
  const configFields = agentInstance.getConfigFields();
  const [config, setConfig] = useState<Record<string, string>>(
    agentInstance.getConfig() || {}
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    console.log(`[PluginConfigEditor] Starting save for ${agent.name}`);
    console.log('[PluginConfigEditor] Config:', config);

    setError(null);
    setLoading(true);
    setStatusMessage('Validating configuration...');

    try {
      // Set config on the plugin instance
      setStatusMessage('Setting configuration...');
      console.log('[PluginConfigEditor] Setting config on plugin instance...');
      agentInstance.setConfig(config);

      // Validate configuration
      setStatusMessage('Validating configuration...');
      console.log('[PluginConfigEditor] Validating config...');
      const validation = await agentInstance.validateConfig();
      console.log('[PluginConfigEditor] Validation result:', validation);

      if (!validation.valid) {
        console.error('[PluginConfigEditor] Validation failed:', validation.errors);
        setError(validation.errors.join('\n'));
        setLoading(false);
        setStatusMessage('');
        return;
      }

      // Check dependencies
      setStatusMessage('Checking dependencies...');
      const dependencies = agentInstance.getDependencies();
      console.log('[PluginConfigEditor] Required dependencies:', dependencies);

      for (const dep of dependencies) {
        const clientInstance = ClientRegistry.getInstance(dep);
        if (!clientInstance) {
          throw new Error(`Required client not found: ${dep}. Please configure the ${dep} client first.`);
        }

        // Load client credentials
        const storageKey = `client:${dep}`;
        const data = await chrome.storage.local.get(storageKey);
        const clientConfig = data[storageKey];

        if (!clientConfig?.credentials) {
          throw new Error(`Client ${dep} is not configured. Please configure it in the Clients tab.`);
        }

        // Set dependency
        clientInstance.setCredentials(clientConfig.credentials);
        await clientInstance.initialize();
        agentInstance.setDependency(dep, clientInstance);
        console.log(`[PluginConfigEditor] Dependency ${dep} resolved`);
      }

      // Initialize the plugin
      setStatusMessage('Initializing agent...');
      console.log('[PluginConfigEditor] Initializing agent...');
      await agentInstance.initialize();
      console.log('[PluginConfigEditor] Plugin initialized successfully');

      // Save to chrome storage
      setStatusMessage('Saving configuration...');
      console.log('[PluginConfigEditor] Saving to chrome storage...');
      await chrome.storage.local.set({
        [`agent:${agent.id}`]: {
          agentId: agent.id,
          config,
          isActive: true,
          configuredAt: Date.now(),
        },
      });

      console.log(`[${agent.name}] Configuration saved and plugin initialized successfully`);
      setStatusMessage('Success!');
      setTimeout(() => onClose(), 500);
    } catch (err) {
      console.error('[PluginConfigEditor] Error during save:', err);
      console.error('[PluginConfigEditor] Error stack:', err instanceof Error ? err.stack : 'No stack');
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(`Configuration failed: ${errorMessage}`);
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          {agent.icon && <span className="text-3xl">{agent.icon}</span>}
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Configure {agent.name}
            </h2>
            <p className="text-sm text-gray-500">v{agent.version}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {agent.description}
        </p>

        {/* Status Message */}
        {statusMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            {statusMessage}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Configuration Fields */}
        <div className="space-y-3 mb-6">
          {configFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  value={config[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="input-field"
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={config[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="input-field"
                  required={field.required}
                  rows={3}
                />
              ) : (
                <input
                  type={field.type}
                  value={config[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="input-field"
                  required={field.required}
                />
              )}

              {field.helpText && (
                <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Configuring...' : 'Save & Initialize'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          <p className="font-medium mb-1">About this plugin:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>{agentInstance.getCapabilities().length} capabilities available</li>
            {agentInstance.getDependencies().length > 0 && (
              <li>Requires: {agentInstance.getDependencies().join(', ')}</li>
            )}
            <li>Configuration stored securely in local storage</li>
            <li>Use from Chat by asking questions related to this plugin</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
