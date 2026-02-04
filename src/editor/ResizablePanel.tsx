import React, { useState, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  rightPanelHeader?: string;
  defaultLeftWidth?: number; // percentage
  isRightPanelCollapsed?: boolean;
  onRightPanelToggle?: () => void;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  leftPanel,
  rightPanel,
  rightPanelHeader = 'AI Assistant',
  defaultLeftWidth = 60,
  isRightPanelCollapsed = false,
  onRightPanelToggle,
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 20% and 95% (allows AI chat pane to be as small as 5%)
      if (newLeftWidth >= 20 && newLeftWidth <= 95) {
        setLeftWidth(newLeftWidth);
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

  if (isRightPanelCollapsed) {
    return (
      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
        {/* Left Panel - Full Width */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {leftPanel}
        </div>

        {/* Collapsed Right Panel */}
        <div className="w-10 bg-gray-100 border-l border-gray-200 flex flex-col items-center py-2 flex-shrink-0">
          <button
            onClick={onRightPanelToggle}
            className="p-2 hover:bg-gray-200 rounded transition-colors mb-2"
            title="Expand AI Assistant"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 flex items-center justify-center">
            <span
              className="text-xs font-medium text-gray-500 whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {rightPanelHeader}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
      {/* Left Panel */}
      <div style={{ width: `${leftWidth}%` }} className="flex flex-col overflow-hidden">
        {leftPanel}
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 bg-gray-300 hover:bg-primary-500 cursor-col-resize flex-shrink-0 transition-colors ${
          isDragging ? 'bg-primary-500' : ''
        }`}
        style={{ userSelect: 'none' }}
      >
        <div className="h-full w-full relative">
          {/* Visual indicator */}
          <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-gray-400 hover:bg-primary-600"></div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: `${100 - leftWidth}%` }} className="flex flex-col overflow-hidden">
        {/* Collapse button header */}
        {onRightPanelToggle && (
          <div className="bg-gray-100 px-2 py-1 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-medium text-gray-600">{rightPanelHeader}</span>
            <button
              onClick={onRightPanelToggle}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Collapse AI Assistant"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
        {rightPanel}
      </div>
    </div>
  );
};
