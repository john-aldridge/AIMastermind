/**
 * Agents View
 *
 * Shows all available agents and their configuration status.
 * Agents are high-level features that depend on clients.
 */

import React, { useState, useEffect } from 'react';
import { AgentRegistry } from '@/agents';
import type { AgentMetadata } from '@/agents';
import { AgentCard } from './AgentCard';
import { AgentSourceStorageService } from '@/storage/agentSourceStorage';
import type { AgentSourceStorage } from '@/types/agentSource';
import { ConfigRegistry } from '@/services/configRegistry';
import type { AgentConfig } from '@/types/agentConfig';
import { ConfigEditor } from './ConfigEditor';
import { JavaScriptReviewDialog, hasJavaScriptApproval } from './JavaScriptReviewDialog';
import { SettingsService } from '@/services/settingsService';

export const AgentsView: React.FC = () => {
  const [view, setView] = useState<'my-agents' | 'purchased'>('purchased');
  const [builtInAgents, setBuiltInAgents] = useState<AgentMetadata[]>([]);
  const [customAgents, setCustomAgents] = useState<AgentSourceStorage[]>([]);
  const [configAgents, setConfigAgents] = useState<AgentConfig[]>([]);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | undefined>();
  const [showJSReview, setShowJSReview] = useState(false);
  const [pendingExecution, setPendingExecution] = useState<{ config: AgentConfig; capabilityName: string } | null>(null);

  useEffect(() => {
    loadAgents();

    // Listen for storage changes to automatically refresh the list
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        // Check if any agent-related keys changed
        const agentKeys = Object.keys(changes).filter(key => key.startsWith('agent:source:'));
        if (agentKeys.length > 0) {
          console.log('[AgentsView] Storage changed, reloading agents:', agentKeys);
          loadAgents();
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const loadAgents = async () => {
    // Load built-in agents
    const allBuiltIn = AgentRegistry.getAllMetadata();
    console.log('[AgentsView] Loaded built-in agents:', allBuiltIn);
    setBuiltInAgents(allBuiltIn);

    // Load custom agents from storage
    const allCustom = await AgentSourceStorageService.listAllAgents();
    console.log('[AgentsView] Loaded custom agents:', allCustom);
    setCustomAgents(allCustom);

    // Load config-based agents
    const registry = ConfigRegistry.getInstance();
    const allConfigAgents = registry.listAgents();
    console.log('[AgentsView] Loaded config-based agents:', allConfigAgents);
    setConfigAgents(allConfigAgents);
  };

  const openEditor = (agentId: string) => {
    // Open editor in a new window (not a tab) for full-screen editing experience
    const editorUrl = chrome.runtime.getURL(`src/editor/index.html?agentId=${encodeURIComponent(agentId)}`);

    // Create a new window that takes up most of the screen
    chrome.windows.create({
      url: editorUrl,
      type: 'normal',
      state: 'maximized', // Maximize the window
    });
  };

  const handleCreateNewAgent = () => {
    // Open editor with new agent flag - agent will be created on first save
    const editorUrl = chrome.runtime.getURL(`src/editor/index.html?isNew=true`);

    chrome.windows.create({
      url: editorUrl,
      type: 'normal',
      state: 'maximized',
    });
  };

  const handleEditConfigAgent = (agentId: string) => {
    setEditingConfigId(agentId);
    setShowConfigEditor(true);
  };

  const handleConfigEditorClose = () => {
    setShowConfigEditor(false);
    setEditingConfigId(undefined);
    loadAgents(); // Reload to show updated config
  };

  const handleExecuteConfigAgent = async (config: AgentConfig, capabilityName: string) => {
    // Check if JS execution is allowed
    const settings = await SettingsService.getSettings();

    if (config.containsJavaScript && !settings.allowJavaScriptInConfigs) {
      alert('JavaScript execution is disabled. Enable it in Settings > Security to run this agent.');
      return;
    }

    // Check if we need to show review dialog
    if (config.containsJavaScript && settings.showJSSnippetsBeforeExecution && !hasJavaScriptApproval(config.id)) {
      setPendingExecution({ config, capabilityName });
      setShowJSReview(true);
      return;
    }

    // Execute the capability
    executeCapability(config, capabilityName);
  };

  const executeCapability = async (config: AgentConfig, capabilityName: string) => {
    try {
      const registry = ConfigRegistry.getInstance();
      const result = await registry.executeAgentCapability(config.id, capabilityName, {}, {});

      if (result.success) {
        console.log('[AgentsView] Capability executed successfully:', result);
      } else {
        console.error('[AgentsView] Capability execution failed:', result.error);
        alert(`Execution failed: ${result.error}`);
      }
    } catch (error) {
      console.error('[AgentsView] Capability execution error:', error);
      alert(`Execution error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleJSReviewApprove = () => {
    setShowJSReview(false);
    if (pendingExecution) {
      executeCapability(pendingExecution.config, pendingExecution.capabilityName);
      setPendingExecution(null);
    }
  };

  const handleJSReviewDeny = () => {
    setShowJSReview(false);
    setPendingExecution(null);
    alert('Execution cancelled by user.');
  };

  // Show config editor in full screen if open
  if (showConfigEditor) {
    return (
      <div className="h-full">
        <ConfigEditor
          configType="agent"
          configId={editingConfigId}
          onSave={handleConfigEditorClose}
          onCancel={handleConfigEditorClose}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* JavaScript Review Dialog */}
      {pendingExecution && (
        <JavaScriptReviewDialog
          config={pendingExecution.config}
          onApprove={handleJSReviewApprove}
          onDeny={handleJSReviewDeny}
          isOpen={showJSReview}
        />
      )}

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
          Purchased Agents
        </button>
        <button
          onClick={() => setView('my-agents')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            view === 'my-agents'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          My Agents
        </button>
      </div>

      {view === 'my-agents' ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">My Agents</h2>
              <p className="text-sm text-gray-600">
                Create and manage your custom agents
              </p>
            </div>
            <button
              onClick={handleCreateNewAgent}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Agent
            </button>
          </div>

          <div className="space-y-3">
            {/* Code-based custom agents */}
            {customAgents.map((agent) => (
              <div
                key={agent.agentId}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors cursor-pointer"
                onClick={() => openEditor(agent.agentId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        Code
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {agent.versions[agent.activeVersion]?.metadata.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>v{agent.activeVersion}</span>
                      <span>•</span>
                      <span>{Object.keys(agent.versions).length} version(s)</span>
                      <span>•</span>
                      <span>Updated {new Date(agent.lastUpdatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}

            {/* Config-based agents */}
            {configAgents.map((config) => (
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
                      <span>{config.capabilities.length} capability(s)</span>
                      <span>•</span>
                      <span>by {config.author}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExecuteConfigAgent(config, config.capabilities[0]?.name)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Execute first capability"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEditConfigAgent(config.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Edit config"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {customAgents.length === 0 && configAgents.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No agents yet</p>
                <button
                  onClick={handleCreateNewAgent}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Create New Agent
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Purchased Agents</h2>
            <p className="text-sm text-gray-600">
              Pre-built agents ready to use
            </p>
          </div>

          <div className="space-y-3">
            {/* Code-based built-in agents */}
            {builtInAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onUpdate={loadAgents} />
            ))}

            {/* Config-based purchased agents (example configs) */}
            {configAgents.map((config) => (
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
                      <span>{config.capabilities.length} capability(s)</span>
                      <span>•</span>
                      <span>by {config.author}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExecuteConfigAgent(config, config.capabilities[0]?.name)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Execute first capability"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEditConfigAgent(config.id)}
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
              </div>
            ))}

            {/* Empty state */}
            {builtInAgents.length === 0 && configAgents.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No purchased agents</p>
                <p className="text-sm text-gray-400">
                  Browse the agent store to purchase pre-built agents
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
