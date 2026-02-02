/**
 * Network Monitor
 * Manages different levels of network monitoring
 */

import { permissionManager } from './permissions';

export type MonitoringLevel = 'filtering-only' | 'api-monitoring' | 'full-monitoring';

export interface MonitoringConfig {
  level: MonitoringLevel;
  description: string;
  permissions: string[];
  features: string[];
  performance: 'excellent' | 'good' | 'moderate' | 'heavy';
  userWarning?: string;
  note?: string;
}

export interface NetworkRequest {
  url: string;
  method: string;
  type: string;
  timestamp: number;
  statusCode?: number;
  tabId?: number;
  // Full request/response data from content script interception
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  duration?: number;
  intercepted?: boolean; // true if captured via content script, false if via webRequest
}

export const MONITORING_LEVELS: Record<MonitoringLevel, MonitoringConfig> = {
  'filtering-only': {
    level: 'filtering-only',
    description: 'Content Filtering Only',
    permissions: [],
    features: [
      'Block trackers & ads (declarativeNetRequest)',
      'Filter content with predefined rules',
      'Zero performance impact',
      'No network request observation',
      'No data sent to AI'
    ],
    performance: 'excellent',
    note: 'Privacy-focused: Only blocks requests, never observes or captures data'
  },
  'api-monitoring': {
    level: 'api-monitoring',
    description: 'API Monitoring - Recommended',
    permissions: ['webRequest'],
    features: [
      'Content filtering enabled',
      'Capture full API request/response data (headers + bodies)',
      'Intercept fetch() and XMLHttpRequest calls',
      'Observe API endpoints only (not images, CSS, fonts)',
      'Include decompressed response data in AI context'
    ],
    performance: 'good',
    note: 'Best for analyzing API calls, responses, and data payloads. Minimal overhead.'
  },
  'full-monitoring': {
    level: 'full-monitoring',
    description: 'Complete Page Analysis',
    permissions: ['webRequest'],
    features: [
      'Everything from API Monitoring',
      'Observe ALL network requests (images, CSS, fonts, scripts)',
      'Extract and analyze all JavaScript code on page',
      'Capture inline and external script contents',
      'Full network timeline with all resource types'
    ],
    performance: 'moderate',
    note: 'Maximum visibility: captures all network traffic + extracts all JavaScript. Higher memory usage.',
    userWarning: 'This mode extracts all JavaScript code from the page for AI analysis. This may use significant memory on complex pages.'
  }
};

export class NetworkMonitor {
  private isMonitoring = false;
  private currentLevel: MonitoringLevel = 'filtering-only';
  private requests: NetworkRequest[] = [];
  private maxRequests = 100; // Keep last 100 requests
  private webRequestListener: any = null;

  async setLevel(level: MonitoringLevel): Promise<{ success: boolean; error?: string }> {
    const config = MONITORING_LEVELS[level];

    // Check if we have required permissions
    for (const perm of config.permissions) {
      const hasPermission = await permissionManager.hasPermission(perm);

      if (!hasPermission) {
        // Request permission from user
        const granted = await permissionManager.requestPermission(perm);
        if (!granted) {
          return {
            success: false,
            error: `Permission denied: ${perm}. Please grant this permission to use ${level} monitoring.`
          };
        }
      }
    }

    // Stop current monitoring
    await this.stop();

    // Start new monitoring level
    this.currentLevel = level;

    switch (level) {
      case 'filtering-only':
        // No webRequest monitoring, only declarativeNetRequest (which is always active)
        // User can enable filtering rules separately in settings
        break;
      case 'api-monitoring':
        await this.startAPIMonitoring();
        break;
      case 'full-monitoring':
        await this.startFullMonitoring();
        break;
    }

    return { success: true };
  }

  private async startAPIMonitoring() {
    if (!chrome.webRequest) {
      console.error('webRequest API not available');
      return;
    }

    this.webRequestListener = (details: chrome.webRequest.WebResponseCacheDetails) => {
      this.handleRequest({
        url: details.url,
        method: details.method,
        type: details.type,
        timestamp: details.timeStamp,
        statusCode: (details as any).statusCode,
        tabId: details.tabId
      });
    };

    chrome.webRequest.onCompleted.addListener(
      this.webRequestListener,
      { urls: ["<all_urls>"], types: ["xmlhttprequest"] }
    );

    this.isMonitoring = true;
    console.log('API monitoring started');
  }

  private async startFullMonitoring() {
    if (!chrome.webRequest) {
      console.error('webRequest API not available');
      return;
    }

    this.webRequestListener = (details: chrome.webRequest.WebResponseCacheDetails) => {
      this.handleRequest({
        url: details.url,
        method: details.method,
        type: details.type,
        timestamp: details.timeStamp,
        statusCode: (details as any).statusCode,
        tabId: details.tabId
      });
    };

    chrome.webRequest.onCompleted.addListener(
      this.webRequestListener,
      { urls: ["<all_urls>"] }
    );

    this.isMonitoring = true;
    console.log('Full network monitoring started');
  }

