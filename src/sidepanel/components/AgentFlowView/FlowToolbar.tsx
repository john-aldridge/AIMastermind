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
  hasChanges: boolean;
  isSaving: boolean;
  validationErrors: ValidationError[];
  onAddCapability: () => void;
}

export const FlowToolbar: React.FC<FlowToolbarProps> = ({
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasChanges,
  isSaving,
  validationErrors,
  onAddCapability,
}) => {
  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();
  const [zoom, setZoom] = React.useState(1);
  const [showErrors, setShowErrors] = React.useState(false);
  const errorsRef = React.useRef<HTMLDivElement>(null);

  // Update zoom display
  React.useEffect(() => {
    const interval = setInterval(() => {
      setZoom(getZoom());
    }, 100);
    return () => clearInterval(interval);
  }, [getZoom]);

  // Close errors dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (errorsRef.current && !errorsRef.current.contains(event.target as Node)) {
        setShowErrors(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      </div>

      {/* Center: Validation Status */}
      <div className="flex items-center gap-2">
        {validationErrors.length > 0 ? (
          <div className="relative" ref={errorsRef}>
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="flex items-center gap-1 text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{validationErrors.length} error{validationErrors.length > 1 ? 's' : ''}</span>
              <svg className={`w-3 h-3 transition-transform ${showErrors ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showErrors && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 max-h-60 overflow-y-auto bg-white border border-red-200 rounded-lg shadow-lg z-50">
                <div className="p-2 border-b border-red-100 bg-red-50">
                  <span className="text-sm font-medium text-red-800">Validation Errors</span>
                </div>
                <ul className="p-2 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Valid</span>
          </div>
        )}

        {hasChanges && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            Unsaved changes
          </span>
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
