import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/state/appStore';
import { ClientCard } from './ClientCard';
import { CreateClientModal } from './CreateClientModal';
import { ClientRegistry } from '@/clients';
import type { ClientMetadata } from '@/clients';
import { ConfigRegistry } from '@/services/configRegistry';
import type { ClientConfig } from '@/types/clientConfig';
import { ConfigEditor } from './ConfigEditor';

export const ClientsView: React.FC = () => {
  const { clients } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState<'my-clients' | 'purchased'>('purchased');
  const [registeredClients, setRegisteredClients] = useState<ClientMetadata[]>([]);
  const [configClients, setConfigClients] = useState<ClientConfig[]>([]);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | undefined>();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    // Load registered clients from ClientRegistry
    const allClients = ClientRegistry.getAllMetadata();
    setRegisteredClients(allClients);

    // Load config-based clients
    const registry = ConfigRegistry.getInstance();
    const allConfigClients = registry.listClients();
    setConfigClients(allConfigClients);
  };

  const handleCreateConfigClient = () => {
    setEditingConfigId(undefined);
    setShowConfigEditor(true);
  };

  const handleEditConfigClient = (clientId: string) => {
    setEditingConfigId(clientId);
    setShowConfigEditor(true);
  };

  const handleConfigEditorClose = () => {
    setShowConfigEditor(false);
    setEditingConfigId(undefined);
    loadClients(); // Reload to show updated config
  };

  // Show config editor in full screen if open
  if (showConfigEditor) {
    return (
      <div className="h-full">
        <ConfigEditor
          configType="client"
          configId={editingConfigId}
          onSave={handleConfigEditorClose}
          onCancel={handleConfigEditorClose}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* View Selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('purchased')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            view === 'purchased'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Purchased Clients
        </button>
        <button
          onClick={() => setView('my-clients')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            view === 'my-clients'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          My Clients
        </button>
      </div>

      {view === 'purchased' ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Purchased Clients</h2>
              <p className="text-sm text-gray-600">
                Pre-configured API clients ready to use
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateConfigClient}
                className="bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 px-3 rounded-lg transition-colors"
              >
                New Config Client
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-sm py-1.5 px-3"
              >
                Import MCP Client
              </button>
            </div>
          </div>

          {registeredClients.length === 0 && clients.length === 0 && configClients.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">No clients available</p>
              <p className="text-sm text-gray-400 mb-4">
                Import a client to connect external APIs to your AI assistant
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show registered clients from ClientRegistry */}
              {registeredClients.map((clientMeta) => (
                <ClientCard
                  key={clientMeta.id}
                  clientMetadata={clientMeta}
                />
              ))}

              {/* Show config-based clients */}
              {configClients.map((config) => (
                <div
                  key={config.id}
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{config.icon} {config.name}</h4>
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                          Config
                        </span>
                        {config.containsJavaScript && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            JS
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>v{config.version}</span>
                        <span>•</span>
                        <span>{config.capabilities.length} endpoint(s)</span>
                        <span>•</span>
                        <span>{config.auth.type} auth</span>
                        <span>•</span>
                        <span>by {config.author}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditConfigClient(config.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="View/Edit config"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Show imported MCP clients */}
              {clients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">My Clients</h2>
              <p className="text-sm text-gray-600">
                Create and manage your custom API clients
              </p>
            </div>
            <button
              onClick={handleCreateConfigClient}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Config Client
            </button>
          </div>

          {configClients.length > 0 ? (
            <div className="space-y-3">
              {configClients.map((config) => (
                <div
                  key={config.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{config.icon} {config.name}</h4>
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                          Config
                        </span>
                        {config.containsJavaScript && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            JS
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>v{config.version}</span>
                        <span>•</span>
                        <span>{config.capabilities.length} endpoint(s)</span>
                        <span>•</span>
                        <span>{config.auth.type} auth</span>
                        <span>•</span>
                        <span>by {config.author}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditConfigClient(config.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Edit config"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">No Custom Clients</p>
              <p className="text-sm text-gray-400 mb-4">
                Create config-based API clients to connect external services
              </p>
              <button
                onClick={handleCreateConfigClient}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Your First Client
              </button>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateClientModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};
