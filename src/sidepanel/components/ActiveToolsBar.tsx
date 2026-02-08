/**
 * Active Tools Bar Component
 *
 * Visual indicator showing active tools above chat messages.
 * Displays badges for always-on (gray), context-suggested (blue), and user-pinned (green) tools.
 * Clicking a tool badge opens a details popup with capabilities and usage examples.
 */

import React, { useState, useEffect, useRef } from 'react';
import { toolSessionManager } from '@/services/toolSessionManager';
import { ClientRegistry } from '@/clients';
import { AgentRegistry } from '@/agents';

interface EditorAgentInfo {
  id: string;
  name: string;
  capabilityCount: number;
  capabilities: Array<{ name: string; description: string }>;
}

interface ActiveToolsBarProps {
  onAddTools: () => void;
  onToolsChange?: () => void;
  editorAgent?: EditorAgentInfo | null;
}

interface ToolBadge {
  clientId: string;
  name: string;
  source: 'always-on' | 'context-suggested' | 'user-pinned';
  reason?: string;
  confidence?: 'high' | 'medium' | 'low';
  category: 'client' | 'agent';
}

interface ToolDetails {
  id: string;
  name: string;
  description: string;
  category: 'client' | 'agent';
  version?: string;
  author?: string;
  icon?: string;
  tags?: string[];
  capabilities: Array<{
    name: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
  }>;
  dependencies?: string[];
}

