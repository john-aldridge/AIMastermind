import React, { useState } from 'react';
import { EXAMPLE_AGENTS } from '@/templates/exampleAgents';

export type ResourceType = 'agent-code' | 'readme' | `example-${string}-code` | `example-${string}-readme`;

interface ResourcesPaneProps {
  selectedResource: ResourceType;
  onResourceSelect: (resource: ResourceType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ResourcesPane: React.FC<ResourcesPaneProps> = ({
  selectedResource,
  onResourceSelect,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set());

  const toggleExample = (exampleId: string) => {
    setExpandedExamples(prev => {
      const next = new Set(prev);
      if (next.has(exampleId)) {
        next.delete(exampleId);
      } else {
        next.add(exampleId);
      }
      return next;
    });
  };

  const resources: { id: 'agent-code' | 'readme'; label: string; icon: string }[] = [
    { id: 'agent-code', label: 'Agent', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    { id: 'readme', label: 'README', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-200 rounded transition-colors mb-2"
          title="Expand resources"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {resources.map((resource) => (
          <button
            key={resource.id}
            onClick={() => onResourceSelect(resource.id)}
            className={`p-2 my-1 rounded transition-colors ${
              selectedResource === resource.id
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            title={resource.label}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={resource.icon} />
            </svg>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-semibold text-gray-700 uppercase">Resources</span>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Collapse resources"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* My Agent Resources */}
        <div className="border-b border-gray-200 pb-2 mb-4">
          {resources.map((resource) => (
            <button
              key={resource.id}
              onClick={() => onResourceSelect(resource.id)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                selectedResource === resource.id
                  ? 'bg-primary-100 text-primary-700 border-l-2 border-primary-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={resource.icon} />
              </svg>
              <span className="truncate">{resource.label}</span>
            </button>
          ))}
        </div>

        {/* Example Agents Section */}
        <div className="pt-2">
          <div className="px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Example Agents
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Read-only examples
            </p>
          </div>

          {EXAMPLE_AGENTS.map((example) => {
            const isExpanded = expandedExamples.has(example.id);
            const codeResourceId = `example-${example.id}-code` as ResourceType;
            const readmeResourceId = `example-${example.id}-readme` as ResourceType;

            return (
              <div key={example.id} className="border-b border-gray-100 last:border-0">
                {/* Example header */}
                <button
                  onClick={() => toggleExample(example.id)}
                  className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <svg
                      className={`w-3 h-3 flex-shrink-0 text-gray-500 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-gray-700 truncate font-medium">{example.name}</span>
                  </div>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      example.difficulty === 'beginner'
                        ? 'bg-green-100 text-green-700'
                        : example.difficulty === 'intermediate'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                    title={example.difficulty.charAt(0).toUpperCase() + example.difficulty.slice(1)}
                  >
                    {example.difficulty[0].toUpperCase()}
                  </span>
                </button>

                {/* Example files (when expanded) */}
                {isExpanded && (
                  <div className="bg-gray-100/50">
                    <button
                      onClick={() => onResourceSelect(readmeResourceId)}
                      className={`w-full pl-8 pr-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors ${
                        selectedResource === readmeResourceId
                          ? 'bg-primary-100 text-primary-700 border-l-2 border-primary-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="truncate">README</span>
                    </button>
                    <button
                      onClick={() => onResourceSelect(codeResourceId)}
                      className={`w-full pl-8 pr-3 py-1.5 text-left text-xs flex items-center gap-2 transition-colors ${
                        selectedResource === codeResourceId
                          ? 'bg-primary-100 text-primary-700 border-l-2 border-primary-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span className="truncate">Agent</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