  private handleRequest(request: NetworkRequest) {
    // Add to requests array
    this.requests.unshift(request);

    // Keep only last maxRequests
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(0, this.maxRequests);
    }
  }

  async stop() {
    // Remove webRequest listener
    if (this.webRequestListener && chrome.webRequest) {
      try {
        chrome.webRequest.onCompleted.removeListener(this.webRequestListener);
        this.webRequestListener = null;
      } catch (error) {
        console.error('Error removing webRequest listener:', error);
      }
    }

    this.isMonitoring = false;
    this.requests = [];
  }

  getLevel(): MonitoringLevel {
    return this.currentLevel;
  }

  isActive(): boolean {
    return this.isMonitoring;
  }

  getRequests(tabId?: number | number[]): NetworkRequest[] {
    if (tabId !== undefined) {
      if (Array.isArray(tabId)) {
        return this.requests.filter(r => r.tabId !== undefined && tabId.includes(r.tabId));
      }
      return this.requests.filter(r => r.tabId === tabId);
    }
    return [...this.requests];
  }

  clearRequests() {
    this.requests = [];
  }

  // Handle intercepted network data from content script
  handleInterceptedRequest(data: any, tabId?: number) {
    const request: NetworkRequest = {
      url: data.request.url,
      method: data.request.method,
      type: data.type, // 'fetch' or 'xhr'
      timestamp: data.request.timestamp,
      statusCode: data.response?.status,
      requestHeaders: data.request.headers,
      requestBody: data.request.body,
      responseHeaders: data.response?.headers,
      responseBody: data.response?.body,
      duration: data.duration,
      intercepted: true,
      tabId: tabId
    };

    this.handleRequest(request);
    console.log('[NetworkMonitor] Intercepted request from tab', tabId, ':', request.method, request.url,
      '| Has response headers:', !!request.responseHeaders,
      '| Has response body:', !!request.responseBody,
      '| Status:', request.statusCode);
  }

  getRequestSummary(tabId?: number | number[]): string {
    const requests = this.getRequests(tabId);
    console.log('[NetworkMonitor] getRequestSummary called with tabId:', tabId, '| Found', requests.length, 'requests');

    if (requests.length === 0) {
      return 'No network requests captured.';
    }

    // Separate intercepted requests (with full data) from webRequest-only
    const interceptedRequests = requests.filter(r => r.intercepted);
    const basicRequests = requests.filter(r => !r.intercepted);

    console.log('[NetworkMonitor] Intercepted requests:', interceptedRequests.length, '| Basic requests:', basicRequests.length);

    let summary = `=== Network Activity (${requests.length} requests, ${interceptedRequests.length} with full data) ===\n\n`;

    // Show intercepted requests with full details first
    if (interceptedRequests.length > 0) {
      summary += `== Requests with Full Request/Response Data ==\n\n`;

      interceptedRequests.slice(0, 20).forEach(req => {
        summary += `${req.method} ${req.url}\n`;
        summary += `  Status: ${req.statusCode || 'unknown'}\n`;
        if (req.duration) summary += `  Duration: ${req.duration}ms\n`;

        // Include request headers
        if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
          summary += `  Request Headers:\n`;
          Object.entries(req.requestHeaders).slice(0, 10).forEach(([key, value]) => {
            summary += `    ${key}: ${value}\n`;
          });
        }

        // Include request body (truncated)
        if (req.requestBody) {
          const bodyPreview = req.requestBody.length > 500
            ? req.requestBody.substring(0, 500) + '...[truncated]'
            : req.requestBody;
          summary += `  Request Body: ${bodyPreview}\n`;
        }

        // Include response headers
        if (req.responseHeaders && Object.keys(req.responseHeaders).length > 0) {
          summary += `  Response Headers:\n`;
          Object.entries(req.responseHeaders).slice(0, 10).forEach(([key, value]) => {
            summary += `    ${key}: ${value}\n`;
          });
        }

        // Include response body (truncated)
        if (req.responseBody) {
          const bodyPreview = req.responseBody.length > 2000
            ? req.responseBody.substring(0, 2000) + '...[truncated]'
            : req.responseBody;
          summary += `  Response Body: ${bodyPreview}\n`;
        }

        summary += '\n';
      });

      if (interceptedRequests.length > 20) {
        summary += `... and ${interceptedRequests.length - 20} more intercepted requests\n\n`;
      }
    }

    // Show basic requests (webRequest only) in grouped format
    if (basicRequests.length > 0) {
      summary += `== Additional Requests (metadata only) ==\n\n`;

      const byDomain = basicRequests.reduce((acc, req) => {
        try {
          const url = new URL(req.url);
          const domain = url.hostname;
          if (!acc[domain]) {
            acc[domain] = [];
          }
          acc[domain].push(req);
        } catch (e) {
          // Invalid URL
        }
        return acc;
      }, {} as Record<string, NetworkRequest[]>);

      Object.entries(byDomain).forEach(([domain, reqs]) => {
        summary += `${domain}: ${reqs.length} requests\n`;
        reqs.slice(0, 5).forEach(req => {
          summary += `  - ${req.method} ${req.url}\n`;
        });
        if (reqs.length > 5) {
          summary += `  ... and ${reqs.length - 5} more\n`;
        }
        summary += '\n';
      });
    }

    return summary;
  }
}

export const networkMonitor = new NetworkMonitor();
