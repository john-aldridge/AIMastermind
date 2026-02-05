/**
 * Expandable Section Component
 *
 * Reusable component for settings sections that can be toggled on/off
 * and expanded to show additional options.
 */

import React, { useState } from 'react';
import type { PerformanceImpact } from '@/types/advancedDebugging';

interface ExpandableSectionProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  performance?: PerformanceImpact;
  disabled?: boolean;
  disabledReason?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const performanceColors: Record<PerformanceImpact, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700', label: 'Low Impact' },
  moderate: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Moderate Impact' },
  high: { bg: 'bg-red-100', text: 'text-red-700', label: 'High Impact' },
};

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  description,
  enabled,
  onToggle,
  performance = 'low',
  disabled = false,
  disabledReason,
  children,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || enabled);

  const perfStyle = performanceColors[performance];

  const handleToggle = () => {
    if (disabled) return;
    const newEnabled = !enabled;
    onToggle(newEnabled);
    // Auto-expand when enabling
    if (newEnabled && !isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${disabled ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div
        className={`p-4 flex items-center justify-between ${!disabled ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Toggle Switch */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed flex-shrink-0 ${
              enabled ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{title}</span>
              {enabled && performance && (
                <span className={`text-xs px-2 py-0.5 rounded ${perfStyle.bg} ${perfStyle.text}`}>
                  {perfStyle.label}
                </span>
              )}
              {disabled && disabledReason && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                  {disabledReason}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{description}</p>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={handleExpand}
          className="p-1 hover:bg-gray-100 rounded transition-colors ml-2 flex-shrink-0"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );
};

// Helper components for common form elements within expandable sections

interface OptionRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export const OptionRow: React.FC<OptionRowProps> = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

interface CheckboxOptionProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const CheckboxOption: React.FC<CheckboxOptionProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) => (
  <label className={`flex items-start gap-3 py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="mt-0.5 w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
    />
    <div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
  </label>
);

interface RadioGroupProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; description?: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function RadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: RadioGroupProps<T>) {
  return (
    <div className="py-2">
      <span className="text-sm font-medium text-gray-700 block mb-2">{label}</span>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="mt-0.5 w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm text-gray-700">{option.label}</span>
              {option.description && <p className="text-xs text-gray-500">{option.description}</p>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

interface SelectOptionProps<T extends string | number> {
  label: string;
  description?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SelectOption<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
}: SelectOptionProps<T>) {
  return (
    <OptionRow label={label} description={description}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </OptionRow>
  );
}

interface NumberInputProps {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  suffix?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  suffix,
}) => (
  <OptionRow label={label} description={description}>
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
    </div>
  </OptionRow>
);

interface TextInputProps {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  description,
  value,
  placeholder,
  onChange,
  disabled = false,
}) => (
  <OptionRow label={label} description={description}>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  </OptionRow>
);
