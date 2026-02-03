import React, { useState, useEffect, useRef } from 'react';
import { MonacoEditor } from './MonacoEditor';
import { PluginSelector } from './AgentSelector';
import { VersionManager } from './VersionManager';
import { EditorChatPanel } from './EditorChatPanel';
import { CreateAgentModal } from './CreateAgentModal';
import { AgentSourceStorageService } from '@/storage/agentSourceStorage';
import { AgentLoader } from '@/services/agentLoader';
import { AgentCompiler } from '@/services/agentCompiler';

interface PluginEditorViewProps {
  initialPluginId?: string;
  onClose?: () => void;
}

export const PluginEditorView: React.FC<PluginEditorViewProps> = ({ initialPluginId }) => {
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(initialPluginId || null);
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [pluginName, setPluginName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [originalCode, setOriginalCode] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveDescription, setSaveDescription] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionBump, setVersionBump] = useState<'patch' | 'minor' | 'major'>('patch');
  const autoSaveTimerRef = useRef<number | null>(null);

  // Load plugin when selection changes
  useEffect(() => {
    if (selectedPluginId) {
      loadPlugin(selectedPluginId);
    }
  }, [selectedPluginId]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(code !== originalCode);
  }, [code, originalCode]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    if (hasUnsavedChanges && selectedPluginId) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 30000); // 30 seconds

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }
  }, [hasUnsavedChanges, code, selectedPluginId]);

  const loadPlugin = async (agentId: string) => {
    try {
      const agentSource = await AgentSourceStorageService.loadAgentSource(agentId);
      if (agentSource) {
        setPluginName(agentSource.name);
        setCurrentVersion(agentSource.activeVersion);

        const versionCode = agentSource.versions[agentSource.activeVersion]?.code || '';
        setCode(versionCode);
        setOriginalCode(versionCode);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      showNotification('error', 'Failed to load plugin: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handlePluginSelect = (agentId: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setSelectedPluginId(agentId);
  };

  const handleVersionChange = async (version: string) => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }

    if (!selectedPluginId) return;

    try {
      const versionCode = await AgentSourceStorageService.loadAgentVersion(selectedPluginId, version);
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
    if (!selectedPluginId || !hasUnsavedChanges) return;

    try {
      // Save as a new version silently
      await AgentSourceStorageService.saveAgentSource(
        selectedPluginId,
        code,
        'Auto-saved changes',
        'Auto-save'
      );

      setOriginalCode(code);
      setHasUnsavedChanges(false);

      // Reload to update version
      await loadPlugin(selectedPluginId);

      console.log('Auto-saved plugin:', selectedPluginId);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = () => {
    setShowSaveModal(true);
    setSaveDescription('');
  };

  const confirmSave = async () => {
    if (!selectedPluginId) return;
    if (!saveDescription.trim()) {
      alert('Please enter a description for this version');
      return;
    }

    setIsSaving(true);

    try {
      // Validate compilation first
      const compilationResult = AgentCompiler.compile(code);
      if (!compilationResult.success) {
        showNotification(
          'error',
          'Cannot save: Compilation failed\n' + compilationResult.errors?.join('\n')
        );
        setIsSaving(false);
        setShowSaveModal(false);
        return;
      }

      // Calculate new version based on bump type
      let newVersion: string;
      if (versionBump === 'major') {
        newVersion = await AgentSourceStorageService.saveAgentSource(
          selectedPluginId,
          code,
          saveDescription
        );
        // Manually set to major version
        const parts = currentVersion.split('.').map(Number);
        parts[0] += 1;
        parts[1] = 0;
        parts[2] = 0;
      } else if (versionBump === 'minor') {
        newVersion = await AgentSourceStorageService.saveAgentSource(
          selectedPluginId,
          code,
          saveDescription
        );
        // Manually set to minor version
        const parts = currentVersion.split('.').map(Number);
        parts[1] += 1;
        parts[2] = 0;
      } else {
        // Patch (default)
        newVersion = await AgentSourceStorageService.saveAgentSource(
          selectedPluginId,
          code,
          saveDescription
        );
      }

      setOriginalCode(code);
      setHasUnsavedChanges(false);
      setShowSaveModal(false);

      // Reload plugin to update version info
      await loadPlugin(selectedPluginId);

      showNotification('success', `Saved as version ${newVersion}`);
    } catch (error) {
      showNotification('error', 'Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!selectedPluginId) return;

    setIsTesting(true);

    try {
      // First, validate the code
      const validation = await AgentLoader.validatePlugin(code);

      if (!validation.valid) {
        showNotification('error', 'Compilation failed:\n' + validation.errors.join('\n'));
        setIsTesting(false);
        return;
      }

      // If validation passes, hot reload the plugin
      await AgentLoader.hotReload(selectedPluginId);

      showNotification('success', 'Plugin hot reloaded successfully! You can now test it in the Chat view.');
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

  const handleAgentCreated = (agentId: string) => {
    setSelectedPluginId(agentId);
    showNotification('success', 'Plugin created successfully!');
  };

  if (!selectedPluginId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Plugin Selected</h3>
          <p className="text-gray-600 mb-4">Create a new plugin or load an existing one to get started.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create New Plugin
          </button>
        </div>

        <CreateAgentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onAgentCreated={handleAgentCreated}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Notification */}
      {notification && (
        <div
          className={`absolute top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
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

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <PluginSelector
          selectedPluginId={selectedPluginId}
          onSelect={handlePluginSelect}
          onCreateNew={() => setIsCreateModalOpen(true)}
        />

        <VersionManager
          agentId={selectedPluginId}
          currentVersion={currentVersion}
          onVersionChange={handleVersionChange}
        />

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save*' : 'Saved'}
          </button>

          <button
            onClick={handleTest}
            disabled={isTesting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isTesting ? 'Testing...' : 'Test'}
          </button>

          {hasUnsavedChanges && (
            <span className="text-xs text-orange-600 ml-2">Unsaved changes (auto-save in 30s)</span>
          )}
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 text-sm font-medium text-gray-700">
            Code Editor
          </div>
          <div className="flex-1 overflow-hidden">
            <MonacoEditor value={code} onChange={handleCodeChange} theme="vs-dark" />
          </div>
        </div>

        {/* Chat Panel */}
        <div className="w-1/2 flex flex-col">
          <EditorChatPanel
            pluginCode={code}
            pluginName={pluginName}
            onApplyCode={handleApplyCodeFromChat}
          />
        </div>
      </div>

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

      <CreateAgentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAgentCreated={handleAgentCreated}
      />
    </div>
  );
};
