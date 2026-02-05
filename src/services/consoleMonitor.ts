/**
 * Console Monitor Service
 *
 * Provides unified logging across the extension with 3 monitoring levels:
 * 1. none - No monitoring
 * 2. extension - Extension logs only (sidepanel, background, content scripts)
 * 3. full - All logs including page console (requires debugger permission)
 *
 * Full monitoring captures:
 * - Page console.* calls
 * - Web Workers console output
 * - Service Workers console output
 * - Shared Workers console output
 * - Uncaught exceptions with full stack traces
 * - Promise rejections
 * - All execution contexts (iframes, workers, etc.)
 */

export type ConsoleMonitoringLevel = 'none' | 'extension' | 'full';

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'table' | 'dir';

export type LogSource =
  | 'sidepanel'
  | 'background'
  | 'content-script'
  | 'page'
  | 'worker'
  | 'service-worker'
  | 'shared-worker'
  | 'iframe'
  | 'agent'
  | 'client'
  | 'unknown';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: LogSource;
  sourceDetail?: string; // e.g., agent name, client name, tab URL, worker URL
  message: string;
  args?: any[];
  stack?: string;
  tabId?: number;
  executionContextId?: number;
  url?: string;
}

type LogSubscriber = (entry: LogEntry) => void;

const MAX_LOG_ENTRIES = 1000;
const STORAGE_KEY = 'consoleMonitoringLevel';

// Track worker/target info
interface TargetInfo {
  targetId: string;
  sessionId: string;
  type: 'worker' | 'service_worker' | 'shared_worker' | 'iframe' | 'page' | 'other';
  url: string;
  tabId: number;
}

// Execution context info
interface ExecutionContextInfo {
  id: number;
  name: string;
  origin: string;
  auxData?: {
    isDefault?: boolean;
    type?: string;
    frameId?: string;
  };
}

class ConsoleMonitorClass {
  private level: ConsoleMonitoringLevel = 'extension';
  private logs: LogEntry[] = [];
  private subscribers: Set<LogSubscriber> = new Set();
  private originalConsole: Record<string, (...args: any[]) => void> | null = null;
  private isInitialized = false;
  private debuggerAttached: Set<number> = new Set();
  private attachedTargets: Map<string, TargetInfo> = new Map(); // sessionId -> TargetInfo
  private executionContexts: Map<number, Map<number, ExecutionContextInfo>> = new Map(); // tabId -> (contextId -> info)
  private tabListenerAdded = false;

  constructor() {
    this.loadLevel();
  }

  /**
   * Load monitoring level from storage
   */
  private async loadLevel(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data[STORAGE_KEY]) {
        this.level = data[STORAGE_KEY];
      }

      // Always initialize to capture our own extension logs
      this.initialize();

