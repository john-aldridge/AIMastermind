import React from 'react';
import { useAppStore } from '@/state/appStore';

export const ViewModeSettings: React.FC = () => {
  const { userConfig, updateUserConfig } = useAppStore();

  const handleModeChange = (preferPopup: boolean) => {
    updateUserConfig({ preferPopup });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">View Mode</h3>

      <div className="space-y-3">
        {/* Side Panel Option */}
        <button
          onClick={() => handleModeChange(false)}
          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
            !userConfig.preferPopup
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-primary-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {!userConfig.preferPopup ? (
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                Side Panel Mode
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Recommended
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Opens alongside your browser. More space, stays open while browsing.
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  Always visible
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  More space
                </span>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  Resizable
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Popup Option */}
        <button
          onClick={() => handleModeChange(true)}
          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
            userConfig.preferPopup
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-primary-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {userConfig.preferPopup ? (
                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">
                Popup Mode
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Compact popup window. Opens when you click the extension icon.
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  Compact
                </span>
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  Traditional
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-900">
          💡 <strong>Tip:</strong> Side Panel mode gives you more space and stays open while you browse different pages. Perfect for managing multiple AI widgets!
        </p>
      </div>
    </div>
  );
};
