import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '@/state/appStore';
import { ChatSearchModal } from './ChatSearchModal';
import type { ChatSessionSummary } from '@/types/chat';

interface ChatSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  collapsed,
  onToggleCollapse,
}) => {
  const {
    chatSessions,
    activeSessionId,
    getSessionSummaries,
    createNewSession,
    switchSession,
    deleteSession,
  } = useAppStore();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [tooltipSession, setTooltipSession] = useState<{ id: string; title: string; top: number } | null>(null);
  const titleRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Get all sessions for display
  const sessions = useMemo((): ChatSessionSummary[] => {
    return getSessionSummaries();
  }, [chatSessions, getSessionSummaries]);

  const handleNewChat = () => {
    createNewSession();
  };

  const handleSearchSelect = (sessionId: string) => {
    switchSession(sessionId);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      deleteSession(sessionId);
    }
  };

  // Check if title is truncated and show tooltip
  const handleMouseEnter = (sessionId: string, title: string) => {
    setHoveredSessionId(sessionId);
    const el = titleRefs.current.get(sessionId);
    if (el && el.scrollWidth > el.clientWidth) {
      const rect = el.getBoundingClientRect();
      setTooltipSession({ id: sessionId, title, top: rect.top });
    }
  };

  const handleMouseLeave = () => {
    setHoveredSessionId(null);
    setTooltipSession(null);
  };

  // Collapsed state - just icons
  if (collapsed) {
    return (
      <>
        <div className="flex flex-col items-center bg-gray-50 border-r border-gray-200 py-2 px-1.5 gap-1.5 flex-shrink-0">
          {/* Expand button */}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            title="Expand sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* New chat button */}
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            title="New Chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Search button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-600 transition-colors"
            title="Search Chats"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>

        <ChatSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelectSession={handleSearchSelect}
        />
      </>
    );
  }

  // Expanded state - streamlined sidebar
  return (
    <>
      <div className="flex flex-col bg-gray-50 border-r border-gray-200 w-44 flex-shrink-0">
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-end px-2 py-1.5 border-b border-gray-200">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col py-1.5">
          {/* New Chat */}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs font-medium">New chat</span>
          </button>

          {/* Search */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-xs font-medium">Search</span>
          </button>
        </div>

        {/* Spacer between search and chats */}
        <div className="h-2"></div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto border-t border-gray-200">
          {sessions.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400">
              No chat history
            </div>
          ) : (
            <div className="py-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => switchSession(session.id)}
                  onMouseEnter={() => handleMouseEnter(session.id, session.title)}
                  onMouseLeave={handleMouseLeave}
                  className={`relative px-3 py-1.5 cursor-pointer transition-colors ${
                    session.id === activeSessionId
                      ? 'bg-blue-50 border-l-2 border-blue-600'
                      : 'hover:bg-gray-100 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <div
                        ref={(el) => {
                          if (el) titleRefs.current.set(session.id, el);
                        }}
                        className={`text-xs truncate ${
                          session.id === activeSessionId ? 'text-blue-900 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {session.title}
                      </div>
                    </div>

                    {/* Delete button - only show on hover */}
                    {hoveredSessionId === session.id && (
                      <button
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="flex-shrink-0 p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete chat"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip for truncated titles */}
      {tooltipSession && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded shadow-lg max-w-xs"
          style={{
            left: '180px',
            top: tooltipSession.top,
            transform: 'translateY(-50%)',
          }}
        >
          {tooltipSession.title}
        </div>
      )}

      <ChatSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectSession={handleSearchSelect}
      />
    </>
  );
};
