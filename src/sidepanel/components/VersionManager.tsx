import React, { useState, useEffect } from 'react';
import { AgentSourceStorageService } from '@/storage/agentSourceStorage';
import { AgentVersionMetadata } from '@/types/agentSource';

interface VersionManagerProps {
  agentId: string;
  currentVersion: string;
  onVersionChange: (version: string) => void;
}

export const VersionManager: React.FC<VersionManagerProps> = ({ agentId, currentVersion, onVersionChange }) => {
  const [versions, setVersions] = useState<Array<{ version: string; metadata: AgentVersionMetadata }>>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVersions();
  }, [agentId]);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const versionList = await AgentSourceStorageService.listVersions(agentId);
      setVersions(versionList);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVersionChange = async (version: string) => {
    try {
      await AgentSourceStorageService.setActiveVersion(agentId, version);
      onVersionChange(version);
    } catch (error) {
      console.error('Failed to change version:', error);
      alert('Failed to change version: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return `${diffDays}d ago`;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-[300px]">
        <select
          value={currentVersion || ''}
          onChange={(e) => handleVersionChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-sm text-gray-900"
          disabled={isLoading}
        >
          {versions.length === 0 && currentVersion && (
            <option value={currentVersion}>v{currentVersion}</option>
          )}
          {versions.map(({ version, metadata }) => (
            <option key={version} value={version}>
              v{version} - {metadata.description}
            </option>
          ))}
          {versions.length === 0 && !currentVersion && (
            <option value="">Loading versions...</option>
          )}
        </select>
      </div>

      <button
        onClick={() => setIsHistoryOpen(true)}
        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        title="View version history"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Version History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {versions.map(({ version, metadata }) => (
                  <div
                    key={version}
                    className={`p-4 border rounded-lg ${
                      version === currentVersion ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">v{version}</span>
                          {version === currentVersion && (
                            <span className="text-xs px-2 py-1 bg-primary-600 text-white rounded">Active</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(metadata.timestamp)} ({formatRelativeTime(metadata.timestamp)})
                        </div>
                      </div>

                      {version !== currentVersion && (
                        <button
                          onClick={() => {
                            handleVersionChange(version);
                            setIsHistoryOpen(false);
                          }}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          Restore
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-gray-700">{metadata.description}</p>

                    {metadata.author && <p className="text-xs text-gray-500 mt-1">Author: {metadata.author}</p>}

                    {metadata.changelog && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Changelog:</p>
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{metadata.changelog}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
