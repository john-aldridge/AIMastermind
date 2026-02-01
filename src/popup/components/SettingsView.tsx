import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/state/appStore';
import { TOKEN_PACKAGES } from '@/utils/pricing';
import { ProviderSelector } from './ProviderSelector';
import { DynamicAuthForm } from './DynamicAuthForm';
import { ViewModeSettings } from './ViewModeSettings';
import { ProviderConfig, getProviderById } from '@/utils/providers';

type NotificationType = 'success' | 'error' | null;

export const SettingsView: React.FC = () => {
  const { userConfig, updateUserConfig } = useAppStore();
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  // Load saved provider on mount
  useEffect(() => {
    if (userConfig.providerId) {
      const provider = getProviderById(userConfig.providerId);
      if (provider) {
        setSelectedProvider(provider);
        setCredentials(userConfig.providerCredentials || {});
      }
    }
  }, []);

  const handleProviderSelect = (provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setNotification(null);
    // Initialize with saved credentials if switching back to same provider
    if (provider.id === userConfig.providerId) {
      setCredentials(userConfig.providerCredentials || {});
    } else {
      setCredentials({});
    }
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const validateCredentials = async (): Promise<{ valid: boolean; error?: string }> => {
    if (!selectedProvider) {
      return { valid: false, error: 'No provider selected' };
    }

    // Check all required fields are filled
    for (const field of selectedProvider.authFields) {
      if (field.required && !credentials[field.key]) {
        return { valid: false, error: `${field.label} is required` };
      }
    }

    // Test API call
    try {
      const headers = selectedProvider.headerFormat(credentials);
      const { url, body } = selectedProvider.formatRequest('test', credentials.model || selectedProvider.defaultModel, credentials);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        return { valid: false, error: errorMsg };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  };

  const handleSaveCredentials = async () => {
    if (!selectedProvider) return;

    setSaving(true);
    setNotification(null);

    try {
      const result = await validateCredentials();
      if (result.valid) {
        updateUserConfig({
          useOwnKey: true,
          providerId: selectedProvider.id,
          providerCredentials: credentials,
          aiModel: credentials.model || selectedProvider.defaultModel,
        });
        setNotification({
          type: 'success',
          message: `${selectedProvider.displayName} configured successfully! You can now use your own API.`,
        });
      } else {
        setNotification({
          type: 'error',
          message: `Configuration failed: ${result.error}`,
        });
        console.error('Validation failed:', result.error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setNotification({
        type: 'error',
        message: `Error: ${errorMsg}`,
      });
      console.error('Configuration error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleKeyMode = () => {
    updateUserConfig({ useOwnKey: !userConfig.useOwnKey });
    setNotification(null);
  };

  const isFormValid = selectedProvider?.authFields.every(
    field => !field.required || credentials[field.key]
  );

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Settings</h2>

      {/* Token Balance */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Token Balance</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-primary-600">
              {userConfig.tokenBalance.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              {userConfig.dailyTokenUsage.toLocaleString()} used today
            </div>
          </div>
          {userConfig.isPremium && (
            <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-medium">
              Premium
            </span>
          )}
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">AI Provider Configuration</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={userConfig.useOwnKey}
              onChange={handleToggleKeyMode}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Use Own API Key</span>
          </label>
        </div>

        {userConfig.useOwnKey ? (
          <div className="space-y-4">
            {/* Provider Selector */}
            <ProviderSelector
              selectedProvider={selectedProvider}
              onSelect={handleProviderSelect}
            />

            {/* Dynamic Auth Form */}
            {selectedProvider && (
              <>
                <div className="border-t pt-4">
                  <DynamicAuthForm
                    provider={selectedProvider}
                    credentials={credentials}
                    onChange={handleCredentialChange}
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveCredentials}
                  disabled={saving || !isFormValid}
                  className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Validating Configuration...' : 'Save Configuration'}
                </button>

                {/* Notification */}
                {notification && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      notification.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base">
                        {notification.type === 'success' ? '✅' : '❌'}
                      </span>
                      <span className="flex-1">{notification.message}</span>
                    </div>
                  </div>
                )}

                {/* Current Configuration */}
                {userConfig.providerId && (
                  <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                    <div className="font-medium text-gray-700 mb-1">Current Configuration:</div>
                    <div>Provider: {selectedProvider.displayName}</div>
                    <div>Model: {credentials.model || selectedProvider.defaultModel}</div>
                  </div>
                )}
              </>
            )}

            <p className="text-xs text-gray-500">
              🔒 Your credentials are stored locally and never sent to our servers.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Using AI Mastermind tokens. Purchase more below to continue using our service.
          </p>
        )}
      </div>

      {/* Token Packages */}
      {!userConfig.useOwnKey && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-700 mb-3">Buy More Tokens</h3>
          <div className="space-y-2">
            {TOKEN_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm text-gray-800">
                    {pkg.name}
                    {pkg.popular && (
                      <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {pkg.tokens.toLocaleString()} tokens
                  </div>
                </div>
                <button className="btn-primary text-sm py-1 px-3">
                  ${pkg.price}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Mode Settings */}
      <ViewModeSettings />

      {/* Cloud Sync */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
        <h3 className="font-semibold text-gray-700 mb-2">Cloud Sync</h3>
        <p className="text-sm text-gray-600 mb-3">
          {userConfig.isPremium
            ? 'Your data is synced across devices.'
            : 'Upgrade to Premium for cloud sync.'}
        </p>
        {!userConfig.isPremium && (
          <button className="btn-primary w-full text-sm">
            Upgrade to Premium
          </button>
        )}
      </div>
    </div>
  );
};
