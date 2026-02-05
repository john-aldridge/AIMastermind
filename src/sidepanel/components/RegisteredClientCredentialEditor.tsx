/**
 * Credential Editor for Registered Clients
 *
 * Handles credential configuration for executable clients from ClientRegistry.
 * Uses the client's getCredentialFields() to build the form dynamically.
 */

import React, { useState } from 'react';
import type { ClientMetadata } from '@/clients';
import type { APIClientBase } from '@/clients';

interface RegisteredClientCredentialEditorProps {
  clientMetadata: ClientMetadata;
  clientInstance: APIClientBase;
  onClose: () => void;
}

export const RegisteredClientCredentialEditor: React.FC<RegisteredClientCredentialEditorProps> = ({
  clientMetadata,
  clientInstance,
  onClose,
}) => {
  const credentialFields = clientInstance.getCredentialFields();
  const [credentials, setCredentials] = useState<Record<string, string>>(
    clientInstance.getCredentials() || {}
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const handleChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPassword(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    console.log(`[RegisteredClientCredentialEditor] Starting save for ${clientMetadata.name}`);
    console.log('[RegisteredClientCredentialEditor] Credentials:', {
      ...credentials,
      personal_token: credentials.personal_token ? '***' : 'missing',
    });

    setError(null);
    setLoading(true);
    setStatusMessage('Starting validation...');

    try {
      // Set credentials on the client instance
      setStatusMessage('Setting credentials...');
      console.log('[RegisteredClientCredentialEditor] Setting credentials on client instance...');
      clientInstance.setCredentials(credentials);

      // Validate credentials
      setStatusMessage('Validating credentials...');
      console.log('[RegisteredClientCredentialEditor] Validating credentials...');
      const validation = await clientInstance.validateCredentials();
      console.log('[RegisteredClientCredentialEditor] Validation result:', validation);

      if (!validation.valid) {
        console.error('[RegisteredClientCredentialEditor] Validation failed:', validation.errors);
        setError(validation.errors.join('\n'));
        setLoading(false);
        setStatusMessage('');
        return;
      }

      // Try to initialize the client (test connection)
      setStatusMessage('Testing connection to API...');
      console.log('[RegisteredClientCredentialEditor] Initializing client (testing connection)...');
      await clientInstance.initialize();
      console.log('[RegisteredClientCredentialEditor] Client initialized successfully');

      // Save to chrome storage (default to inactive - user must explicitly activate)
      setStatusMessage('Saving credentials...');
      console.log('[RegisteredClientCredentialEditor] Saving to chrome storage...');

      // Preserve existing isActive state if reconfiguring, otherwise default to false
      const existingData = await chrome.storage.local.get(`client:${clientMetadata.id}`);
      const existingConfig = existingData[`client:${clientMetadata.id}`];
      const preserveIsActive = existingConfig?.isActive ?? false;

      await chrome.storage.local.set({
        [`client:${clientMetadata.id}`]: {
          clientId: clientMetadata.id,
          credentials,
          isActive: preserveIsActive,
          configuredAt: Date.now(),
        },
      });

      console.log(`[${clientMetadata.name}] Credentials saved and client initialized successfully`);
      setStatusMessage('Success!');
      setTimeout(() => onClose(), 500);
    } catch (err) {
      console.error('[RegisteredClientCredentialEditor] Error during save:', err);
      console.error('[RegisteredClientCredentialEditor] Error stack:', err instanceof Error ? err.stack : 'No stack');
      const errorMessage = err instanceof Error ? err.message : 'Failed to save credentials';
      setError(`Connection failed: ${errorMessage}`);
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          {clientMetadata.icon && (
            <img src={clientMetadata.icon} alt={clientMetadata.name} className="w-10 h-10" />
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Configure {clientMetadata.name}
            </h2>
            <p className="text-sm text-gray-500">v{clientMetadata.version}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {clientMetadata.description}
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

        {/* Credential Fields */}
        <div className="space-y-3 mb-6">
          {credentialFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  value={credentials[field.key] || ''}
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
              ) : field.type === 'password' ? (
                <div className="relative">
                  <input
                    type={showPassword[field.key] ? 'text' : 'password'}
                    value={credentials[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="input-field pr-10"
                    required={field.required}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.key)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword[field.key] ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <input
                  type={field.type}
                  value={credentials[field.key] || ''}
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
            {loading ? 'Testing Connection...' : 'Save & Test Connection'}
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
          <p className="font-medium mb-1">About this client:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>{clientInstance.getCapabilities().length} capabilities available</li>
            <li>Credentials stored securely in local storage</li>
            <li>Connection will be tested before saving</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
