/**
 * FlowToolbar - Save, undo, redo, zoom controls
 */

import React from 'react';
import { useReactFlow } from '@xyflow/react';
import type { ValidationError } from './FlowToConfigConverter';

interface FlowToolbarProps {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  validationErrors: ValidationError[];
  onAddCapability: () => void;
  hasChanges: boolean;
  showNotes?: boolean;
  onToggleNotes?: () => void;
  onGenerateNotes?: () => void;
  isGeneratingNotes?: boolean;
  onAutoLayout?: () => void;
}

export const FlowToolbar: React.FC<FlowToolbarProps> = ({
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isSaving,
  validationErrors,
  onAddCapability,
  hasChanges,
  showNotes = false,
  onToggleNotes,
  onGenerateNotes,
  isGeneratingNotes = false,
  onAutoLayout,
}) => {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [zoom, setZoom] = React.useState(1);

  // Update zoom display
  React.useEffect(() => {
    const interval = setInterval(() => {
      setZoom(getZoom());
    }, 100);
    return () => clearInterval(interval);
  }, [getZoom]);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200">
      {/* Left: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Add Capability */}
        <button
          onClick={onAddCapability}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Capability
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>

        {/* Notes Controls */}
        {onToggleNotes && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Toggle Notes */}
            <button
              onClick={onToggleNotes}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                showNotes
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
              title={showNotes ? 'Hide AI Notes' : 'Show AI Notes'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {showNotes ? 'Hide Notes' : 'Show Notes'}
            </button>

            {/* Generate All Notes */}
            {showNotes && onGenerateNotes && (
              <button
                onClick={onGenerateNotes}
                disabled={isGeneratingNotes}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Generate AI notes for all nodes"
              >
                {isGeneratingNotes ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate All
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Right: Zoom and Save */}
      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded">
          <button
            onClick={() => zoomOut()}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-l transition-colors"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xs text-gray-600 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => zoomIn()}
            className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-r transition-colors"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Fit view */}
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Fit to view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        {/* Auto Layout */}
        {onAutoLayout && (
          <button
            onClick={onAutoLayout}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Auto-arrange nodes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Auto Layout
          </button>
        )}

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Save */}
        <button
          onClick={onSave}
          disabled={!hasChanges || isSaving || validationErrors.length > 0}
          className="flex items-center gap-1 px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save
            </>
          )}
        </button>
      </div>
    </div>
  );
};
