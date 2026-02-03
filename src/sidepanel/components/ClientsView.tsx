import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/state/appStore';
import { ClientCard } from './ClientCard';
import { CreateClientModal } from './CreateClientModal';
import { ClientRegistry } from '@/clients';
import type { ClientMetadata } from '@/clients';

export const ClientsView: React.FC = () => {
  const { clients } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [view, setView] = useState<'my-clients' | 'purchased'>('purchased');
  const [registeredClients, setRegisteredClients] = useState<ClientMetadata[]>([]);

  useEffect(() => {
    // Load registered clients from ClientRegistry
    const allClients = ClientRegistry.getAllMetadata();
    setRegisteredClients(allClients);
  }, []);

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
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-sm py-1.5 px-3"
              >
                Import Client
              </button>
            </div>
          </div>

          {registeredClients.length === 0 && clients.length === 0 ? (
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

              {/* Show imported MCP clients */}
              {clients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          )}
        </>
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
          <p className="text-sm text-gray-400">
            Custom client integrations will appear here
          </p>
        </div>
      )}

      {showCreateModal && (
        <CreateClientModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};
