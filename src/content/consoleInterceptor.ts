/**
 * Console Interceptor - Injected into page context
 *
 * Captures console logs and errors from the page and sends them to the extension.
 * This runs in the MAIN world (page context), so it can intercept console methods.
 */

(function() {
  // Prevent double injection
  if ((window as any).__SYNERGY_CONSOLE_INTERCEPTOR__) {
    return;
  }
  (window as any).__SYNERGY_CONSOLE_INTERCEPTOR__ = true;

  // Store original console methods
  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  // Helper to send to content script
  const sendToExtension = (data: any) => {
    window.postMessage({
      type: 'CONSOLE_INTERCEPTED',
      source: 'ai-mastermind-console',
      data,
    }, '*');
  };

  // Helper to safely serialize args
  const serializeArg = (arg: any): any => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }
    if (arg instanceof HTMLElement) {
      return `[HTMLElement: ${arg.tagName}${arg.id ? '#' + arg.id : ''}${arg.className ? '.' + arg.className.split(' ').join('.') : ''}]`;
    }
    if (typeof arg === 'function') {
      return `[Function: ${arg.name || 'anonymous'}]`;
    }

    try {
      const seen = new WeakSet();
      return JSON.parse(JSON.stringify(arg, (_, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      }));
    } catch {
      return String(arg);
    }
  };

  // Helper to format message
  const formatMessage = (args: any[]): string => {
    return args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');
  };

  // Override console methods
  const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;

  levels.forEach(level => {
    (console as any)[level] = (...args: any[]) => {
      // Call original
      originalConsole[level](...args);

      // Send to extension
      try {
        sendToExtension({
          level,
          message: formatMessage(args),
          args: args.map(serializeArg),
          timestamp: Date.now(),
        });
      } catch {
        // Ignore errors in the interceptor itself
      }
    };
  });

  // Capture uncaught errors
  window.addEventListener('error', (event) => {
    sendToExtension({
      level: 'error',
      message: event.message,
      source: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    sendToExtension({
      level: 'error',
      message: reason instanceof Error ? reason.message : String(reason),
      source: 'unhandledrejection',
      stack: reason?.stack,
      timestamp: Date.now(),
    });
  });
})();
