/**
 * Messaging Interceptor - Injected into page context
 *
 * Captures inter-context messaging:
 * - window.postMessage (cross-origin communication)
 * - MessageChannel (two-way channels)
 * - BroadcastChannel (broadcast to all contexts)
 *
 * This runs in the page context to intercept page-level messaging.
 */

(function() {
  // Prevent double injection
  if ((window as any).__SYNERGY_MESSAGING_INTERCEPTOR_INSTALLED__) {
    return;
  }
  (window as any).__SYNERGY_MESSAGING_INTERCEPTOR_INSTALLED__ = true;

  console.log('[MessagingInterceptor] Messaging interceptor loaded');

  // Helper to send data to content script
  const sendToContentScript = (data: any) => {
    window.postMessage({
      type: 'MESSAGING_INTERCEPTED',
      source: 'ai-mastermind-messaging',
      data
    }, '*');
  };

  // Helper to safely stringify (handles circular references)
  const safeStringify = (obj: any, maxLength = 10000): string => {
    try {
      if (typeof obj === 'string') return obj.length > maxLength ? obj.substring(0, maxLength) + '...[truncated]' : obj;
      const seen = new WeakSet();
      const str = JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        // Handle special types
        if (value instanceof Error) return `${value.name}: ${value.message}`;
        if (typeof value === 'function') return '[Function]';
        if (value instanceof ArrayBuffer) return `[ArrayBuffer ${value.byteLength} bytes]`;
        if (ArrayBuffer.isView(value)) return `[${value.constructor.name} ${value.byteLength} bytes]`;
        return value;
      });
      return str.length > maxLength ? str.substring(0, maxLength) + '...[truncated]' : str;
    } catch (e) {
      return '[Unable to stringify]';
    }
  };

  // Get a unique ID for tracking channels
  let channelIdCounter = 0;
  const getChannelId = () => ++channelIdCounter;

  // ============================================
  // 1. postMessage Interception
  // ============================================
  const originalPostMessage = window.postMessage.bind(window);

  window.postMessage = function(message: any, targetOriginOrOptions?: string | WindowPostMessageOptions, transfer?: Transferable[]) {
    // Don't intercept our own messages
    if (message?.source?.startsWith?.('ai-mastermind')) {
      return originalPostMessage(message, targetOriginOrOptions as any, transfer);
    }

    const targetOrigin = typeof targetOriginOrOptions === 'string'
      ? targetOriginOrOptions
      : targetOriginOrOptions?.targetOrigin || '*';

    sendToContentScript({
      type: 'postMessage',
      direction: 'outgoing',
      message: safeStringify(message),
      targetOrigin,
      sourceOrigin: window.location.origin,
      timestamp: Date.now()
    });

    return originalPostMessage(message, targetOriginOrOptions as any, transfer);
  };

  // Listen for incoming postMessages (capture phase)
  window.addEventListener('message', (event) => {
    // Don't intercept our own messages
    if (event.data?.source?.startsWith?.('ai-mastermind')) {
      return;
    }

    sendToContentScript({
      type: 'postMessage',
      direction: 'incoming',
      message: safeStringify(event.data),
      origin: event.origin,
      sourceOrigin: event.origin,
      targetOrigin: window.location.origin,
      timestamp: Date.now()
    });
  }, true); // capture phase

  console.log('[MessagingInterceptor] postMessage intercepted');

  // ============================================
  // 2. MessageChannel Interception
  // ============================================
  const OriginalMessageChannel = window.MessageChannel;

  if (OriginalMessageChannel) {
    (window as any).MessageChannel = function() {
      const channel = new OriginalMessageChannel();
      const channelId = getChannelId();

      const wrapPort = (port: MessagePort, portName: string) => {
        const originalPortPostMessage = port.postMessage.bind(port);

        // Override postMessage with proper overload handling
        (port as any).postMessage = function(message: any, transferOrOptions?: Transferable[] | StructuredSerializeOptions) {
          sendToContentScript({
            type: 'MessageChannel',
            channelId,
            port: portName,
            direction: 'outgoing',
            message: safeStringify(message),
            timestamp: Date.now()
          });
          return originalPortPostMessage(message, transferOrOptions as any);
        };

        // Listen for incoming messages on this port
        const originalAddEventListener = port.addEventListener.bind(port);
        (port as any).addEventListener = function(type: string, listener: any, options?: any) {
          if (type === 'message') {
            const wrappedListener = function(this: MessagePort, event: MessageEvent) {
              sendToContentScript({
                type: 'MessageChannel',
                channelId,
                port: portName,
                direction: 'incoming',
                message: safeStringify(event.data),
                timestamp: Date.now()
              });
              return listener.call(this, event);
            };
            return originalAddEventListener(type, wrappedListener, options);
          }
          return originalAddEventListener(type, listener, options);
        };

        // Also handle onmessage property
        let onmessageHandler: ((event: MessageEvent) => void) | null = null;
        Object.defineProperty(port, 'onmessage', {
          get() { return onmessageHandler; },
          set(handler) {
            onmessageHandler = handler;
            if (handler) {
              originalAddEventListener('message', (event: MessageEvent) => {
                sendToContentScript({
                  type: 'MessageChannel',
                  channelId,
                  port: portName,
                  direction: 'incoming',
                  message: safeStringify(event.data),
                  timestamp: Date.now()
                });
                handler(event);
              });
            }
          }
        });
      };

      wrapPort(channel.port1, 'port1');
      wrapPort(channel.port2, 'port2');

      sendToContentScript({
        type: 'MessageChannel',
        channelId,
        event: 'created',
        timestamp: Date.now()
      });

      return channel;
    };

    // Preserve prototype chain
    (window as any).MessageChannel.prototype = OriginalMessageChannel.prototype;

    console.log('[MessagingInterceptor] MessageChannel intercepted');
  }

  // ============================================
  // 3. BroadcastChannel Interception
  // ============================================
  const OriginalBroadcastChannel = window.BroadcastChannel;

  if (OriginalBroadcastChannel) {
    (window as any).BroadcastChannel = function(name: string) {
      const channel = new OriginalBroadcastChannel(name);
      const channelId = getChannelId();

      // Intercept outgoing messages
      const originalPostMessage = channel.postMessage.bind(channel);
      channel.postMessage = function(message: any) {
        sendToContentScript({
          type: 'BroadcastChannel',
          channelId,
          channelName: name,
          direction: 'outgoing',
          message: safeStringify(message),
          timestamp: Date.now()
        });
        return originalPostMessage(message);
      };

      // Listen for incoming messages
      const originalAddEventListener = channel.addEventListener.bind(channel);
      (channel as any).addEventListener = function(type: string, listener: any, options?: any) {
        if (type === 'message') {
          const wrappedListener = function(this: BroadcastChannel, event: MessageEvent) {
            sendToContentScript({
              type: 'BroadcastChannel',
              channelId,
              channelName: name,
              direction: 'incoming',
              message: safeStringify(event.data),
              timestamp: Date.now()
            });
            return listener.call(this, event);
          };
          return originalAddEventListener(type, wrappedListener, options);
        }
        return originalAddEventListener(type, listener, options);
      };

      // Handle onmessage property
      let onmessageHandler: ((event: MessageEvent) => void) | null = null;
      Object.defineProperty(channel, 'onmessage', {
        get() { return onmessageHandler; },
        set(handler) {
          onmessageHandler = handler;
          if (handler) {
            originalAddEventListener('message', (event: MessageEvent) => {
              sendToContentScript({
                type: 'BroadcastChannel',
                channelId,
                channelName: name,
                direction: 'incoming',
                message: safeStringify(event.data),
                timestamp: Date.now()
              });
              handler(event);
            });
          }
        }
      });

      sendToContentScript({
        type: 'BroadcastChannel',
        channelId,
        channelName: name,
        event: 'created',
        timestamp: Date.now()
      });

      // Intercept close
      const originalClose = channel.close.bind(channel);
      channel.close = function() {
        sendToContentScript({
          type: 'BroadcastChannel',
          channelId,
          channelName: name,
          event: 'closed',
          timestamp: Date.now()
        });
        return originalClose();
      };

      return channel;
    };

    // Preserve prototype chain
    (window as any).BroadcastChannel.prototype = OriginalBroadcastChannel.prototype;

    console.log('[MessagingInterceptor] BroadcastChannel intercepted');
  }

  console.log('[MessagingInterceptor] All messaging APIs intercepted');
})();
