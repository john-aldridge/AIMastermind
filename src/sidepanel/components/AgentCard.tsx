/**
 * Agent Card Component
 *
 * Displays an agent with its configuration status and allows configuration.
 */

import React, { useState, useEffect } from 'react';
import type { AgentMetadata } from '@/agents';
import { AgentRegistry } from '@/agents';
import { AgentConfigEditor } from './AgentConfigEditor';

interface AgentCardProps {
  agent: AgentMetadata;
  onUpdate: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [hasDependencies, setHasDependencies] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, [agent.id]);

  const checkConfiguration = async () => {
    // Check if plugin is configured
    const storageKey = `plugin:${agent.id}`;
    const data = await chrome.storage.local.get(storageKey);
    const config = data[storageKey];

    setIsConfigured(!!config?.config && Object.keys(config.config).length > 0);

    // Check dependencies
    const canResolve = AgentRegistry.canResolveDependencies(agent.id);
    setHasDependencies(canResolve);
  };

  const agentInstance = AgentRegistry.getInstance(agent.id);
  const dependencies = agentInstance?.getDependencies() || [];
  const capabilities = agentInstance?.getCapabilities() || [];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {agent.icon && <span className="text-2xl">{agent.icon}</span>}
              <h3 className="font-semibold text-gray-800">{agent.name}</h3>
              {!isConfigured && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                  Not Configured
                </span>
              )}
              {isConfigured && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Configured
                </span>
              )}
              {!hasDependencies && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  Missing Dependencies
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">{agent.description}</p>

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{capabilities.length} capabilities</span>
              <span>•</span>
              <span>v{agent.version}</span>
              {dependencies.length > 0 && (
                <>
                  <span>•</span>
                  <span>Requires: {dependencies.join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {!hasDependencies ? (
            <div className="flex-1">
              <div className="text-xs text-red-600 mb-2">
                ⚠️ Required clients not configured: {dependencies.join(', ')}
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="btn-secondary text-xs py-1 px-3"
              >
                {expanded ? 'Hide Details' : 'View Details'}
              </button>
            </div>
          ) : !isConfigured ? (
            <>
              <button
                onClick={() => setShowConfigEditor(true)}
                className="btn-primary text-xs py-1.5 px-4 flex-1"
              >
                Configure Plugin
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="btn-secondary text-xs py-1 px-3"
              >
                {expanded ? 'Hide' : 'Details'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowConfigEditor(true)}
                className="btn-secondary text-xs py-1 px-3 flex-1"
              >
                Reconfigure
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="btn-secondary text-xs py-1 px-3 flex-1"
              >
                {expanded ? 'Hide' : 'Details'}
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          {/* Dependencies Section */}
          {dependencies.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-medium text-gray-700 block mb-2">
                Dependencies
              </span>
              <div className="space-y-1">
                {dependencies.map((dep) => (
                  <div key={dep} className="text-xs text-gray-600 flex items-center gap-2">
                    {hasDependencies ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                    <span>{dep}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capabilities Section */}
          <div className="mb-3">
            <span className="text-xs font-medium text-gray-700 block mb-2">
              Capabilities ({capabilities.length})
            </span>
            {capabilities.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                No capabilities defined
              </p>
            ) : (
              <div className="space-y-2">
                {capabilities.map((capability, index) => (
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
                  ✓ Plugin configured and ready to use from chat
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showConfigEditor && agentInstance && (
        <AgentConfigEditor
          agent={agent}
          agentInstance={agentInstance}
          onClose={() => {
            setShowConfigEditor(false);
            checkConfiguration();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};
