import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/state/appStore';
import { MONITORING_LEVELS, MonitoringLevel } from '@/utils/networkMonitor';
import { permissionManager } from '@/utils/permissions';
import { sendToBackground, MessageType } from '@/utils/messaging';
import { NetworkCaptureOptions } from './settings/NetworkCaptureOptions';
import { advancedDebugger } from '@/services/advancedDebugger';
import type { NetworkCaptureSettings } from '@/types/advancedDebugging';

export const NetworkSettings: React.FC = () => {
  const { userConfig, updateUserConfig } = useAppStore();
  const [currentLevel, setCurrentLevel] = useState<MonitoringLevel>('filtering-only');
  const [isChanging, setIsChanging] = useState(false);
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [currentTabId, setCurrentTabId] = useState<number | undefined>();
  const [networkCaptureSettings, setNetworkCaptureSettings] = useState<NetworkCaptureSettings | null>(null);
  const [debuggerRequestCount, setDebuggerRequestCount] = useState(0);

  useEffect(() => {
    // Get current tab ID on mount
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) {
        setCurrentTabId(tab.id);
        loadCurrentSettings(tab.id);

        // Establish port for disconnect detection
        // When side panel closes, background will detect and turn off monitoring
        const port = chrome.runtime.connect({ name: `sidepanel-${tab.id}` });

        // Sync current state to content script on mount
        sendToBackground({
          type: MessageType.GET_MONITORING_LEVEL,
          payload: { tabId: tab.id }
        }).then(response => {
          if (response.success) {
            // Broadcast to ensure content script is in sync
            chrome.tabs.sendMessage(tab.id!, {
              type: 'MONITORING_LEVEL_CHANGED',
              level: response.data
            }).catch(() => {
              // Content script may not be ready yet, that's okay
            });
          }
        });

        // Cleanup port on unmount (though browser handles this automatically on panel close)
        return () => {
          port.disconnect();
        };
      }
    });

    // Update request count every second when monitoring
    const interval = setInterval(async () => {
      if (currentTabId) {
        const response = await sendToBackground({
          type: MessageType.GET_NETWORK_REQUESTS,
          payload: { tabIds: currentTabId }
        });
        if (response.success && response.data) {
          setRequestCount(response.data.length);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTabId]);

  // Load and subscribe to network capture settings for debugger mode
  useEffect(() => {
    advancedDebugger.getSettings().then(settings => {
      setNetworkCaptureSettings(settings.network);
    });

    const unsubscribe = advancedDebugger.subscribe(settings => {
      setNetworkCaptureSettings(settings.network);
    });

    return unsubscribe;
  }, []);

  // Update debugger request count when in debugger-capture mode
  useEffect(() => {
    if (currentLevel !== 'debugger-capture' || !currentTabId) return;

    const interval = setInterval(async () => {
      const response = await sendToBackground({
        type: MessageType.GET_CAPTURED_NETWORK_REQUESTS,
        payload: { tabId: currentTabId }
      });
      if (response.success && response.data) {
        setDebuggerRequestCount(response.data.length);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLevel, currentTabId]);

  const loadCurrentSettings = async (tabId: number) => {
    // Get the monitoring level for this specific tab from background
    const response = await sendToBackground({
      type: MessageType.GET_MONITORING_LEVEL,
      payload: { tabId }
    });

    if (response.success && response.data) {
      setCurrentLevel(response.data);
    } else {
      setCurrentLevel('filtering-only');
    }

    const perms = await permissionManager.getGrantedPermissions();
    setGrantedPermissions(perms);

    // Get request count for this tab
    const requestsResponse = await sendToBackground({
      type: MessageType.GET_NETWORK_REQUESTS,
      payload: { tabIds: tabId }
    });
    if (requestsResponse.success && requestsResponse.data) {
      setRequestCount(requestsResponse.data.length);
    }
  };

  const handleLevelChange = async (newLevel: MonitoringLevel) => {
    if (!currentTabId) {
      console.error('No current tab ID available');
      return;
    }

    // Store previous level for potential revert
    const previousLevel = currentLevel;

    // Immediately update UI to show selection (optimistic update)
    setCurrentLevel(newLevel);
    setIsChanging(true);

    const config = MONITORING_LEVELS[newLevel];

    // Show warning if config has userWarning
    if (config.userWarning) {
      const confirmed = confirm(config.userWarning + '\n\nContinue?');
      if (!confirmed) {
        // Revert to previous level
        setCurrentLevel(previousLevel);
        setIsChanging(false);
        return;
      }
    }

    // Set level for this specific tab via background script
    const result = await sendToBackground({
      type: MessageType.SET_MONITORING_LEVEL,
      payload: { level: newLevel, tabId: currentTabId }
    });

    if (result.success) {
      // Confirm the selection
      updateUserConfig({ networkMonitoringLevel: newLevel });

      // Only update permissions list, don't reload currentLevel
      const perms = await permissionManager.getGrantedPermissions();
      setGrantedPermissions(perms);
    } else {
      // Revert on error
      setCurrentLevel(previousLevel);
      alert(result.error);
    }

    setIsChanging(false);
  };

  const handleRemovePermission = async (permission: string) => {
    // Check if current level uses this permission
    const currentConfig = MONITORING_LEVELS[currentLevel];
    const willRevert = currentConfig.permissions.includes(permission);

    const message = willRevert
      ? `Remove ${permission} permission?\n\nThis will automatically switch you back to "Content Filtering" mode since your current level requires this permission.`
      : `Remove ${permission} permission?\n\nYou'll need to grant it again to use related features.`;

    const confirmed = confirm(message);
    if (!confirmed) return;

    const removed = await permissionManager.removePermission(permission);

    if (removed) {
      // Reset to 'filtering-only' if current level requires this permission
      if (willRevert && currentTabId) {
        // Set UI state immediately
        setCurrentLevel('filtering-only');
        setRequestCount(0);

        // Update via background script for this tab
        await sendToBackground({
          type: MessageType.SET_MONITORING_LEVEL,
          payload: { level: 'filtering-only', tabId: currentTabId }
        });

        // Update store
        updateUserConfig({ networkMonitoringLevel: 'filtering-only' });
      }

      // Only refresh permissions list, don't reload level (which would overwrite our change)
      const perms = await permissionManager.getGrantedPermissions();
      setGrantedPermissions(perms);
    }
  };

  const handleClearRequests = async () => {
    // Note: clearRequests clears all requests, not just for current tab
    // This is acceptable since clearing is a deliberate user action
    await sendToBackground({
      type: MessageType.GET_NETWORK_REQUESTS,
      payload: { clear: true }
    });
    setRequestCount(0);
  };

  const handleClearDebuggerRequests = async () => {
    if (!currentTabId) return;
    await sendToBackground({
      type: MessageType.CLEAR_NETWORK_DATA,
      payload: { tabId: currentTabId }
    });
    setDebuggerRequestCount(0);
  };

  const handleNetworkCaptureSettingsChange = async (partial: Partial<NetworkCaptureSettings>) => {
    if (!networkCaptureSettings) return;
    const updated = { ...networkCaptureSettings, ...partial };
    await advancedDebugger.updateSettings({ network: updated });
  };

  // Check if monitoring is active for this tab
  const isMonitoringActive = currentLevel !== 'filtering-only';
  const isDebuggerMode = currentLevel === 'debugger-capture';
  const displayedRequestCount = isDebuggerMode ? debuggerRequestCount : requestCount;

  return (
    <div className="space-y-4">
      {/* Status Bar - Always visible to prevent layout shift */}
      <div className="flex items-center justify-end gap-2 min-h-[20px]">
        {isMonitoringActive ? (
          <>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isDebuggerMode ? 'bg-purple-500' : 'bg-green-500'}`}></div>
              <span className="text-xs text-gray-600">
                {isDebuggerMode ? 'Debugger Active' : 'Active'} (this tab)
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {displayedRequestCount} requests captured
            </span>
            {displayedRequestCount > 0 && (
              <button
                onClick={isDebuggerMode ? handleClearDebuggerRequests : handleClearRequests}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-400 italic">
            No monitoring active for this tab
          </span>
        )}
      </div>

      {/* Monitoring Level Selector */}
      <div className="space-y-2">
        {Object.entries(MONITORING_LEVELS).map(([key, config]) => {
          const isSelected = currentLevel === key;
          const performanceColor =
            config.performance === 'excellent' ? 'bg-green-100 text-green-700' :
            config.performance === 'good' ? 'bg-blue-100 text-blue-700' :
            config.performance === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700';

          return (
            <label
              key={key}
              className={`block p-3 border rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${isChanging ? 'opacity-50 cursor-wait' : ''}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="monitoring-level"
                  checked={isSelected}
                  onChange={() => handleLevelChange(key as MonitoringLevel)}
                  disabled={isChanging}
                  className="mt-1 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{config.description}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${performanceColor}`}>
                      {config.performance}
                    </span>
                  </div>
                  <ul className="text-xs text-gray-600 mt-1.5 space-y-0.5">
                    {config.features.map(feature => (
                      <li key={feature} className="flex items-start gap-1">
                        <span className="text-primary-600 mt-0.5">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {config.note && (
                    <div className="text-xs text-blue-600 mt-1.5 italic">
                      💡 {config.note}
                    </div>
                  )}
                  {config.permissions.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1.5 italic">
                      Requires: {config.permissions.join(', ')}
                    </div>
                  )}
                  {key === 'full-monitoring' && isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                      <div className="text-xs font-medium text-gray-700 mb-2">Extraction Options:</div>

                      {/* JavaScript Extraction */}
                      <div>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userConfig.extractJavaScript ?? true}
                            onChange={(e) => updateUserConfig({ extractJavaScript: e.target.checked })}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <div className="text-xs text-gray-900 font-medium">Extract JavaScript code from page</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Automatically extract and analyze all inline and external JavaScript files
                            </div>
                          </div>
                        </label>
                        <div className="text-xs text-red-600 mt-1.5 ml-5 flex items-start gap-1">
                          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>Warning: Extracts all JavaScript code from the page for AI analysis. May use significant memory on complex pages with large scripts.</span>
                        </div>
                      </div>

                      {/* CSS Extraction */}
                      <div>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={userConfig.extractCSS ?? true}
                            onChange={(e) => updateUserConfig({ extractCSS: e.target.checked })}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <div className="text-xs text-gray-900 font-medium">Extract CSS stylesheets from page</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Automatically extract and analyze all inline and external CSS stylesheets
                            </div>
                          </div>
                        </label>
                        <div className="text-xs text-red-600 mt-1.5 ml-5 flex items-start gap-1">
                          <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>Warning: Extracts all CSS code from the page for AI analysis. May use significant memory on pages with large stylesheets.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {key === 'debugger-capture' && isSelected && networkCaptureSettings && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <NetworkCaptureOptions
                        settings={networkCaptureSettings}
                        onChange={handleNetworkCaptureSettingsChange}
                        disabled={isChanging}
                      />
                    </div>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Granted Permissions */}
      {grantedPermissions.some(p => ['webRequest', 'debugger'].includes(p)) && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-2 text-gray-700">Granted Optional Permissions</h4>
          <div className="space-y-2">
            {grantedPermissions
              .filter(p => ['webRequest', 'debugger'].includes(p))
              .map(permission => (
                <div
                  key={permission}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 font-medium">{permission}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePermission(permission)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            You can remove permissions anytime. Monitoring will automatically stop when permission is removed.
          </p>
        </div>
      )}

    </div>
  );
};
