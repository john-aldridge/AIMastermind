import React, { useState } from 'react';
import { useAppStore, SavedConfiguration } from '@/state/appStore';
import { getProviderById } from '@/utils/providers';
import { apiService } from '@/utils/api';

export const ConfigurationManager: React.FC = () => {
  const { userConfig, deleteConfiguration, activateConfiguration, updateConfiguration } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editModel, setEditModel] = useState('');

  const handleActivate = (config: SavedConfiguration) => {
    activateConfiguration(config.id);

    // Update API service
    apiService.setApiKey(config.credentials.apiKey || '');
    const provider = getProviderById(config.providerId);
    if (provider) {
      apiService.setProvider(config.providerId as any);
      apiService.setModel(config.model);
    }
  };

  const handleDelete = (config: SavedConfiguration) => {
    if (confirm(`Delete configuration "${config.name}"?`)) {
      deleteConfiguration(config.id);
    }
  };

  const handleEdit = (config: SavedConfiguration) => {
    setEditingConfigId(config.id);
    setEditName(config.name);
    setEditModel(config.model);
    setExpandedId(config.id); // Ensure expanded
  };

  const handleSaveEdit = (config: SavedConfiguration) => {
    if (!editName.trim()) return;

    updateConfiguration(config.id, {
      name: editName.trim(),
      model: editModel,
    });

    setEditingConfigId(null);
    setEditName('');
    setEditModel('');
  };

  const handleCancelEdit = () => {
    setEditingConfigId(null);
    setEditName('');
    setEditModel('');
  };

  const configs = userConfig.savedConfigurations || [];

  // Sort configurations: Free Model first, then others
  const sortedConfigs = [...configs].sort((a, b) => {
    if (a.id === 'free-model') return -1;
    if (b.id === 'free-model') return 1;
    return 0;
  });

  if (configs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-700 mb-2">Saved Configurations</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No saved configurations yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Configure a provider above and save it for quick access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-700 mb-3">Saved Configurations</h3>

      <div className="space-y-2">
        {sortedConfigs.map((config) => {
          const provider = getProviderById(config.providerId);
          const isActive = userConfig.activeConfigurationId === config.id;
          const isExpanded = expandedId === config.id;
          const isFreeModel = config.id === 'free-model';

          return (
            <div
              key={config.id}
              className={`border rounded-lg transition-all ${
                isActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Configuration Header */}
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {config.name}
                      </h4>
                      {isFreeModel && (
                        <span className="flex-shrink-0 text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-0.5 rounded font-medium">
                          Free
                        </span>
                      )}
                      {isActive && (
                        <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {isFreeModel ? (
                        <>
                          {userConfig.tokenBalance.toLocaleString()} tokens available • {provider?.displayName}
                        </>
                      ) : (
                        <>
                          {provider?.displayName} • {config.model}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : config.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    {editingConfigId === config.id ? (
                      /* Edit Mode */
                      <>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                          <p className="text-xs text-blue-900 font-medium">
                            Editing: {provider?.displayName}
                          </p>
                        </div>

                        {/* Configuration Name */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Configuration Name *
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g., Work Claude, Personal OpenAI"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>

                        {/* Model Selection */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Model
                          </label>
                          <select
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {provider?.models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name}
                                {model.pricing && ` ($${model.pricing.input}/$${model.pricing.output})`}
                                {model.contextWindow && !model.pricing && ` (${(model.contextWindow / 1000).toFixed(0)}K context)`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Save/Cancel Buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleSaveEdit(config)}
                            disabled={!editName.trim()}
                            className="flex-1 py-1.5 px-3 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Update
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      /* View Mode */
                      <>
                        <div className="text-xs text-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Provider:</span>
                            <span className="font-medium">{provider?.displayName}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-500">Model:</span>
                            <span className="font-medium">{config.model}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-500">Created:</span>
                            <span className="font-medium">
                              {new Date(config.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          {!isActive && (
                            <button
                              onClick={() => handleActivate(config)}
                              className="flex-1 py-1.5 px-3 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              Activate
                            </button>
                          )}
                          {!isFreeModel && (
                            <>
                              <button
                                onClick={() => handleEdit(config)}
                                className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium rounded transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(config)}
                                className="flex-1 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-medium rounded transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Quick Actions (when collapsed) */}
                {!isExpanded && !isActive && (
                  <button
                    onClick={() => handleActivate(config)}
                    className="mt-2 w-full py-1.5 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded transition-colors"
                  >
                    Activate Configuration
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-900">
          💡 <strong>Tip:</strong> Save multiple configurations to quickly switch between different AI providers or accounts.
        </p>
      </div>
    </div>
  );
};
