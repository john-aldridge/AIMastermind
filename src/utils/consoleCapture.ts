/**
 * Console Capture Utility
 *
 * Lightweight console interception for extension UI contexts (sidepanel, editor).
 * Captures logs and forwards them to the background script for unified storage.
 */

import { MessageType } from './messaging';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface CaptureOptions {
  source: string; // e.g., 'sidepanel', 'editor'
}

let isInitialized = false;

const originalConsole: Record<LogLevel, (...args: any[]) => void> = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

/**
 * Format args to a message string
 */
function formatMessage(args: any[]): string {
  return args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }).join(' ');
}

/**
 * Send log to background script
 */
function sendLog(level: LogLevel, source: string, args: any[]): void {
  // Don't block on sending - fire and forget
  chrome.runtime?.sendMessage?.({
    type: MessageType.CONSOLE_LOG,
    payload: {
      level,
      source,
      message: formatMessage(args),
      timestamp: Date.now(),
    }
  }).catch(() => {
    // Ignore errors (extension context may be invalidated)
  });
}

/**
 * Initialize console capture for a UI context
 */
export function initConsoleCapture(options: CaptureOptions): void {
  if (isInitialized) return;

  const { source } = options;

  (['log', 'info', 'warn', 'error', 'debug'] as const).forEach(level => {
    (console as any)[level] = (...args: any[]) => {
      // Always call original
      originalConsole[level](...args);

      // Forward to background
      sendLog(level, source, args);
    };
  });

  isInitialized = true;
  console.log(`[ConsoleCapture] Initialized for ${source}`);
}

/**
 * Get original console (useful for avoiding recursion)
 */
export function getOriginalConsole(): typeof originalConsole {
  return originalConsole;
}
