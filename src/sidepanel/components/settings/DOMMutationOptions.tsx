/**
 * DOM Mutation Tracking Options Component
 *
 * Configuration options for DOM mutation tracking feature
 */

import React from 'react';
import type { DOMMutationSettings } from '@/types/advancedDebugging';
import {
  CheckboxOption,
  RadioGroup,
  NumberInput,
  TextInput,
} from './ExpandableSection';

interface DOMMutationOptionsProps {
  settings: DOMMutationSettings;
  onChange: (settings: Partial<DOMMutationSettings>) => void;
  disabled?: boolean;
}

export const DOMMutationOptions: React.FC<DOMMutationOptionsProps> = ({
  settings,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      {/* What to Track */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Track Changes To</h4>
        <div className="grid grid-cols-2 gap-x-4">
          <CheckboxOption
            label="Elements"
            description="Node additions/removals"
            checked={settings.trackElements}
            onChange={(v) => onChange({ trackElements: v })}
            disabled={disabled}
          />
          <CheckboxOption
            label="Attributes"
            description="Attribute changes"
            checked={settings.trackAttributes}
            onChange={(v) => onChange({ trackAttributes: v })}
            disabled={disabled}
          />
          <CheckboxOption
            label="Text Content"
            description="Text/character data"
            checked={settings.trackText}
            onChange={(v) => onChange({ trackText: v })}
            disabled={disabled}
          />
          <CheckboxOption
            label="Computed Styles"
            description="Style changes (heavy)"
            checked={settings.trackStyles}
            onChange={(v) => onChange({ trackStyles: v })}
            disabled={disabled}
          />
        </div>
        {settings.trackStyles && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            Tracking computed styles has significant performance impact and generates many events.
          </div>
        )}
      </div>

      {/* Scope */}
      <div className="border-t border-gray-200 pt-4">
        <RadioGroup
          label="Scope"
          value={settings.scope}
          options={[
            { value: 'all', label: 'All Elements', description: 'Track entire document' },
            { value: 'selector', label: 'CSS Selector', description: 'Track specific elements only' },
          ]}
          onChange={(v) => onChange({ scope: v })}
          disabled={disabled}
        />
        {settings.scope === 'selector' && (
          <div className="mt-2 ml-7">
            <TextInput
              label=""
              value={settings.selector}
              placeholder="e.g., #app, .container, [data-component]"
              onChange={(v) => onChange({ selector: v })}
              disabled={disabled}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a valid CSS selector. Mutations will only be tracked for matching elements and their descendants.
            </p>
          </div>
        )}
      </div>

      {/* Performance Options */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Performance</h4>
        <NumberInput
          label="Throttle"
          description="Batch rapid mutations"
          value={settings.throttleMs}
          min={0}
          max={1000}
          step={10}
          onChange={(v) => onChange({ throttleMs: v })}
          disabled={disabled}
          suffix="ms"
        />
        <NumberInput
          label="Max Mutations"
          description="Buffer size before oldest dropped"
          value={settings.maxMutations}
          min={100}
          max={10000}
          step={100}
          onChange={(v) => onChange({ maxMutations: v })}
          disabled={disabled}
        />
      </div>

      {/* Info */}
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
        <p>
          DOM mutation tracking uses a MutationObserver to capture changes to the page structure.
          Higher throttle values improve performance but may miss rapid changes.
        </p>
      </div>
    </div>
  );
};
