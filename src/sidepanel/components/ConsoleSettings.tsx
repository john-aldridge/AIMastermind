/**
 * Console Settings Component
 *
 * Settings UI for console monitoring levels
 */

import React, { useState, useEffect } from 'react';
import { consoleMonitor, ConsoleMonitoringLevel } from '@/services/consoleMonitor';

interface MonitoringOption {
  value: ConsoleMonitoringLevel;
  label: string;
  description: string;
  features: string[];
  requiresPermission?: boolean;
}

const MONITORING_OPTIONS: MonitoringOption[] = [
  {
    value: 'none',
    label: 'Extension Only',
    description: 'Monitor only extension code (always on)',
    features: [
      'Background service worker logs',
      'Sidepanel UI logs',
      'Agent/client execution logs',
      'No page console monitoring',
    ],
  },
  {
    value: 'extension',
    label: 'Standard',
    description: 'Extension + page console logs',
    features: [
      'Everything in Extension Only',
      'Page console.log/warn/error/info',
      'Cross-origin iframe logs',
      'Page errors and unhandled rejections',
      'Content script logs',
    ],
  },
  {
    value: 'full',
    label: 'Full Monitoring',
    description: 'Complete monitoring via Chrome DevTools Protocol',
    features: [
      'Everything in Standard',
      'Web Worker console logs',
      'Service Worker console logs',
      'Shared Worker console logs',
      'Network/security warnings',
      'Full stack traces with source locations',
      'console.table/dir/trace formatting',
      'All execution contexts tracked',
    ],
    requiresPermission: true,
  },
];

export const ConsoleSettings: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState<ConsoleMonitoringLevel>('extension');
  const [hasDebuggerPermission, setHasDebuggerPermission] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    // Load current level
    setCurrentLevel(consoleMonitor.getLevel());

    // Check debugger permission
    consoleMonitor.hasDebuggerPermission().then(setHasDebuggerPermission);
  }, []);

  const handleLevelChange = async (level: ConsoleMonitoringLevel) => {
    if (level === currentLevel) return;

    // Check if full monitoring is selected but no debugger permission
    if (level === 'full' && !hasDebuggerPermission) {
      alert('Full monitoring requires the debugger permission. Please add "debugger" to your extension permissions.');
      return;
    }

    setIsChanging(true);
    try {
      await consoleMonitor.setLevel(level);
      setCurrentLevel(level);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <>
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Console Monitoring</h3>
            <p className="text-sm text-blue-800">
              When enabled, logs are collected and can be analyzed by the AI to help debug issues with agents and clients.
            </p>
          </div>
        </div>
      </div>

      {/* Monitoring Level Options */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {MONITORING_OPTIONS.map((option, index) => {
          const isSelected = currentLevel === option.value;
          const isDisabled = option.requiresPermission && !hasDebuggerPermission;

          return (
            <div
              key={option.value}
              className={`p-4 ${index !== MONITORING_OPTIONS.length - 1 ? 'border-b border-gray-200' : ''} ${
                isDisabled ? 'opacity-60' : ''
              }`}
            >
              <label className={`flex items-start gap-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="consoleMonitoringLevel"
                  value={option.value}
                  checked={isSelected}
                  onChange={() => handleLevelChange(option.value)}
                  disabled={isDisabled || isChanging}
                  className="mt-1 w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    {option.value === 'extension' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                    {option.requiresPermission && !hasDebuggerPermission && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        Requires Permission
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>

                  {/* Feature list */}
                  <ul className="mt-2 space-y-1">
                    {option.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Debugger Permission Notice */}
      {!hasDebuggerPermission && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Debugger Permission Required</h4>
              <p className="text-sm text-amber-800">
                To enable Full Monitoring, the extension needs the "debugger" permission.
                Add <code className="bg-amber-100 px-1 rounded">"debugger"</code> to your manifest.json permissions array.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What's Captured Info */}
      <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">How Logs Help Debugging</h4>
        <p className="mb-2">
          When an error occurs during agent or client execution, the AI can analyze the collected logs to:
        </p>
        <ul className="space-y-1 ml-4 list-disc text-gray-600">
          <li>Identify the root cause of errors</li>
          <li>Suggest fixes for configuration issues</li>
          <li>Provide context about what happened before the error</li>
          <li>Help you understand agent behavior</li>
        </ul>
      </div>
    </>
  );
};
