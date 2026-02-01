import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/state/appStore';
import { networkMonitor, MONITORING_LEVELS, MonitoringLevel } from '@/utils/networkMonitor';
import { permissionManager } from '@/utils/permissions';

export const NetworkSettings: React.FC = () => {
  const { userConfig, updateUserConfig } = useAppStore();
  const [currentLevel, setCurrentLevel] = useState<MonitoringLevel>('filtering-only');
  const [isChanging, setIsChanging] = useState(false);
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    loadCurrentSettings();

    // Update request count every second when monitoring
    const interval = setInterval(() => {
      if (networkMonitor.isActive()) {
        setRequestCount(networkMonitor.getRequests().length);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadCurrentSettings = async () => {
    const level = userConfig.networkMonitoringLevel || networkMonitor.getLevel();
    setCurrentLevel(level);

    const perms = await permissionManager.getGrantedPermissions();
    setGrantedPermissions(perms);

    setRequestCount(networkMonitor.getRequests().length);
  };

  const handleLevelChange = async (newLevel: MonitoringLevel) => {
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

    const result = await networkMonitor.setLevel(newLevel);

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
      // Stop any active monitoring first
      await networkMonitor.stop();

      // Reset to 'filtering-only' if current level requires this permission
      if (willRevert) {
        // Set UI state immediately
        setCurrentLevel('filtering-only');
        setRequestCount(0);

        // Update store
        updateUserConfig({ networkMonitoringLevel: 'filtering-only' });
      }

      // Only refresh permissions list, don't reload level (which would overwrite our change)
      const perms = await permissionManager.getGrantedPermissions();
      setGrantedPermissions(perms);
    }
  };

  const handleClearRequests = () => {
    networkMonitor.clearRequests();
    setRequestCount(0);
  };

  return (
    <div className="space-y-4">
      {/* Status Bar - Always visible to prevent layout shift */}
      <div className="flex items-center justify-end gap-2 min-h-[20px]">
        {networkMonitor.isActive() ? (
          <>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-600">Active</span>
            </div>
            <span className="text-xs text-gray-500">
              {requestCount} requests captured
            </span>
            {requestCount > 0 && (
              <button
                onClick={handleClearRequests}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-400 italic">
            No monitoring active
          </span>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
        <strong>💡 How it works:</strong> Content filtering (blocking trackers/ads) is always available
        via declarativeNetRequest. For network monitoring (observing requests for AI analysis), select
        "API Monitoring" or "Full Monitoring" - Chrome will ask for webRequest permission the first time.
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
                  {config.userWarning && isSelected && (
                    <div className="text-xs text-orange-600 mt-1.5 flex items-start gap-1">
                      <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>{config.userWarning}</span>
                    </div>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {/* Granted Permissions */}
      {grantedPermissions.some(p => ['webRequest'].includes(p)) && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-sm mb-2 text-gray-700">Granted Optional Permissions</h4>
          <div className="space-y-2">
            {grantedPermissions
              .filter(p => ['webRequest'].includes(p))
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
