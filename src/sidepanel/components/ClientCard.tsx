import React, { useState, useEffect } from 'react';
import { APIClient, useAppStore } from '@/state/appStore';
import { CredentialEditor } from './CredentialEditor';
import { RegisteredClientCredentialEditor } from './RegisteredClientCredentialEditor';
import { ClientRegistry } from '@/clients';
import type { ClientMetadata } from '@/clients';

interface ClientCardProps {
  client?: APIClient; // For imported MCP clients
  clientMetadata?: ClientMetadata; // For registered executable clients
}

export const ClientCard: React.FC<ClientCardProps> = ({ client, clientMetadata }) => {
  const [expanded, setExpanded] = useState(false);
  const [showCredentialEditor, setShowCredentialEditor] = useState(false);
  const { deleteClient, toggleClientActive } = useAppStore();

  // For registered clients, check if credentials are configured
  const [isConfigured, setIsConfigured] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [clientInstance, setClientInstance] = useState<any>(null);

  const loadClientState = async () => {
    if (clientMetadata) {
      // Get client instance first
      const instance = ClientRegistry.getInstance(clientMetadata.id);
      setClientInstance(instance);

      // Check chrome storage for saved credentials
      const data = await chrome.storage.local.get(`client:${clientMetadata.id}`);
      const stored = data[`client:${clientMetadata.id}`];

      // Check if configured:
      // - If client requires no credentials (empty array), it's always configured if stored
      // - If client requires credentials, check if they're provided
      const credentialFields = instance?.getCredentialFields() || [];
      const requiresCredentials = credentialFields.length > 0;

      if (requiresCredentials) {
        setIsConfigured(!!stored?.credentials && Object.keys(stored.credentials).length > 0);
      } else {
        // No credentials needed - configured if it exists in storage
        setIsConfigured(!!stored);
      }

      // Load active state
      setIsActive(!!stored?.isActive);

      // Load credentials if available
      if (stored?.credentials && instance) {
        instance.setCredentials(stored.credentials);
      }
    }
  };

  useEffect(() => {
    loadClientState();
  }, [clientMetadata]);

  // Toggle active state for built-in clients (stored in chrome.storage)
  const toggleBuiltInClientActive = async () => {
    if (!clientMetadata) return;

    const storageKey = `client:${clientMetadata.id}`;
    const data = await chrome.storage.local.get(storageKey);
    const stored = data[storageKey] || {};

    const newIsActive = !stored.isActive;
    await chrome.storage.local.set({
      [storageKey]: {
        ...stored,
        isActive: newIsActive,
      },
    });

    setIsActive(newIsActive);
  };

  const handleDelete = () => {
    const name = client?.name || clientMetadata?.name || 'this client';

    if (confirm(`Delete client "${name}"? This will remove all stored credentials.`)) {
      if (client) {
        deleteClient(client.id);
      } else if (clientMetadata) {
        // Remove from chrome storage
        chrome.storage.local.remove(`client:${clientMetadata.id}`);
        setIsConfigured(false);
      }
    }
  };

  // Determine display values
  const displayName = client?.name || clientMetadata?.name || 'Unknown';
  const displayDescription = client?.description || clientMetadata?.description || '';
  const displayIcon = clientMetadata?.icon;
  const capabilitiesCount = client?.capabilities.length || clientInstance?.getCapabilities().length || 0;
  const isBuiltIn = !!clientMetadata; // It's a built-in client if we have metadata

  // For imported clients, use the zustand store state; for built-in, use local state from chrome storage
  const displayIsActive = isBuiltIn ? isActive : (client?.isActive || false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {displayIcon && (
                displayIcon.startsWith('http') || displayIcon.startsWith('/') ? (
                  <img src={displayIcon} alt={displayName} className="w-5 h-5" />
                ) : (
                  <span className="text-xl leading-none">{displayIcon}</span>
                )
              )}
              <h3 className="font-semibold text-gray-800">{displayName}</h3>
              {isBuiltIn && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  Built-in
                </span>
              )}
              {!isConfigured && isBuiltIn && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                  Not Configured
                </span>
              )}
              {client?.isPurchased && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Imported
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{displayDescription}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{capabilitiesCount} capabilities</span>
              {clientMetadata && (
                <>
                  <span>•</span>
                  <span>v{clientMetadata.version}</span>
                </>
              )}
            </div>
          </div>

          {/* Active/Inactive Toggle - always visible, disabled if not configured */}
          {(() => {
            const canToggle = isBuiltIn ? isConfigured : !!client;
            return (
              <button
                onClick={() => {
                  if (!canToggle) return;
                  if (isBuiltIn) {
                    toggleBuiltInClientActive();
                  } else if (client) {
                    toggleClientActive(client.id);
                  }
                }}
                disabled={!canToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  !canToggle
                    ? 'bg-gray-200 cursor-not-allowed opacity-50'
                    : displayIsActive
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
                title={!canToggle ? 'Configure credentials first' : displayIsActive ? 'Active - click to deactivate' : 'Inactive - click to activate'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    displayIsActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            );
          })()}
        </div>

        <div className="flex gap-2 mt-3">
          {isBuiltIn && !isConfigured ? (
            // For unconfigured built-in clients, show prominent Configure button
            <>
              <button
                onClick={() => setShowCredentialEditor(true)}
                className="btn-primary text-xs py-1.5 px-4 flex-1"
              >
                Configure Credentials
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="btn-secondary text-xs py-1 px-3"
              >
                {expanded ? 'Hide' : 'Details'}
              </button>
            </>
          ) : (
            // For configured clients (both built-in and imported)
            <>
              <button
                onClick={() => setShowCredentialEditor(true)}
                className="btn-secondary text-xs py-1 px-3 flex-1"
              >
                {isConfigured ? 'Reconfigure' : 'Configure'}
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="btn-secondary text-xs py-1 px-3 flex-1"
              >
                {expanded ? 'Hide' : 'Details'}
              </button>
              {!isBuiltIn && client && (
                <button
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 text-xs px-2"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          {/* Capabilities Section */}
          <div className="mb-3">
            <span className="text-xs font-medium text-gray-700 block mb-2">
              Capabilities ({capabilitiesCount})
            </span>
            {capabilitiesCount === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                No capabilities defined
              </p>
            ) : (
              <div className="space-y-2">
                {client?.capabilities.map((capability, index) => (
                  <div
                    key={index}
                    className="bg-white rounded p-2 text-xs border border-gray-200"
                  >
                    <div className="font-medium text-gray-700">{capability.name}</div>
                    <div className="text-gray-500 mt-1">{capability.description}</div>
                    {capability.method && capability.endpoint && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-primary-600 font-mono">{capability.method}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 font-mono text-[10px]">
                          {capability.endpoint}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {clientInstance?.getCapabilities().map((capability: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white rounded p-2 text-xs border border-gray-200"
                  >
                    <div className="font-medium text-gray-700">{capability.name}</div>
                    <div className="text-gray-500 mt-1">{capability.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Section */}
          {isConfigured && (
            <div>
              <span className="text-xs font-medium text-gray-700 block mb-2">Status</span>
              <div className="bg-white rounded p-2 text-xs border border-gray-200">
                <div className="text-green-600">
                  ✓ Credentials configured and ready to use
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showCredentialEditor && clientMetadata && clientInstance && (
        <RegisteredClientCredentialEditor
          clientMetadata={clientMetadata}
          clientInstance={clientInstance}
          onClose={() => {
            setShowCredentialEditor(false);
            // Reload configuration and active status
            loadClientState();
          }}
        />
      )}

      {showCredentialEditor && client && !clientMetadata && (
        <CredentialEditor
          client={client}
          onClose={() => setShowCredentialEditor(false)}
        />
      )}
    </div>
  );
};
