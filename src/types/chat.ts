/**
 * Chat Session Management Types
 *
 * Provides type definitions for the chat session system with:
 * - Session isolation (each tab/new chat creates a session)
 * - Conversation memory within sessions
 * - Persistent storage support
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;                    // UUID
  title: string;                 // Auto-generated from first message or "New Chat"
  createdAt: number;
  updatedAt: number;
  tabUrl?: string;               // URL where chat was started (for reference)
  messages: ChatMessage[];
  editorContext?: { agentId: string; agentName: string };
}

export interface ChatStorageState {
  sessions: ChatSession[];
  activeSessionId: string | null;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview?: string;              // First line of first user message
  editorContext?: { agentId: string; agentName: string };
}
