import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, ChatMessage } from '@/state/appStore';
import { apiService } from '@/utils/api';
import { networkMonitor } from '@/utils/networkMonitor';
import { FileAnalysis } from './FileAnalysis';

interface TabContext {
  tabId: number;
  title: string;
  url: string;
  content: string;
  selected: boolean;
}

interface DownloadInfo {
  id: number;
  filePath: string;  // Full path to the downloaded file
  url: string;
  fileSize: number;
  mime: string;
  downloadTime: number;
}

export const ChatView: React.FC = () => {
  const { userConfig, consumeTokens, chatMessages, addChatMessage, clearChatMessages } = useAppStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabs, setTabs] = useState<TabContext[]>([]);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [showFileAnalysis, setShowFileAnalysis] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ name: string; content: string; info: DownloadInfo } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Capture context from all tabs
  useEffect(() => {
    captureAllTabs();
  }, []);

  // Re-capture tabs when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      captureAllTabs();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        captureAllTabs();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const captureAllTabs = async () => {
    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = activeTab[0]?.id;

      const tabContexts: TabContext[] = [];

      for (const tab of allTabs) {
        if (!tab.id) continue;

        let content = '';
        try {
          // Execute script to get page content
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const body = document.body;
              const text = body.innerText || body.textContent || '';
              // Limit to first 3000 characters per tab
              return text.slice(0, 3000);
            },
          });

          content = results[0]?.result || 'Unable to capture content';
        } catch (error) {
          content = 'Unable to capture content (restricted page)';
        }

        tabContexts.push({
          tabId: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          content,
          selected: tab.id === activeTabId, // Auto-select active tab
        });
      }

      setTabs(tabContexts);
    } catch (error) {
      console.error('Error capturing tabs:', error);
    }
  };

  const toggleTabSelection = (tabId: number) => {
    setTabs(tabs.map(tab =>
      tab.tabId === tabId ? { ...tab, selected: !tab.selected } : tab
    ));
  };

  const getSelectedContext = (): string => {
    const selectedTabs = tabs.filter(tab => tab.selected);
    if (selectedTabs.length === 0) {
      return 'No tabs selected for context.';
    }

    return selectedTabs.map(tab =>
      `=== Tab: ${tab.title} ===\nURL: ${tab.url}\n\nContent:\n${tab.content}`
    ).join('\n\n---\n\n');
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      // Construct prompt with context from selected tabs
      const pageContext = getSelectedContext();

      // Add network monitoring data if available
      let contextPrompt = '';

      // Add file content if available
      if (currentFile) {
        contextPrompt = `Here is the content of the file "${currentFile.name}" (${currentFile.info.mime}, ${(currentFile.info.fileSize / 1024).toFixed(1)} KB):\n\n${currentFile.content}\n\n`;
      }

      if (pageContext !== 'No tabs selected for context.') {
        contextPrompt += `Here is the context from the browser tabs the user is viewing:\n\n${pageContext}`;

        // Include network data if monitoring is active
        if (networkMonitor.isActive()) {
          const selectedTabs = tabs.filter(tab => tab.selected);
          const tabIds = selectedTabs.map(tab => tab.tabId);

          // Get network requests for selected tabs
          const allRequests = tabIds.flatMap(tabId => networkMonitor.getRequests(tabId));

          if (allRequests.length > 0) {
            contextPrompt += `\n\n${networkMonitor.getRequestSummary()}`;
          }
        }

        contextPrompt += `\n\nUser question: ${userMessage.content}`;
      } else {
        contextPrompt += userMessage.content;
      }

      // Call API service
      const response = await apiService.generateContent(
        { prompt: contextPrompt },
        userConfig.useOwnKey
      );

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };

      addChatMessage(assistantMessage);

      // Consume tokens if using free model
      if (!userConfig.useOwnKey && response.tokensUsed) {
        consumeTokens(response.tokensUsed);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      };
      addChatMessage(errorMessage);
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear chat history?')) {
      clearChatMessages();
      setCurrentFile(null);
    }
  };

  const handleFileSelected = (filename: string, content: string, fileInfo: DownloadInfo) => {
    setCurrentFile({ name: filename, content, info: fileInfo });
    setShowFileAnalysis(false);

    // Auto-populate input with a question about the file
    setInput(`Analyze this file: ${filename}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Context Selector */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowTabSelector(!showTabSelector)}
            className="flex items-center gap-2 text-sm text-blue-900 hover:text-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span className="font-medium">
              {tabs.filter(t => t.selected).length} of {tabs.length} tabs selected
            </span>
            <svg className={`w-3 h-3 transition-transform ${showTabSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={captureAllTabs}
            className="text-xs text-blue-700 hover:text-blue-800"
            title="Refresh tabs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tab List */}
        {showTabSelector && (
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
            {tabs.map(tab => (
              <label
                key={tab.tabId}
                className="flex items-start gap-2 p-2 hover:bg-blue-100 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={tab.selected}
                  onChange={() => toggleTabSelection(tab.tabId)}
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-blue-900 truncate">
                    {tab.title}
                  </div>
                  <div className="text-xs text-blue-600 truncate">
                    {tab.url}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : message.content.startsWith('Error:')
                  ? 'bg-red-50 text-red-900 border border-red-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0">
        {/* Current File Badge */}
        {currentFile && (
          <div className="mb-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs text-blue-900 font-medium truncate">{currentFile.name}</span>
            </div>
            <button
              onClick={() => setCurrentFile(null)}
              className="text-blue-600 hover:text-blue-700 flex-shrink-0"
              title="Remove file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Model Selector & Actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Model:</span>
            <span className="text-xs font-medium text-gray-700">
              {userConfig.activeConfigurationId
                ? userConfig.savedConfigurations.find(c => c.id === userConfig.activeConfigurationId)?.name || 'Free Model'
                : 'Free Model'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFileAnalysis(true)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              title="Analyze file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>File</span>
            </button>
            <button
              onClick={handleClearChat}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Clear chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Input Field */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this page..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* File Analysis Modal */}
      {showFileAnalysis && (
        <FileAnalysis
          onFileSelected={handleFileSelected}
          onClose={() => setShowFileAnalysis(false)}
        />
      )}
    </div>
  );
};
