import React from 'react';

type Resource = 'agent-code' | 'readme';

interface ResourcesPaneProps {
  selectedResource: Resource;
  onResourceSelect: (resource: Resource) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ResourcesPane: React.FC<ResourcesPaneProps> = ({
  selectedResource,
  onResourceSelect,
  isCollapsed,
  onToggleCollapse,
}) => {
  const resources: { id: Resource; label: string; icon: string }[] = [
    { id: 'agent-code', label: 'Agent Code', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
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
    <div className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-2 border-b border-gray-200 flex items-center justify-between">
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
    </div>
  );
};
