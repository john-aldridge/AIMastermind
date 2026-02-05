/**
 * Advanced Debugging Settings Types
 *
 * Type definitions for Chrome DevTools Protocol debugging features:
 * - DOM Mutation Tracking (DOM/DOMDebugger)
 * - Memory Profiling (HeapProfiler)
 * - CPU Profiling (Profiler)
 * - Code Coverage (Profiler)
 *
 * All features require the `debugger` permission.
 */

// ============================================
// DOM Mutation Tracking
// ============================================
export interface DOMMutationSettings {
  enabled: boolean;
  trackElements: boolean;
  trackAttributes: boolean;
  trackText: boolean;
  trackStyles: boolean;
  scope: 'all' | 'selector';
  selector: string;
  throttleMs: number;
  maxMutations: number;
}

export const DEFAULT_DOM_SETTINGS: DOMMutationSettings = {
  enabled: false,
  trackElements: true,
  trackAttributes: true,
  trackText: true,
  trackStyles: false,
  scope: 'all',
  selector: '',
  throttleMs: 100,
  maxMutations: 1000,
};

// ============================================
// Memory Profiling
// ============================================
export interface MemoryProfilingSettings {
  enabled: boolean;
  mode: 'on-demand' | 'periodic' | 'sampling';
  periodicIntervalMin: number;
  trackAllocations: boolean;
  detectDetachedDOM: boolean;
  maxSnapshots: number;
  includeNumericValues: boolean;
}

export const DEFAULT_MEMORY_SETTINGS: MemoryProfilingSettings = {
  enabled: false,
  mode: 'on-demand',
  periodicIntervalMin: 5,
  trackAllocations: false,
  detectDetachedDOM: true,
  maxSnapshots: 5,
  includeNumericValues: false,
};

// ============================================
// CPU Profiling
// ============================================
export interface CPUProfilingSettings {
  enabled: boolean;
  mode: 'on-demand' | 'continuous' | 'triggered';
  samplingIntervalUs: number;
  includeNatives: boolean;
  maxDepth: number;
  triggerThresholdPercent: number;
  maxProfiles: number;
}

export const DEFAULT_CPU_SETTINGS: CPUProfilingSettings = {
  enabled: false,
  mode: 'on-demand',
  samplingIntervalUs: 1000,
  includeNatives: false,
  maxDepth: 50,
  triggerThresholdPercent: 80,
  maxProfiles: 5,
};

// ============================================
// Code Coverage
// ============================================
export interface CodeCoverageSettings {
  enabled: boolean;
  granularity: 'function' | 'block';
  mode: 'one-shot' | 'continuous';
  trackCallCounts: boolean;
  includeScriptsPattern: string;
  excludeScriptsPattern: string;
  reportUncovered: boolean;
}

export const DEFAULT_COVERAGE_SETTINGS: CodeCoverageSettings = {
  enabled: false,
  granularity: 'function',
  mode: 'one-shot',
  trackCallCounts: true,
  includeScriptsPattern: '.*',
  excludeScriptsPattern: '',
  reportUncovered: true,
};

// ============================================
// Network Capture (via Debugger)
// ============================================
export interface NetworkCaptureSettings {
  enabled: boolean;
  captureRequestBodies: boolean;
  captureResponseBodies: boolean;
  captureWebSockets: boolean;
  maxBodySize: number; // Max bytes to capture per body
  filterResourceTypes: NetworkResourceType[];
  includeUrlPattern: string;
  excludeUrlPattern: string;
  maxRequests: number;
}

export type NetworkResourceType =
  | 'document' | 'stylesheet' | 'image' | 'media' | 'font'
  | 'script' | 'texttrack' | 'xhr' | 'fetch' | 'eventsource'
  | 'websocket' | 'manifest' | 'other';

export const ALL_RESOURCE_TYPES: NetworkResourceType[] = [
  'document', 'stylesheet', 'image', 'media', 'font',
  'script', 'texttrack', 'xhr', 'fetch', 'eventsource',
  'websocket', 'manifest', 'other'
];

export const API_RESOURCE_TYPES: NetworkResourceType[] = [
  'xhr', 'fetch', 'eventsource', 'websocket'
];

export const DEFAULT_NETWORK_CAPTURE_SETTINGS: NetworkCaptureSettings = {
  enabled: false,
  captureRequestBodies: true,
  captureResponseBodies: true,
  captureWebSockets: true,
  maxBodySize: 1024 * 1024, // 1MB
  filterResourceTypes: API_RESOURCE_TYPES,
  includeUrlPattern: '.*',
  excludeUrlPattern: '',
  maxRequests: 500,
};

// ============================================
// Combined Settings
// ============================================
export interface AdvancedDebuggingSettings {
  dom: DOMMutationSettings;
  memory: MemoryProfilingSettings;
  cpu: CPUProfilingSettings;
  coverage: CodeCoverageSettings;
  network: NetworkCaptureSettings;
}

