/**
 * Agents View
 *
 * Shows all available agents and their configuration status.
 * Agents are high-level features that depend on clients.
 */

import React, { useState, useEffect, useRef } from 'react';
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

type AgentsViewTab = 'my-agents' | 'purchased' | 'sample-agents';

interface AgentsViewProps {
  onOpenEditor?: (agentId: string | null, isNew: boolean) => void;
  activeTab?: AgentsViewTab;
  onTabChange?: (tab: AgentsViewTab) => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ onOpenEditor, activeTab, onTabChange }) => {
  // Use props if provided, otherwise fall back to internal state
  const [internalView, setInternalView] = useState<AgentsViewTab>('purchased');
  const view = activeTab ?? internalView;
  const setView = onTabChange ?? setInternalView;
  const [builtInAgents, setBuiltInAgents] = useState<AgentMetadata[]>([]);
  const [customAgents, setCustomAgents] = useState<AgentSourceStorage[]>([]);
  const [configAgents, setConfigAgents] = useState<AgentConfig[]>([]);  // User-created config agents
  const [purchasedConfigAgents, setPurchasedConfigAgents] = useState<AgentConfig[]>([]);  // Purchased config agents
  const [sampleConfigAgents, setSampleConfigAgents] = useState<AgentConfig[]>([]);  // Example/sample config agents
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | undefined>();
  const [showJSReview, setShowJSReview] = useState(false);
  const [pendingExecution, setPendingExecution] = useState<{ config: AgentConfig; capabilityName: string; tabId?: number } | null>(null);
  const [showNewAgentDropdown, setShowNewAgentDropdown] = useState(false);
  const [activeEditDropdown, setActiveEditDropdown] = useState<string | null>(null);
  const newAgentDropdownRef = useRef<HTMLDivElement>(null);
  const editDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // View split button state
  const [activeViewDropdown, setActiveViewDropdown] = useState<string | null>(null);
  const viewDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Run split button state
  const [activeRunDropdown, setActiveRunDropdown] = useState<string | null>(null);
  const [showRunConfirmModal, setShowRunConfirmModal] = useState(false);
  const [showRunConfigModal, setShowRunConfigModal] = useState(false);
  const [runTargetAgent, setRunTargetAgent] = useState<AgentConfig | null>(null);
  const [availableTabs, setAvailableTabs] = useState<chrome.tabs.Tab[]>([]);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<string>('');
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [savedRunConfigs, setSavedRunConfigs] = useState<Record<string, { capabilityName: string; tabId: number }>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [runResult, setRunResult] = useState<{ message: string; details?: string } | null>(null);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const runDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const tabDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgents();

    // Listen for storage changes to automatically refresh the list
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        // Check if any agent-related keys changed
        const agentKeys = Object.keys(changes).filter(key =>
          key.startsWith('agent:source:') || key === 'agent_configs'
        );
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNewAgentDropdown && newAgentDropdownRef.current && !newAgentDropdownRef.current.contains(event.target as Node)) {
        setShowNewAgentDropdown(false);
      }
      if (activeEditDropdown) {
        const ref = editDropdownRefs.current.get(activeEditDropdown);
        if (ref && !ref.contains(event.target as Node)) {
          setActiveEditDropdown(null);
        }
      }
      if (activeRunDropdown) {
        const ref = runDropdownRefs.current.get(activeRunDropdown);
        if (ref && !ref.contains(event.target as Node)) {
          setActiveRunDropdown(null);
        }
      }
      if (activeViewDropdown) {
        const ref = viewDropdownRefs.current.get(activeViewDropdown);
        if (ref && !ref.contains(event.target as Node)) {
          setActiveViewDropdown(null);
        }
      }
      if (showTabDropdown && tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
        setShowTabDropdown(false);
      }
    };

    const handleBlur = () => {
      setShowNewAgentDropdown(false);
      setActiveEditDropdown(null);
      setActiveRunDropdown(null);
      setActiveViewDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('blur', handleBlur);
    };
  }, [showNewAgentDropdown, activeEditDropdown, activeRunDropdown, activeViewDropdown, showTabDropdown]);

  const loadAgents = async () => {
    // Load built-in agents
    const allBuiltIn = AgentRegistry.getAllMetadata();
    console.log('[AgentsView] Loaded built-in agents:', allBuiltIn);
    setBuiltInAgents(allBuiltIn);

    // Load custom agents from storage
    const allCustom = await AgentSourceStorageService.listAllAgents();
    console.log('[AgentsView] Loaded custom agents:', allCustom);
    setCustomAgents(allCustom);

    // Load config-based agents - ensure registry is initialized from storage first
    const registry = ConfigRegistry.getInstance();
    await registry.loadAgentsFromStorage(); // Load from storage in case registry is empty
    const allConfigAgents = registry.listAgents();
    console.log('[AgentsView] Loaded config-based agents:', allConfigAgents);

    // Filter by source field
    const userConfigAgents = allConfigAgents.filter(c => c.source === 'user');
    const sampleAgents = allConfigAgents.filter(c => c.source === 'example');
    const purchasedAgents = allConfigAgents.filter(c => c.source === 'purchased');
    setConfigAgents(userConfigAgents);
    setSampleConfigAgents(sampleAgents);
    setPurchasedConfigAgents(purchasedAgents);
  };

  const openEditorInSidepanel = (agentId: string) => {
    if (onOpenEditor) {
      onOpenEditor(agentId, false);
    }
    setActiveEditDropdown(null);
  };

  const openEditorInNewTab = (agentId: string) => {
    const editorUrl = chrome.runtime.getURL(`src/editor/index.html?agentId=${encodeURIComponent(agentId)}`);
    chrome.tabs.create({ url: editorUrl });
    setActiveEditDropdown(null);
  };

  const handleCreateNewAgentInSidepanel = () => {
    if (onOpenEditor) {
      onOpenEditor(null, true);
    }
    setShowNewAgentDropdown(false);
  };

  const handleCreateNewAgentInNewTab = () => {
    const editorUrl = chrome.runtime.getURL(`src/editor/index.html?isNew=true`);
    chrome.tabs.create({ url: editorUrl });
    setShowNewAgentDropdown(false);
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

  const executeCapability = async (config: AgentConfig, capabilityName: string, tabId?: number) => {
    try {
      const registry = ConfigRegistry.getInstance();
      const result = await registry.executeAgentCapability(config.id, capabilityName, {}, tabId ? { tabId } : {});

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
      executeCapability(pendingExecution.config, pendingExecution.capabilityName, pendingExecution.tabId);
      setPendingExecution(null);
    }
  };

  const handleJSReviewDeny = () => {
    setShowJSReview(false);
    setPendingExecution(null);
    alert('Execution cancelled by user.');
  };

  // Load available tabs for run configuration
  const loadAvailableTabs = async () => {
    try {
      const allTabs = await chrome.tabs.query({});
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = activeTab?.id || null;

      const filteredTabs = allTabs.filter(tab =>
        tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('about:')
      );

      const sortedTabs = filteredTabs.sort((a, b) => {
        if (a.id === activeTabId) return -1;
        if (b.id === activeTabId) return 1;
        return 0;
      });

      setAvailableTabs(sortedTabs);
      setCurrentTabId(activeTabId);

      if (activeTabId && sortedTabs.some(t => t.id === activeTabId)) {
        setSelectedTabId(activeTabId);
      } else if (sortedTabs.length > 0 && !selectedTabId) {
        setSelectedTabId(sortedTabs[0].id || null);
      }
    } catch (error) {
      console.error('Failed to load tabs:', error);
    }
  };

  // Load saved run config for an agent
  const loadSavedRunConfig = async (agentId: string) => {
    try {
      const key = `run_config_${agentId}`;
      const result = await chrome.storage.local.get(key);
      if (result[key]) {
        setSavedRunConfigs(prev => ({ ...prev, [agentId]: result[key] }));
        return result[key];
      }
    } catch (error) {
      console.error('Failed to load run config:', error);
    }
    return null;
  };

  // Open run confirmation modal
  const openRunConfirmModal = async (config: AgentConfig) => {
    setRunTargetAgent(config);
    await loadAvailableTabs();

    const savedConfig = savedRunConfigs[config.id] || await loadSavedRunConfig(config.id);

    if (savedConfig) {
      setSelectedCapability(savedConfig.capabilityName);
      setSelectedTabId(savedConfig.tabId);
    } else if (config.capabilities.length > 0) {
      setSelectedCapability(config.capabilities[0].name);
    }

    setActiveRunDropdown(null);
    setShowRunConfirmModal(true);
  };

  // Open run configuration modal
  const openRunConfigModal = async (config: AgentConfig) => {
    setRunTargetAgent(config);
    await loadAvailableTabs();

    const savedConfig = savedRunConfigs[config.id] || await loadSavedRunConfig(config.id);

    if (savedConfig) {
      setSelectedCapability(savedConfig.capabilityName);
      setSelectedTabId(savedConfig.tabId);
    } else if (config.capabilities.length > 0) {
      setSelectedCapability(config.capabilities[0].name);
    }

    setActiveRunDropdown(null);
    setShowRunConfigModal(true);
  };

  // Save run configuration
  const saveRunConfiguration = async () => {
    if (!runTargetAgent || !selectedCapability || !selectedTabId) return;

    const config = { capabilityName: selectedCapability, tabId: selectedTabId };
    setSavedRunConfigs(prev => ({ ...prev, [runTargetAgent.id]: config }));

    try {
      const key = `run_config_${runTargetAgent.id}`;
      await chrome.storage.local.set({ [key]: config });
    } catch (error) {
      console.error('Failed to save run config:', error);
    }

    setShowRunConfigModal(false);
    setShowTabDropdown(false);
  };

  // Execute run with confirmation
  const executeRun = async () => {
    if (!runTargetAgent || !selectedCapability || !selectedTabId) return;

    setIsRunning(true);
    setRunStatus('running');
    setRunResult(null);
    setShowTabDropdown(false);

    try {
      // Check if JS execution is allowed
      const settings = await SettingsService.getSettings();

      if (runTargetAgent.containsJavaScript && !settings.allowJavaScriptInConfigs) {
        setRunStatus('error');
        setRunResult({ message: 'JavaScript execution is disabled', details: 'Enable it in Settings > Security to run this agent.' });
        setIsRunning(false);
        return;
      }

      // Check if we need to show review dialog
      if (runTargetAgent.containsJavaScript && settings.showJSSnippetsBeforeExecution && !hasJavaScriptApproval(runTargetAgent.id)) {
        setShowRunConfirmModal(false);
        setPendingExecution({ config: runTargetAgent, capabilityName: selectedCapability, tabId: selectedTabId });
        setShowJSReview(true);
        setIsRunning(false);
        setRunStatus('idle');
        return;
      }

      // Execute the capability
      const registry = ConfigRegistry.getInstance();
      const result = await registry.executeAgentCapability(runTargetAgent.id, selectedCapability, {}, { tabId: selectedTabId });

      if (result.success) {
        console.log('[AgentsView] Capability executed successfully:', result);
        setRunStatus('success');
        // Only show details if it's meaningful
        let details: string | undefined;
        if (typeof result.data === 'string' && result.data !== '[object Object]' && result.data.trim() !== '') {
          details = result.data;
        } else if (result.data && typeof result.data === 'object') {
          // For objects, show a summary if available
          const data = result.data as any;
          if (data.successful !== undefined && data.totalOperations !== undefined) {
            details = `${data.successful} of ${data.totalOperations} operations completed`;
          }
          // Otherwise don't show details for complex objects
        }
        setRunResult({ message: 'Agent completed successfully!', details });
      } else {
        console.error('[AgentsView] Capability execution failed:', result.error);
        setRunStatus('error');
        setRunResult({ message: 'Execution failed', details: result.error });
      }
    } catch (error) {
      console.error('[AgentsView] Capability execution error:', error);
      setRunStatus('error');
      setRunResult({ message: 'Execution error', details: error instanceof Error ? error.message : String(error) });
    }

    setIsRunning(false);
  };

  // Close the run modal and reset state
  const closeRunModal = () => {
    setShowRunConfirmModal(false);
    setShowTabDropdown(false);
    setRunStatus('idle');
    setRunResult(null);
  };

  // Render run dropdown button for an agent
  const renderRunSplitButton = (config: AgentConfig) => {
    const dropdownKey = `run-${config.id}`;
    const isDropdownOpen = activeRunDropdown === dropdownKey;

    return (
      <div
        className="relative"
        ref={(el) => { if (el) runDropdownRefs.current.set(dropdownKey, el); }}
      >
        <button
          onClick={() => setActiveRunDropdown(isDropdownOpen ? null : dropdownKey)}
          disabled={isRunning || config.capabilities.length === 0}
          className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <button
              onClick={() => {
                openRunConfirmModal(config);
                setActiveRunDropdown(null);
              }}
              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 rounded-t-lg"
            >
              Run
            </button>
            <button
              onClick={() => {
                openRunConfigModal(config);
                setActiveRunDropdown(null);
              }}
              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 rounded-b-lg"
            >
              Configure and Run
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render view split button for an agent
  const renderViewSplitButton = (agentId: string) => {
    const dropdownKey = `view-${agentId}`;
    const isDropdownOpen = activeViewDropdown === dropdownKey;

    return (
      <div
        className="relative flex"
        ref={(el) => { if (el) viewDropdownRefs.current.set(dropdownKey, el); }}
      >
        <button
          onClick={() => openEditorInNewTab(agentId)}
          className="px-3 py-1 text-xs font-medium bg-primary-600 text-white rounded-l hover:bg-primary-700 transition-colors whitespace-nowrap"
        >
          View
        </button>
        <button
          onClick={() => setActiveViewDropdown(isDropdownOpen ? null : dropdownKey)}
          className="px-1.5 py-1 bg-primary-700 text-white rounded-r hover:bg-primary-800 transition-colors border-l border-primary-500"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <button
              onClick={() => {
                openEditorInNewTab(agentId);
                setActiveViewDropdown(null);
              }}
              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 rounded-t-lg"
            >
              View in New Tab
            </button>
            <button
              onClick={() => {
                openEditorInSidepanel(agentId);
                setActiveViewDropdown(null);
              }}
              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 rounded-b-lg"
            >
              View in Sidepanel
            </button>
          </div>
        )}
      </div>
    );
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
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setView('purchased')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
            view === 'purchased'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Purchased
        </button>
        <button
          onClick={() => setView('my-agents')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
            view === 'my-agents'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          My Agents
        </button>
        <button
          onClick={() => setView('sample-agents')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
            view === 'sample-agents'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Samples
        </button>
      </div>

      {view === 'my-agents' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">My Agents</h2>
              <p className="text-sm text-gray-600">
                Create and manage your custom agents
              </p>
            </div>
            <div className="relative flex" ref={newAgentDropdownRef}>
              <button
                onClick={handleCreateNewAgentInNewTab}
                className="px-4 py-2 bg-primary-600 text-white rounded-l-lg hover:bg-primary-700 transition-colors"
              >
                New Agent
              </button>
              <button
                onClick={() => setShowNewAgentDropdown(!showNewAgentDropdown)}
                className="px-2 py-2 bg-primary-700 text-white rounded-r-lg hover:bg-primary-800 transition-colors border-l border-primary-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showNewAgentDropdown && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={handleCreateNewAgentInNewTab}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                  >
                    Open in New Tab
                  </button>
                  <button
                    onClick={handleCreateNewAgentInSidepanel}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
                  >
                    Open in Sidepanel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Code-based custom agents */}
            {customAgents.map((agent) => (
              <div
                key={agent.agentId}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 transition-colors cursor-pointer"
                onClick={() => openEditorInNewTab(agent.agentId)}
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
                  <div
                    className="relative"
                    ref={(el) => { if (el) editDropdownRefs.current.set(agent.agentId, el); }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setActiveEditDropdown(activeEditDropdown === agent.agentId ? null : agent.agentId)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    {activeEditDropdown === agent.agentId && (
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => openEditorInSidepanel(agent.agentId)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                          Edit in Sidepanel
                        </button>
                        <button
                          onClick={() => openEditorInNewTab(agent.agentId)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Edit in New Tab
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Config-based agents */}
            {configAgents.map((config) => (
              <div
                key={config.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-300 transition-colors cursor-pointer"
                onClick={() => openEditorInNewTab(config.id)}
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
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {renderRunSplitButton(config)}
                    {renderViewSplitButton(config.id)}
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
                  onClick={() => onOpenEditor ? handleCreateNewAgentInSidepanel() : handleCreateNewAgentInNewTab()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Create New Agent
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'purchased' && (
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
            {purchasedConfigAgents.map((config) => (
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
                    {renderRunSplitButton(config)}
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
            {builtInAgents.length === 0 && purchasedConfigAgents.length === 0 && (
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

      {view === 'sample-agents' && (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Sample Agents</h2>
            <p className="text-sm text-gray-600">
              Example agents to learn from
            </p>
          </div>

          <div className="space-y-3">
            {/* Sample config-based agents */}
            {sampleConfigAgents.map((config) => (
              <div
                key={config.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-amber-300 transition-colors cursor-pointer"
                onClick={() => openEditorInNewTab(config.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{config.icon} {config.name}</h4>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                        Sample
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
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {renderRunSplitButton(config)}
                    {renderViewSplitButton(config.id)}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {sampleConfigAgents.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No sample agents available</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Run Confirmation Modal */}
      {showRunConfirmModal && runTargetAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {runStatus === 'idle' && 'Confirm Run'}
                {runStatus === 'running' && 'Running Agent...'}
                {runStatus === 'success' && 'Run Complete'}
                {runStatus === 'error' && 'Run Failed'}
              </h3>
              {runStatus !== 'running' && (
                <button
                  onClick={closeRunModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Idle state - show confirmation */}
            {runStatus === 'idle' && (
              <>
                <div className="mb-6">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800 mb-2">
                      Are you sure you want to run <strong>"{selectedCapability}"</strong> on:
                    </p>
                    <div className="flex items-center gap-2 bg-white/50 rounded px-2 py-1">
                      {availableTabs.find(t => t.id === selectedTabId)?.favIconUrl ? (
                        <img
                          src={availableTabs.find(t => t.id === selectedTabId)?.favIconUrl}
                          alt=""
                          className="w-4 h-4 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      <span className="text-sm font-medium text-orange-900 truncate">
                        {availableTabs.find(t => t.id === selectedTabId)?.title?.slice(0, 40) || 'Unknown tab'}
                      </span>
                    </div>
                    <p className="text-xs text-orange-600 mt-2">
                      This will execute real actions on the selected tab.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeRunModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeRun}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Run
                  </button>
                </div>
              </>
            )}

            {/* Running state - show spinner */}
            {runStatus === 'running' && (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
                <p className="text-gray-600">Executing <strong>{selectedCapability}</strong>...</p>
                <p className="text-sm text-gray-400 mt-2">Please wait while the agent runs</p>
              </div>
            )}

            {/* Success state */}
            {runStatus === 'success' && runResult && (
              <>
                <div className="mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <svg className="w-12 h-12 mx-auto text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-800 font-medium">{runResult.message}</p>
                    {runResult.details && (
                      <p className="text-sm text-green-600 mt-2">{runResult.details}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeRunModal}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Close
                </button>
              </>
            )}

            {/* Error state */}
            {runStatus === 'error' && runResult && (
              <>
                <div className="mb-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <svg className="w-12 h-12 mx-auto text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-800 font-medium">{runResult.message}</p>
                    {runResult.details && (
                      <p className="text-sm text-red-600 mt-2">{runResult.details}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={closeRunModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => { setRunStatus('idle'); setRunResult(null); }}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Run Configuration Modal */}
      {showRunConfigModal && runTargetAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Configure Run</h3>
              <button
                onClick={() => { setShowRunConfigModal(false); setShowTabDropdown(false); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Capability Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Capability</label>
              <select
                value={selectedCapability}
                onChange={(e) => setSelectedCapability(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {runTargetAgent.capabilities.length === 0 ? (
                  <option value="">No capabilities available</option>
                ) : (
                  runTargetAgent.capabilities.map((cap) => (
                    <option key={cap.name} value={cap.name}>
                      {cap.name} - {cap.description}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Target Tab Selection with icons */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Tab</label>
              <div className="relative" ref={tabDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowTabDropdown(!showTabDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-left flex items-center gap-2"
                >
                  {selectedTabId && availableTabs.find(t => t.id === selectedTabId) ? (
                    <>
                      {availableTabs.find(t => t.id === selectedTabId)?.favIconUrl ? (
                        <img
                          src={availableTabs.find(t => t.id === selectedTabId)?.favIconUrl}
                          alt=""
                          className="w-4 h-4 flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      <span className="truncate flex-1 text-sm">
                        {availableTabs.find(t => t.id === selectedTabId)?.title?.slice(0, 40) || 'Untitled'}
                        {selectedTabId === currentTabId ? ' - current tab' : ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500 text-sm">Select a tab...</span>
                  )}
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTabDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {availableTabs.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No tabs available</div>
                    ) : (
                      availableTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setSelectedTabId(tab.id || null);
                            setShowTabDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-100 ${
                            selectedTabId === tab.id ? 'bg-primary-50' : ''
                          }`}
                        >
                          {tab.favIconUrl ? (
                            <img
                              src={tab.favIconUrl}
                              alt=""
                              className="w-4 h-4 flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">
                              {tab.title?.slice(0, 50) || 'Untitled'}
                              {tab.id === currentTabId && (
                                <span className="text-primary-600 ml-1">- current tab</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{tab.url?.slice(0, 50)}...</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                These settings will be saved for this agent.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowRunConfigModal(false); setShowTabDropdown(false); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRunConfiguration}
                disabled={!selectedCapability || !selectedTabId}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
