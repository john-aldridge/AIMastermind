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
  const [isActive, setIsActive] = useState(false);
  const [hasDependencies, setHasDependencies] = useState(false);

  useEffect(() => {
    checkConfiguration();
  }, [agent.id]);

  const checkConfiguration = async () => {
    // Check if plugin is configured
    const storageKey = `plugin:${agent.id}`;
    const data = await chrome.storage.local.get(storageKey);
    const config = data[storageKey];

    // Get the agent's config fields to check which are required
    const instance = AgentRegistry.getInstance(agent.id);
    const configFields = instance?.getConfigFields() || [];
    const requiredFields = configFields.filter(f => f.required);

    // Agent is configured if:
    // 1. It has no required config fields, OR
    // 2. All required config fields are filled in
    const hasNoRequiredFields = requiredFields.length === 0;
    const allRequiredFieldsFilled = requiredFields.every(
      field => config?.config?.[field.key]
    );

    setIsConfigured(hasNoRequiredFields || allRequiredFieldsFilled);
    setIsActive(!!config?.isActive);

    // Check dependencies
    const canResolve = AgentRegistry.canResolveDependencies(agent.id);
    setHasDependencies(canResolve);
  };

  const toggleAgentActive = async () => {
    const storageKey = `plugin:${agent.id}`;
    const data = await chrome.storage.local.get(storageKey);
    const config = data[storageKey] || {};

    const newIsActive = !config.isActive;
    await chrome.storage.local.set({
      [storageKey]: {
        ...config,
        isActive: newIsActive,
      },
    });

    setIsActive(newIsActive);
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

          {/* Active/Inactive Toggle - always visible, disabled if not configured or missing deps */}
          {(() => {
            const canToggle = isConfigured && hasDependencies;
            const disabledReason = !hasDependencies
              ? 'Configure required clients first'
              : !isConfigured
              ? 'Configure agent first'
              : '';
            return (
              <button
                onClick={() => canToggle && toggleAgentActive()}
                disabled={!canToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  !canToggle
                    ? 'bg-gray-200 cursor-not-allowed opacity-50'
                    : isActive
                    ? 'bg-purple-500'
                    : 'bg-gray-300'
                }`}
                title={!canToggle ? disabledReason : isActive ? 'Active - click to deactivate' : 'Inactive - click to activate'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            );
          })()}
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
