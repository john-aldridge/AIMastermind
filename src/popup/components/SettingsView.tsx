import React, { useState } from 'react';
import { useAppStore } from '@/state/appStore';
import { TOKEN_PACKAGES } from '@/utils/pricing';
import { apiService } from '@/utils/api';

export const SettingsView: React.FC = () => {
  const { userConfig, updateUserConfig } = useAppStore();
  const [apiKey, setApiKey] = useState(userConfig.apiKey || '');
  const [saving, setSaving] = useState(false);

  const handleSaveApiKey = async () => {
    setSaving(true);
    try {
      const isValid = await apiService.validateApiKey(apiKey);
      if (isValid) {
        apiService.setApiKey(apiKey);
        updateUserConfig({ apiKey, useOwnKey: true });
        alert('API key saved successfully!');
      } else {
        alert('Invalid API key. Please check and try again.');
      }
    } catch (error) {
      alert('Error validating API key');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleKeyMode = () => {
    updateUserConfig({ useOwnKey: !userConfig.useOwnKey });
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
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="input-field mb-2 text-sm"
            />
            <button
              onClick={handleSaveApiKey}
              disabled={saving}
              className="btn-primary w-full text-sm"
            >
              {saving ? 'Validating...' : 'Save API Key'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Your API key is stored locally and never sent to our servers.
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