export const ActiveToolsBar: React.FC<ActiveToolsBarProps> = ({ onAddTools, onToolsChange, editorAgent }) => {
  const [tools, setTools] = useState<ToolBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolDetails | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const loadTools = async () => {
    try {
      const activeTools = await toolSessionManager.getActiveTools();
      const badges: ToolBadge[] = [];

      for (const tool of activeTools) {
        let name = tool.clientId;
        let category: 'client' | 'agent' = 'client';

        // Try to get display name from registry
        const clientMetadata = ClientRegistry.getMetadata(tool.clientId);
        if (clientMetadata) {
          name = clientMetadata.name;
          category = 'client';
        } else {
          const agentMetadata = AgentRegistry.getMetadata(tool.clientId);
          if (agentMetadata) {
            name = agentMetadata.name;
            category = 'agent';
          }
        }

        badges.push({
          clientId: tool.clientId,
          name,
          source: tool.source,
          reason: tool.reason,
          confidence: tool.confidence,
          category,
        });
      }

      setTools(badges);
    } catch (error) {
      console.error('[ActiveToolsBar] Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();

    // Subscribe to session changes
    const unsubscribe = toolSessionManager.subscribe(() => {
      loadTools();
      onToolsChange?.();
    });

    return () => unsubscribe();
  }, [onToolsChange]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setSelectedTool(null);
        setPopupPosition(null);
      }
    };

    if (selectedTool) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedTool]);

  const handleDismiss = (e: React.MouseEvent, clientId: string, source: 'always-on' | 'context-suggested' | 'user-pinned') => {
    e.stopPropagation(); // Prevent opening the popup
    if (source === 'context-suggested') {
      toolSessionManager.dismissSuggestion(clientId);
    } else if (source === 'user-pinned') {
      toolSessionManager.unpinTool(clientId);
    }
    // always-on tools can't be dismissed - handled in UI
  };

  const handleToolClick = (e: React.MouseEvent, tool: ToolBadge) => {
    // Get tool details
    const details = getToolDetails(tool.clientId, tool.category);
    if (details) {
      setSelectedTool(details);

      // Position popup below the clicked badge
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 320)),
      });
    }
  };

  const getToolDetails = (toolId: string, category: 'client' | 'agent'): ToolDetails | null => {
    if (category === 'client') {
      const metadata = ClientRegistry.getMetadata(toolId);
      const instance = ClientRegistry.getInstance(toolId);
      if (metadata && instance) {
        return {
          id: toolId,
          name: metadata.name,
          description: metadata.description,
          category: 'client',
          version: metadata.version,
          author: metadata.author,
          icon: metadata.icon,
          tags: metadata.tags,
          capabilities: instance.getCapabilities().map(cap => ({
            name: cap.name,
            description: cap.description,
            parameters: cap.parameters,
          })),
        };
      }
    } else {
      const metadata = AgentRegistry.getMetadata(toolId);
      const instance = AgentRegistry.getInstance(toolId);
      if (metadata && instance) {
        return {
          id: toolId,
          name: metadata.name,
          description: metadata.description,
          category: 'agent',
          version: metadata.version,
          author: metadata.author,
          icon: metadata.icon,
          tags: metadata.tags,
          capabilities: instance.getCapabilities().map(cap => ({
            name: cap.name,
            description: cap.description,
            parameters: cap.parameters,
          })),
          dependencies: instance.getDependencies(),
        };
      }
    }
    return null;
  };

  const getBadgeStyles = (source: 'always-on' | 'context-suggested' | 'user-pinned') => {
    switch (source) {
      case 'always-on':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'context-suggested':
        return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'user-pinned':
        return 'bg-green-50 text-green-700 border-green-300';
    }
  };

  const getIconForSource = (source: 'always-on' | 'context-suggested' | 'user-pinned') => {
    switch (source) {
      case 'always-on':
        return null; // No icon for always-on
      case 'context-suggested':
        return (
          <span className="text-blue-400" title="Suggested based on current page">
            *
          </span>
        );
      case 'user-pinned':
        return (
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <title>Pinned by you</title>
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getTooltipText = (tool: ToolBadge) => {
    switch (tool.source) {
      case 'always-on':
        return 'Always available - Click for details';
      case 'context-suggested':
        return (tool.reason || 'Suggested based on current page') + ' - Click for details';
      case 'user-pinned':
        return 'Pinned by you - Click for details';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs text-gray-500">Loading tools...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-wrap relative">
      <span className="text-xs text-gray-500 font-medium">Active tools:</span>

      {/* Editor agent badge */}
      {editorAgent && (
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip('editor-agent')}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <button
            onClick={(e) => {
              // Show editor agent details in popup
              const details: ToolDetails = {
                id: editorAgent.id,
                name: editorAgent.name,
                description: 'Currently editing in the agent editor',
                category: 'agent',
                capabilities: editorAgent.capabilities.map(c => ({
                  name: c.name,
                  description: c.description,
                  parameters: [],
                })),
              };
              setSelectedTool(details);
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setPopupPosition({
                top: rect.bottom + 8,
                left: Math.max(8, Math.min(rect.left, window.innerWidth - 320)),
              });
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border cursor-pointer hover:opacity-80 transition-opacity bg-purple-50 text-purple-700 border-purple-300"
          >
            <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Editor Agent</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium truncate max-w-[100px]">{editorAgent.name}</span>
            <span className="text-purple-400 text-[10px]">{editorAgent.capabilityCount}</span>
          </button>

          {/* Tooltip */}
          {showTooltip === 'editor-agent' && !selectedTool && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
              Currently editing - {editorAgent.capabilityCount} {editorAgent.capabilityCount === 1 ? 'capability' : 'capabilities'} available
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          )}
        </div>
      )}

      {tools.length === 0 && !editorAgent ? (
        <span className="text-xs text-gray-400 italic">No tools active</span>
      ) : (
        tools.map((tool) => (
          <div
            key={tool.clientId}
            className="relative"
            onMouseEnter={() => setShowTooltip(tool.clientId)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <button
              onClick={(e) => handleToolClick(e, tool)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border cursor-pointer hover:opacity-80 transition-opacity ${getBadgeStyles(tool.source)}`}
            >
              {/* Type icon */}
              {tool.category === 'client' ? (
                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>Client</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <title>Agent</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
              <span className="font-medium truncate max-w-[100px]">{tool.name}</span>
              {getIconForSource(tool.source)}

              {/* Dismiss button for non-always-on tools */}
              {tool.source !== 'always-on' && (
                <span
                  onClick={(e) => handleDismiss(e, tool.clientId, tool.source)}
                  className="ml-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                  title={tool.source === 'user-pinned' ? 'Unpin' : 'Dismiss'}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              )}
            </button>

            {/* Tooltip */}
            {showTooltip === tool.clientId && !selectedTool && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                {getTooltipText(tool)}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Add tools button */}
      <button
        onClick={onAddTools}
        className="flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full border border-blue-200 transition-colors"
        title="Add more tools"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Add</span>
      </button>

      {/* Tool count warning if approaching limit */}
      {tools.length > 15 && (
        <span className="text-xs text-amber-600 ml-auto" title="High tool count may affect accuracy">
          {tools.length} tools
        </span>
      )}

      {/* Tool Details Popup */}
      {selectedTool && popupPosition && (
        <ToolDetailsPopup
          ref={popupRef}
          tool={selectedTool}
          position={popupPosition}
          onClose={() => {
            setSelectedTool(null);
            setPopupPosition(null);
          }}
        />
      )}
    </div>
  );
};

// Tool Details Popup Component
interface ToolDetailsPopupProps {
  tool: ToolDetails;
  position: { top: number; left: number };
  onClose: () => void;
}

const ToolDetailsPopup = React.forwardRef<HTMLDivElement, ToolDetailsPopupProps>(
  ({ tool, position, onClose }, ref) => {
    const [expandedCapability, setExpandedCapability] = useState<string | null>(null);

    // Generate example usage based on capability
    const getExampleUsage = (capability: ToolDetails['capabilities'][0]): string => {
      const name = capability.name;

      // Generate a simple example based on the capability name and parameters
      if (name.includes('search')) {
        return `"Search for issues related to authentication"`;
      } else if (name.includes('create')) {
        return `"Create a new bug ticket for the login issue"`;
      } else if (name.includes('get') || name.includes('fetch')) {
        return `"Get the details of ticket ABC-123"`;
      } else if (name.includes('update')) {
        return `"Update the priority of ABC-123 to High"`;
      } else if (name.includes('translate')) {
        return `"Translate this page to Spanish"`;
      } else if (name.includes('similar') || name.includes('find')) {
        return `"Find issues similar to ABC-123"`;
      } else if (name.includes('comment')) {
        return `"Add a comment to ABC-123 noting the workaround"`;
      } else if (name.includes('transition') || name.includes('status')) {
        return `"Move ABC-123 to In Progress"`;
      } else if (name.includes('field')) {
        return `"What fields are available in Jira?"`;
      } else if (name.includes('inspect') || name.includes('analyze')) {
        return `"Analyze the structure of this page"`;
      } else if (name.includes('click') || name.includes('button')) {
        return `"Click the submit button"`;
      } else if (name.includes('remove') || name.includes('delete')) {
        return `"Remove the popup overlay"`;
      } else {
        return `"Use ${name.replace(/_/g, ' ')}"`;
      }
    };

    // Render the tool icon - handle URLs, emojis, or show a default
    const renderIcon = () => {
      if (!tool.icon) {
        // Default icon based on category
        if (tool.category === 'agent') {
          return (
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          );
        } else {
          return (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
          );
        }
      }

      // Check if icon is a URL
      if (tool.icon.startsWith('http://') || tool.icon.startsWith('https://')) {
        return (
          <img
            src={tool.icon}
            alt={tool.name}
            className="w-10 h-10 rounded-lg object-contain bg-gray-50"
            onError={(e) => {
              // On error, replace with default icon
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        );
      }

      // Emoji or text icon
      return (
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-2xl">
          {tool.icon}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 w-80 max-h-96 overflow-hidden z-50 flex flex-col"
        style={{ top: position.top, left: position.left }}
      >
        {/* Header with prominent type indicator */}
        <div className={`px-4 py-3 border-b flex items-start justify-between ${
          tool.category === 'agent'
            ? 'bg-purple-50 border-purple-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            {renderIcon()}
            <div>
              <h3 className="font-semibold text-gray-900">{tool.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {/* Prominent type badge */}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  tool.category === 'agent'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-white'
                }`}>
                  {tool.category === 'agent' ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Agent
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                      </svg>
                      Client
                    </>
                  )}
                </span>
                {tool.version && (
                  <span className="text-xs text-gray-400">v{tool.version}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-600">{tool.description}</p>

          {/* Dependencies (for agents) */}
          {tool.dependencies && tool.dependencies.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Uses
              </h4>
              <div className="flex flex-wrap gap-1">
                {tool.dependencies.map(dep => (
                  <span key={dep} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    {dep} client
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Capabilities */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Capabilities ({tool.capabilities.length})
            </h4>
            <div className="space-y-2">
              {tool.capabilities.map((capability) => (
                <div
                  key={capability.name}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCapability(
                      expandedCapability === capability.name ? null : capability.name
                    )}
                    className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-xs font-mono text-gray-800 truncate">
                      {capability.name}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedCapability === capability.name ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedCapability === capability.name && (
                    <div className="px-3 py-2 border-t border-gray-200 space-y-2">
                      {/* Description */}
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">
                        {capability.description.length > 200
                          ? capability.description.substring(0, 200) + '...'
                          : capability.description}
                      </p>

                      {/* Parameters */}
                      {capability.parameters.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-500">Parameters:</span>
                          <div className="mt-1 space-y-1">
                            {capability.parameters.map(param => (
                              <div key={param.name} className="text-xs flex items-start gap-1">
                                <code className="text-purple-600 bg-purple-50 px-1 rounded">
                                  {param.name}
                                </code>
                                <span className="text-gray-400">
                                  ({param.type}{param.required ? ', required' : ''})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Example usage */}
                      <div className="bg-blue-50 rounded p-2">
                        <span className="text-xs font-medium text-blue-700">Example:</span>
                        <p className="text-xs text-blue-600 mt-0.5 italic">
                          {getExampleUsage(capability)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {tool.author && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-400">
              By {tool.author}
            </p>
          </div>
        )}
      </div>
    );
  }
);

ToolDetailsPopup.displayName = 'ToolDetailsPopup';

export default ActiveToolsBar;
