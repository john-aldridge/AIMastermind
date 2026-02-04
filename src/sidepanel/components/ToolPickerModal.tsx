/**
 * Tool Picker Modal Component
 *
 * Modal for manually selecting which tools to enable for the session.
 * Lists all configured clients grouped by category with toggle on/off.
 */

import React, { useState, useEffect } from 'react';
import { toolSessionManager } from '@/services/toolSessionManager';
import { ClientRegistry } from '@/clients';
import { AgentRegistry } from '@/agents';

interface ToolPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AvailableTool {
  clientId: string;
  name: string;
  description: string;
  isActive: boolean;
  source?: 'always-on' | 'context-suggested' | 'user-pinned';
  category: 'client' | 'plugin';
  tags?: string[];
}

export const ToolPickerModal: React.FC<ToolPickerModalProps> = ({ isOpen, onClose }) => {
  const [tools, setTools] = useState<AvailableTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadTools = async () => {
    setLoading(true);
    try {
      const availableTools: AvailableTool[] = [];
      const activeToolsList = await toolSessionManager.getActiveTools();
      const activeMap = new Map(activeToolsList.map(t => [t.clientId, t.source]));

      // Get all registered clients
      const clientIds = ClientRegistry.getAllIds();
      for (const id of clientIds) {
        const metadata = ClientRegistry.getMetadata(id);
        if (metadata) {
          // Check if configured
          const storageKey = `client:${id}`;
          const data = await chrome.storage.local.get(storageKey);
          const clientConfig = data[storageKey];

          const clientInstance = ClientRegistry.getInstance(id);
          if (!clientInstance) continue;

          const credentialFields = clientInstance.getCredentialFields();
          const requiresCredentials = credentialFields.length > 0;

          let isConfigured = false;
          if (requiresCredentials) {
            isConfigured = !!clientConfig?.credentials && Object.keys(clientConfig.credentials).length > 0;
          } else {
            isConfigured = true; // Clients without credentials are always available
          }

          // Only show configured clients (except always-on which are always shown)
          const isAlwaysOn = id === 'browser';
          if (isConfigured || isAlwaysOn) {
            availableTools.push({
              clientId: id,
              name: metadata.name,
              description: metadata.description,
              isActive: activeMap.has(id),
              source: activeMap.get(id),
              category: 'client',
              tags: metadata.tags,
            });
          }
        }
      }

      // Get all registered plugins
      const pluginIds = AgentRegistry.getAllIds();
      for (const id of pluginIds) {
        const metadata = AgentRegistry.getMetadata(id);
        if (metadata) {
          // Check if configured
          const storageKey = `plugin:${id}`;
          const data = await chrome.storage.local.get(storageKey);
          const pluginConfig = data[storageKey];

          if (pluginConfig?.config && pluginConfig?.isActive) {
            availableTools.push({
              clientId: id,
              name: metadata.name,
              description: metadata.description,
              isActive: activeMap.has(id),
              source: activeMap.get(id),
              category: 'plugin',
              tags: metadata.tags,
            });
          }
        }
      }

      setTools(availableTools);
    } catch (error) {
      console.error('[ToolPickerModal] Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTools();
    }
  }, [isOpen]);

  const handleToggle = async (tool: AvailableTool) => {
    if (tool.source === 'always-on') {
      // Can't toggle always-on tools
      return;
    }

    if (tool.isActive) {
      // Deactivate: either unpin or dismiss
      if (tool.source === 'user-pinned') {
        toolSessionManager.unpinTool(tool.clientId);
      } else if (tool.source === 'context-suggested') {
        toolSessionManager.dismissSuggestion(tool.clientId);
      } else {
        toolSessionManager.removeTool(tool.clientId);
      }
    } else {
      // Activate: pin the tool
      toolSessionManager.pinTool(tool.clientId);
    }

    // Reload tools after change
    await loadTools();
  };

  const filteredTools = tools.filter(tool => {
    // Apply search filter
    const matchesSearch = searchQuery === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    // Apply active filter
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && tool.isActive) ||
      (activeFilter === 'inactive' && !tool.isActive);

    return matchesSearch && matchesActive;
  });

  // Group by category
  const clientTools = filteredTools.filter(t => t.category === 'client');
  const pluginTools = filteredTools.filter(t => t.category === 'plugin');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Tools</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  activeFilter === filter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tool List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No tools found</p>
              <p className="text-xs mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            <>
              {/* Clients Section */}
              {clientTools.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Clients
                  </h3>
                  <div className="space-y-2">
                    {clientTools.map((tool) => (
                      <ToolItem
                        key={tool.clientId}
                        tool={tool}
                        onToggle={() => handleToggle(tool)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Plugins Section */}
              {pluginTools.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Plugins
                  </h3>
                  <div className="space-y-2">
                    {pluginTools.map((tool) => (
                      <ToolItem
                        key={tool.clientId}
                        tool={tool}
                        onToggle={() => handleToggle(tool)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500 text-center">
            Pinned tools stay active across page changes. Configure more clients in Settings.
          </p>
        </div>
      </div>
    </div>
  );
};

interface ToolItemProps {
  tool: AvailableTool;
  onToggle: () => void;
}

const ToolItem: React.FC<ToolItemProps> = ({ tool, onToggle }) => {
  const isAlwaysOn = tool.source === 'always-on';

  const getSourceBadge = () => {
    switch (tool.source) {
      case 'always-on':
        return <span className="text-xs text-gray-400">Always on</span>;
      case 'context-suggested':
        return <span className="text-xs text-blue-500">Suggested</span>;
      case 'user-pinned':
        return <span className="text-xs text-green-500">Pinned</span>;
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        tool.isActive
          ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex-1 min-w-0 mr-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 truncate">
            {tool.name}
          </span>
          {getSourceBadge()}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
          {tool.description}
        </p>
        {tool.tags && tool.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {tool.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onToggle}
        disabled={isAlwaysOn}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isAlwaysOn
            ? 'bg-gray-300 cursor-not-allowed'
            : tool.isActive
            ? 'bg-blue-600'
            : 'bg-gray-200'
        }`}
        title={isAlwaysOn ? 'Always-on tools cannot be disabled' : tool.isActive ? 'Click to disable' : 'Click to enable'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            tool.isActive ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default ToolPickerModal;
