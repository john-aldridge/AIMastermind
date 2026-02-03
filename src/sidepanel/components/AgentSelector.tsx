import React, { useState, useEffect } from 'react';
import { AgentSourceStorage } from '@/types/agentSource';
import { AgentSourceStorageService } from '@/storage/agentSourceStorage';

interface PluginSelectorProps {
  selectedPluginId: string | null;
  onSelect: (agentId: string) => void;
  onCreateNew: () => void;
}

export const PluginSelector: React.FC<PluginSelectorProps> = ({ selectedPluginId, onSelect, onCreateNew }) => {
  const [plugins, setPlugins] = useState<AgentSourceStorage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setIsLoading(true);
    try {
      const allPlugins = await AgentSourceStorageService.listAllAgents();
      setPlugins(allPlugins);

      // Auto-select first plugin if none selected
      if (!selectedPluginId && allPlugins.length > 0) {
        onSelect(allPlugins[0].agentId);
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
        <span className="text-sm text-gray-600">Loading plugins...</span>
      </div>
    );
  }

  const selectedPlugin = plugins.find((p) => p.agentId === selectedPluginId);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <select
            value={selectedPluginId || ''}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            {plugins.length === 0 && <option value="">No plugins available</option>}
            {plugins.map((plugin) => (
              <option key={plugin.agentId} value={plugin.agentId}>
                {plugin.name} (v{plugin.activeVersion})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          title="Create new plugin"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
      </div>

      {selectedPlugin && (
        <div className="mt-2 text-xs text-gray-600 flex items-center gap-4">
          <span>ID: {selectedPlugin.agentId}</span>
          <span>•</span>
          <span>Updated {formatDate(selectedPlugin.lastUpdatedAt)}</span>
          <span>•</span>
          <span>{Object.keys(selectedPlugin.versions).length} version(s)</span>
        </div>
      )}
    </div>
  );
};
