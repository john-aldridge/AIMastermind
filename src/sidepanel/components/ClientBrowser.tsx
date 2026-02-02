/**
 * Client Browser
 *
 * UI for discovering and installing executable API clients.
 * Shows all registered clients from the ClientRegistry.
 */

import React, { useState, useEffect } from 'react';
import { ClientRegistry } from '@/clients';
import type { ClientMetadata } from '@/clients';

interface ClientBrowserProps {
  onInstall: (clientId: string) => void;
  installedClients: string[];
}

export const ClientBrowser: React.FC<ClientBrowserProps> = ({
  onInstall,
  installedClients,
}) => {
  const [clients, setClients] = useState<ClientMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = () => {
    const allClients = ClientRegistry.getAllMetadata();
    setClients(allClients);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      selectedTag === 'all' ||
      client.tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase());

    return matchesSearch && matchesTag;
  });

  const allTags = ['all', ...new Set(clients.flatMap(c => c.tags))];

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Browse Clients</h2>
        <p className="text-sm text-gray-600">
          Install executable API clients to extend your AI assistant's capabilities
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 space-y-2">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search clients..."
          className="input-field"
        />

        <div className="flex gap-2 flex-wrap">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedTag === tag
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No clients found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map(client => {
            const isInstalled = installedClients.includes(client.id);

            return (
              <div
                key={client.id}
                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {client.icon && (
                      <img
                        src={client.icon}
                        alt={client.name}
                        className="w-10 h-10 rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{client.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{client.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>v{client.version}</span>
                        <span>•</span>
                        <span>by {client.author}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {client.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onInstall(client.id)}
                    disabled={isInstalled}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      isInstalled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {isInstalled ? 'Installed' : 'Install'}
                  </button>
                </div>

                {client.homepage && (
                  <a
                    href={client.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline mt-2 inline-block"
                  >
                    Learn more →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
