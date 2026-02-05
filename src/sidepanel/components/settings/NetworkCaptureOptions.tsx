/**
 * Network Capture Options Component
 *
 * Configuration options for debugger-based network capture
 */

import React from 'react';
import type { NetworkCaptureSettings, NetworkResourceType } from '@/types/advancedDebugging';
import { ALL_RESOURCE_TYPES, API_RESOURCE_TYPES } from '@/types/advancedDebugging';
import {
  CheckboxOption,
  NumberInput,
  TextInput,
} from './ExpandableSection';

interface NetworkCaptureOptionsProps {
  settings: NetworkCaptureSettings;
  onChange: (settings: Partial<NetworkCaptureSettings>) => void;
  disabled?: boolean;
}

const RESOURCE_TYPE_LABELS: Record<NetworkResourceType, string> = {
  document: 'Documents (HTML)',
  stylesheet: 'Stylesheets (CSS)',
  image: 'Images',
  media: 'Media (audio/video)',
  font: 'Fonts',
  script: 'Scripts (JS)',
  texttrack: 'Text Tracks',
  xhr: 'XHR Requests',
  fetch: 'Fetch Requests',
  eventsource: 'EventSource (SSE)',
  websocket: 'WebSockets',
  manifest: 'Manifests',
  other: 'Other',
};

export const NetworkCaptureOptions: React.FC<NetworkCaptureOptionsProps> = ({
  settings,
  onChange,
  disabled = false,
}) => {
  const handleResourceTypeToggle = (type: NetworkResourceType, checked: boolean) => {
    const current = settings.filterResourceTypes;
    const updated = checked
      ? [...current, type]
      : current.filter(t => t !== type);
    onChange({ filterResourceTypes: updated });
  };

  const handlePresetSelect = (preset: 'all' | 'api') => {
    onChange({
      filterResourceTypes: preset === 'all' ? [...ALL_RESOURCE_TYPES] : [...API_RESOURCE_TYPES]
    });
  };

  const isApiOnly = settings.filterResourceTypes.length === API_RESOURCE_TYPES.length &&
    API_RESOURCE_TYPES.every(t => settings.filterResourceTypes.includes(t));

  const isAll = settings.filterResourceTypes.length === ALL_RESOURCE_TYPES.length;

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
        <strong>Configure capture options below.</strong> The debugger will attach when you select this mode
        and detach when you switch to another mode or close the side panel.
      </div>

      {/* What to Capture */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Capture Options</h4>
        <div className="space-y-1">
          <CheckboxOption
            label="Request Bodies"
            description="POST/PUT data, form submissions"
            checked={settings.captureRequestBodies}
            onChange={(v) => onChange({ captureRequestBodies: v })}
            disabled={disabled}
          />
          <CheckboxOption
            label="Response Bodies"
            description="Full response content (can be large)"
            checked={settings.captureResponseBodies}
            onChange={(v) => onChange({ captureResponseBodies: v })}
            disabled={disabled}
          />
          <CheckboxOption
            label="WebSocket Frames"
            description="Real-time message data"
            checked={settings.captureWebSockets}
            onChange={(v) => onChange({ captureWebSockets: v })}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Resource Type Filter */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Resource Types to Capture</h4>

        {/* Presets */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => handlePresetSelect('api')}
            disabled={disabled}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              isApiOnly
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            API Only (Recommended)
          </button>
          <button
            onClick={() => handlePresetSelect('all')}
            disabled={disabled}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              isAll
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            All Resources
          </button>
        </div>

        {/* Individual toggles */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {ALL_RESOURCE_TYPES.map(type => (
            <label
              key={type}
              className={`flex items-center gap-2 py-1 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                checked={settings.filterResourceTypes.includes(type)}
                onChange={(e) => handleResourceTypeToggle(type, e.target.checked)}
                disabled={disabled}
                className="w-3.5 h-3.5 text-primary-600 focus:ring-primary-500 rounded"
              />
              <span className="text-gray-700">{RESOURCE_TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* URL Filters */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">URL Filters</h4>
        <TextInput
          label="Include Pattern"
          description="Only capture URLs matching this regex"
          value={settings.includeUrlPattern}
          placeholder="e.g., api\\.example\\.com"
          onChange={(v) => onChange({ includeUrlPattern: v })}
          disabled={disabled}
        />
        <div className="mt-2">
          <TextInput
            label="Exclude Pattern"
            description="Skip URLs matching this regex"
            value={settings.excludeUrlPattern}
            placeholder="e.g., analytics|tracking|ads"
            onChange={(v) => onChange({ excludeUrlPattern: v })}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Limits */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Limits</h4>
        <NumberInput
          label="Max Body Size"
          description="Truncate bodies larger than this"
          value={Math.floor(settings.maxBodySize / 1024)}
          min={64}
          max={10240}
          step={64}
          onChange={(v) => onChange({ maxBodySize: v * 1024 })}
          disabled={disabled}
          suffix="KB"
        />
        <NumberInput
          label="Max Requests"
          description="Keep N most recent requests"
          value={settings.maxRequests}
          min={100}
          max={2000}
          step={100}
          onChange={(v) => onChange({ maxRequests: v })}
          disabled={disabled}
        />
      </div>

    </div>
  );
};
