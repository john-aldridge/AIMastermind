// Import Monaco workers using Vite's native ?worker syntax
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import React, { useState, useEffect, useRef } from 'react';
import { MonacoEditor } from '../sidepanel/components/MonacoEditor';
import { VersionManager } from '../sidepanel/components/VersionManager';
import { EditorChatPanel } from '../sidepanel/components/EditorChatPanel';
import { ResizablePanel } from './ResizablePanel';
import { ResourcesPane, ResourceType } from './components/ResourcesPane';
import { MarkdownPreview } from './components/MarkdownPreview';
import { apiService } from '../utils/api';
import { ConfigStorageService } from '../storage/configStorage';
import { ConfigRegistry } from '../services/configRegistry';
import type { AgentConfig } from '../types/agentConfig';

// Configure Monaco to use Vite-bundled workers
if (typeof window !== 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorker: function (_moduleId: string, label: string) {
      if (label === 'json') {
        return new JsonWorker();
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new CssWorker();
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new HtmlWorker();
      }
      if (label === 'typescript' || label === 'javascript') {
        return new TsWorker();
      }
      return new EditorWorker();
    }
  };
}

// Blank agent config template
const BLANK_AGENT_CONFIG_TEMPLATE = JSON.stringify({
  id: "new-agent",
  name: "New Agent",
  description: "A new custom agent",
  version: "1.0.0",
  author: "Your Name",
  icon: "🤖",
  tags: [],
  source: "user",
  containsJavaScript: false,
  requiresPageAccess: false,
  configFields: [],
  dependencies: [],
  capabilities: [
    {
      name: "example_capability",
      description: "An example capability",
      parameters: [],
      trigger: {
        type: "manual"
      },
      isLongRunning: false,
      actions: [
        {
          type: "notify",
          title: "Hello from Agent",
          message: "This is an example capability"
        }
      ]
    }
  ]
}, null, 2);

export interface EditorAppProps {
  // Embedded mode (sidepanel) vs standalone mode (new tab)
  mode?: 'standalone' | 'embedded';
  // Props for embedded mode (instead of URL params)
  agentId?: string | null;
  isNew?: boolean;
  onClose?: () => void;
}

