/**
 * Active Tools Bar Component
 *
 * Visual indicator showing active tools above chat messages.
 * Displays badges for always-on (gray), context-suggested (blue), and user-pinned (green) tools.
 */

import React, { useState, useEffect } from 'react';
import { toolSessionManager } from '@/services/toolSessionManager';
import { ClientRegistry } from '@/clients';
import { AgentRegistry } from '@/agents';

interface ActiveToolsBarProps {
  onAddTools: () => void;
  onToolsChange?: () => void;
}

interface ToolBadge {
  clientId: string;
  name: string;
  source: 'always-on' | 'context-suggested' | 'user-pinned';
  reason?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export const ActiveToolsBar: React.FC<ActiveToolsBarProps> = ({ onAddTools, onToolsChange }) => {
  const [tools, setTools] = useState<ToolBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const loadTools = async () => {
    try {
      const activeTools = await toolSessionManager.getActiveTools();
      const badges: ToolBadge[] = [];

      for (const tool of activeTools) {
        let name = tool.clientId;

        // Try to get display name from registry
        const clientMetadata = ClientRegistry.getMetadata(tool.clientId);
        if (clientMetadata) {
          name = clientMetadata.name;
        } else {
          const agentMetadata = AgentRegistry.getMetadata(tool.clientId);
          if (agentMetadata) {
            name = agentMetadata.name;
          }
        }

        badges.push({
          clientId: tool.clientId,
          name,
          source: tool.source,
          reason: tool.reason,
          confidence: tool.confidence,
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

  const handleDismiss = (clientId: string, source: 'always-on' | 'context-suggested' | 'user-pinned') => {
    if (source === 'context-suggested') {
      toolSessionManager.dismissSuggestion(clientId);
    } else if (source === 'user-pinned') {
      toolSessionManager.unpinTool(clientId);
    }
    // always-on tools can't be dismissed - handled in UI
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
        return 'Always available';
      case 'context-suggested':
        return tool.reason || 'Suggested based on current page';
      case 'user-pinned':
        return 'Pinned by you';
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
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">Active tools:</span>

      {tools.length === 0 ? (
        <span className="text-xs text-gray-400 italic">No tools active</span>
      ) : (
        tools.map((tool) => (
          <div
            key={tool.clientId}
            className="relative"
            onMouseEnter={() => setShowTooltip(tool.clientId)}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getBadgeStyles(tool.source)}`}
            >
              <span className="font-medium truncate max-w-[100px]">{tool.name}</span>
              {getIconForSource(tool.source)}

              {/* Dismiss button for non-always-on tools */}
              {tool.source !== 'always-on' && (
                <button
                  onClick={() => handleDismiss(tool.clientId, tool.source)}
                  className="ml-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                  title={tool.source === 'user-pinned' ? 'Unpin' : 'Dismiss'}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Tooltip */}
            {showTooltip === tool.clientId && (
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
    </div>
  );
};

export default ActiveToolsBar;
