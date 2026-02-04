import React, { useState, useEffect, useRef } from 'react';

export type ResourceType = 'agent-code' | 'readme';

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
  const [width, setWidth] = useState<number>(() => {
    // Load saved width from localStorage
    const saved = localStorage.getItem('resourcesPaneWidth');
    return saved ? parseInt(saved, 10) : 224; // Default 224px (w-56)
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('resourcesPaneWidth', width.toString());
  }, [width]);

  // Handle resize dragging - matches ResizablePanel pattern
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      // Constrain between 150px (min) and 500px (max)
      if (newWidth >= 150 && newWidth <= 500) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const resources: { id: 'agent-code' | 'readme'; label: string; icon: string }[] = [
    { id: 'agent-code', label: 'Agent', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    { id: 'readme', label: 'README', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  if (isCollapsed) {
    return (
      <div className="bg-gray-50 border-r border-gray-200 flex flex-col items-center py-2" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>
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
    <div ref={containerRef} className="flex flex-shrink-0">
      {/* Pane Content */}
      <div
        className="bg-gray-50 flex flex-col"
        style={{ width: `${width}px`, minWidth: '150px', maxWidth: '500px' }}
      >
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
        {/* Agent Resources */}
        <div className="py-2">
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
      </div>

      {/* Divider - flex sibling matching ResizablePanel pattern */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 bg-gray-300 hover:bg-primary-500 cursor-col-resize flex-shrink-0 transition-colors ${
          isDragging ? 'bg-primary-500' : ''
        }`}
        style={{ userSelect: 'none' }}
      />
    </div>
  );
};
