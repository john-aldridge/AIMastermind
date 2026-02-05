/**
 * Chat Session Service
 *
 * Manages chat sessions with:
 * - CRUD operations for sessions
 * - Automatic title generation from first message
 * - Search functionality
 * - Persistent storage via chrome.storage.local
 */

import type {
  ChatSession,
  ChatMessage,
  ChatStorageState,
  ChatSessionSummary,
} from '@/types/chat';

const STORAGE_KEY = 'ai_mastermind_chat_sessions';
const SESSION_STORAGE_KEY = 'ai_mastermind_last_tab_id';

/**
 * Generate a UUID for session/message IDs
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a title from the first user message
 */
function generateTitle(firstMessage: string): string {
  // Clean up the message and take first 50 chars
  const cleaned = firstMessage
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= 50) {
    return cleaned;
  }

  // Find a good break point (word boundary)
  const truncated = cleaned.substring(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 30) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Create a welcome message for new sessions
 */
function createWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content: "Hello! Ask me anything about the current page you're viewing.",
    timestamp: Date.now(),
  };
}

export const chatSessionService = {
  /**
   * Create a new chat session
   */
  createSession: async (tabUrl?: string): Promise<ChatSession> => {
    const session: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tabUrl,
      messages: [createWelcomeMessage()],
    };

    // Load existing sessions and add new one
    const state = await chatSessionService.loadState();
    state.sessions.unshift(session);
    state.activeSessionId = session.id;

    await chatSessionService.saveState(state);
    return session;
  },

  /**
   * Get a session by ID
   */
  getSession: async (id: string): Promise<ChatSession | null> => {
    const state = await chatSessionService.loadState();
    return state.sessions.find((s) => s.id === id) || null;
  },

  /**
   * Update a session (add messages, update title, etc.)
   */
  updateSession: async (
    id: string,
    updates: Partial<Pick<ChatSession, 'title' | 'messages'>>
  ): Promise<ChatSession | null> => {
    const state = await chatSessionService.loadState();
    const index = state.sessions.findIndex((s) => s.id === id);

    if (index === -1) {
      return null;
    }

    const session = state.sessions[index];

    if (updates.messages) {
      session.messages = updates.messages;

      // Auto-generate title from first user message if still "New Chat"
      if (session.title === 'New Chat') {
        const firstUserMessage = session.messages.find(
          (m) => m.role === 'user'
        );
        if (firstUserMessage) {
          session.title = generateTitle(firstUserMessage.content);
        }
      }
    }

    if (updates.title) {
      session.title = updates.title;
    }

    session.updatedAt = Date.now();

    // Move to top of list (most recently updated)
    state.sessions.splice(index, 1);
    state.sessions.unshift(session);

    await chatSessionService.saveState(state);
    return session;
  },

  /**
   * Add a message to a session
   */
  addMessage: async (
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<ChatMessage | null> => {
    const session = await chatSessionService.getSession(sessionId);
    if (!session) {
      return null;
    }

    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };

    session.messages.push(newMessage);

    await chatSessionService.updateSession(sessionId, {
      messages: session.messages,
    });

    return newMessage;
  },

  /**
   * Delete a session
   */
  deleteSession: async (id: string): Promise<boolean> => {
    const state = await chatSessionService.loadState();
    const index = state.sessions.findIndex((s) => s.id === id);

    if (index === -1) {
      return false;
    }

    state.sessions.splice(index, 1);

    // If we deleted the active session, switch to the next one or null
    if (state.activeSessionId === id) {
      state.activeSessionId =
        state.sessions.length > 0 ? state.sessions[0].id : null;
    }

    await chatSessionService.saveState(state);
    return true;
  },

  /**
   * Get all sessions as summaries (for sidebar display)
   */
  getAllSessionSummaries: async (): Promise<ChatSessionSummary[]> => {
    const state = await chatSessionService.loadState();

    return state.sessions.map((session) => {
      const firstUserMessage = session.messages.find((m) => m.role === 'user');
      return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
        preview: firstUserMessage?.content.substring(0, 100),
      };
    });
  },

  /**
   * Search sessions by title and message content
   */
  searchSessions: async (query: string): Promise<ChatSessionSummary[]> => {
    const state = await chatSessionService.loadState();
    const lowerQuery = query.toLowerCase();

    const matchingSessions = state.sessions.filter((session) => {
      // Check title
      if (session.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Check message content
      return session.messages.some((m) =>
        m.content.toLowerCase().includes(lowerQuery)
      );
    });

    return matchingSessions.map((session) => {
      const firstUserMessage = session.messages.find((m) => m.role === 'user');
      return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
        preview: firstUserMessage?.content.substring(0, 100),
      };
    });
  },

  /**
   * Set the active session
   */
  setActiveSession: async (id: string | null): Promise<void> => {
    const state = await chatSessionService.loadState();
    state.activeSessionId = id;
    await chatSessionService.saveState(state);
  },

  /**
   * Get the active session ID
   */
  getActiveSessionId: async (): Promise<string | null> => {
    const state = await chatSessionService.loadState();
    return state.activeSessionId;
  },

  /**
   * Load the full storage state
   */
  loadState: async (): Promise<ChatStorageState> => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const state = result[STORAGE_KEY] as ChatStorageState | undefined;

      if (!state) {
        return {
          sessions: [],
          activeSessionId: null,
        };
      }

      return state;
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      return {
        sessions: [],
        activeSessionId: null,
      };
    }
  },

  /**
   * Save the full storage state
   */
  saveState: async (state: ChatStorageState): Promise<void> => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: state });
    } catch (error) {
      console.error('Error saving chat sessions:', error);
    }
  },

  /**
   * Get the last active tab ID from session storage
   * (used to detect when to create new sessions)
   */
  getLastActiveTabId: async (): Promise<number | null> => {
    try {
      const result = await chrome.storage.session.get(SESSION_STORAGE_KEY);
      return result[SESSION_STORAGE_KEY] ?? null;
    } catch (error) {
      console.error('Error getting last active tab ID:', error);
      return null;
    }
  },

  /**
   * Set the last active tab ID in session storage
   */
  setLastActiveTabId: async (tabId: number): Promise<void> => {
    try {
      await chrome.storage.session.set({ [SESSION_STORAGE_KEY]: tabId });
    } catch (error) {
      console.error('Error setting last active tab ID:', error);
    }
  },

  /**
   * Migrate old chat messages to new session format
   * Called once during app initialization
   */
  migrateFromLegacyMessages: async (
    legacyMessages: ChatMessage[]
  ): Promise<void> => {
    // Only migrate if there's actually content beyond the welcome message
    const hasContent = legacyMessages.some(
      (m) => m.id !== 'welcome' && m.role === 'user'
    );

    if (!hasContent) {
      return;
    }

    const state = await chatSessionService.loadState();

    // Only migrate if no sessions exist yet
    if (state.sessions.length > 0) {
      return;
    }

    // Create a session from legacy messages
    const firstUserMessage = legacyMessages.find((m) => m.role === 'user');
    const session: ChatSession = {
      id: generateId(),
      title: firstUserMessage
        ? generateTitle(firstUserMessage.content)
        : 'Imported Chat',
      createdAt: legacyMessages[0]?.timestamp || Date.now(),
      updatedAt:
        legacyMessages[legacyMessages.length - 1]?.timestamp || Date.now(),
      messages: legacyMessages,
    };

    state.sessions.push(session);
    state.activeSessionId = session.id;

    await chatSessionService.saveState(state);
    console.log('Migrated legacy chat messages to session format');
  },
};
