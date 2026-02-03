import React, { useState, useEffect, useRef } from 'react';
import { MonacoEditor } from '../sidepanel/components/MonacoEditor';
import { VersionManager } from '../sidepanel/components/VersionManager';
import { EditorChatPanel } from '../sidepanel/components/EditorChatPanel';
import { ResizablePanel } from './ResizablePanel';
import { ResourcesPane } from './components/ResourcesPane';
import { MarkdownPreview } from './components/MarkdownPreview';
import { AgentSourceStorageService } from '../storage/agentSourceStorage';
import { AgentLoader } from '../services/agentLoader';
import { AgentCompiler } from '../services/agentCompiler';
import { apiService } from '../utils/api';

// Disable Monaco workers globally before any Monaco code runs
if (typeof window !== 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorker() {
      return null;
    }
  };
}

export const EditorApp: React.FC = () => {
  const [agentId, setPluginId] = useState<string | null>(null);
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
  const [selectedResource, setSelectedResource] = useState<'agent-code' | 'readme'>('agent-code');
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
    if (id) {
      setPluginId(id);
    }
  }, []);

  // Load plugin when ID is set
  useEffect(() => {
    if (agentId) {
      loadPlugin(agentId);
    }
  }, [agentId]);

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
      const agentSource = await AgentSourceStorageService.loadAgentSource(id);
      if (agentSource) {
        setPluginName(agentSource.name);
        setCurrentVersion(agentSource.activeVersion);

        const versionCode = agentSource.versions[agentSource.activeVersion]?.code || '';
        const versionReadme = agentSource.versions[agentSource.activeVersion]?.readme || '';
        const versionMetadata = agentSource.versions[agentSource.activeVersion]?.metadata;
        setPluginDescription(versionMetadata?.description || '');

        setCode(versionCode);
        setOriginalCode(versionCode);
        setReadmeContent(versionReadme);
        setOriginalReadme(versionReadme);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      showNotification('error', 'Failed to load plugin: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleVersionChange = async (version: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }

    if (!agentId) return;

    try {
      const versionCode = await AgentSourceStorageService.loadAgentVersion(agentId, version);
      if (versionCode) {
        setCode(versionCode);
        setOriginalCode(versionCode);
        setCurrentVersion(version);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      showNotification('error', 'Failed to load version: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
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
    if (!agentId || !hasUnsavedChanges) return;

    try {
      await AgentSourceStorageService.saveAgentSource(agentId, code, 'Auto-saved changes', 'Auto-save');

      setOriginalCode(code);
      setHasUnsavedChanges(false);

      await loadPlugin(agentId);

      console.log('Auto-saved plugin:', agentId);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = () => {
    setShowSaveModal(true);
    setSaveDescription('');
  };

  const confirmSave = async () => {
    if (!agentId) return;
    if (!saveDescription.trim()) {
      alert('Please enter a description for this version');
      return;
    }

    setIsSaving(true);

    try {
      const compilationResult = AgentCompiler.compile(code);
      if (!compilationResult.success) {
        showNotification('error', 'Cannot save: Compilation failed\n' + compilationResult.errors?.join('\n'));
        setIsSaving(false);
        setShowSaveModal(false);
        return;
      }

      // Save based on version bump selection
      let savedVersion: string;
      if (versionBump === 'none') {
        savedVersion = await AgentSourceStorageService.updateCurrentVersion(agentId, code, saveDescription, undefined, readmeContent);
      } else {
        savedVersion = await AgentSourceStorageService.saveAgentSource(agentId, code, saveDescription, undefined, versionBump, readmeContent);
      }

      // Also update the agent name metadata
      if (pluginName.trim()) {
        await AgentSourceStorageService.updateAgentMetadata(agentId, pluginName.trim());
      }

      setOriginalCode(code);
      setOriginalReadme(readmeContent);
      setHasUnsavedChanges(false);
      setShowSaveModal(false);

      await loadPlugin(agentId);

      showNotification('success', `Saved as version ${savedVersion}`);
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
      const validation = await AgentLoader.validatePlugin(code);

      if (!validation.valid) {
        showNotification('error', 'Compilation failed:\n' + validation.errors.join('\n'));
        setIsTesting(false);
        return;
      }

      await AgentLoader.hotReload(agentId);

      showNotification('success', 'Plugin hot reloaded successfully!');
    } catch (error) {
      showNotification('error', 'Hot reload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsTesting(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }
    window.close();
  };

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
              Done
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
              onResourceSelect={setSelectedResource}
              isCollapsed={isResourcesPaneCollapsed}
              onToggleCollapse={() => setIsResourcesPaneCollapsed(!isResourcesPaneCollapsed)}
            />

            {/* Editor/Preview Pane */}
            <div className="flex-1 flex flex-col">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-700 flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{selectedResource === 'agent-code' ? 'Agent Code' : 'README'}</span>
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
                  selectedResource === 'agent-code' ? (
                    <MonacoEditor value={code} onChange={handleCodeChange} theme="vs-dark" />
                  ) : (
                    <textarea
                      value={readmeContent}
                      onChange={(e) => setReadmeContent(e.target.value)}
                      className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none border-0"
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
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="What changed in this version?"
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
                disabled={isSaving || !saveDescription.trim()}
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
