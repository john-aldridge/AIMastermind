/**
 * Code Coverage Options Component
 *
 * Configuration options for JavaScript code coverage tracking
 */

import React from 'react';
import type { CodeCoverageSettings } from '@/types/advancedDebugging';
import {
  CheckboxOption,
  RadioGroup,
  TextInput,
} from './ExpandableSection';

interface CodeCoverageOptionsProps {
  settings: CodeCoverageSettings;
  onChange: (settings: Partial<CodeCoverageSettings>) => void;
  disabled?: boolean;
}

export const CodeCoverageOptions: React.FC<CodeCoverageOptionsProps> = ({
  settings,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Granularity */}
      <RadioGroup
        label="Coverage Granularity"
        value={settings.granularity}
        options={[
          {
            value: 'function',
            label: 'Function Level',
            description: 'Track which functions are called (faster)',
          },
          {
            value: 'block',
            label: 'Block Level',
            description: 'Track individual code blocks within functions (detailed, higher overhead)',
          },
        ]}
        onChange={(v) => onChange({ granularity: v })}
        disabled={disabled}
      />

      {settings.granularity === 'block' && (
        <div className="ml-7 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Block-level coverage provides detailed information about which specific code paths
          are executed, but has higher performance overhead.
        </div>
      )}

      {/* Mode */}
      <div className="border-t border-gray-200 pt-4">
        <RadioGroup
          label="Collection Mode"
          value={settings.mode}
          options={[
            {
              value: 'one-shot',
              label: 'One-Shot',
              description: 'Single coverage capture, then stop',
            },
            {
              value: 'continuous',
              label: 'Continuous',
              description: 'Keep tracking coverage over time',
            },
          ]}
          onChange={(v) => onChange({ mode: v })}
          disabled={disabled}
        />
      </div>

      {/* Tracking Options */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Tracking Options</h4>

        <CheckboxOption
          label="Track Call Counts"
          description="Count how many times each function is called"
          checked={settings.trackCallCounts}
          onChange={(v) => onChange({ trackCallCounts: v })}
          disabled={disabled}
        />

        <CheckboxOption
          label="Report Uncovered Code"
          description="Include functions that were never called in report"
          checked={settings.reportUncovered}
          onChange={(v) => onChange({ reportUncovered: v })}
          disabled={disabled}
        />
      </div>

      {/* Script Filters */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Script Filters</h4>
        <p className="text-xs text-gray-500 mb-3">
          Use regular expressions to include or exclude specific scripts.
        </p>

        <TextInput
          label="Include Pattern"
          description="Only track scripts matching this regex"
          value={settings.includeScriptsPattern}
          placeholder="e.g., /src/.*\\.js$"
          onChange={(v) => onChange({ includeScriptsPattern: v })}
          disabled={disabled}
        />

        <div className="mt-2">
          <TextInput
            label="Exclude Pattern"
            description="Skip scripts matching this regex"
            value={settings.excludeScriptsPattern}
            placeholder="e.g., node_modules|vendor"
            onChange={(v) => onChange({ excludeScriptsPattern: v })}
            disabled={disabled}
          />
        </div>

        {/* Pattern Examples */}
        <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <p className="font-medium mb-1">Common patterns:</p>
          <ul className="space-y-1 ml-3">
            <li><code>.*</code> - All scripts (default)</li>
            <li><code>^https://example\\.com/</code> - Only scripts from example.com</li>
            <li><code>node_modules</code> - Exclude node_modules</li>
            <li><code>\\.(min|bundle)\\.js$</code> - Exclude minified/bundled files</li>
          </ul>
        </div>
      </div>

      {/* Info */}
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
        <p className="mb-2">
          <strong>Code coverage</strong> tracks which parts of your JavaScript code are executed.
          This helps identify dead code and untested paths.
        </p>
        <p>
          <strong>Tips:</strong> Use coverage during testing to ensure all code paths are exercised.
          Filter out third-party libraries to focus on your own code.
        </p>
      </div>
    </div>
  );
};
