/**
 * Advanced Debugging Settings Component
 *
 * Main settings component for all advanced Chrome DevTools Protocol features:
 * - DOM Mutation Tracking
 * - Memory Profiling
 * - CPU Profiling
 * - Code Coverage
 */

import React, { useState, useEffect } from 'react';
import {
  AdvancedDebuggingSettings as Settings,
  DEFAULT_ADVANCED_DEBUGGING_SETTINGS,
  getDOMPerformanceImpact,
  getMemoryPerformanceImpact,
  getCPUPerformanceImpact,
  getCoveragePerformanceImpact,
} from '@/types/advancedDebugging';
import { advancedDebugger } from '@/services/advancedDebugger';
import { ExpandableSection } from './settings/ExpandableSection';
import { DOMMutationOptions } from './settings/DOMMutationOptions';
import { MemoryProfilingOptions } from './settings/MemoryProfilingOptions';
import { CPUProfilingOptions } from './settings/CPUProfilingOptions';
import { CodeCoverageOptions } from './settings/CodeCoverageOptions';

export const AdvancedDebuggingSettings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_ADVANCED_DEBUGGING_SETTINGS);
  const [hasDebuggerPermission, setHasDebuggerPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load settings and check permission
    Promise.all([
      advancedDebugger.getSettings(),
      advancedDebugger.hasDebuggerPermission(),
    ]).then(([loadedSettings, hasPermission]) => {
      setSettings(loadedSettings);
      setHasDebuggerPermission(hasPermission);
      setIsLoading(false);
    });

    // Subscribe to settings changes
    const unsubscribe = advancedDebugger.subscribe(setSettings);
    return unsubscribe;
  }, []);

  const updateSettings = async (partial: Partial<Settings>) => {
    setIsSaving(true);
    try {
      await advancedDebugger.updateSettings(partial);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableAll = async () => {
    await updateSettings({
      dom: { ...settings.dom, enabled: true },
      memory: { ...settings.memory, enabled: true },
      cpu: { ...settings.cpu, enabled: true },
      coverage: { ...settings.coverage, enabled: true },
    });
  };

  const handleDisableAll = async () => {
    await updateSettings({
      dom: { ...settings.dom, enabled: false },
      memory: { ...settings.memory, enabled: false },
      cpu: { ...settings.cpu, enabled: false },
      coverage: { ...settings.coverage, enabled: false },
    });
  };

  const handleResetDefaults = async () => {
    if (confirm('Reset all advanced debugging settings to defaults?')) {
      await advancedDebugger.resetSettings();
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const anyEnabled = settings.dom.enabled || settings.memory.enabled ||
                     settings.cpu.enabled || settings.coverage.enabled;

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Advanced Debugging Tools</h3>
            <p className="text-sm text-blue-800">
              Powerful Chrome DevTools Protocol features for deep debugging.
              Enable only what you need - each feature has performance implications.
            </p>
          </div>
        </div>
      </div>

      {/* Permission Warning */}
      {!hasDebuggerPermission && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Debugger Permission Required</h4>
              <p className="text-sm text-amber-800">
                These features require the <code className="bg-amber-100 px-1 rounded">"debugger"</code> permission
                in manifest.json. Add it to enable advanced debugging capabilities.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Saving Indicator */}
      {isSaving && (
        <div className="flex items-center justify-center py-2 text-sm text-gray-500">
          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        </div>
      )}

      {/* Feature Sections */}
      <ExpandableSection
        title="DOM Mutation Tracking"
        description="Track changes to page elements, attributes, and content"
        enabled={settings.dom.enabled}
        onToggle={(enabled) => updateSettings({ dom: { ...settings.dom, enabled } })}
        performance={getDOMPerformanceImpact(settings.dom)}
        disabled={!hasDebuggerPermission}
        disabledReason={!hasDebuggerPermission ? 'Requires Permission' : undefined}
      >
        <DOMMutationOptions
          settings={settings.dom}
          onChange={(partial) => updateSettings({ dom: { ...settings.dom, ...partial } })}
          disabled={!hasDebuggerPermission}
        />
      </ExpandableSection>

      <ExpandableSection
        title="Memory Profiling"
        description="Heap snapshots, allocation tracking, memory leak detection"
        enabled={settings.memory.enabled}
        onToggle={(enabled) => updateSettings({ memory: { ...settings.memory, enabled } })}
        performance={getMemoryPerformanceImpact(settings.memory)}
        disabled={!hasDebuggerPermission}
        disabledReason={!hasDebuggerPermission ? 'Requires Permission' : undefined}
      >
        <MemoryProfilingOptions
          settings={settings.memory}
          onChange={(partial) => updateSettings({ memory: { ...settings.memory, ...partial } })}
          disabled={!hasDebuggerPermission}
        />
      </ExpandableSection>

      <ExpandableSection
        title="CPU Profiling"
        description="Performance profiling, flame graphs, slow function detection"
        enabled={settings.cpu.enabled}
        onToggle={(enabled) => updateSettings({ cpu: { ...settings.cpu, enabled } })}
        performance={getCPUPerformanceImpact(settings.cpu)}
        disabled={!hasDebuggerPermission}
        disabledReason={!hasDebuggerPermission ? 'Requires Permission' : undefined}
      >
        <CPUProfilingOptions
          settings={settings.cpu}
          onChange={(partial) => updateSettings({ cpu: { ...settings.cpu, ...partial } })}
          disabled={!hasDebuggerPermission}
        />
      </ExpandableSection>

      <ExpandableSection
        title="Code Coverage"
        description="Track which code paths execute, find dead code"
        enabled={settings.coverage.enabled}
        onToggle={(enabled) => updateSettings({ coverage: { ...settings.coverage, enabled } })}
        performance={getCoveragePerformanceImpact(settings.coverage)}
        disabled={!hasDebuggerPermission}
        disabledReason={!hasDebuggerPermission ? 'Requires Permission' : undefined}
      >
        <CodeCoverageOptions
          settings={settings.coverage}
          onChange={(partial) => updateSettings({ coverage: { ...settings.coverage, ...partial } })}
          disabled={!hasDebuggerPermission}
        />
      </ExpandableSection>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleEnableAll}
          disabled={!hasDebuggerPermission || anyEnabled}
          className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          Enable All
        </button>
        <button
          onClick={handleDisableAll}
          disabled={!anyEnabled}
          className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          Disable All
        </button>
        <button
          onClick={handleResetDefaults}
          className="py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          Reset Defaults
        </button>
      </div>

      {/* Performance Summary */}
      {anyEnabled && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Features</h4>
          <div className="flex flex-wrap gap-2">
            {settings.dom.enabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                DOM Tracking
              </span>
            )}
            {settings.memory.enabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Memory {settings.memory.mode === 'periodic' ? '(Periodic)' : settings.memory.mode === 'sampling' ? '(Sampling)' : ''}
              </span>
            )}
            {settings.cpu.enabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                CPU {settings.cpu.mode === 'continuous' ? '(Continuous)' : settings.cpu.mode === 'triggered' ? '(Triggered)' : ''}
              </span>
            )}
            {settings.coverage.enabled && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Coverage ({settings.coverage.granularity})
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Active debugging features may impact page performance. Monitor the impact and disable when not needed.
          </p>
        </div>
      )}
    </div>
  );
};