export const DEFAULT_ADVANCED_DEBUGGING_SETTINGS: AdvancedDebuggingSettings = {
  dom: DEFAULT_DOM_SETTINGS,
  memory: DEFAULT_MEMORY_SETTINGS,
  cpu: DEFAULT_CPU_SETTINGS,
  coverage: DEFAULT_COVERAGE_SETTINGS,
  network: DEFAULT_NETWORK_CAPTURE_SETTINGS,
};

// ============================================
// Data Types for captured results
// ============================================

export interface DOMMutation {
  id: string;
  timestamp: number;
  tabId: number;
  type: 'childList' | 'attributes' | 'characterData' | 'style';
  targetSelector: string;
  targetNodeName: string;
  attributeName?: string;
  oldValue?: string;
  newValue?: string;
  addedNodes?: string[];
  removedNodes?: string[];
}

export interface HeapSnapshot {
  id: string;
  timestamp: number;
  tabId: number;
  sizeBytes: number;
  nodeCount: number;
  edgeCount: number;
  detachedDOMNodes?: number;
  data?: string; // JSON string of full snapshot (can be large)
}

export interface AllocationProfile {
  id: string;
  timestamp: number;
  tabId: number;
  durationMs: number;
  allocations: Array<{
    functionName: string;
    scriptName: string;
    lineNumber: number;
    columnNumber: number;
    size: number;
    count: number;
  }>;
}

export interface SnapshotDiff {
  addedObjects: number;
  removedObjects: number;
  sizeChange: number;
  topGrowingTypes: Array<{
    type: string;
    sizeDelta: number;
    countDelta: number;
  }>;
}

export interface CPUProfile {
  id: string;
  timestamp: number;
  tabId: number;
  durationMs: number;
  samples: number;
  topFunctions: Array<{
    functionName: string;
    scriptName: string;
    lineNumber: number;
    selfTime: number;
    totalTime: number;
    hitCount: number;
  }>;
  data?: any; // Full profile data
}

export interface CoverageReport {
  id: string;
  timestamp: number;
  tabId: number;
  scripts: Array<{
    scriptId: string;
    url: string;
    functions: Array<{
      functionName: string;
      ranges: Array<{
        startOffset: number;
        endOffset: number;
        count: number;
      }>;
      isBlockCoverage: boolean;
    }>;
    coveredBytes: number;
    totalBytes: number;
    coveragePercent: number;
  }>;
  totalCoveredBytes: number;
  totalBytes: number;
  overallCoveragePercent: number;
}

// ============================================
// Network Capture Data Types
// ============================================
export interface CapturedNetworkRequest {
  id: string;
  requestId: string;
  tabId: number;
  timestamp: number;
  url: string;
  method: string;
  resourceType: NetworkResourceType;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  requestBodyTruncated?: boolean;
  responseStatusCode?: number;
  responseStatusText?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseBodyTruncated?: boolean;
  responseBodyBase64?: boolean;
  mimeType?: string;
  timing?: {
    requestTime: number;
    dnsStart: number;
    dnsEnd: number;
    connectStart: number;
    connectEnd: number;
    sslStart: number;
    sslEnd: number;
    sendStart: number;
    sendEnd: number;
    receiveHeadersEnd: number;
  };
  fromCache?: boolean;
  fromServiceWorker?: boolean;
  error?: string;
  completed: boolean;
}

export interface WebSocketFrame {
  id: string;
  requestId: string;
  tabId: number;
  timestamp: number;
  url: string;
  opcode: number; // 1 = text, 2 = binary
  direction: 'incoming' | 'outgoing';
  data: string;
  dataTruncated?: boolean;
}

export function getNetworkCapturePerformanceImpact(settings: NetworkCaptureSettings): PerformanceImpact {
  if (!settings.enabled) return 'low';
  if (settings.captureResponseBodies && settings.filterResourceTypes.length > 4) return 'high';
  if (settings.captureResponseBodies) return 'moderate';
  return 'low';
}

// ============================================
// Performance impact levels for UI display
// ============================================
export type PerformanceImpact = 'low' | 'moderate' | 'high';

export function getDOMPerformanceImpact(settings: DOMMutationSettings): PerformanceImpact {
  if (!settings.enabled) return 'low';
  if (settings.trackStyles) return 'high';
  if (settings.scope === 'all' && settings.throttleMs < 50) return 'moderate';
  return 'low';
}

export function getMemoryPerformanceImpact(settings: MemoryProfilingSettings): PerformanceImpact {
  if (!settings.enabled) return 'low';
  if (settings.mode === 'sampling' || settings.trackAllocations) return 'moderate';
  return 'low';
}

export function getCPUPerformanceImpact(settings: CPUProfilingSettings): PerformanceImpact {
  if (!settings.enabled) return 'low';
  if (settings.mode === 'continuous') return 'moderate';
  if (settings.samplingIntervalUs < 500) return 'moderate';
  return 'low';
}

export function getCoveragePerformanceImpact(settings: CodeCoverageSettings): PerformanceImpact {
  if (!settings.enabled) return 'low';
  if (settings.granularity === 'block') return 'high';
  if (settings.mode === 'continuous') return 'moderate';
  return 'moderate';
}