      // Setup debugger if full mode
      if (this.level === 'full') {
        this.attachDebuggerToAllTabs();
      }
    } catch (error) {
      console.error('[ConsoleMonitor] Error loading level:', error);
    }
  }

  /**
   * Save monitoring level to storage
   */
  private async saveLevel(): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: this.level });
    } catch (error) {
      console.error('[ConsoleMonitor] Error saving level:', error);
    }
  }

  /**
   * Get current monitoring level
   */
  getLevel(): ConsoleMonitoringLevel {
    return this.level;
  }

  /**
   * Set monitoring level
   */
  async setLevel(level: ConsoleMonitoringLevel): Promise<void> {
    const previousLevel = this.level;
    this.level = level;
    await this.saveLevel();

    // Always keep sidepanel console interception active
    if (!this.isInitialized) {
      this.initialize();
    }

    // Handle debugger attachment/detachment for full mode
    if (level === 'full' && previousLevel !== 'full') {
      this.attachDebuggerToAllTabs();
    } else if (level !== 'full' && previousLevel === 'full') {
      this.detachAllDebuggers();
    }

    console.log(`[ConsoleMonitor] Level changed: ${previousLevel} -> ${level}`);
  }

  /**
   * Initialize console interception
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    // Override console methods
    const levels: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
    levels.forEach(level => {
      (console as any)[level] = (...args: any[]) => {
        // Call original
        this.originalConsole![level](...args);

        // Capture if monitoring is enabled
        if (this.level !== 'none') {
          this.addLog({
            level,
            source: 'sidepanel',
            message: this.formatMessage(args),
            args,
          });
        }
      };
    });

    // Listen for messages from content scripts
    this.setupMessageListener();

    // Setup debugger listener if full monitoring
    if (this.level === 'full') {
      this.setupDebuggerListener();
      this.attachDebuggerToAllTabs();
    }

    this.isInitialized = true;
    console.log('[ConsoleMonitor] Initialized with level:', this.level);
  }

  /**
   * Setup listener for messages from content scripts
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender) => {
      if (message.type === 'CONSOLE_LOG') {
        if (this.level === 'none') return;

        this.addLog({
          level: message.level || 'log',
          source: message.source || 'content-script',
          sourceDetail: sender.tab?.url,
          message: message.message,
          args: message.args,
          stack: message.stack,
          tabId: sender.tab?.id,
        });
      }

      if (message.type === 'PAGE_ERROR') {
        if (this.level === 'none') return;

        this.addLog({
          level: 'error',
          source: 'page',
          sourceDetail: sender.tab?.url,
          message: message.message,
          stack: message.stack,
          tabId: sender.tab?.id,
        });
      }
    });
  }

  /**
   * Setup debugger event listener for full monitoring
   */
  private setupDebuggerListener(): void {
    if (!chrome.debugger) {
      console.warn('[ConsoleMonitor] Debugger API not available');
      return;
    }

    chrome.debugger.onEvent.addListener((source, method, params: any) => {
      const tabId = source.tabId;
      if (!tabId) return;

      // Handle console API calls (page and workers)
      if (method === 'Runtime.consoleAPICalled') {
        this.handleConsoleAPICalled(tabId, params);
      }

      // Handle exceptions
      if (method === 'Runtime.exceptionThrown') {
        this.handleExceptionThrown(tabId, params);
      }

      // Track execution contexts for better source attribution
      if (method === 'Runtime.executionContextCreated') {
        this.handleExecutionContextCreated(tabId, params);
      }

      if (method === 'Runtime.executionContextDestroyed') {
        this.handleExecutionContextDestroyed(tabId, params);
      }

      // Handle new targets (workers, iframes, etc.)
      if (method === 'Target.attachedToTarget') {
        this.handleTargetAttached(tabId, params);
      }

      if (method === 'Target.detachedFromTarget') {
        this.handleTargetDetached(params);
      }

      // Handle events from child sessions (workers)
      if (method === 'Target.receivedMessageFromTarget') {
        this.handleMessageFromTarget(tabId, params);
      }

      // Handle Log.entryAdded (browser-level logs: network errors, security, etc.)
      if (method === 'Log.entryAdded') {
        this.handleLogEntry(tabId, params);
      }
    });

    chrome.debugger.onDetach.addListener((source) => {
      if (source.tabId) {
        this.debuggerAttached.delete(source.tabId);
        this.executionContexts.delete(source.tabId);
        // Clean up targets for this tab
        for (const [sessionId, info] of this.attachedTargets) {
          if (info.tabId === source.tabId) {
            this.attachedTargets.delete(sessionId);
          }
        }
      }
    });
  }

  /**
   * Handle Runtime.consoleAPICalled event
   */
  private handleConsoleAPICalled(tabId: number, params: any): void {
    const level = this.mapDebuggerLogLevel(params.type);
    const { message, formattedArgs } = this.formatConsoleArgs(params.type, params.args);

    // Check for our special worker messaging marker
    if (message.startsWith('[__SYNERGY_MSG__]')) {
      this.handleWorkerMessagingLog(tabId, message, params);
      return; // Don't log as regular console entry
    }

    // Determine source from execution context
    const contextId = params.executionContextId;
    const source = this.getSourceFromContext(tabId, contextId);
    const contextInfo = this.executionContexts.get(tabId)?.get(contextId);

    this.addLog({
      level,
      source,
      sourceDetail: contextInfo?.origin || `Tab ${tabId}`,
      message,
      args: formattedArgs,
      tabId,
      executionContextId: contextId,
      url: contextInfo?.origin,
      stack: params.stackTrace ? this.formatStackTrace(params.stackTrace) : undefined,
    });
  }

  /**
   * Handle intercepted worker messaging (from our injected code)
   */
  private handleWorkerMessagingLog(tabId: number, rawMessage: string, _params: any): void {
    try {
      // Parse the JSON payload after our marker
      const jsonStr = rawMessage.replace('[__SYNERGY_MSG__]', '').trim();
      const data = JSON.parse(jsonStr);

      // Forward to background script for storage with other messaging data
      chrome.runtime.sendMessage({
        type: 'MESSAGING_DATA_INTERCEPTED',
        payload: {
          ...data,
          tabId,
          frameType: 'worker',
          isWorker: true,
        }
      }).catch(() => {
        // Ignore errors
      });

      // Also log as a special entry in our console logs for visibility
      this.addLog({
        level: 'info',
        source: data.workerType === 'service_worker' ? 'service-worker' :
                data.workerType === 'shared_worker' ? 'shared-worker' : 'worker',
        sourceDetail: `Worker postMessage (${data.direction})`,
        message: `[${data.direction}] ${data.message}`,
        tabId,
      });
    } catch (error) {
      // If parsing fails, just ignore
      console.warn('[ConsoleMonitor] Failed to parse worker messaging log:', error);
    }
  }

  /**
   * Handle Runtime.exceptionThrown event
   */
  private handleExceptionThrown(tabId: number, params: any): void {
    const exception = params.exceptionDetails;
    const contextId = exception?.executionContextId;
    const source = this.getSourceFromContext(tabId, contextId);
    const contextInfo = this.executionContexts.get(tabId)?.get(contextId);

    // Build comprehensive error message
    let message = exception?.text || 'Unknown error';
    if (exception?.exception) {
      const exc = exception.exception;
      if (exc.description) {
        message = exc.description;
      } else if (exc.value) {
        message = String(exc.value);
      }
    }

    this.addLog({
      level: 'error',
      source,
      sourceDetail: contextInfo?.origin || `Tab ${tabId}`,
      message,
      stack: this.formatStackTrace(exception?.stackTrace),
      tabId,
      executionContextId: contextId,
      url: exception?.url,
    });
  }

  /**
   * Handle Runtime.executionContextCreated event
   */
  private handleExecutionContextCreated(tabId: number, params: any): void {
    const context = params.context;
    if (!this.executionContexts.has(tabId)) {
      this.executionContexts.set(tabId, new Map());
    }

    this.executionContexts.get(tabId)!.set(context.id, {
      id: context.id,
      name: context.name,
      origin: context.origin,
      auxData: context.auxData,
    });
  }

  /**
   * Handle Runtime.executionContextDestroyed event
   */
  private handleExecutionContextDestroyed(tabId: number, params: any): void {
    this.executionContexts.get(tabId)?.delete(params.executionContextId);
  }

  /**
   * Handle Target.attachedToTarget event (workers, iframes)
   */
  private async handleTargetAttached(tabId: number, params: any): Promise<void> {
    const { sessionId, targetInfo } = params;

    const type = this.mapTargetType(targetInfo.type);
    this.attachedTargets.set(sessionId, {
      targetId: targetInfo.targetId,
      sessionId,
      type,
      url: targetInfo.url,
      tabId,
    });

    // Enable Runtime on the new target to capture its console
    try {
      await chrome.debugger.sendCommand(
        { tabId },
        'Target.sendMessageToTarget',
        {
          sessionId,
          message: JSON.stringify({ id: 1, method: 'Runtime.enable' }),
        }
      );

      console.log(`[ConsoleMonitor] Enabled Runtime on ${type}: ${targetInfo.url}`);

      // Inject messaging interception into workers
      if (type === 'worker' || type === 'service_worker' || type === 'shared_worker') {
        await this.injectWorkerMessagingInterceptor(tabId, sessionId, type);
      }
    } catch (error) {
      console.warn(`[ConsoleMonitor] Failed to enable Runtime on target:`, error);
    }
  }

  /**
   * Inject messaging interception code into a worker context
   */
  private async injectWorkerMessagingInterceptor(
    tabId: number,
    sessionId: string,
    workerType: string
  ): Promise<void> {
    // Code to inject into the worker - intercepts postMessage and onmessage
    const interceptorCode = `
      (function() {
        if (self.__SYNERGY_WORKER_MSG_INTERCEPTED__) return;
        self.__SYNERGY_WORKER_MSG_INTERCEPTED__ = true;

        const safeStringify = (obj, maxLen = 5000) => {
          try {
            if (typeof obj === 'string') return obj.length > maxLen ? obj.slice(0, maxLen) + '...' : obj;
            const str = JSON.stringify(obj);
            return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
          } catch { return '[Unstringifiable]'; }
        };

        // Intercept self.postMessage (worker -> main thread)
        const originalPostMessage = self.postMessage.bind(self);
        self.postMessage = function(message, transfer) {
          console.log('[__SYNERGY_MSG__]', JSON.stringify({
            type: 'WorkerMessage',
            direction: 'outgoing',
            workerType: '${workerType}',
            message: safeStringify(message),
            timestamp: Date.now()
          }));
          return originalPostMessage(message, transfer);
        };

        // Intercept incoming messages via onmessage setter
        let _onmessage = null;
        Object.defineProperty(self, 'onmessage', {
          get() { return _onmessage; },
          set(handler) {
            _onmessage = handler;
            // We'll log in addEventListener wrapper instead
          }
        });

        // Intercept addEventListener for 'message'
        const originalAddEventListener = self.addEventListener.bind(self);
        self.addEventListener = function(type, listener, options) {
          if (type === 'message' && typeof listener === 'function') {
            const wrappedListener = function(event) {
              console.log('[__SYNERGY_MSG__]', JSON.stringify({
                type: 'WorkerMessage',
                direction: 'incoming',
                workerType: '${workerType}',
                message: safeStringify(event.data),
                timestamp: Date.now()
              }));
              return listener.call(this, event);
            };
            return originalAddEventListener(type, wrappedListener, options);
          }
          return originalAddEventListener(type, listener, options);
        };

        console.log('[Synergy] Worker messaging interceptor installed');
      })();
    `;

    try {
      await chrome.debugger.sendCommand(
        { tabId },
        'Target.sendMessageToTarget',
        {
          sessionId,
          message: JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: {
              expression: interceptorCode,
              allowUnsafeEvalBlockedByCSP: true,
            }
          }),
        }
      );
      console.log(`[ConsoleMonitor] Injected messaging interceptor into ${workerType}`);
    } catch (error) {
      console.warn(`[ConsoleMonitor] Failed to inject messaging interceptor into worker:`, error);
    }
  }

  /**
   * Handle Target.detachedFromTarget event
   */
  private handleTargetDetached(params: any): void {
    this.attachedTargets.delete(params.sessionId);
  }

  /**
   * Handle Log.entryAdded (browser-level logs)
   */
  private handleLogEntry(tabId: number, params: any): void {
    const entry = params.entry;
    if (!entry) return;

    // Map log source
    let source: LogSource = 'page';
    if (entry.source === 'network') source = 'page';
    else if (entry.source === 'worker') source = 'worker';
    else if (entry.source === 'security') source = 'page';

    // Map log level
    let level: LogLevel = 'log';
    if (entry.level === 'error') level = 'error';
    else if (entry.level === 'warning') level = 'warn';
    else if (entry.level === 'info') level = 'info';
    else if (entry.level === 'verbose') level = 'debug';

    // Build message with source prefix for clarity
    let message = entry.text || '';
    if (entry.source && entry.source !== 'javascript') {
      message = `[${entry.source}] ${message}`;
    }

    this.addLog({
      level,
      source,
      sourceDetail: entry.url || `Tab ${tabId}`,
      message,
      tabId,
      url: entry.url,
      stack: entry.stackTrace ? this.formatStackTrace(entry.stackTrace) : undefined,
    });
  }

  /**
   * Handle Target.receivedMessageFromTarget (messages from workers)
   */
  private handleMessageFromTarget(tabId: number, params: any): void {
    const { sessionId, message } = params;
    const targetInfo = this.attachedTargets.get(sessionId);
    if (!targetInfo) return;

    try {
      const parsed = JSON.parse(message);

      // Handle console API calls from workers
      if (parsed.method === 'Runtime.consoleAPICalled') {
        const workerParams = parsed.params;
        const level = this.mapDebuggerLogLevel(workerParams.type);
        const { message: msg, formattedArgs } = this.formatConsoleArgs(workerParams.type, workerParams.args);

        // Check for our special worker messaging marker
        if (msg.startsWith('[__SYNERGY_MSG__]')) {
          this.handleWorkerMessagingLog(tabId, msg, workerParams);
          return; // Don't log as regular console entry
        }

        this.addLog({
          level,
          source: this.mapTargetTypeToSource(targetInfo.type),
          sourceDetail: targetInfo.url,
          message: msg,
          args: formattedArgs,
          tabId,
          url: targetInfo.url,
          stack: workerParams.stackTrace ? this.formatStackTrace(workerParams.stackTrace) : undefined,
        });
      }

      // Handle exceptions from workers
      if (parsed.method === 'Runtime.exceptionThrown') {
        const exception = parsed.params.exceptionDetails;
        let msg = exception?.text || 'Unknown error';
        if (exception?.exception?.description) {
          msg = exception.exception.description;
        }

        this.addLog({
          level: 'error',
          source: this.mapTargetTypeToSource(targetInfo.type),
          sourceDetail: targetInfo.url,
          message: msg,
          stack: this.formatStackTrace(exception?.stackTrace),
          tabId,
          url: targetInfo.url,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Map target type string to our type
   */
  private mapTargetType(type: string): TargetInfo['type'] {
    switch (type) {
      case 'worker': return 'worker';
      case 'service_worker': return 'service_worker';
      case 'shared_worker': return 'shared_worker';
      case 'iframe': return 'iframe';
      case 'page': return 'page';
      default: return 'other';
    }
  }

  /**
   * Map target type to LogSource
   */
  private mapTargetTypeToSource(type: TargetInfo['type']): LogSource {
    switch (type) {
      case 'worker': return 'worker';
      case 'service_worker': return 'service-worker';
      case 'shared_worker': return 'shared-worker';
      case 'iframe': return 'iframe';
      default: return 'page';
    }
  }

  /**
   * Get source from execution context
   */
  private getSourceFromContext(tabId: number, contextId?: number): LogSource {
    if (!contextId) return 'page';

    const contextInfo = this.executionContexts.get(tabId)?.get(contextId);
    if (!contextInfo) return 'page';

    // Check auxData for context type
    const auxData = contextInfo.auxData;
    if (auxData?.type === 'worker') return 'worker';
    if (auxData?.type === 'service_worker') return 'service-worker';
    if (auxData?.type === 'shared_worker') return 'shared-worker';
    if (auxData?.frameId && !auxData?.isDefault) return 'iframe';

    return 'page';
  }

  /**
   * Format console args based on console method type
   */
  private formatConsoleArgs(type: string, args: any[]): { message: string; formattedArgs: any[] } {
    if (!args || args.length === 0) {
      return { message: '', formattedArgs: [] };
    }

    const formattedArgs = args.map(arg => this.formatRemoteObject(arg));

    // Special formatting for different console methods
    switch (type) {
      case 'table':
        return {
          message: this.formatTable(args),
          formattedArgs,
        };

      case 'dir':
      case 'dirxml':
        return {
          message: this.formatDir(args[0]),
          formattedArgs,
        };

      case 'trace':
        return {
          message: `Trace: ${formattedArgs.join(' ')}`,
          formattedArgs,
        };

      case 'assert':
        // First arg is the assertion result (false means assertion failed)
        return {
          message: `Assertion failed: ${formattedArgs.slice(1).join(' ')}`,
          formattedArgs: formattedArgs.slice(1),
        };

      case 'count':
      case 'countReset':
        return {
          message: formattedArgs.join(': '),
          formattedArgs,
        };

      case 'time':
      case 'timeLog':
      case 'timeEnd':
        return {
          message: formattedArgs.join(': '),
          formattedArgs,
        };

      case 'group':
      case 'groupCollapsed':
        return {
          message: `▸ ${formattedArgs.join(' ') || 'console.group'}`,
          formattedArgs,
        };

      case 'groupEnd':
        return {
          message: '◂ (group end)',
          formattedArgs: [],
        };

      default:
        return {
          message: formattedArgs.join(' '),
          formattedArgs,
        };
    }
  }

  /**
   * Format a remote object from debugger
   */
  private formatRemoteObject(obj: any): any {
    if (!obj) return 'undefined';

    // Primitive values
    if (obj.type === 'undefined') return 'undefined';
    if (obj.type === 'string') return obj.value;
    if (obj.type === 'number') return obj.value;
    if (obj.type === 'boolean') return obj.value;
    if (obj.type === 'symbol') return obj.description || 'Symbol()';
    if (obj.type === 'bigint') return obj.description || obj.value;

    // Null
    if (obj.subtype === 'null') return 'null';

    // Objects
    if (obj.type === 'object') {
      // Arrays
      if (obj.subtype === 'array') {
        return obj.description || 'Array';
      }
      // Errors
      if (obj.subtype === 'error') {
        return obj.description || 'Error';
      }
      // DOM nodes
      if (obj.subtype === 'node') {
        return obj.description || 'Node';
      }
      // Regular expressions
      if (obj.subtype === 'regexp') {
        return obj.description || 'RegExp';
      }
      // Dates
      if (obj.subtype === 'date') {
        return obj.description || 'Date';
      }
      // Maps/Sets
      if (obj.subtype === 'map') {
        return obj.description || 'Map';
      }
      if (obj.subtype === 'set') {
        return obj.description || 'Set';
      }
      // WeakMap/WeakSet
      if (obj.subtype === 'weakmap') return 'WeakMap';
      if (obj.subtype === 'weakset') return 'WeakSet';
      // Promise
      if (obj.subtype === 'promise') {
        return obj.description || 'Promise';
      }
      // Proxy
      if (obj.subtype === 'proxy') return 'Proxy';
      // Iterator
      if (obj.subtype === 'iterator') return obj.description || 'Iterator';
      // Generator
      if (obj.subtype === 'generator') return obj.description || 'Generator';

      // Generic object
      return obj.description || obj.className || 'Object';
    }

    // Functions
    if (obj.type === 'function') {
      return obj.description || 'function()';
    }

    // Fallback
    return obj.description ?? obj.value ?? String(obj);
  }

  /**
   * Format console.table output
   */
  private formatTable(args: any[]): string {
    const data = args[0];
    if (!data) return 'table: (empty)';

    const formatted = this.formatRemoteObject(data);
    if (typeof formatted === 'string' && formatted.includes('[')) {
      return `table: ${formatted}`;
    }
    return `table: ${JSON.stringify(formatted)}`;
  }

  /**
   * Format console.dir output
   */
  private formatDir(obj: any): string {
    if (!obj) return 'dir: undefined';
    return `dir: ${this.formatRemoteObject(obj)}`;
  }

  /**
   * Format stack trace from debugger
   */
  private formatStackTrace(stackTrace: any): string | undefined {
    if (!stackTrace?.callFrames?.length) return undefined;

    return stackTrace.callFrames.map((frame: any) => {
      const funcName = frame.functionName || '<anonymous>';
      const url = frame.url || '<unknown>';
      const line = frame.lineNumber ?? '?';
      const col = frame.columnNumber ?? '?';
      return `    at ${funcName} (${url}:${line}:${col})`;
    }).join('\n');
  }

  /**
   * Map debugger log type to our LogLevel
   */
  private mapDebuggerLogLevel(type: string): LogLevel {
    const mapping: Record<string, LogLevel> = {
      'log': 'log',
      'info': 'info',
      'warning': 'warn',
      'warn': 'warn',
      'error': 'error',
      'debug': 'debug',
      'dir': 'dir',
      'dirxml': 'dir',
      'table': 'table',
      'trace': 'trace',
      'assert': 'error',
      'count': 'log',
      'countReset': 'log',
      'time': 'log',
      'timeLog': 'log',
      'timeEnd': 'log',
      'timeStamp': 'log',
      'group': 'log',
      'groupCollapsed': 'log',
      'groupEnd': 'log',
      'clear': 'log',
      'profile': 'debug',
      'profileEnd': 'debug',
    };
    return mapping[type] || 'log';
  }

  /**
   * Attach debugger to all existing tabs
   */
  private async attachDebuggerToAllTabs(): Promise<void> {
    if (!chrome.debugger) return;

    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && !this.debuggerAttached.has(tab.id)) {
          this.attachDebuggerToTab(tab.id);
        }
      }

      // Listen for new tabs (only add listener once)
      if (!this.tabListenerAdded) {
        this.tabListenerAdded = true;

        // Attach to new tabs
        chrome.tabs.onCreated.addListener((tab) => {
          if (tab.id && this.level === 'full') {
            this.attachDebuggerToTab(tab.id);
          }
        });

        // Also attach when navigating to a new URL (reattach may be needed)
        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
          if (this.level === 'full' && changeInfo.status === 'loading') {
            // Re-enable runtime on navigation to catch new contexts
            if (this.debuggerAttached.has(tabId)) {
              chrome.debugger.sendCommand({ tabId }, 'Runtime.enable').catch(() => {});
            }
          }
          // Re-inject page messaging interceptor after navigation completes
          if (this.level === 'full' && changeInfo.status === 'complete') {
            if (this.debuggerAttached.has(tabId)) {
              this.injectPageMessagingInterceptor(tabId).catch(() => {});
            }
          }
        });
      }
    } catch (error) {
      console.error('[ConsoleMonitor] Error attaching debuggers:', error);
    }
  }

  /**
   * Attach debugger to a specific tab with full monitoring capabilities
   */
  private async attachDebuggerToTab(tabId: number): Promise<void> {
    if (!chrome.debugger || this.debuggerAttached.has(tabId)) return;

    try {
      // Attach debugger with protocol version 1.3
      await chrome.debugger.attach({ tabId }, '1.3');
      this.debuggerAttached.add(tabId);

      // Enable Runtime domain for console and exceptions
      await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable');

      // Enable Target domain for worker discovery
      await chrome.debugger.sendCommand({ tabId }, 'Target.setAutoAttach', {
        autoAttach: true,
        waitForDebuggerOnStart: false,
        flatten: false, // Use nested sessions for workers
      });

      // Also discover existing workers
      await chrome.debugger.sendCommand({ tabId }, 'Target.setDiscoverTargets', {
        discover: true,
      });

      // Enable Log domain for additional logging
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Log.enable');
      } catch {
        // Log domain may not be available in all contexts
      }

      // Inject page-level messaging interception (captures even if page tries to suppress)
      await this.injectPageMessagingInterceptor(tabId);

      console.log(`[ConsoleMonitor] Full monitoring enabled for tab ${tabId}`);
    } catch (error: any) {
      // Ignore errors for chrome:// pages, extensions, etc.
      if (!error.message?.includes('Cannot attach') &&
          !error.message?.includes('Cannot access')) {
        console.warn(`[ConsoleMonitor] Could not attach debugger to tab ${tabId}:`, error);
      }
      this.debuggerAttached.delete(tabId);
    }
  }

  /**
   * Inject messaging interception into page context via debugger
   * This runs before any page scripts, so it can't be suppressed
   */
  private async injectPageMessagingInterceptor(tabId: number): Promise<void> {
    const interceptorCode = `
      (function() {
        if (window.__SYNERGY_PAGE_MSG_INTERCEPTED__) return;
        window.__SYNERGY_PAGE_MSG_INTERCEPTED__ = true;

        const safeStringify = (obj, maxLen = 5000) => {
          try {
            if (typeof obj === 'string') return obj.length > maxLen ? obj.slice(0, maxLen) + '...' : obj;
            if (obj && obj.source && String(obj.source).startsWith('ai-mastermind')) return '[Internal]';
            const str = JSON.stringify(obj);
            return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
          } catch { return '[Unstringifiable]'; }
        };

        // Intercept window.postMessage
        const originalPostMessage = window.postMessage.bind(window);
        window.postMessage = function(message, targetOriginOrOptions, transfer) {
          // Skip our own internal messages
          if (message && message.source && String(message.source).startsWith('ai-mastermind')) {
            return originalPostMessage(message, targetOriginOrOptions, transfer);
          }

          const targetOrigin = typeof targetOriginOrOptions === 'string'
            ? targetOriginOrOptions
            : targetOriginOrOptions?.targetOrigin || '*';

          console.log('[__SYNERGY_MSG__]', JSON.stringify({
            type: 'postMessage',
            direction: 'outgoing',
            message: safeStringify(message),
            targetOrigin: targetOrigin,
            sourceOrigin: window.location.origin,
            timestamp: Date.now()
          }));

          return originalPostMessage(message, targetOriginOrOptions, transfer);
        };

        // Listen for incoming postMessages
        window.addEventListener('message', function(event) {
          // Skip our own internal messages
          if (event.data && event.data.source && String(event.data.source).startsWith('ai-mastermind')) {
            return;
          }

          console.log('[__SYNERGY_MSG__]', JSON.stringify({
            type: 'postMessage',
            direction: 'incoming',
            message: safeStringify(event.data),
            origin: event.origin,
            timestamp: Date.now()
          }));
        }, true);

        // Intercept MessageChannel
        const OriginalMessageChannel = window.MessageChannel;
        if (OriginalMessageChannel) {
          let channelCounter = 0;
          window.MessageChannel = function() {
            const channel = new OriginalMessageChannel();
            const channelId = ++channelCounter;

            ['port1', 'port2'].forEach(portName => {
              const port = channel[portName];
              const originalPostMessage = port.postMessage.bind(port);
              port.postMessage = function(message, transfer) {
                console.log('[__SYNERGY_MSG__]', JSON.stringify({
                  type: 'MessageChannel',
                  channelId: channelId,
                  port: portName,
                  direction: 'outgoing',
                  message: safeStringify(message),
                  timestamp: Date.now()
                }));
                return originalPostMessage(message, transfer);
              };
            });

            return channel;
          };
          window.MessageChannel.prototype = OriginalMessageChannel.prototype;
        }

        // Intercept BroadcastChannel
        const OriginalBroadcastChannel = window.BroadcastChannel;
        if (OriginalBroadcastChannel) {
          let bcCounter = 0;
          window.BroadcastChannel = function(name) {
            const channel = new OriginalBroadcastChannel(name);
            const channelId = ++bcCounter;

            const originalPostMessage = channel.postMessage.bind(channel);
            channel.postMessage = function(message) {
              console.log('[__SYNERGY_MSG__]', JSON.stringify({
                type: 'BroadcastChannel',
                channelId: channelId,
                channelName: name,
                direction: 'outgoing',
                message: safeStringify(message),
                timestamp: Date.now()
              }));
              return originalPostMessage(message);
            };

            return channel;
          };
          window.BroadcastChannel.prototype = OriginalBroadcastChannel.prototype;
        }

        console.log('[Synergy] Page messaging interceptor installed via debugger');
      })();
    `;

    try {
      await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: interceptorCode,
        allowUnsafeEvalBlockedByCSP: true,
      });
      console.log(`[ConsoleMonitor] Injected page messaging interceptor via debugger for tab ${tabId}`);
    } catch (error) {
      // May fail on some pages, that's ok
      console.warn(`[ConsoleMonitor] Could not inject page messaging interceptor:`, error);
    }
  }

  /**
   * Detach debugger from all tabs
   */
  private async detachAllDebuggers(): Promise<void> {
    if (!chrome.debugger) return;

    for (const tabId of this.debuggerAttached) {
      try {
        await chrome.debugger.detach({ tabId });
      } catch (error) {
        // Ignore errors
      }
    }
    this.debuggerAttached.clear();
    this.attachedTargets.clear();
    this.executionContexts.clear();
  }

  /**
   * Format message args to string
   */
  private formatMessage(args: any[]): string {
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
   * Add a log entry
   */
  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    if (this.level === 'none') return;

    const logEntry: LogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.logs.push(logEntry);

    // Trim if over limit
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }

    // Notify subscribers
    this.subscribers.forEach(cb => cb(logEntry));
  }

  /**
   * Log from a specific source (for agents/clients to use)
   */
  log(level: LogLevel, source: LogSource, message: string, sourceDetail?: string): void {
    if (this.level === 'none') return;

    this.addLog({
      level,
      source,
      sourceDetail,
      message,
    });
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by criteria
   */
  getFilteredLogs(options: {
    level?: LogLevel | LogLevel[];
    source?: LogSource | LogSource[];
    since?: number;
    search?: string;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (options.level) {
      const levels = Array.isArray(options.level) ? options.level : [options.level];
      filtered = filtered.filter(log => levels.includes(log.level));
    }

    if (options.source) {
      const sources = Array.isArray(options.source) ? options.source : [options.source];
      filtered = filtered.filter(log => sources.includes(log.source));
    }

    if (options.since) {
      const since = options.since;
      filtered = filtered.filter(log => log.timestamp >= since);
    }

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.sourceDetail?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): LogEntry[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Subscribe to new log entries
   */
  subscribe(callback: LogSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Check if debugger permission is available
   */
  async hasDebuggerPermission(): Promise<boolean> {
    try {
      return !!chrome.debugger;
    } catch {
      return false;
    }
  }

  /**
   * Get summary of logs for AI analysis
   */
  getLogSummary(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    bySource: Record<LogSource, number>;
    recentErrors: LogEntry[];
  } {
    const byLevel: Record<LogLevel, number> = {
      log: 0,
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
      trace: 0,
      table: 0,
      dir: 0,
    };

    const bySource: Record<LogSource, number> = {
      sidepanel: 0,
      background: 0,
      'content-script': 0,
      page: 0,
      iframe: 0,
      worker: 0,
      'service-worker': 0,
      'shared-worker': 0,
      agent: 0,
      client: 0,
      unknown: 0,
    };

    for (const log of this.logs) {
      byLevel[log.level]++;
      bySource[log.source]++;
    }

    return {
      total: this.logs.length,
      byLevel,
      bySource,
      recentErrors: this.getRecentErrors(5),
    };
  }
}

// Export singleton
export const consoleMonitor = new ConsoleMonitorClass();
