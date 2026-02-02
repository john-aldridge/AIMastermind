import React, { useState } from 'react';
import { ProviderConfig, getPopularProviders, getAllProviders } from '@/utils/providers';

interface ProviderSelectorProps {
  selectedProvider: ProviderConfig | null;
  onSelect: (provider: ProviderConfig) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  selectedProvider,
  onSelect,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const popularProviders = getPopularProviders();
  const allProviders = getAllProviders();

  const displayedProviders = showAll
    ? allProviders.filter(p =>
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : popularProviders;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          AI Provider
        </label>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-primary-600 hover:text-primary-700"
        >
          {showAll ? 'Show Popular' : `Show All (${allProviders.length})`}
        </button>
      </div>

      {showAll && (
        <input
          type="text"
          placeholder="Search providers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field text-sm"
        />
      )}

      <div className="space-y-1 max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
        {displayedProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider)}
            className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between hover:bg-gray-50 ${
              selectedProvider?.id === provider.id
                ? 'bg-primary-50 border-l-4 border-primary-500'
                : 'border-l-4 border-transparent'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900">
                  {provider.displayName}
                </span>
                {provider.tier === 'popular' && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                    Popular
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {provider.description}
              </div>
            </div>
            {selectedProvider?.id === provider.id && (
              <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
