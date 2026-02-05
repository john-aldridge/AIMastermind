/**
 * CPU Profiling Options Component
 *
 * Configuration options for JavaScript CPU profiling
 */

import React from 'react';
import type { CPUProfilingSettings } from '@/types/advancedDebugging';
import {
  CheckboxOption,
  RadioGroup,
  SelectOption,
  NumberInput,
} from './ExpandableSection';

interface CPUProfilingOptionsProps {
  settings: CPUProfilingSettings;
  onChange: (settings: Partial<CPUProfilingSettings>) => void;
  disabled?: boolean;
}

export const CPUProfilingOptions: React.FC<CPUProfilingOptionsProps> = ({
  settings,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <RadioGroup
        label="Profiling Mode"
        value={settings.mode}
        options={[
          {
            value: 'on-demand',
            label: 'On-Demand',
            description: 'Start/stop profiling manually',
          },
          {
            value: 'continuous',
            label: 'Continuous',
            description: 'Always profile (moderate overhead)',
          },
          {
            value: 'triggered',
            label: 'Auto-Triggered',
            description: 'Start when CPU usage exceeds threshold',
          },
        ]}
        onChange={(v) => onChange({ mode: v })}
        disabled={disabled}
      />

      {/* Triggered Mode Options */}
      {settings.mode === 'triggered' && (
        <div className="ml-7 p-3 bg-gray-100 rounded-lg">
          <NumberInput
            label="CPU Threshold"
            description="Start profiling when CPU exceeds this percentage"
            value={settings.triggerThresholdPercent}
            min={50}
            max={100}
            step={5}
            onChange={(v) => onChange({ triggerThresholdPercent: v })}
            disabled={disabled}
            suffix="%"
          />
          <p className="text-xs text-gray-500 mt-2">
            Note: CPU usage detection requires additional monitoring overhead.
          </p>
        </div>
      )}

      {/* Continuous Mode Warning */}
      {settings.mode === 'continuous' && (
        <div className="ml-7 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Continuous profiling has moderate performance overhead. Use for debugging sessions only.
        </div>
      )}

      {/* Sampling Configuration */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Sampling</h4>
        <SelectOption
          label="Sampling Interval"
          description="Time between samples (lower = more detail, more overhead)"
          value={settings.samplingIntervalUs}
          options={[
            { value: 100, label: '100 \u00b5s (high detail)' },
            { value: 500, label: '500 \u00b5s' },
            { value: 1000, label: '1000 \u00b5s (default)' },
            { value: 2000, label: '2000 \u00b5s' },
            { value: 5000, label: '5000 \u00b5s' },
            { value: 10000, label: '10000 \u00b5s (low overhead)' },
          ]}
          onChange={(v) => onChange({ samplingIntervalUs: Number(v) })}
          disabled={disabled}
        />
      </div>

      {/* Advanced Options */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Advanced Options</h4>

        <CheckboxOption
          label="Include Native Functions"
          description="Include browser internal functions in profile"
          checked={settings.includeNatives}
          onChange={(v) => onChange({ includeNatives: v })}
          disabled={disabled}
        />

        <NumberInput
          label="Max Call Stack Depth"
          description="Maximum depth to track in call stacks"
          value={settings.maxDepth}
          min={5}
          max={100}
          step={5}
          onChange={(v) => onChange({ maxDepth: v })}
          disabled={disabled}
        />
      </div>

      {/* Storage Options */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Storage</h4>
        <NumberInput
          label="Max Profiles"
          description="Keep N most recent profiles"
          value={settings.maxProfiles}
          min={1}
          max={20}
          onChange={(v) => onChange({ maxProfiles: v })}
          disabled={disabled}
        />
      </div>

      {/* Info */}
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
        <p className="mb-2">
          <strong>CPU profiling</strong> samples the JavaScript call stack at regular intervals
          to identify hot functions and performance bottlenecks.
        </p>
        <p>
          <strong>Tips:</strong> Profile specific user interactions by starting before
          and stopping after the interaction. Look for functions with high "self time".
        </p>
      </div>
    </div>
  );
};
