import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/state/appStore';
import type { ChatSessionSummary } from '@/types/chat';

interface ChatSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  /** When set, filter results to sessions for this agent only */
  filterAgentId?: string;
}

/**
 * Format relative time (e.g., "2 hours ago", "Yesterday")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export const ChatSearchModal: React.FC<ChatSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSession,
  filterAgentId,
}) => {
  const { searchSessions, getSessionSummaries } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ChatSessionSummary[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyAgentFilter = (sessions: ChatSessionSummary[]): ChatSessionSummary[] => {
    if (!filterAgentId) return sessions;
    return sessions.filter(s => s.editorContext?.agentId === filterAgentId);
  };

  // Focus input and load all sessions when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      // Load all sessions sorted by most recent
      const allSessions = getSessionSummaries();
      setResults(applyAgentFilter(allSessions));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, getSessionSummaries, filterAgentId]);

  // Filter as user types
  useEffect(() => {
    if (searchQuery.trim()) {
      const found = searchSessions(searchQuery);
      setResults(applyAgentFilter(found));
    } else {
      // Show all sessions when search is cleared
      const allSessions = getSessionSummaries();
      setResults(applyAgentFilter(allSessions));
    }
  }, [searchQuery, searchSessions, getSessionSummaries, filterAgentId]);

  const handleSelect = (sessionId: string) => {
    onSelectSession(sessionId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <p className="text-sm">
                {searchQuery.trim()
                  ? `No chats found for "${searchQuery}"`
                  : 'No chat history yet'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelect(session.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900 truncate">
                    {session.title}
                  </div>
                  <div className="text-sm text-gray-500 truncate mt-0.5">
                    {session.preview || 'No messages'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatRelativeTime(session.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
