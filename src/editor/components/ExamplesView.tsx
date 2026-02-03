import React, { useState } from 'react';
import { EXAMPLE_AGENTS, ExampleAgent } from '@/templates/exampleAgents';
import { MonacoEditor } from '@/sidepanel/components/MonacoEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { AgentSourceStorageService } from '@/storage/agentSourceStorage';

interface ExamplesViewProps {
  onClone: (agentId: string) => void;
}

export const ExamplesView: React.FC<ExamplesViewProps> = ({ onClone }) => {
  const [selectedExample, setSelectedExample] = useState<ExampleAgent | null>(
    EXAMPLE_AGENTS.length > 0 ? EXAMPLE_AGENTS[0] : null
  );
  const [view, setView] = useState<'readme' | 'code'>('readme');
  const [isCloning, setIsCloning] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleClone = async () => {
    if (!selectedExample) return;

    setIsCloning(true);
    try {
      // Generate unique ID
      const timestamp = Date.now();
      const newAgentId = `${selectedExample.id}-clone-${timestamp}`;

      // Create the agent
      await AgentSourceStorageService.createAgent(
        newAgentId,
        `${selectedExample.name} (Clone)`,
        selectedExample.code,
        selectedExample.description,
        'You'
      );

      // Update the README separately
      await AgentSourceStorageService.saveAgentSource(
        newAgentId,
        selectedExample.code,
        'Initial version with README',
        'You',
        'patch',
        selectedExample.readme
      );

      showNotification('success', `Created "${selectedExample.name} (Clone)"!`);

      // Notify parent to switch to the new agent
      setTimeout(() => {
        onClone(newAgentId);
      }, 1000);
    } catch (error) {
      console.error('Failed to clone example:', error);
      showNotification('error', 'Failed to clone example: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCloning(false);
    }
  };

  const getDifficultyColor = (difficulty: ExampleAgent['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
    }
  };

  if (EXAMPLE_AGENTS.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
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
          <p className="text-gray-600">No example agents available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {notification.message}
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: Example list */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h3 className="font-semibold text-gray-900">Example Agents</h3>
            <p className="text-xs text-gray-600 mt-1">
              Browse and clone working examples
            </p>
          </div>

          <div className="p-2">
            {EXAMPLE_AGENTS.map((example) => (
              <button
                key={example.id}
                onClick={() => setSelectedExample(example)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedExample?.id === example.id
                    ? 'bg-primary-100 border-2 border-primary-500'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{example.name}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(example.difficulty)}`}
                  >
                    {example.difficulty}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{example.description}</p>
                <div className="flex flex-wrap gap-1">
                  {example.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Example details */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedExample && (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-900">{selectedExample.name}</h2>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(selectedExample.difficulty)}`}
                    >
                      {selectedExample.difficulty}
                    </span>
                  </div>
                  <button
                    onClick={handleClone}
                    disabled={isCloning}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCloning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Cloning...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Clone to My Agents
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-600">{selectedExample.description}</p>

                {/* View toggle */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setView('readme')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      view === 'readme'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📖 README
                  </button>
                  <button
                    onClick={() => setView('code')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      view === 'code'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    💻 Code
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto">
                {view === 'readme' ? (
                  <div className="p-6">
                    <MarkdownPreview content={selectedExample.readme} />
                  </div>
                ) : (
                  <MonacoEditor
                    value={selectedExample.code}
                    onChange={() => {}} // Read-only
                    language="typescript"
                    readOnly={true}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
