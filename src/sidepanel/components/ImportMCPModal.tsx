import React, { useState } from 'react';
import { useAppStore } from '@/state/appStore';
import {
  fetchMCPConfig,
  parseMCPConfig,
  convertMCPToClient,
  validateMCPConfig,
  importFromGitHub,
  MCPServerConfig
} from '@/utils/mcpImport';

interface ImportMCPModalProps {
  onClose: () => void;
}

export const ImportMCPModal: React.FC<ImportMCPModalProps> = ({ onClose }) => {
  const [importMethod, setImportMethod] = useState<'url' | 'json' | 'github'>('url');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<MCPServerConfig | null>(null);
  const { addClient } = useAppStore();

  const handlePreview = async () => {
    setError(null);
    setLoading(true);

    try {
      let config: MCPServerConfig;

      if (importMethod === 'url') {
        if (!input.trim()) {
          throw new Error('Please enter a URL');
        }
        config = await fetchMCPConfig(input.trim());
      } else if (importMethod === 'github') {
        if (!input.trim()) {
          throw new Error('Please enter a GitHub repository URL');
        }
        config = await importFromGitHub(input.trim());
      } else {
        if (!input.trim()) {
          throw new Error('Please paste JSON configuration');
        }
        config = parseMCPConfig(input.trim());
      }

      // Validate the config
      const validation = validateMCPConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid MCP configuration:\n${validation.errors.join('\n')}`);
      }

      setPreview(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!preview) return;

    const clientData = convertMCPToClient(preview);
    const newClient = {
      ...clientData,
      id: `client-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addClient(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Import MCP Server</h2>

        {/* Import Method Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setImportMethod('url')}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              importMethod === 'url'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            From URL
          </button>
          <button
            onClick={() => setImportMethod('github')}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              importMethod === 'github'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            From GitHub
          </button>
          <button
            onClick={() => setImportMethod('json')}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              importMethod === 'json'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Paste JSON
          </button>
        </div>

        {/* Input Area */}
        <div className="mb-4">
          {importMethod === 'url' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MCP Config URL
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://raw.githubusercontent.com/.../mcp.json"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the URL to an MCP server configuration file
              </p>
            </>
          )}

          {importMethod === 'github' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Repository URL
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://github.com/username/mcp-server"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll automatically find the MCP configuration in the repository
              </p>
            </>
          )}

          {importMethod === 'json' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MCP Configuration JSON
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='{"name": "My MCP Server", "tools": [...]}'
                className="input-field resize-none font-mono text-sm"
                rows={8}
              />
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded">
            <h3 className="font-semibold text-gray-800 mb-2">Preview</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Name:</span>{' '}
                <span className="text-gray-600">{preview.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Description:</span>{' '}
                <span className="text-gray-600">{preview.description || 'None'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tools:</span>{' '}
                <span className="text-gray-600">{preview.tools?.length || 0} capabilities</span>
              </div>
              {preview.tools && preview.tools.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-700 mb-1">Available Tools:</div>
                  <div className="space-y-1">
                    {preview.tools.slice(0, 5).map((tool, index) => (
                      <div key={index} className="text-xs text-gray-600 ml-2">
                        • {tool.name} - {tool.description}
                      </div>
                    ))}
                    {preview.tools.length > 5 && (
                      <div className="text-xs text-gray-500 ml-2">
                        ... and {preview.tools.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!preview ? (
            <>
              <button
                onClick={handlePreview}
                disabled={loading || !input.trim()}
                className="btn-primary flex-1"
              >
                {loading ? 'Loading...' : 'Preview Configuration'}
              </button>
              <button
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleImport}
                className="btn-primary flex-1"
              >
                Import Client
              </button>
              <button
                onClick={() => setPreview(null)}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
