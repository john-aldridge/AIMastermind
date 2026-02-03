import React, { useState, useEffect } from 'react';
import { useAppStore, SavedConfiguration } from '@/state/appStore';
import { ProviderSelector } from './ProviderSelector';
import { DynamicAuthForm } from './DynamicAuthForm';
import { ConfigurationManager } from './ConfigurationManager';
import { NetworkSettings } from './NetworkSettings';
import { AutoLoadRulesView } from './AutoLoadRulesView';
import { ProcessMonitorView } from './ProcessMonitorView';
import { ProviderConfig, getProviderById } from '@/utils/providers';
import { SettingsService, ExtensionSettings } from '@/services/settingsService';

type NotificationType = 'success' | 'error' | null;
type SettingsSection = 'main' | 'models' | 'network' | 'auto-load' | 'processes' | 'billing' | 'cloud-sync' | 'security';

export const SettingsView: React.FC = () => {
  const { userConfig, updateUserConfig, addConfiguration } = useAppStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [configName, setConfigName] = useState('');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: NotificationType; message: string } | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [extensionSettings, setExtensionSettings] = useState<ExtensionSettings | null>(null);

  // Load saved provider and extension settings on mount
  useEffect(() => {
    if (userConfig.providerId) {
      const provider = getProviderById(userConfig.providerId);
      if (provider) {
        setSelectedProvider(provider);
        setCredentials(userConfig.providerCredentials || {});
      }
    }

    // Load extension settings
    SettingsService.getSettings().then(setExtensionSettings);
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

    // Skip validation for "Our Models" provider - no API key needed
    if (selectedProvider.id === 'our-models') {
      return { valid: true };
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

  const handleSaveConfiguration = async () => {
    if (!selectedProvider) return;
    if (!configName.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter a name for this configuration',
      });
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      const result = await validateCredentials();
      if (result.valid) {
        const newConfig: SavedConfiguration = {
          id: `config-${Date.now()}`,
          name: configName.trim(),
          providerId: selectedProvider.id,
          providerName: selectedProvider.displayName,
          credentials: credentials,
          model: credentials.model || selectedProvider.defaultModel,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        addConfiguration(newConfig);

        // Also set as active
        updateUserConfig({
          useOwnKey: true,
          providerId: selectedProvider.id,
          providerCredentials: credentials,
          aiModel: credentials.model || selectedProvider.defaultModel,
          activeConfigurationId: newConfig.id,
        });

        setNotification({
          type: 'success',
          message: `Configuration "${configName}" saved and activated!`,
        });

        // Reset form and hide it
        setConfigName('');
        setSelectedProvider(null);
        setCredentials({});
        setShowConfigForm(false);

        // Clear notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
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

  const isFormValid =
    selectedProvider?.id === 'our-models'
      ? true
      : selectedProvider?.authFields.every(field => !field.required || credentials[field.key]);

  // Render main settings menu
  const renderMainMenu = () => (
    <>
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

      {/* Settings Menu */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

        <button
          onClick={() => setActiveSection('models')}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="text-left">
              <div className="font-medium text-gray-800">Models</div>
              <div className="text-xs text-gray-500">Configure AI model providers</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setActiveSection('network')}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <div className="text-left">
              <div className="font-medium text-gray-800">Network Monitoring</div>
              <div className="text-xs text-gray-500">Control network access levels</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setActiveSection('auto-load')}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="text-left">
              <div className="font-medium text-gray-800">Auto-Load Rules</div>
              <div className="text-xs text-gray-500">Auto-activate agents on specific URLs</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setActiveSection('processes')}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-left">
              <div className="font-medium text-gray-800">Active Processes</div>
              <div className="text-xs text-gray-500">Monitor long-running agent processes</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setActiveSection('security')}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-left">
              <div className="font-medium text-gray-800">Security</div>
              <div className="text-xs text-gray-500">JavaScript execution and security settings</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setActiveSection('billing')}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <div className="text-left">
              <div className="font-medium text-gray-800">Billing</div>
              <div className="text-xs text-gray-500">Manage tokens and purchases</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setActiveSection('cloud-sync')}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            <div className="text-left">
              <div className="font-medium text-gray-800">Cloud Sync</div>
              <div className="text-xs text-gray-500">Sync data across devices</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </>
  );


  // Render Models settings
  const renderModelsSettings = () => (
    <>
      {/* Saved Configurations Manager */}
      <ConfigurationManager />

      {/* Separator with Title */}
      <div className="my-6 text-center relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 px-4 text-sm text-gray-600">
            Use one of our models or configure your own
          </span>
        </div>
      </div>

      {/* API Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-3">Model Providers</h3>

        <div className="space-y-4">
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

          {/* Configuration Form */}
          {showConfigForm ? (
            /* Add New Mode - Full Form */
            <>
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

                  {/* Configuration Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Configuration Name *
                    </label>
                    <input
                      type="text"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      placeholder="e.g., Work Claude, Personal OpenAI"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Give this configuration a memorable name
                    </p>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveConfiguration}
                    disabled={saving || !isFormValid || !configName.trim()}
                    className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Validating Configuration...' : 'Save Configuration'}
                  </button>
                </>
              )}

              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowConfigForm(false);
                  setSelectedProvider(null);
                  setCredentials({});
                  setConfigName('');
                  setNotification(null);
                }}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded transition-colors"
              >
                Cancel
              </button>

              <p className="text-xs text-gray-500">
                🔒 Your credentials are stored locally and never sent to our servers.
              </p>
            </>
          ) : (
            /* Add New Configuration Button */
            <button
              onClick={() => setShowConfigForm(true)}
              className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Model Provider Configuration
            </button>
          )}
        </div>
      </div>
    </>
  );

  // Render Billing settings
  const renderBillingSettings = () => (
    <>
      {/* Payment Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-4">Payment</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 1.304 0 2.053.527 2.053 1.447h2.456c-.022-1.963-1.395-3.44-3.82-3.829V1.5h-2.262v1.588C8.644 3.436 7 4.784 7 7.003c0 2.474 2.068 3.573 4.532 4.493 2.12.777 3.135 1.526 3.135 2.596 0 .917-.741 1.424-2.124 1.424-1.556 0-2.438-.648-2.438-1.833H7.648c0 2.235 1.689 3.685 4.054 4.053V19.5h2.262v-1.784c2.315-.351 3.985-1.691 3.985-3.976 0-2.727-2.137-3.835-3.973-4.59z"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Link by Stripe</span>
          </div>
          <button className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Update
          </button>
        </div>
      </div>

      {/* Extra Usage Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">Extra usage</h3>
        <p className="text-sm text-gray-600 mb-4">
          Buy extra usage so people in your organization can keep using Claude if they hit a limit.
        </p>

        {/* Current Balance */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
          <div>
            <div className="text-lg font-semibold text-gray-900">${userConfig.tokenBalance.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Current balance</div>
          </div>
          <button className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Buy more
          </button>
        </div>

        {/* Auto-reload */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">Auto-reload</div>
            <div className="text-xs text-gray-500">
              Automatically buy more extra usage when your balance is low
            </div>
          </div>
          <button className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Turn on
          </button>
        </div>
      </div>

      {/* Invoices Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Invoices</h3>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-medium text-gray-600">Date</th>
                <th className="text-left py-2 text-xs font-medium text-gray-600">Due</th>
                <th className="text-left py-2 text-xs font-medium text-gray-600">Total</th>
                <th className="text-left py-2 text-xs font-medium text-gray-600">Status</th>
                <th className="text-left py-2 text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { date: 'Jan 9, 2026', due: '', total: '$21.49', status: 'Paid' },
                { date: 'Jan 1, 2026', due: 'Jan 15, 2026', total: '$0.00', status: 'Paid' },
                { date: 'Dec 22, 2025', due: '', total: '$26.86', status: 'Paid' },
                { date: 'Dec 21, 2025', due: '', total: '$5.37', status: 'Paid' },
                { date: 'Dec 9, 2025', due: '', total: '$21.49', status: 'Paid' },
              ].map((invoice, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-2 text-gray-900">{invoice.date}</td>
                  <td className="py-2 text-gray-900">{invoice.due}</td>
                  <td className="py-2 text-gray-900">{invoice.total}</td>
                  <td className="py-2 text-gray-900">{invoice.status}</td>
                  <td className="py-2">
                    <button className="text-gray-700 hover:text-gray-900 underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        <div className="mt-4 flex justify-center">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Load more
          </button>
        </div>
      </div>
    </>
  );

  // Render Network settings
  const renderNetworkSettings = () => (
    <NetworkSettings />
  );

  // Render Security settings
  const renderSecuritySettings = () => {
    if (!extensionSettings) {
      return <div className="text-sm text-gray-500">Loading settings...</div>;
    }

    const handleToggleSetting = async (key: keyof ExtensionSettings) => {
      const newValue = !extensionSettings[key];
      await SettingsService.updateSettings({ [key]: newValue });
      setExtensionSettings({ ...extensionSettings, [key]: newValue });
    };

    return (
      <>
        {/* JavaScript Execution Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Security Notice</h3>
              <p className="text-sm text-amber-800">
                Some config-based agents may contain JavaScript code that runs in the page context.
                These settings control whether such agents can execute. Only enable if you trust the source of your agents.
              </p>
            </div>
          </div>
        </div>

        {/* JavaScript Execution Settings */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Allow JavaScript */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <div className="font-medium text-gray-900 mb-1">
                  Allow JavaScript in Configs
                </div>
                <div className="text-sm text-gray-600">
                  Enable execution of JavaScript snippets in config-based agents.
                  JavaScript runs in page context and cannot access extension APIs or credentials.
                </div>
              </div>
              <button
                onClick={() => handleToggleSetting('allowJavaScriptInConfigs')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  extensionSettings.allowJavaScriptInConfigs ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    extensionSettings.allowJavaScriptInConfigs ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Warn Before Executing */}
          <div className={`p-4 border-b border-gray-200 ${!extensionSettings.allowJavaScriptInConfigs ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <div className="font-medium text-gray-900 mb-1">
                  Warn Before Executing JavaScript
                </div>
                <div className="text-sm text-gray-600">
                  Show a warning dialog before executing any config that contains JavaScript.
                </div>
              </div>
              <button
                onClick={() => handleToggleSetting('warnBeforeExecutingJS')}
                disabled={!extensionSettings.allowJavaScriptInConfigs}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed ${
                  extensionSettings.warnBeforeExecutingJS ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    extensionSettings.warnBeforeExecutingJS ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Show JS Snippets */}
          <div className={`p-4 ${!extensionSettings.allowJavaScriptInConfigs ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <div className="font-medium text-gray-900 mb-1">
                  Show JavaScript Snippets Before Execution
                </div>
                <div className="text-sm text-gray-600">
                  Display JavaScript code in a review dialog before first execution, allowing you to inspect it.
                </div>
              </div>
              <button
                onClick={() => handleToggleSetting('showJSSnippetsBeforeExecution')}
                disabled={!extensionSettings.allowJavaScriptInConfigs}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed ${
                  extensionSettings.showJSSnippetsBeforeExecution ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    extensionSettings.showJSSnippetsBeforeExecution ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">What JavaScript Can and Cannot Do</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Access and manipulate page DOM</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Read page JavaScript variables</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>Access chrome.* extension APIs</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>Access stored credentials or API keys</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Render Cloud Sync settings
  const renderCloudSyncSettings = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
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
  );

  return (
    <div className="p-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-4">
        {activeSection !== 'main' && (
          <button
            onClick={() => setActiveSection('main')}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-800">
          {activeSection === 'main' && 'Settings'}
          {activeSection === 'models' && 'Models'}
          {activeSection === 'network' && 'Network Monitoring'}
          {activeSection === 'auto-load' && 'Auto-Load Rules'}
          {activeSection === 'processes' && 'Active Processes'}
          {activeSection === 'security' && 'Security'}
          {activeSection === 'billing' && 'Billing'}
          {activeSection === 'cloud-sync' && 'Cloud Sync'}
        </h2>
      </div>

      {/* Render appropriate section based on activeSection state */}
      {activeSection === 'main' && renderMainMenu()}
      {activeSection === 'models' && renderModelsSettings()}
      {activeSection === 'network' && renderNetworkSettings()}
      {activeSection === 'auto-load' && <AutoLoadRulesView />}
      {activeSection === 'processes' && <ProcessMonitorView />}
      {activeSection === 'security' && renderSecuritySettings()}
      {activeSection === 'billing' && renderBillingSettings()}
      {activeSection === 'cloud-sync' && renderCloudSyncSettings()}
    </div>
  );
};
