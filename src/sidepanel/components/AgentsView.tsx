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

export const AgentsView: React.FC = () => {
  const [view, setView] = useState<'my-agents' | 'purchased'>('purchased');
  const [builtInAgents, setBuiltInAgents] = useState<AgentMetadata[]>([]);
  const [customAgents, setCustomAgents] = useState<AgentSourceStorage[]>([]);

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
              Create New Agent
            </button>
          </div>

          {customAgents.length > 0 ? (
            <div className="space-y-3">
              {customAgents.map((agent) => (
                <div
                  key={agent.agentId}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors cursor-pointer"
                  onClick={() => openEditor(agent.agentId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{agent.name}</h4>
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
            </div>
          ) : (
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
                Create Your First Agent
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Purchased Agents</h2>
            <p className="text-sm text-gray-600">
              Pre-built agents ready to use
            </p>
          </div>

          {builtInAgents.length > 0 ? (
            <div className="space-y-3">
              {builtInAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onUpdate={loadAgents} />
              ))}
            </div>
          ) : (
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
        </>
      )}
    </div>
  );
};
