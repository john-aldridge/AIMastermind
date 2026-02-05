/**
 * Memory Profiling Options Component
 *
 * Configuration options for heap profiling and memory analysis
 */

import React from 'react';
import type { MemoryProfilingSettings } from '@/types/advancedDebugging';
import {
  CheckboxOption,
  RadioGroup,
  SelectOption,
  NumberInput,
} from './ExpandableSection';

interface MemoryProfilingOptionsProps {
  settings: MemoryProfilingSettings;
  onChange: (settings: Partial<MemoryProfilingSettings>) => void;
  disabled?: boolean;
}

export const MemoryProfilingOptions: React.FC<MemoryProfilingOptionsProps> = ({
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
            description: 'Take snapshots manually when needed',
          },
          {
            value: 'periodic',
            label: 'Periodic',
            description: 'Auto-take snapshots at intervals',
          },
          {
            value: 'sampling',
            label: 'Sampling',
            description: 'Continuous allocation sampling (moderate overhead)',
          },
        ]}
        onChange={(v) => onChange({ mode: v })}
        disabled={disabled}
      />

      {/* Periodic Mode Options */}
      {settings.mode === 'periodic' && (
        <div className="ml-7 p-3 bg-gray-100 rounded-lg">
          <SelectOption
            label="Snapshot Interval"
            description="Time between auto-snapshots"
            value={settings.periodicIntervalMin}
            options={[
              { value: 1, label: '1 minute' },
              { value: 2, label: '2 minutes' },
              { value: 5, label: '5 minutes' },
              { value: 10, label: '10 minutes' },
              { value: 15, label: '15 minutes' },
              { value: 30, label: '30 minutes' },
              { value: 60, label: '1 hour' },
            ]}
            onChange={(v) => onChange({ periodicIntervalMin: Number(v) })}
            disabled={disabled}
          />
        </div>
      )}

      {/* Sampling Mode Info */}
      {settings.mode === 'sampling' && (
        <div className="ml-7 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          Sampling mode continuously tracks allocations and can help identify memory leaks over time.
          This has moderate performance impact.
        </div>
      )}

      {/* Advanced Options */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Advanced Options</h4>

        <CheckboxOption
          label="Track Allocation Call Stacks"
          description="Record where allocations happen (increases overhead)"
          checked={settings.trackAllocations}
          onChange={(v) => onChange({ trackAllocations: v })}
          disabled={disabled}
        />

        <CheckboxOption
          label="Detect Detached DOM Nodes"
          description="Flag DOM nodes no longer in document"
          checked={settings.detectDetachedDOM}
          onChange={(v) => onChange({ detectDetachedDOM: v })}
          disabled={disabled}
        />

        <CheckboxOption
          label="Include Numeric Values"
          description="Capture actual numbers in snapshot (larger size)"
          checked={settings.includeNumericValues}
          onChange={(v) => onChange({ includeNumericValues: v })}
          disabled={disabled}
        />
      </div>

      {/* Storage Options */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Storage</h4>
        <NumberInput
          label="Max Snapshots"
          description="Keep N most recent snapshots"
          value={settings.maxSnapshots}
          min={1}
          max={20}
          onChange={(v) => onChange({ maxSnapshots: v })}
          disabled={disabled}
        />
      </div>

      {/* Info */}
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
        <p className="mb-2">
          <strong>Heap snapshots</strong> capture the complete memory state at a point in time.
          Use them to identify memory leaks and understand object retention.
        </p>
        <p>
          <strong>Tips:</strong> Compare snapshots taken before and after operations to find leaks.
          Detached DOM nodes are a common source of memory leaks in web apps.
        </p>
      </div>
    </div>
  );
};
