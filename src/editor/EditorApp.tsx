import React, { useState, useEffect, useRef } from 'react';
import { MonacoEditor } from '../sidepanel/components/MonacoEditor';
import { VersionManager } from '../sidepanel/components/VersionManager';
import { EditorChatPanel } from '../sidepanel/components/EditorChatPanel';
import { ResizablePanel } from './ResizablePanel';
import { ResourcesPane, ResourceType } from './components/ResourcesPane';
import { MarkdownPreview } from './components/MarkdownPreview';
import { getExampleAgent } from '../templates/exampleAgents';
import { apiService } from '../utils/api';
import { ConfigStorageService } from '../storage/configStorage';
import { ConfigRegistry } from '../services/configRegistry';
import type { AgentConfig } from '../types/agentConfig';

// Disable Monaco workers globally before any Monaco code runs
// Use a proper stub worker that extends EventTarget to prevent errors
if (typeof window !== 'undefined') {
  // Create a stub worker that properly implements the Worker interface
  class StubWorker extends EventTarget {
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
    onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;
    onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;

    postMessage(_message: any, _transfer?: Transferable[]): void {
      // Silently ignore all messages
      // Monaco will try to send messages, but we do nothing
    }

    terminate(): void {
      // No-op - nothing to terminate
    }

    // Satisfy TypeScript's Worker interface
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void {
      super.addEventListener(type, listener, options);
    }

    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void {
      super.removeEventListener(type, listener, options);
    }

    dispatchEvent(event: Event): boolean {
      return super.dispatchEvent(event);
    }
  }

  (window as any).MonacoEnvironment = {
    getWorker() {
      return new StubWorker() as any;
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

export const EditorApp: React.FC = () => {
  const [agentId, setPluginId] = useState<string | null>(null);
  const [isNewAgent, setIsNewAgent] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [pluginName, setPluginName] = useState<string>('');
  const [pluginDescription, setPluginDescription] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [originalCode, setOriginalCode] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveDescription, setSaveDescription] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionBump, setVersionBump] = useState<'none' | 'patch' | 'minor' | 'major'>('none');
  const [selectedResource, setSelectedResource] = useState<ResourceType>('agent-code');
  const [editorMode, setEditorMode] = useState<'details' | 'preview'>('details');
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [originalReadme, setOriginalReadme] = useState<string>('');
  const [isResourcesPaneCollapsed, setIsResourcesPaneCollapsed] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);

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

  // Get plugin ID from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('agentId');
    const isNew = params.get('isNew') === 'true';

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
  }, []);

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

  const handleTest = async () => {
    if (!agentId) return;

    setIsTesting(true);

    try {
      // Parse and validate JSON
      let config: AgentConfig;
      try {
        config = JSON.parse(code);
      } catch (parseError) {
        showNotification('error', 'Test failed: Invalid JSON\n' + (parseError instanceof Error ? parseError.message : 'Unknown error'));
        setIsTesting(false);
        return;
      }

      // Validate config schema
      const validation = ConfigStorageService.validateAgentConfig(config);
      if (!validation.valid) {
        showNotification('error', 'Test failed: Invalid config\n' + validation.errors.join('\n'));
        setIsTesting(false);
        return;
      }

      // Test by executing the first capability
      const registry = ConfigRegistry.getInstance();

      // Temporarily register this config for testing
      registry.registerAgent(config);

      if (config.capabilities.length > 0) {
        const firstCapability = config.capabilities[0];
        const result = await registry.executeAgentCapability(config.id, firstCapability.name, {}, {});

        if (result.success) {
          showNotification('success', `Test successful! Executed "${firstCapability.name}" capability.`);
        } else {
          showNotification('error', `Test failed: ${result.error}`);
        }
      } else {
        showNotification('success', 'Config is valid! No capabilities to test.');
      }
    } catch (error) {
      showNotification('error', 'Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsTesting(false);
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
    window.close();
  };

  const handleResourceSelect = (resource: ResourceType) => {
    setSelectedResource(resource);

    // If it's an example resource, load the example content
    if (resource.startsWith('example-')) {
      const match = resource.match(/^example-(.+)-(code|readme)$/);
      if (match) {
        const [, exampleId, fileType] = match;
        const example = getExampleAgent(exampleId);

        if (example) {
          if (fileType === 'code') {
            setCode(example.code);
            setOriginalCode(example.code);
          } else if (fileType === 'readme') {
            setReadmeContent(example.readme);
            setOriginalReadme(example.readme);
          }
          // Force details mode for viewing examples
          setEditorMode('details');
        }
      }
    } else {
      // Reload the user's agent files
      if (agentId) {
        loadPlugin(agentId);
      }
    }
  };

  const isViewingExample = selectedResource.startsWith('example-');

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

      {/* Header */}
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

      {/* Split View with Resizable Panels */}
      <ResizablePanel
        defaultLeftWidth={60}
        leftPanel={
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
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-700 flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>
                    {selectedResource === 'agent-code'
                      ? 'Agent'
                      : selectedResource === 'readme'
                      ? 'README'
                      : selectedResource.includes('code')
                      ? 'Example Config'
                      : 'Example README'}
                  </span>
                  {isViewingExample && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                      Read-only
                    </span>
                  )}
                  <div className="flex gap-1 ml-4">
                    <button
                      onClick={() => setEditorMode('details')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editorMode === 'details'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setEditorMode('preview')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        editorMode === 'preview'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {selectedResource === 'agent-code' && (
                  <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {isTesting ? 'Testing...' : 'Test'}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                {editorMode === 'details' ? (
                  selectedResource === 'agent-code' || selectedResource.includes('code') ? (
                    <MonacoEditor
                      value={code}
                      onChange={isViewingExample ? () => {} : handleCodeChange}
                      language="json"
                      theme="vs-dark"
                      readOnly={isViewingExample}
                    />
                  ) : (
                    <textarea
                      value={readmeContent}
                      onChange={(e) => !isViewingExample && setReadmeContent(e.target.value)}
                      className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none border-0 bg-[#1e1e1e] text-[#d4d4d4]"
                      placeholder={isViewingExample ? '' : 'Edit your README here...'}
                      readOnly={isViewingExample}
                    />
                  )
                ) : (
                  selectedResource === 'agent-code' || selectedResource.includes('code') ? (
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
        }
        rightPanel={
          <div className="flex flex-col bg-white h-full">
            <EditorChatPanel pluginCode={code} pluginName={pluginName} onApplyCode={handleApplyCodeFromChat} />
          </div>
        }
      />

      {/* Save Modal */}
      {showSaveModal && (
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
      )}
    </div>
  );
};
