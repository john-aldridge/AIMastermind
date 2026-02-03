/**
 * Config Editor Component
 *
 * Full-featured editor for creating and editing agent and client configs.
 * Includes JSON editing, validation, JavaScript detection, and preview.
 */

import React, { useState, useEffect } from 'react';
import { AgentConfig } from '@/types/agentConfig';
import { ClientConfig } from '@/types/clientConfig';
import { ConfigStorageService } from '@/storage/configStorage';
import { ConfigRegistry } from '@/services/configRegistry';

type ConfigType = 'agent' | 'client';

interface ConfigEditorProps {
  configType: ConfigType;
  configId?: string; // If provided, loads existing config for editing
  onSave?: (config: AgentConfig | ClientConfig) => void;
  onCancel?: () => void;
}

export const ConfigEditor: React.FC<ConfigEditorProps> = ({
  configType,
  configId,
  onSave,
  onCancel,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [containsJavaScript, setContainsJavaScript] = useState(false);

  // Load existing config if editing
  useEffect(() => {
    if (configId) {
      loadConfig(configId);
    } else {
      // Load template for new config
      loadTemplate();
    }
  }, [configId, configType]);

  const loadConfig = async (id: string) => {
    try {
      let config: AgentConfig | ClientConfig | null = null;

      if (configType === 'agent') {
        config = await ConfigStorageService.loadAgentConfig(id);
      } else {
        config = await ConfigStorageService.loadClientConfig(id);
      }

      if (config) {
        setJsonText(JSON.stringify(config, null, 2));
        setContainsJavaScript(config.containsJavaScript || false);
        validateConfig(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadTemplate = () => {
    const template = configType === 'agent' ? getAgentTemplate() : getClientTemplate();
    setJsonText(JSON.stringify(template, null, 2));
    validateConfig(JSON.stringify(template, null, 2));
  };

  const validateConfig = (text: string) => {
    try {
      // Parse JSON
      const config = JSON.parse(text);

      // Validate schema
      const validation =
        configType === 'agent'
          ? ConfigStorageService.validateAgentConfig(config as AgentConfig)
          : ConfigStorageService.validateClientConfig(config as ClientConfig);

      setIsValid(validation.valid);
      setValidationErrors(validation.errors);

      // Detect JavaScript
      if (configType === 'agent' && validation.valid) {
        const hasJS = ConfigStorageService.detectJavaScriptInAgent(config as AgentConfig);
        setContainsJavaScript(hasJS);
      }
    } catch (error) {
      setIsValid(false);
      setValidationErrors([`JSON Parse Error: ${error instanceof Error ? error.message : String(error)}`]);
      setContainsJavaScript(false);
    }
  };

  const handleTextChange = (text: string) => {
    setJsonText(text);
    validateConfig(text);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!isValid) {
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const config = JSON.parse(jsonText);

      // Save to storage
      if (configType === 'agent') {
        await ConfigStorageService.saveAgentConfig(config as AgentConfig);
        // Register in registry
        ConfigRegistry.getInstance().registerAgent(config as AgentConfig);
      } else {
        await ConfigStorageService.saveClientConfig(config as ClientConfig);
        // Register in registry
        ConfigRegistry.getInstance().registerClient(config as ClientConfig);
      }

      setSaveSuccess(true);

      // Call onSave callback if provided
      if (onSave) {
        onSave(config);
      }

      // Show success message
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setValidationErrors([`Save Error: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleFormat = () => {
    try {
      const config = JSON.parse(jsonText);
      setJsonText(JSON.stringify(config, null, 2));
    } catch (error) {
      // Ignore formatting errors
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {configId ? 'Edit' : 'Create'} {configType === 'agent' ? 'Agent' : 'Client'} Config
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {configType === 'agent'
                ? 'Define agent capabilities using JSON configuration'
                : 'Configure REST API client with authentication'}
            </p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            {containsJavaScript && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Contains JavaScript
              </span>
            )}
            {isValid ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Valid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Invalid
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {!isValid && validationErrors.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 mb-1">Validation Errors</h4>
              <ul className="text-sm text-red-800 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-900">
              Config saved successfully!
            </span>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
          <button
            onClick={handleFormat}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Format JSON
          </button>
          <span className="text-xs text-gray-500">
            Edit the JSON configuration below
          </span>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-900">
          <textarea
            value={jsonText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded border border-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
            spellCheck={false}
            placeholder="Enter JSON configuration here..."
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {containsJavaScript && (
            <span className="text-amber-700">
              ⚠️ JavaScript execution must be enabled in Settings
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Get template for new agent config
 */
function getAgentTemplate(): Partial<AgentConfig> {
  return {
    id: 'my-agent',
    name: 'My Agent',
    description: 'Description of what this agent does',
    version: '1.0.0',
    author: 'Your Name',
    icon: '🤖',
    tags: ['example'],
    containsJavaScript: false,
    requiresPageAccess: false,
    configFields: [],
    dependencies: [],
    capabilities: [
      {
        name: 'example_capability',
        description: 'Example capability that does something',
        parameters: [],
        actions: [
          {
            type: 'notify',
            title: 'Hello',
            message: 'This is an example agent',
          },
          {
            type: 'return',
            value: { success: true },
          },
        ],
      },
    ],
  };
}

/**
 * Get template for new client config
 */
function getClientTemplate(): Partial<ClientConfig> {
  return {
    id: 'my-client',
    name: 'My API Client',
    description: 'REST API client for...',
    version: '1.0.0',
    author: 'Your Name',
    icon: '🌐',
    tags: ['api'],
    containsJavaScript: false,
    auth: {
      type: 'apikey',
      fields: [
        {
          key: 'api_key',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your API key',
          helpText: 'Get your API key from...',
        },
      ],
    },
    baseUrl: 'https://api.example.com',
    capabilities: [
      {
        name: 'example_request',
        description: 'Make an example API request',
        method: 'GET',
        path: '/endpoint',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Query parameter',
            required: true,
            location: 'query',
          },
        ],
        requestTransform: {
          headers: {
            'Accept': 'application/json',
          },
        },
        responseTransform: {
          extract: '$',
        },
      },
    ],
  };
}
