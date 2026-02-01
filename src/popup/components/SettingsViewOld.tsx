import React, { useState } from 'react';
import { useAppStore } from '@/state/appStore';
import { TOKEN_PACKAGES } from '@/utils/pricing';
import { apiService, AIProvider } from '@/utils/api';

type NotificationType = 'success' | 'error' | null;

export const SettingsView: React.FC = () => {
  const { userConfig, updateUserConfig } = useAppStore();
  const [apiKey, setApiKey] = useState(userConfig.apiKey || '');
  const [provider, setProvider] = useState<AIProvider>(userConfig.aiProvider || 'claude');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);

  const handleSaveApiKey = async () => {
    setSaving(true);
    setNotification(null);

    try {
      const result = await apiService.validateApiKey(apiKey, provider);
      if (result.valid) {
        apiService.setApiKey(apiKey);
        apiService.setProvider(provider);
        updateUserConfig({ apiKey, useOwnKey: true, aiProvider: provider });
        setNotification({
          type: 'success',
          message: 'API key saved successfully! You can now use your own AI provider.',
        });
      } else {
        const errorMsg = result.error || 'Unknown error';
        setNotification({
          type: 'error',
          message: `Invalid API key: ${errorMsg}`,
        });
        console.error('API validation failed:', result.error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setNotification({
        type: 'error',
        message: `Error validating API key: ${errorMsg}`,
      });
      console.error('Validation error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleKeyMode = () => {
    updateUserConfig({ useOwnKey: !userConfig.useOwnKey });
  };

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
  };

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

      {/* API Key Option */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">API Configuration</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={userConfig.useOwnKey}
              onChange={handleToggleKeyMode}
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Use Own Key</span>
          </label>
        </div>

        {userConfig.useOwnKey ? (
          <div>
            {/* Provider Selection */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleProviderChange('claude')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    provider === 'claude'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Claude (Anthropic)
                </button>
                <button
                  onClick={() => handleProviderChange('openai')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    provider === 'openai'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  OpenAI
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === 'claude'
                    ? 'sk-ant-...'
                    : 'sk-...'
                }
                className="input-field text-sm"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveApiKey}
              disabled={saving || !apiKey}
              className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Validating...' : 'Save API Key'}
            </button>

            {/* Notification */}
            {notification && (
              <div
                className={`mt-3 p-3 rounded-lg text-sm ${
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

            {/* Instructions */}
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-900 font-medium mb-1">
                {provider === 'claude' ? 'Get your Claude API key:' : 'Get your OpenAI API key:'}
              </p>
              <p className="text-xs text-blue-700">
                {provider === 'claude' ? (
                  <>
                    Visit{' '}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      console.anthropic.com
                    </a>
                    {' '}to get your API key
                  </>
                ) : (
                  <>
                    Visit{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      platform.openai.com/api-keys
                    </a>
                    {' '}to get your API key
                  </>
                )}
              </p>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              🔒 Your API key is stored locally and never sent to our servers.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Using AI Mastermind tokens. Purchase more below.
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
