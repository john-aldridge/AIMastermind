import React, { useState, useEffect, useRef } from 'react';
import { MessageType } from '@/utils/messaging';

export interface TabInfo {
  tabId: number;
  title: string;
  url: string;
  favIconUrl?: string;
  selected: boolean;
}

interface TabContextBarProps {
  /** Specific tab ID to auto-select on mount (e.g. from URL param in standalone editor) */
  initialTabId?: number | null;
  /** Callback when selected tabs change */
  onSelectedTabsChange?: (tabs: TabInfo[]) => void;
}

const TabFavicon: React.FC<{ url?: string; size?: number }> = ({ url, size = 16 }) => {
  if (url) {
    return (
      <img
        src={url}
        className="w-4 h-4 rounded flex-shrink-0"
        style={{ width: size, height: size }}
        alt=""
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" style={{ width: size, height: size }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
};

export const TabContextBar: React.FC<TabContextBarProps> = ({ initialTabId, onSelectedTabsChange }) => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [showAddTabsDropdown, setShowAddTabsDropdown] = useState(false);
  const addTabsDropdownRef = useRef<HTMLDivElement>(null);
  const tabSelectorRef = useRef<HTMLDivElement>(null);
  const initialTabApplied = useRef(false);

  const refreshTabMetadata = async () => {
    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = activeTab[0]?.id;

      setTabs(prevTabs => {
        const prevSelected = new Set(prevTabs.filter(t => t.selected).map(t => t.tabId));

        return allTabs.filter(tab => tab.id).map(tab => ({
          tabId: tab.id!,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl,
          selected: prevSelected.has(tab.id!) || (prevSelected.size === 0 && tab.id === activeTabId),
        }));
      });
    } catch (error) {
      console.error('Error refreshing tab metadata:', error);
    }
  };

  // Initial load
  useEffect(() => {
    refreshTabMetadata();
  }, []);

  // Apply initialTabId once tabs are loaded
  useEffect(() => {
    if (initialTabId != null && !initialTabApplied.current && tabs.length > 0) {
      initialTabApplied.current = true;
      setTabs(prev => prev.map(t => ({
        ...t,
        selected: t.tabId === initialTabId,
      })));
    }
  }, [initialTabId, tabs.length]);

  // Notify parent of selected tabs changes
  useEffect(() => {
    onSelectedTabsChange?.(tabs.filter(t => t.selected));
  }, [tabs]);

  // Listen for TAB_CHANGED messages
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === MessageType.TAB_CHANGED) {
        refreshTabMetadata();
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // Close dropdowns on click outside or window blur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAddTabsDropdown &&
        addTabsDropdownRef.current &&
        !addTabsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAddTabsDropdown(false);
      }
      if (
        showTabSelector &&
        tabSelectorRef.current &&
        !tabSelectorRef.current.contains(event.target as Node)
      ) {
        setShowTabSelector(false);
      }
    };

    const handleBlur = () => {
      if (showAddTabsDropdown) setShowAddTabsDropdown(false);
      if (showTabSelector) setShowTabSelector(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('blur', handleBlur);
    };
  }, [showAddTabsDropdown, showTabSelector]);

  const toggleTabSelection = (tabId: number) => {
    setTabs(prev => prev.map(tab =>
      tab.tabId === tabId ? { ...tab, selected: !tab.selected } : tab
    ));
  };

  const selectedTabs = tabs.filter(t => t.selected);
  const singleTabSelected = selectedTabs.length === 1;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex-shrink-0 relative">
      <div className="flex items-center justify-between gap-2">
        {/* Left side: Tab info */}
        {singleTabSelected ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <TabFavicon url={selectedTabs[0]?.favIconUrl} />
            <span className="text-sm font-medium text-blue-900 truncate">
              {selectedTabs[0]?.title || 'No tab selected'}
            </span>
          </div>
        ) : selectedTabs.length > 1 ? (
          <button
            onClick={() => setShowTabSelector(!showTabSelector)}
            className="flex items-center gap-2 text-sm text-blue-900 hover:text-blue-700 min-w-0"
          >
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="font-medium">{selectedTabs.length} tabs selected</span>
            <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${showTabSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <span className="text-sm text-gray-500 italic">No tabs selected</span>
        )}

        {/* Right side: Add more tabs button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowAddTabsDropdown(!showAddTabsDropdown)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-white border border-blue-200 rounded-md px-2 py-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add tabs</span>
          </button>
        </div>
      </div>

      {/* Selected tabs dropdown (for multiple tabs) */}
      {showTabSelector && selectedTabs.length > 1 && (
        <div ref={tabSelectorRef} className="mt-2 bg-white border border-blue-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2 border-b border-blue-100 text-xs text-gray-500 font-medium">
            Selected tabs
          </div>
          {selectedTabs.map(tab => (
            <div
              key={tab.tabId}
              className="flex items-center gap-2 p-2 hover:bg-blue-50"
            >
              <TabFavicon url={tab.favIconUrl} />
              <span className="text-xs text-blue-900 truncate flex-1 min-w-0">
                {tab.title}
              </span>
              <button
                onClick={() => toggleTabSelection(tab.tabId)}
                className="text-gray-400 hover:text-red-500 flex-shrink-0 p-0.5"
                title="Remove from context"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add more tabs dropdown */}
      {showAddTabsDropdown && (
        <div
          ref={addTabsDropdownRef}
          className="absolute left-4 right-4 top-full mt-1 bg-white border border-blue-200 rounded-lg shadow-lg max-h-64 overflow-hidden z-10"
        >
          <div className="flex items-center justify-between p-2 border-b border-blue-100 sticky top-0 bg-white">
            <span className="text-xs text-gray-500 font-medium">All tabs in window</span>
            <button
              onClick={() => setShowAddTabsDropdown(false)}
              className="text-gray-400 hover:text-gray-600 p-0.5"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto max-h-52">
            {tabs.map(tab => (
              <label
                key={tab.tabId}
                className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={tab.selected}
                  onChange={() => toggleTabSelection(tab.tabId)}
                  className="flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <TabFavicon url={tab.favIconUrl} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-blue-900 truncate">
                    {tab.title}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {tab.url}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
