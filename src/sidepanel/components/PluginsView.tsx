/**
 * Plugins View
 *
 * Shows all available plugins and their configuration status.
 * Plugins are high-level features that depend on clients.
 */

import React, { useState, useEffect } from 'react';
import { PluginRegistry } from '@/plugins';
import type { PluginMetadata } from '@/plugins';
import { PluginCard } from './PluginCard';

export const PluginsView: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = () => {
    const allPlugins = PluginRegistry.getAllMetadata();
    console.log('[PluginsView] Loaded plugins:', allPlugins);
    setPlugins(allPlugins);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Plugins</h2>
        <p className="text-sm text-gray-600">
          High-level features that combine multiple capabilities. Plugins depend on configured clients.
        </p>
      </div>

      {plugins.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-500">No plugins available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} onUpdate={loadPlugins} />
          ))}
        </div>
      )}
    </div>
  );
};
