/**
 * Network Interceptor - Injected into page context
 * Monkey-patches fetch() and XMLHttpRequest to capture request/response data
 *
 * This runs in the page context, not the extension context, so it can intercept
 * all network requests made by the page.
 */

(function() {
  console.log('[Interceptor] Network interceptor loaded');

  // Store original functions
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  // Helper to send data to content script
  const sendToContentScript = (data: any) => {
    window.postMessage({
      type: 'NETWORK_INTERCEPTED',
      source: 'ai-mastermind-interceptor',
      data
    }, '*');
  };

  // Helper to safely stringify (handles circular references)
  const safeStringify = (obj: any, maxLength = 50000): string => {
    try {
      const seen = new WeakSet();
      const str = JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        return value;
      });
      return str.length > maxLength ? str.substring(0, maxLength) + '...[truncated]' : str;
    } catch (e) {
      return '[Unable to stringify]';
    }
  };

  // Helper to extract response body safely
  const extractResponseBody = async (response: Response): Promise<string> => {
    try {
      const contentType = response.headers.get('content-type') || '';

      // Clone the response so we don't consume it
      const clonedResponse = response.clone();

      // Check if it's JSON
      if (contentType.includes('application/json')) {
        const json = await clonedResponse.json();
        return safeStringify(json);
      }

      // Check if it's text
      if (contentType.includes('text/') || contentType.includes('application/xml')) {
        const text = await clonedResponse.text();
        return text.length > 50000 ? text.substring(0, 50000) + '...[truncated]' : text;
      }

      // For binary data, just note the type
      return `[Binary data: ${contentType}, ${response.headers.get('content-length') || 'unknown'} bytes]`;
    } catch (e) {
      return `[Error extracting body: ${e}]`;
    }
  };

  // Intercept fetch()
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const options = init || {};

    const requestData = {
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body ? safeStringify(options.body, 10000) : null,
      timestamp: startTime
    };

    try {
      // Make the actual request
      const response = await originalFetch(input, init);

      // Extract response data
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseBody = await extractResponseBody(response);

      // Send to content script
      sendToContentScript({
        type: 'fetch',
        request: requestData,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
          url: response.url
        },
        duration: Date.now() - startTime
      });

      // Return the original response (already cloned for body extraction)
      return response;
    } catch (error: any) {
      // Send error info
      sendToContentScript({
        type: 'fetch',
        request: requestData,
        response: {
          error: error.message || String(error)
        },
        duration: Date.now() - startTime
      });

      throw error;
    }
  };

  // Intercept XMLHttpRequest
  const xhrRequests = new WeakMap<XMLHttpRequest, any>();

  XMLHttpRequest.prototype.open = function(method: string, url: string, async: boolean = true, username?: string | null, password?: string | null) {
    xhrRequests.set(this, {
      method,
      url,
      startTime: Date.now(),
      requestHeaders: {}
    });

    return originalXHROpen.call(this, method, url, async, username, password);
  };

  // Capture request headers
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
    const requestData = xhrRequests.get(this);
    if (requestData) {
      requestData.requestHeaders[header] = value;
    }
    return originalSetRequestHeader.apply(this, [header, value]);
  };

  XMLHttpRequest.prototype.send = function(body?: any) {
    const requestData = xhrRequests.get(this);
    if (requestData) {
      requestData.body = body ? safeStringify(body, 10000) : null;
    }

    // Listen for response
    this.addEventListener('loadend', function() {
      if (!requestData) return;

      const duration = Date.now() - requestData.startTime;

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      const headerString = this.getAllResponseHeaders();
      headerString.split('\r\n').forEach(line => {
        const [key, value] = line.split(': ');
        if (key && value) responseHeaders[key] = value;
      });

      // Get response body
      let responseBody: string;
      try {
        const contentType = this.getResponseHeader('content-type') || '';
        if (contentType.includes('application/json') && this.responseText) {
          responseBody = this.responseText;
        } else {
          responseBody = this.responseText || this.response;
          if (typeof responseBody !== 'string') {
            responseBody = safeStringify(responseBody, 50000);
          }
        }
      } catch (e) {
        responseBody = `[Error reading response: ${e}]`;
      }

      // Send to content script
      sendToContentScript({
        type: 'xhr',
        request: {
          url: requestData.url,
          method: requestData.method,
          headers: requestData.requestHeaders,
          body: requestData.body,
          timestamp: requestData.startTime
        },
        response: {
          status: this.status,
          statusText: this.statusText,
          headers: responseHeaders,
          body: responseBody
        },
        duration
      });
    });

    return originalXHRSend.apply(this, body ? [body] : []);
  };

  console.log('[Interceptor] fetch() and XMLHttpRequest intercepted');
})();