export const EditorApp: React.FC<EditorAppProps> = ({
  mode = 'standalone',
  agentId: propAgentId,
  isNew: propIsNew,
  onClose: propOnClose,
}) => {
  const [agentId, setPluginId] = useState<string | null>(null);
  const [isNewAgent, setIsNewAgent] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [pluginName, setPluginName] = useState<string>('');
  const [pluginDescription, setPluginDescription] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [originalCode, setOriginalCode] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveDescription, setSaveDescription] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionBump, setVersionBump] = useState<'none' | 'patch' | 'minor' | 'major'>('none');
  const [selectedResource, setSelectedResource] = useState<ResourceType>('agent-code');
  const [editorMode, setEditorMode] = useState<'details' | 'preview'>('details');
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [originalReadme, setOriginalReadme] = useState<string>('');
  const [isResourcesPaneCollapsed, setIsResourcesPaneCollapsed] = useState(true);
  const [isAIAssistantCollapsed, setIsAIAssistantCollapsed] = useState(true);
  const [copyButtonText, setCopyButtonText] = useState('Copy All');
  const [availableTabs, setAvailableTabs] = useState<chrome.tabs.Tab[]>([]);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<string>('');
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  // Validation state
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | 'validating'>('validating');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const validationTimerRef = useRef<number | null>(null);

  // Run configuration state
  const [showRunDropdown, setShowRunDropdown] = useState(false);
  const [showRunConfigModal, setShowRunConfigModal] = useState(false);
  const [showRunConfirmModal, setShowRunConfirmModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [savedRunConfig, setSavedRunConfig] = useState<{ capabilityName: string; tabId: number } | null>(null);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const runDropdownRef = useRef<HTMLDivElement>(null);
  const tabDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize API service with user's configuration
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        const STORAGE_KEY = 'ai_mastermind_user_config';
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const userConfig = result[STORAGE_KEY];

        console.log('[EditorApp] Loaded userConfig:', userConfig);

        if (userConfig && userConfig.activeConfigurationId && userConfig.savedConfigurations) {
          const activeConfig = userConfig.savedConfigurations.find(
            (c: any) => c.id === userConfig.activeConfigurationId
          );

          console.log('[EditorApp] Active config:', activeConfig);

          if (activeConfig) {
            // Set API key
            const apiKey = activeConfig.credentials.apiKey || activeConfig.credentials.api_key;
            console.log('[EditorApp] API key found:', apiKey ? 'Yes' : 'No');

            if (apiKey) {
              apiService.setApiKey(apiKey);
            } else {
              console.error('[EditorApp] No API key found in configuration');
              showNotification('error', 'API key not configured. Please configure your API key in Settings.');
              return;
            }

            // Map provider ID to API service provider type
            const providerMap: Record<string, 'openai' | 'claude'> = {
              'anthropic': 'claude',
              'openai': 'openai',
              'our-models': 'claude',
            };
            const mappedProvider = providerMap[activeConfig.providerId] || 'claude';
            apiService.setProvider(mappedProvider);
            apiService.setModel(activeConfig.model);

            console.log('[EditorApp] API service initialized:', {
              provider: mappedProvider,
              model: activeConfig.model,
              hasApiKey: !!apiKey
            });
          } else {
            console.error('[EditorApp] No active configuration found');
            showNotification('error', 'No active API configuration. Please configure in Settings.');
          }
        } else {
          console.error('[EditorApp] No user config or saved configurations found');
          showNotification(
            'error',
            'API not configured. Please:\n1. Open the extension side panel\n2. Go to Settings tab\n3. Configure your API key\n4. Then reopen the editor'
          );
        }
      } catch (error) {
        console.error('[EditorApp] Failed to initialize API service:', error);
        showNotification('error', 'Failed to initialize API: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    };

    initializeAPI();
  }, []);

  // Get plugin ID from URL params (standalone) or props (embedded)
  useEffect(() => {
    let id: string | null = null;
    let isNew = false;

    if (mode === 'embedded') {
      // Use props in embedded mode
      id = propAgentId || null;
      isNew = propIsNew || false;
    } else {
      // Use URL params in standalone mode
      const params = new URLSearchParams(window.location.search);
      id = params.get('agentId');
      isNew = params.get('isNew') === 'true';
    }

    if (isNew) {
      // Generate a temporary ID for new agent
      const timestamp = Date.now();
      const tempId = `new-agent-${timestamp}`;
      setPluginId(tempId);
      setIsNewAgent(true);
      setPluginName('New Agent');
      setPluginDescription('A new custom agent');

      // Load blank config template
      setCode(BLANK_AGENT_CONFIG_TEMPLATE);
      setOriginalCode(BLANK_AGENT_CONFIG_TEMPLATE);
      setReadmeContent('');
      setOriginalReadme('');
    } else if (id) {
      setPluginId(id);
    }
  }, [mode, propAgentId, propIsNew]);

  // Load plugin when ID is set (but not for new agents)
  useEffect(() => {
    if (agentId && !isNewAgent) {
      loadPlugin(agentId);
    }
  }, [agentId, isNewAgent]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(code !== originalCode || readmeContent !== originalReadme);
  }, [code, originalCode, readmeContent, originalReadme]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (hasUnsavedChanges && agentId) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = window.setTimeout(() => {
        handleAutoSave();
      }, 30000); // 30 seconds

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }
  }, [hasUnsavedChanges, code, agentId]);

  // Listen for tab changes to keep the tab list updated
  useEffect(() => {
    const handleTabChange = () => {
      if (showRunConfigModal || showRunConfirmModal) {
        loadAvailableTabs();
      }
    };

    // Listen for various tab events
    chrome.tabs.onCreated.addListener(handleTabChange);
    chrome.tabs.onRemoved.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener(handleTabChange);
    chrome.tabs.onActivated.addListener(handleTabChange);

    return () => {
      chrome.tabs.onCreated.removeListener(handleTabChange);
      chrome.tabs.onRemoved.removeListener(handleTabChange);
      chrome.tabs.onUpdated.removeListener(handleTabChange);
      chrome.tabs.onActivated.removeListener(handleTabChange);
    };
  }, [showRunConfigModal, showRunConfirmModal]);

  // Validate code on load and after changes (debounced)
  useEffect(() => {
    const validateCode = () => {
      setValidationStatus('validating');
      try {
        const config: AgentConfig = JSON.parse(code);
        const validation = ConfigStorageService.validateAgentConfig(config);
        if (validation.valid) {
          setValidationStatus('valid');
          setValidationErrors([]);
        } else {
          setValidationStatus('invalid');
          setValidationErrors(validation.errors);
        }
      } catch (parseError) {
        setValidationStatus('invalid');
        setValidationErrors([`Invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`]);
      }
    };

    // Clear any existing timer
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    // Validate after a short delay (debounced)
    validationTimerRef.current = window.setTimeout(validateCode, 500);

    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [code]);

  // Load saved run configuration for this agent
  useEffect(() => {
    const loadRunConfig = async () => {
      if (!agentId) return;
      try {
        const key = `run_config_${agentId}`;
        const result = await chrome.storage.local.get(key);
        if (result[key]) {
          setSavedRunConfig(result[key]);
          setSelectedCapability(result[key].capabilityName);
          setSelectedTabId(result[key].tabId);
        }
      } catch (error) {
        console.error('Failed to load run config:', error);
      }
    };
    loadRunConfig();
  }, [agentId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showRunDropdown && runDropdownRef.current && !runDropdownRef.current.contains(event.target as Node)) {
        setShowRunDropdown(false);
      }
      if (showTabDropdown && tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
        setShowTabDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRunDropdown, showTabDropdown]);

  const loadPlugin = async (id: string) => {
    try {
      const agentConfig = await ConfigStorageService.loadAgentConfig(id);
      if (agentConfig) {
        setPluginName(agentConfig.name);
        setPluginDescription(agentConfig.description);
        setCurrentVersion(agentConfig.version);

        const configJson = JSON.stringify(agentConfig, null, 2);
        setCode(configJson);
        setOriginalCode(configJson);
        setReadmeContent(''); // Configs don't have separate README
        setOriginalReadme('');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      showNotification('error', 'Failed to load agent: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleVersionChange = async (_version: string) => {
    // Config-based agents don't have separate versions in storage
    // The version is just a property in the JSON config
    showNotification('error', 'Version management not available for config-based agents. Edit the version field in the JSON config directly.');
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleApplyCodeFromChat = (newCode: string) => {
    if (confirm('Replace current code with AI suggestion?')) {
      setCode(newCode);
      showNotification('success', 'Code applied from AI assistant');
    }
  };

  const handleAutoSave = async () => {
    if (!agentId || !hasUnsavedChanges || isNewAgent) return; // Don't auto-save new unsaved agents

    try {
      // Parse and validate JSON
      let config: AgentConfig;
      try {
        config = JSON.parse(code);
      } catch (parseError) {
        console.error('Auto-save failed: Invalid JSON', parseError);
        return;
      }

      // Validate config schema
      const validation = ConfigStorageService.validateAgentConfig(config);
      if (!validation.valid) {
        console.error('Auto-save failed: Invalid config', validation.errors);
        return;
      }

      // Save the config
      await ConfigStorageService.saveAgentConfig(config);

      setOriginalCode(code);
      setHasUnsavedChanges(false);

      console.log('Auto-saved agent config:', agentId);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = () => {
    if (isViewingExample) {
      showNotification('error', 'Cannot save changes to example files. Copy the code to your agent instead.');
      return;
    }
    setShowSaveModal(true);
    setSaveDescription('');
  };

  const confirmSave = async () => {
    if (!agentId) return;

    setIsSaving(true);

    try {
      // Parse and validate JSON
      let config: AgentConfig;
      try {
        config = JSON.parse(code);
      } catch (parseError) {
        showNotification('error', 'Cannot save: Invalid JSON\n' + (parseError instanceof Error ? parseError.message : 'Unknown error'));
        setIsSaving(false);
        setShowSaveModal(false);
        return;
      }

      // Validate config schema
      const validation = ConfigStorageService.validateAgentConfig(config);
      if (!validation.valid) {
        showNotification('error', 'Cannot save: Invalid config\n' + validation.errors.join('\n'));
        setIsSaving(false);
        setShowSaveModal(false);
        return;
      }

      // Update config metadata from form inputs
      config.name = pluginName.trim() || config.name;
      config.description = pluginDescription.trim() || config.description;

      // Save the config
      await ConfigStorageService.saveAgentConfig(config);

      // Register with config registry
      const registry = ConfigRegistry.getInstance();
      registry.registerAgent(config);

      setIsNewAgent(false);
      setOriginalCode(JSON.stringify(config, null, 2));
      setHasUnsavedChanges(false);
      setShowSaveModal(false);

      showNotification('success', 'Agent saved successfully!');

      // Reload to show updated config
      await loadPlugin(config.id);
    } catch (error) {
      showNotification('error', 'Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const loadAvailableTabs = async () => {
    try {
      // Get all tabs from all windows
      const allTabs = await chrome.tabs.query({});
      // Get the active tab in the current window
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = activeTab?.id || null;

      // Filter out extension pages
      const filteredTabs = allTabs.filter(tab =>
        tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('about:')
      );

      // Sort so current tab is first
      const sortedTabs = filteredTabs.sort((a, b) => {
        if (a.id === activeTabId) return -1;
        if (b.id === activeTabId) return 1;
        return 0;
      });

      setAvailableTabs(sortedTabs);
      setCurrentTabId(activeTabId);

      // Auto-select the current tab
      if (activeTabId && sortedTabs.some(t => t.id === activeTabId)) {
        setSelectedTabId(activeTabId);
      } else if (sortedTabs.length > 0 && !selectedTabId) {
        setSelectedTabId(sortedTabs[0].id || null);
      }
    } catch (error) {
      console.error('Failed to load tabs:', error);
    }
  };

  // Open the run confirmation modal
  const openRunConfirmModal = async () => {
    if (validationStatus !== 'valid') {
      showNotification('error', 'Cannot run: Agent config is invalid');
      return;
    }

    await loadAvailableTabs();

    // Use saved config or defaults
    try {
      const config: AgentConfig = JSON.parse(code);
      if (!selectedCapability && config.capabilities.length > 0) {
        setSelectedCapability(savedRunConfig?.capabilityName || config.capabilities[0].name);
      }
      if (!selectedTabId && currentTabId) {
        setSelectedTabId(savedRunConfig?.tabId || currentTabId);
      }
    } catch {
      // Ignore parse errors, validation will catch them
    }

    setShowRunConfirmModal(true);
  };

  // Open the run configuration modal
  const openRunConfigModal = async () => {
    if (validationStatus !== 'valid') {
      showNotification('error', 'Cannot configure: Agent config is invalid');
      return;
    }

    await loadAvailableTabs();

    try {
      const config: AgentConfig = JSON.parse(code);
      if (!selectedCapability && config.capabilities.length > 0) {
        setSelectedCapability(savedRunConfig?.capabilityName || config.capabilities[0].name);
      }
      if (!selectedTabId && currentTabId) {
        setSelectedTabId(savedRunConfig?.tabId || currentTabId);
      }
    } catch {
      // Ignore parse errors
    }

    setShowRunDropdown(false);
    setShowRunConfigModal(true);
  };

  // Save run configuration
  const saveRunConfiguration = async () => {
    if (!agentId || !selectedCapability || !selectedTabId) return;

    const config = { capabilityName: selectedCapability, tabId: selectedTabId };
    setSavedRunConfig(config);

    try {
      const key = `run_config_${agentId}`;
      await chrome.storage.local.set({ [key]: config });
      showNotification('success', 'Run configuration saved');
    } catch (error) {
      console.error('Failed to save run config:', error);
    }

    setShowRunConfigModal(false);
  };

  // Execute the agent capability
  const executeRun = async () => {
    if (!agentId || !selectedCapability || !selectedTabId) return;

    setIsRunning(true);
    setShowRunConfirmModal(false);

    try {
      const config: AgentConfig = JSON.parse(code);
      const registry = ConfigRegistry.getInstance();
      registry.registerAgent(config);

      const result = await registry.executeAgentCapability(
        config.id,
        selectedCapability,
        {},
        { tabId: selectedTabId }
      );

      if (result.success) {
        showNotification('success', `Capability "${selectedCapability}" executed successfully`);
      } else {
        showNotification('error', `Execution failed: ${result.error}`);
      }
    } catch (error) {
      showNotification('error', 'Execution failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  // Get capability and tab names for display
  const getCapabilityName = (capName: string): string => {
    try {
      const config: AgentConfig = JSON.parse(code);
      const cap = config.capabilities.find(c => c.name === capName);
      return cap?.name || capName;
    } catch {
      return capName;
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleDownload = () => {
    if (!agentId || !pluginName) return;

    // Create downloadable file
    const downloadFile = (content: string, filename: string, mimeType: string) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Download config file
    const configFilename = `${agentId}.json`;
    downloadFile(code, configFilename, 'application/json');

    showNotification('success', 'Agent config downloaded successfully');
  };

  const handleDelete = async () => {
    if (!agentId) return;

    const confirmMessage = `Are you sure you want to delete "${pluginName}"?\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await ConfigStorageService.deleteAgentConfig(agentId);

      // Remove from registry
      const registry = ConfigRegistry.getInstance();
      registry.removeAgent(agentId);

      showNotification('success', `Agent "${pluginName}" deleted successfully`);

      // Close the editor window after a brief delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (error) {
      showNotification('error', 'Failed to delete agent: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }
    if (mode === 'embedded' && propOnClose) {
      propOnClose();
    } else {
      window.close();
    }
  };

  const handleCopyAll = async () => {
    const contentToCopy = selectedResource === 'agent-code'
      ? code
      : readmeContent;

    try {
      await navigator.clipboard.writeText(contentToCopy);
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy All'), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      showNotification('error', 'Failed to copy to clipboard');
    }
  };

  const handleResourceSelect = (resource: ResourceType) => {
    setSelectedResource(resource);
    // Reload the user's agent files when switching resources
    if (agentId) {
      loadPlugin(agentId);
    }
  };

  // Examples are now shown in the Sample Agents tab, not in the editor
  const isViewingExample = false;

  if (!agentId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plugin Specified</h3>
          <p className="text-gray-600">Plugin ID not found in URL parameters.</p>
        </div>
      </div>
    );
  }

  // Render header (shared between modes)
  const renderHeader = () => (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 shadow-lg flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 max-w-2xl">
          <input
            type="text"
            value={pluginName}
            onChange={(e) => setPluginName(e.target.value)}
            className="w-full px-2 py-1 text-lg font-bold bg-white/20 border border-white/30 rounded text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 mb-2"
            placeholder="Agent Name"
          />
          <input
            type="text"
            value={pluginDescription}
            onChange={(e) => setPluginDescription(e.target.value)}
            className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            placeholder="Agent description"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 font-medium"
          >
            Close
          </button>

          <button
            onClick={handleDownload}
            disabled={isViewingExample}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            title={isViewingExample ? 'Cannot download example files' : 'Download agent files'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>

          <button
            onClick={handleDelete}
            disabled={isViewingExample}
            className="px-4 py-2 bg-red-500/90 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            title={isViewingExample ? 'Cannot delete example files' : 'Delete this agent'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isViewingExample}
            className="px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            title={isViewingExample ? 'Cannot save example files' : 'Save changes'}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        {agentId && currentVersion ? (
          <VersionManager agentId={agentId} currentVersion={currentVersion} onVersionChange={handleVersionChange} />
        ) : (
          <div className="text-sm text-primary-100">Loading versions...</div>
        )}
        {hasUnsavedChanges && <span className="text-xs text-primary-100">Unsaved changes (auto-save in 30s)</span>}
      </div>
    </div>
  );

  // Render the editor content (shared between modes)
  const renderEditorContent = () => (
    <div className="flex-1 flex border-r border-gray-200 bg-white h-full">
      {/* Resources Pane */}
      <ResourcesPane
        selectedResource={selectedResource}
        onResourceSelect={handleResourceSelect}
        isCollapsed={isResourcesPaneCollapsed}
        onToggleCollapse={() => setIsResourcesPaneCollapsed(!isResourcesPaneCollapsed)}
      />

      {/* Editor/Preview Pane */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-700 flex-shrink-0 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="whitespace-nowrap">
              {selectedResource === 'agent-code' ? 'Agent' : 'README'}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setEditorMode('details')}
                className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                  editorMode === 'details'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={`px-3 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                  editorMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Validation Status Indicator - only for agent-code */}
            {selectedResource === 'agent-code' && (
              <>
                {validationStatus === 'validating' && (
                  <span className="px-2 py-1 text-xs text-gray-500 whitespace-nowrap">
                    Validating...
                  </span>
                )}
                {validationStatus === 'valid' && (
                  <span className="px-2 py-1 text-xs text-green-600 font-medium whitespace-nowrap">
                    Valid
                  </span>
                )}
                {validationStatus === 'invalid' && (
                  <button
                    onClick={() => setShowValidationModal(true)}
                    className="px-2 py-1 text-xs text-red-600 font-medium whitespace-nowrap hover:bg-red-50 rounded cursor-pointer"
                    title="Click to see errors"
                  >
                    Invalid
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleCopyAll}
              className="px-3 py-1 bg-gray-600 text-white hover:bg-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1 whitespace-nowrap"
              title="Copy all content to clipboard"
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copyButtonText}
            </button>
            {selectedResource === 'agent-code' && (
              <>
                {/* Run Split Button */}
                <div className="relative flex" ref={runDropdownRef}>
                  <button
                    onClick={openRunConfirmModal}
                    disabled={validationStatus !== 'valid' || isRunning}
                    className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-l hover:bg-green-700 transition-colors flex items-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                    </svg>
                    {isRunning ? 'Running...' : 'Run'}
                  </button>
                  <button
                    onClick={() => setShowRunDropdown(!showRunDropdown)}
                    disabled={validationStatus !== 'valid'}
                    className="px-1.5 py-1 bg-green-700 text-white rounded-r hover:bg-green-800 transition-colors border-l border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showRunDropdown && (
                    <div className="absolute right-0 bottom-full mb-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <button
                        onClick={openRunConfigModal}
                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configure
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {editorMode === 'details' ? (
            selectedResource === 'agent-code' ? (
              <MonacoEditor
                value={code}
                onChange={handleCodeChange}
                language="json"
                theme="vs-dark"
              />
            ) : (
              <textarea
                value={readmeContent}
                onChange={(e) => setReadmeContent(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none border-0 bg-[#1e1e1e] text-[#d4d4d4]"
                placeholder="Edit your README here..."
              />
            )
          ) : (
            selectedResource === 'agent-code' ? (
              <div className="h-full flex items-center justify-center bg-gray-50 text-gray-500">
                No Preview Available
              </div>
            ) : (
              <MarkdownPreview content={readmeContent} />
            )
          )}
        </div>
      </div>
    </div>
  );

  // Render the AI assistant panel
  const renderAIAssistant = () => (
    <div className="flex flex-col bg-white h-full">
      <EditorChatPanel pluginCode={code} pluginName={pluginName} onApplyCode={handleApplyCodeFromChat} />
    </div>
  );

  // Render save modal
  const renderSaveModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Save New Version</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Version Bump</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="none"
                checked={versionBump === 'none'}
                onChange={(e) => setVersionBump(e.target.value as 'none')}
                className="mr-2"
              />
              <span className="text-sm">Don't bump version (update current)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="patch"
                checked={versionBump === 'patch'}
                onChange={(e) => setVersionBump(e.target.value as 'patch')}
                className="mr-2"
              />
              <span className="text-sm">Patch (bug fixes)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="minor"
                checked={versionBump === 'minor'}
                onChange={(e) => setVersionBump(e.target.value as 'minor')}
                className="mr-2"
              />
              <span className="text-sm">Minor (new features)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="major"
                checked={versionBump === 'major'}
                onChange={(e) => setVersionBump(e.target.value as 'major')}
                className="mr-2"
              />
              <span className="text-sm">Major (breaking changes)</span>
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <textarea
            value={saveDescription}
            onChange={(e) => setSaveDescription(e.target.value)}
            placeholder="What changed in this version? (optional)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowSaveModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );

  // Render validation errors modal
  const renderValidationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-600">Validation Errors</h3>
          <button
            onClick={() => setShowValidationModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 max-h-64 overflow-y-auto">
          {validationErrors.length === 0 ? (
            <p className="text-gray-500">No errors found.</p>
          ) : (
            <ul className="space-y-2">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => setShowValidationModal(false)}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );

  // Render run confirmation modal
  const renderRunConfirmModal = () => {
    const capabilityDisplay = selectedCapability ? getCapabilityName(selectedCapability) : 'Unknown';
    const selectedTab = selectedTabId ? availableTabs.find(t => t.id === selectedTabId) : null;
    const tabDisplay = selectedTab?.title?.slice(0, 40) || 'Unknown';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Confirm Run</h3>
            <button
              onClick={() => setShowRunConfirmModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 mb-2">
                Are you sure you want to run <strong>"{capabilityDisplay}"</strong> on:
              </p>
              <div className="flex items-center gap-2 bg-white/50 rounded px-2 py-1">
                {selectedTab?.favIconUrl ? (
                  <img
                    src={selectedTab.favIconUrl}
                    alt=""
                    className="w-4 h-4 flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="text-sm font-medium text-orange-900 truncate">{tabDisplay}</span>
              </div>
              <p className="text-xs text-orange-600 mt-2">
                This will execute real actions on the selected tab.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowRunConfirmModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeRun}
              disabled={isRunning}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render run configuration modal
  const renderRunConfigModal = () => {
    let capabilities: { name: string; description: string }[] = [];
    try {
      const config: AgentConfig = JSON.parse(code);
      capabilities = config.capabilities.map(c => ({ name: c.name, description: c.description }));
    } catch {
      // Ignore parse errors
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Configure Run</h3>
            <button
              onClick={() => setShowRunConfigModal(false)}
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
              {capabilities.length === 0 ? (
                <option value="">No capabilities available</option>
              ) : (
                capabilities.map((cap) => (
                  <option key={cap.name} value={cap.name}>
                    {cap.name} - {cap.description}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Target Tab Selection - Custom dropdown with icons */}
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
              onClick={() => setShowRunConfigModal(false)}
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
    );
  };

  // Unified layout for both embedded and standalone modes
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white max-w-md`}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 whitespace-pre-line">{notification.message}</div>
            <button onClick={() => setNotification(null)} className="text-white hover:text-gray-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {renderHeader()}

      {/* Split View with Resizable Panels */}
      <ResizablePanel
        defaultLeftWidth={60}
        rightPanelHeader="AI Assistant"
        isRightPanelCollapsed={isAIAssistantCollapsed}
        onRightPanelToggle={() => setIsAIAssistantCollapsed(!isAIAssistantCollapsed)}
        leftPanel={renderEditorContent()}
        rightPanel={renderAIAssistant()}
      />

      {/* Save Modal */}
      {showSaveModal && renderSaveModal()}

      {/* Validation Errors Modal */}
      {showValidationModal && renderValidationModal()}

      {/* Run Confirmation Modal */}
      {showRunConfirmModal && renderRunConfirmModal()}

      {/* Run Configuration Modal */}
      {showRunConfigModal && renderRunConfigModal()}
    </div>
  );
};
