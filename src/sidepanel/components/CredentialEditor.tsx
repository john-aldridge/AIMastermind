import React, { useState } from 'react';
import { APIClient, useAppStore } from '@/state/appStore';

interface CredentialEditorProps {
  client: APIClient;
  onClose: () => void;
}

// Common credential templates for popular providers
const CREDENTIAL_TEMPLATES: Record<string, { cloud?: string[], serverDC?: string[], default: string[] }> = {
  'atlassian': {
    cloud: ['JIRA_URL', 'JIRA_USERNAME', 'JIRA_API_TOKEN', 'CONFLUENCE_URL', 'CONFLUENCE_USERNAME', 'CONFLUENCE_API_TOKEN'],
    serverDC: ['JIRA_URL', 'JIRA_PERSONAL_TOKEN', 'CONFLUENCE_URL', 'CONFLUENCE_PERSONAL_TOKEN'],
    default: ['JIRA_URL', 'JIRA_USERNAME', 'JIRA_API_TOKEN', 'CONFLUENCE_URL', 'CONFLUENCE_USERNAME', 'CONFLUENCE_API_TOKEN'],
  },
  'jira': {
    cloud: ['JIRA_URL', 'JIRA_USERNAME', 'JIRA_API_TOKEN'],
    serverDC: ['JIRA_URL', 'JIRA_PERSONAL_TOKEN'],
    default: ['JIRA_URL', 'JIRA_USERNAME', 'JIRA_API_TOKEN'],
  },
  'confluence': {
    cloud: ['CONFLUENCE_URL', 'CONFLUENCE_USERNAME', 'CONFLUENCE_API_TOKEN'],
    serverDC: ['CONFLUENCE_URL', 'CONFLUENCE_PERSONAL_TOKEN'],
    default: ['CONFLUENCE_URL', 'CONFLUENCE_USERNAME', 'CONFLUENCE_API_TOKEN'],
  },
  'github': { default: ['GITHUB_TOKEN', 'GITHUB_USERNAME'] },
  'slack': { default: ['SLACK_TOKEN', 'SLACK_WORKSPACE'] },
  'default': { default: ['API_KEY', 'BASE_URL'] },
};

export const CredentialEditor: React.FC<CredentialEditorProps> = ({ client, onClose }) => {
  const { updateClient } = useAppStore();

  // Determine if this is an Atlassian/Jira/Confluence client
  const isAtlassianClient = ['atlassian', 'jira', 'confluence'].some(key =>
    client.provider.toLowerCase().includes(key)
  );

  // Track deployment type for Atlassian clients
  const [deploymentType, setDeploymentType] = useState<'cloud' | 'serverDC'>('cloud');

  // Determine which template to use based on provider name
  const getCredentialKeys = (): string[] => {
    const provider = client.provider.toLowerCase();

    // Check if provider matches any template
    for (const [key, template] of Object.entries(CREDENTIAL_TEMPLATES)) {
      if (provider.includes(key)) {
        // For Atlassian clients, return fields based on deployment type
        if (isAtlassianClient && (template.cloud || template.serverDC)) {
          return deploymentType === 'cloud' ? (template.cloud || template.default) : (template.serverDC || template.default);
        }
        return template.default;
      }
    }

    // If client already has credentials, use those keys
    if (Object.keys(client.credentials).length > 0) {
      return Object.keys(client.credentials);
    }

    // Default template
    return CREDENTIAL_TEMPLATES.default.default;
  };

  const credentialKeys = getCredentialKeys();
  const [credentials, setCredentials] = useState<Record<string, string>>(
    credentialKeys.reduce((acc, key) => {
      acc[key] = client.credentials[key] || '';
      return acc;
    }, {} as Record<string, string>)
  );

  const handleSave = () => {
    updateClient(client.id, { credentials });
    onClose();
  };

  const handleChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const handleDeploymentTypeChange = (type: 'cloud' | 'serverDC') => {
    setDeploymentType(type);
    // Reset credentials when switching deployment type
    const newKeys = type === 'cloud'
      ? (CREDENTIAL_TEMPLATES[client.provider.toLowerCase()]?.cloud || CREDENTIAL_TEMPLATES.default.default)
      : (CREDENTIAL_TEMPLATES[client.provider.toLowerCase()]?.serverDC || CREDENTIAL_TEMPLATES.default.default);

    setCredentials(
      newKeys.reduce((acc, key) => {
        acc[key] = '';
        return acc;
      }, {} as Record<string, string>)
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Configure {client.name} Credentials
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Enter your API credentials to enable this client. All credentials are stored locally
          in your browser's extension storage.
        </p>

        {/* Deployment Type Selector for Atlassian clients */}
        {isAtlassianClient && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deployment Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeploymentTypeChange('cloud')}
                className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                  deploymentType === 'cloud'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cloud
              </button>
              <button
                onClick={() => handleDeploymentTypeChange('serverDC')}
                className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
                  deploymentType === 'serverDC'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Server/Data Center
              </button>
            </div>
          </div>
        )}

        {/* Help text for Atlassian credentials */}
        {isAtlassianClient ? (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            {deploymentType === 'cloud' ? (
              <>
                <p className="font-medium text-blue-900 mb-1">Getting Atlassian Cloud API Tokens:</p>
                <ol className="text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Visit: <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="underline">id.atlassian.com/manage-profile/security/api-tokens</a></li>
                  <li>Click "Create API token"</li>
                  <li>Give it a label (e.g., "Synergy AI")</li>
                  <li>Copy the token and paste it below</li>
                </ol>
                <p className="text-blue-800 mt-2">
                  <strong>Auth Method:</strong> Basic Authentication (username + API token)
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-blue-900 mb-1">Getting Personal Access Tokens (PAT):</p>
                <ol className="text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Log in to your Jira Server/Data Center instance</li>
                  <li>Go to: Profile → Personal Access Tokens</li>
                  <li>Click "Create token"</li>
                  <li>Give it a name and set permissions</li>
                  <li>Copy the token and paste it below</li>
                </ol>
                <p className="text-blue-800 mt-2">
                  <strong>Auth Method:</strong> Bearer Token (Authorization: Bearer &lt;token&gt;)
                </p>
              </>
            )}
          </div>
        ) : null}

        <div className="space-y-3 mb-6">
          {credentialKeys.map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {key.replace(/_/g, ' ')}
              </label>
              <input
                type={key.toLowerCase().includes('token') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password') ? 'password' : 'text'}
                value={credentials[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={
                  key.includes('URL') ? 'https://yourcompany.atlassian.net' :
                  key.includes('USERNAME') || key.includes('EMAIL') ? 'your.email@company.com' :
                  key.includes('TOKEN') || key.includes('KEY') ? 'Your API token or key' :
                  `Enter ${key.toLowerCase()}`
                }
                className="input-field"
              />
              {key.includes('URL') && (
                <p className="text-xs text-gray-500 mt-1">
                  Example: https://yourcompany.atlassian.net
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-primary flex-1">
            Save Credentials
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
