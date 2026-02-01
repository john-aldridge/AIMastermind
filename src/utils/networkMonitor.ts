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
}

export const MONITORING_LEVELS: Record<MonitoringLevel, MonitoringConfig> = {
  'filtering-only': {
    level: 'filtering-only',
    description: 'Content Filtering (Built-in)',
    permissions: [],
    features: [
      'Block trackers & ads (declarativeNetRequest)',
      'Filter content with rules',
      'Native performance (no overhead)',
      'No request observation'
    ],
    performance: 'excellent',
    note: 'Always available - uses declarativeNetRequest for efficient filtering'
  },
  'api-monitoring': {
    level: 'api-monitoring',
    description: 'API Monitoring + Filtering - Recommended',
    permissions: ['webRequest'],
    features: [
      'All filtering capabilities',
      'Observe API calls (XHR/Fetch)',
      'Include API data in chat context',
      'Network timing analysis'
    ],
    performance: 'good',
    note: 'Best balance: filtering + API observation for AI analysis'
  },
  'full-monitoring': {
    level: 'full-monitoring',
    description: 'Complete Monitoring + Filtering',
    permissions: ['webRequest'],
    features: [
      'All filtering capabilities',
      'Observe all requests (images, CSS, scripts, etc.)',
      'Complete headers & response data',
      'Full network timeline'
    ],
    performance: 'moderate',
    note: 'Maximum visibility - captures everything for comprehensive analysis'
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

  getRequests(tabId?: number): NetworkRequest[] {
    if (tabId !== undefined) {
      return this.requests.filter(r => r.tabId === tabId);
    }
    return [...this.requests];
  }

  clearRequests() {
    this.requests = [];
  }

  getRequestSummary(tabId?: number): string {
    const requests = this.getRequests(tabId);
    if (requests.length === 0) {
      return 'No network requests captured.';
    }

    // Group by domain
    const byDomain = requests.reduce((acc, req) => {
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

    let summary = `=== Network Activity (${requests.length} requests) ===\n\n`;

    Object.entries(byDomain).forEach(([domain, reqs]) => {
      summary += `${domain}: ${reqs.length} requests\n`;
      // Show first 5 URLs per domain
      reqs.slice(0, 5).forEach(req => {
        summary += `  - ${req.method} ${req.url}\n`;
      });
      if (reqs.length > 5) {
        summary += `  ... and ${reqs.length - 5} more\n`;
      }
      summary += '\n';
    });

    return summary;
  }
}

export const networkMonitor = new NetworkMonitor();
