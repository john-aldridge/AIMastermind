/**
 * Advanced Debugger Service
 *
 * Provides Chrome DevTools Protocol integration for advanced debugging features:
 * - DOM Mutation Tracking (DOM/DOMDebugger domains)
 * - Memory Profiling (HeapProfiler domain)
 * - CPU Profiling (Profiler domain)
 * - Code Coverage (Profiler domain)
 *
 * All features require the `debugger` permission in manifest.json
 */

import {
  AdvancedDebuggingSettings,
  DEFAULT_ADVANCED_DEBUGGING_SETTINGS,
  DOMMutation,
  HeapSnapshot,
  AllocationProfile,
  SnapshotDiff,
  CPUProfile,
  CoverageReport,
  CapturedNetworkRequest,
  WebSocketFrame,
  NetworkResourceType,
} from '@/types/advancedDebugging';

const STORAGE_KEY = 'advancedDebuggingSettings';

type SettingsSubscriber = (settings: AdvancedDebuggingSettings) => void;

class AdvancedDebuggerServiceClass {
  private settings: AdvancedDebuggingSettings = DEFAULT_ADVANCED_DEBUGGING_SETTINGS;
  private subscribers: Set<SettingsSubscriber> = new Set();
  private isInitialized = false;

  // Tab-specific state
  private attachedTabs: Set<number> = new Set();
  private domMutations: Map<number, DOMMutation[]> = new Map();
  private heapSnapshots: Map<number, HeapSnapshot[]> = new Map();
  private cpuProfiles: Map<number, CPUProfile[]> = new Map();
  private coverageReports: Map<number, CoverageReport[]> = new Map();

  // Active operations tracking
  private activeAllocationTracking: Set<number> = new Set();
  private activeCPUProfiling: Set<number> = new Set();
  private activeCoverage: Set<number> = new Set();
  private activeDOMTracking: Set<number> = new Set();
  private activeNetworkCapture: Set<number> = new Set();

  // Network capture data
  private networkRequests: Map<number, CapturedNetworkRequest[]> = new Map();
  private webSocketFrames: Map<number, WebSocketFrame[]> = new Map();
  private pendingRequests: Map<string, CapturedNetworkRequest> = new Map(); // requestId -> request

  // Periodic intervals
  private periodicMemoryIntervals: Map<number, ReturnType<typeof setInterval>> = new Map();

  // Mutation batching - reserved for future throttle implementation
  // private mutationBatches: Map<number, DOMMutation[]> = new Map();
  private mutationBatchTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();

  constructor() {
    this.loadSettings();
  }

  // ============================================
  // Settings Management
  // ============================================

  private async loadSettings(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data[STORAGE_KEY]) {
        // Merge with defaults to handle new options
        this.settings = this.mergeWithDefaults(data[STORAGE_KEY]);
      }
      this.isInitialized = true;
      console.log('[AdvancedDebugger] Settings loaded:', this.settings);
    } catch (error) {
      console.error('[AdvancedDebugger] Error loading settings:', error);
      this.isInitialized = true;
    }
  }

  private mergeWithDefaults(stored: Partial<AdvancedDebuggingSettings>): AdvancedDebuggingSettings {
    return {
      dom: { ...DEFAULT_ADVANCED_DEBUGGING_SETTINGS.dom, ...stored.dom },
      memory: { ...DEFAULT_ADVANCED_DEBUGGING_SETTINGS.memory, ...stored.memory },
      cpu: { ...DEFAULT_ADVANCED_DEBUGGING_SETTINGS.cpu, ...stored.cpu },
      coverage: { ...DEFAULT_ADVANCED_DEBUGGING_SETTINGS.coverage, ...stored.coverage },
      network: { ...DEFAULT_ADVANCED_DEBUGGING_SETTINGS.network, ...stored.network },
    };
  }

  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: this.settings });
      this.notifySubscribers();
    } catch (error) {
      console.error('[AdvancedDebugger] Error saving settings:', error);
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(cb => cb(this.settings));
  }

  async getSettings(): Promise<AdvancedDebuggingSettings> {
    // Wait for initialization if needed
    if (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { ...this.settings };
  }

  async updateSettings(partial: Partial<AdvancedDebuggingSettings>): Promise<void> {
    this.settings = {
      dom: partial.dom ? { ...this.settings.dom, ...partial.dom } : this.settings.dom,
      memory: partial.memory ? { ...this.settings.memory, ...partial.memory } : this.settings.memory,
      cpu: partial.cpu ? { ...this.settings.cpu, ...partial.cpu } : this.settings.cpu,
      coverage: partial.coverage ? { ...this.settings.coverage, ...partial.coverage } : this.settings.coverage,
      network: partial.network ? { ...this.settings.network, ...partial.network } : this.settings.network,
    };
    await this.saveSettings();
  }

  async resetSettings(): Promise<void> {
    this.settings = { ...DEFAULT_ADVANCED_DEBUGGING_SETTINGS };
    await this.saveSettings();
  }

  subscribe(callback: SettingsSubscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // ============================================
  // Debugger Permission Check
  // ============================================

  async hasDebuggerPermission(): Promise<boolean> {
    try {
      return !!chrome.debugger;
    } catch {
      return false;
    }
  }

  // ============================================
  // Tab Attachment Management
  // ============================================

  private async ensureAttached(tabId: number): Promise<boolean> {
    if (this.attachedTabs.has(tabId)) return true;

    try {
      await chrome.debugger.attach({ tabId }, '1.3');
      this.attachedTabs.add(tabId);
      console.log(`[AdvancedDebugger] Attached to tab ${tabId}`);

      // Setup detach listener
      chrome.debugger.onDetach.addListener((source) => {
        if (source.tabId === tabId) {
          this.handleTabDetach(tabId);
        }
      });

      return true;
    } catch (error: any) {
      if (error.message?.includes('Another debugger is already attached')) {
        // Already attached by console monitor, consider it attached
        this.attachedTabs.add(tabId);
        return true;
      }
      console.error(`[AdvancedDebugger] Failed to attach to tab ${tabId}:`, error);
      return false;
    }
  }

  private handleTabDetach(tabId: number): void {
    this.attachedTabs.delete(tabId);
    this.activeDOMTracking.delete(tabId);
    this.activeAllocationTracking.delete(tabId);
    this.activeCPUProfiling.delete(tabId);
    this.activeCoverage.delete(tabId);
    this.activeNetworkCapture.delete(tabId);

    // Clear periodic intervals
    const memInterval = this.periodicMemoryIntervals.get(tabId);
    if (memInterval) {
      clearInterval(memInterval);
      this.periodicMemoryIntervals.delete(tabId);
    }

    // Clear mutation batch timers
    const batchTimer = this.mutationBatchTimers.get(tabId);
    if (batchTimer) {
      clearTimeout(batchTimer);
      this.mutationBatchTimers.delete(tabId);
    }

    // Clear pending network requests for this tab
    for (const [requestId, request] of this.pendingRequests) {
      if (request.tabId === tabId) {
        this.pendingRequests.delete(requestId);
      }
    }
  }

  // ============================================
  // DOM Mutation Tracking
  // ============================================

  async startDOMTracking(tabId: number): Promise<void> {
    if (!this.settings.dom.enabled) {
      throw new Error('DOM tracking is not enabled in settings');
    }

    if (!(await this.ensureAttached(tabId))) {
      throw new Error('Failed to attach debugger');
    }

    try {
      // Enable DOM domain
      await chrome.debugger.sendCommand({ tabId }, 'DOM.enable');

      // Get the document root
      const doc: any = await chrome.debugger.sendCommand({ tabId }, 'DOM.getDocument', {
        depth: -1,
        pierce: true,
      });

      // Determine which node to track
      let nodeId = doc.root.nodeId;
      if (this.settings.dom.scope === 'selector' && this.settings.dom.selector) {
        try {
          const result: any = await chrome.debugger.sendCommand({ tabId }, 'DOM.querySelector', {
            nodeId: doc.root.nodeId,
            selector: this.settings.dom.selector,
          });
          if (result.nodeId) {
            nodeId = result.nodeId;
          }
        } catch {
          console.warn(`[AdvancedDebugger] Selector "${this.settings.dom.selector}" not found, tracking all elements`);
        }
      }

      // Enable DOMDebugger for specific mutation types
      if (this.settings.dom.trackElements) {
        await chrome.debugger.sendCommand({ tabId }, 'DOMDebugger.setDOMBreakpoint', {
          nodeId,
          type: 'subtree-modified',
        });
      }
      if (this.settings.dom.trackAttributes) {
        await chrome.debugger.sendCommand({ tabId }, 'DOMDebugger.setDOMBreakpoint', {
          nodeId,
          type: 'attribute-modified',
        });
      }

      // Setup event listener for mutations
      this.setupDOMMutationListener(tabId);
      this.activeDOMTracking.add(tabId);

      // Initialize storage
      if (!this.domMutations.has(tabId)) {
        this.domMutations.set(tabId, []);
      }

      console.log(`[AdvancedDebugger] DOM tracking started for tab ${tabId}`);
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to start DOM tracking:', error);
      throw error;
    }
  }

  private setupDOMMutationListener(tabId: number): void {
    // This would listen for DOM.childNodeCountUpdated, DOM.childNodeInserted, etc.
    // In practice, we need to use a MutationObserver in the page context
    // Here we'll inject a script to observe mutations and report back

    const observerScript = `
      (function() {
        if (window.__SYNERGY_DOM_OBSERVER__) {
          window.__SYNERGY_DOM_OBSERVER__.disconnect();
        }

        const config = ${JSON.stringify({
          childList: this.settings.dom.trackElements,
          attributes: this.settings.dom.trackAttributes,
          characterData: this.settings.dom.trackText,
          subtree: true,
          attributeOldValue: true,
          characterDataOldValue: true,
        })};

        const throttleMs = ${this.settings.dom.throttleMs};
        let pending = [];
        let timer = null;

        const flush = () => {
          if (pending.length === 0) return;
          const mutations = pending.slice();
          pending = [];
          console.log('[__SYNERGY_DOM_MUTATION__]', JSON.stringify(mutations));
        };

        const getSelector = (el) => {
          if (!el || !el.tagName) return '';
          let selector = el.tagName.toLowerCase();
          if (el.id) selector += '#' + el.id;
          else if (el.className && typeof el.className === 'string') {
            selector += '.' + el.className.trim().split(/\\s+/).join('.');
          }
          return selector;
        };

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            const entry = {
              type: mutation.type,
              target: getSelector(mutation.target),
              nodeName: mutation.target.nodeName,
            };

            if (mutation.type === 'attributes') {
              entry.attributeName = mutation.attributeName;
              entry.oldValue = mutation.oldValue;
              entry.newValue = mutation.target.getAttribute(mutation.attributeName);
            } else if (mutation.type === 'characterData') {
              entry.oldValue = mutation.oldValue;
              entry.newValue = mutation.target.textContent;
            } else if (mutation.type === 'childList') {
              entry.addedNodes = Array.from(mutation.addedNodes).map(n => getSelector(n) || n.nodeName);
              entry.removedNodes = Array.from(mutation.removedNodes).map(n => getSelector(n) || n.nodeName);
            }

            pending.push(entry);
          }

          if (throttleMs === 0) {
            flush();
          } else {
            if (!timer) {
              timer = setTimeout(() => {
                timer = null;
                flush();
              }, throttleMs);
            }
          }
        });

        const targetSelector = ${JSON.stringify(this.settings.dom.scope === 'selector' ? this.settings.dom.selector : null)};
        const target = targetSelector ? document.querySelector(targetSelector) : document.body;

        if (target) {
          observer.observe(target, config);
          window.__SYNERGY_DOM_OBSERVER__ = observer;
          console.log('[Synergy] DOM mutation observer installed');
        }
      })();
    `;

    chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
      expression: observerScript,
      allowUnsafeEvalBlockedByCSP: true,
    }).catch(error => {
      console.warn('[AdvancedDebugger] Failed to inject DOM observer:', error);
    });
  }

  async stopDOMTracking(tabId: number): Promise<void> {
    if (!this.activeDOMTracking.has(tabId)) return;

    try {
      // Disconnect the observer in the page
      await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: `
          if (window.__SYNERGY_DOM_OBSERVER__) {
            window.__SYNERGY_DOM_OBSERVER__.disconnect();
            window.__SYNERGY_DOM_OBSERVER__ = null;
          }
        `,
      });

      this.activeDOMTracking.delete(tabId);
      console.log(`[AdvancedDebugger] DOM tracking stopped for tab ${tabId}`);
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to stop DOM tracking:', error);
    }
  }

  getDOMMutations(tabId: number, options?: { since?: number }): DOMMutation[] {
    let mutations = this.domMutations.get(tabId) || [];
    if (options?.since) {
      mutations = mutations.filter(m => m.timestamp >= options.since!);
    }
    return mutations;
  }

  clearDOMMutations(tabId: number): void {
    this.domMutations.set(tabId, []);
  }

  // Internal method to add mutations from the page observer
  addDOMMutation(tabId: number, mutation: Omit<DOMMutation, 'id' | 'timestamp' | 'tabId'>): void {
    const mutations = this.domMutations.get(tabId) || [];
    mutations.push({
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      tabId,
    });

    // Trim if over limit
    if (mutations.length > this.settings.dom.maxMutations) {
      mutations.splice(0, mutations.length - this.settings.dom.maxMutations);
    }

    this.domMutations.set(tabId, mutations);
  }

  // ============================================
  // Memory Profiling
  // ============================================

  async takeHeapSnapshot(tabId: number): Promise<HeapSnapshot> {
    if (!(await this.ensureAttached(tabId))) {
      throw new Error('Failed to attach debugger');
    }

    try {
      // Enable HeapProfiler domain
      await chrome.debugger.sendCommand({ tabId }, 'HeapProfiler.enable');

      // Collect garbage first for accurate snapshot
      await chrome.debugger.sendCommand({ tabId }, 'HeapProfiler.collectGarbage');

      // Take snapshot
      let snapshotData = '';
      const chunkHandler = (source: any, method: string, params: any) => {
        if (source.tabId === tabId && method === 'HeapProfiler.addHeapSnapshotChunk') {
          snapshotData += params.chunk;
        }
      };

      chrome.debugger.onEvent.addListener(chunkHandler);

      await chrome.debugger.sendCommand({ tabId }, 'HeapProfiler.takeHeapSnapshot', {
        reportProgress: false,
        treatGlobalObjectsAsRoots: true,
        captureNumericValue: this.settings.memory.includeNumericValues,
      });

      chrome.debugger.onEvent.removeListener(chunkHandler);

      // Parse basic stats from snapshot
      let nodeCount = 0;
      let edgeCount = 0;
      let sizeBytes = 0;
      let detachedDOMNodes = 0;

      try {
        const snapshotJson = JSON.parse(snapshotData);
        nodeCount = snapshotJson.nodes?.length / snapshotJson.snapshot?.meta?.node_fields?.length || 0;
        edgeCount = snapshotJson.edges?.length / snapshotJson.snapshot?.meta?.edge_fields?.length || 0;

        // Detect detached DOM nodes if enabled
        if (this.settings.memory.detectDetachedDOM && snapshotJson.strings) {
          const detachedIndex = snapshotJson.strings.indexOf('Detached');
          if (detachedIndex >= 0) {
            // Count nodes with "Detached" in their name
            const nodeFields = snapshotJson.snapshot?.meta?.node_fields || [];
            const nameIndex = nodeFields.indexOf('name');
            const nodeFieldCount = nodeFields.length;

            for (let i = 0; i < snapshotJson.nodes.length; i += nodeFieldCount) {
              const nameStringIndex = snapshotJson.nodes[i + nameIndex];
              const name = snapshotJson.strings[nameStringIndex] || '';
              if (name.startsWith('Detached')) {
                detachedDOMNodes++;
              }
            }
          }
        }

        sizeBytes = snapshotData.length; // Approximate
      } catch {
        // Failed to parse, just store raw data
      }

      const snapshot: HeapSnapshot = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        tabId,
        sizeBytes,
        nodeCount,
        edgeCount,
        detachedDOMNodes,
        data: snapshotData.length < 10_000_000 ? snapshotData : undefined, // Only store if < 10MB
      };

      // Store snapshot
      const snapshots = this.heapSnapshots.get(tabId) || [];
      snapshots.push(snapshot);

      // Trim old snapshots
      if (snapshots.length > this.settings.memory.maxSnapshots) {
        snapshots.splice(0, snapshots.length - this.settings.memory.maxSnapshots);
      }

      this.heapSnapshots.set(tabId, snapshots);

      console.log(`[AdvancedDebugger] Heap snapshot taken for tab ${tabId}: ${nodeCount} nodes, ${edgeCount} edges`);
      return snapshot;
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to take heap snapshot:', error);
      throw error;
    }
  }

  async startAllocationTracking(tabId: number): Promise<void> {
    if (!this.settings.memory.trackAllocations) {
      throw new Error('Allocation tracking is not enabled in settings');
    }

    if (!(await this.ensureAttached(tabId))) {
      throw new Error('Failed to attach debugger');
    }

    try {
      await chrome.debugger.sendCommand({ tabId }, 'HeapProfiler.enable');
      await chrome.debugger.sendCommand({ tabId }, 'HeapProfiler.startTrackingHeapObjects', {
        trackAllocations: true,
      });

      this.activeAllocationTracking.add(tabId);
      console.log(`[AdvancedDebugger] Allocation tracking started for tab ${tabId}`);
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to start allocation tracking:', error);
      throw error;
    }
  }

  async stopAllocationTracking(tabId: number): Promise<AllocationProfile> {
    if (!this.activeAllocationTracking.has(tabId)) {
      throw new Error('Allocation tracking is not active for this tab');
    }

    try {
      await chrome.debugger.sendCommand({ tabId }, 'HeapProfiler.stopTrackingHeapObjects', {
        reportProgress: false,
      });

      this.activeAllocationTracking.delete(tabId);

      // Parse allocation profile
      const profile: AllocationProfile = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        tabId,
        durationMs: 0, // Would need to track start time
        allocations: [], // Would need to parse from result
      };

      console.log(`[AdvancedDebugger] Allocation tracking stopped for tab ${tabId}`);
      return profile;
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to stop allocation tracking:', error);
      throw error;
    }
  }

  getHeapSnapshots(tabId: number): HeapSnapshot[] {
    return this.heapSnapshots.get(tabId) || [];
  }

  compareSnapshots(_snapshotA: string, _snapshotB: string): SnapshotDiff {
    // This would require parsing both snapshots and comparing
    // Simplified implementation - full implementation would parse JSON and diff
    return {
      addedObjects: 0,
      removedObjects: 0,
      sizeChange: 0,
      topGrowingTypes: [],
    };
  }

  // Start periodic memory snapshots
  async startPeriodicMemoryProfiling(tabId: number): Promise<void> {
    if (this.settings.memory.mode !== 'periodic') {
      throw new Error('Memory profiling mode is not set to periodic');
    }

    if (this.periodicMemoryIntervals.has(tabId)) {
      console.log(`[AdvancedDebugger] Periodic memory profiling already active for tab ${tabId}`);
      return;
    }

    const intervalMs = this.settings.memory.periodicIntervalMin * 60 * 1000;
    const interval = setInterval(() => {
      this.takeHeapSnapshot(tabId).catch(error => {
        console.error('[AdvancedDebugger] Periodic snapshot failed:', error);
      });
    }, intervalMs);

    this.periodicMemoryIntervals.set(tabId, interval);

    // Take initial snapshot
    await this.takeHeapSnapshot(tabId);

    console.log(`[AdvancedDebugger] Periodic memory profiling started for tab ${tabId} (every ${this.settings.memory.periodicIntervalMin} min)`);
  }

  stopPeriodicMemoryProfiling(tabId: number): void {
    const interval = this.periodicMemoryIntervals.get(tabId);
    if (interval) {
      clearInterval(interval);
      this.periodicMemoryIntervals.delete(tabId);
      console.log(`[AdvancedDebugger] Periodic memory profiling stopped for tab ${tabId}`);
    }
  }

  // ============================================
  // CPU Profiling
  // ============================================

  async startCPUProfile(tabId: number): Promise<void> {
    if (!this.settings.cpu.enabled) {
      throw new Error('CPU profiling is not enabled in settings');
    }

    if (!(await this.ensureAttached(tabId))) {
      throw new Error('Failed to attach debugger');
    }

    try {
      await chrome.debugger.sendCommand({ tabId }, 'Profiler.enable');
      await chrome.debugger.sendCommand({ tabId }, 'Profiler.setSamplingInterval', {
        interval: this.settings.cpu.samplingIntervalUs,
      });
      await chrome.debugger.sendCommand({ tabId }, 'Profiler.start');

      this.activeCPUProfiling.add(tabId);
      console.log(`[AdvancedDebugger] CPU profiling started for tab ${tabId}`);
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to start CPU profiling:', error);
      throw error;
    }
  }

  async stopCPUProfile(tabId: number): Promise<CPUProfile> {
    if (!this.activeCPUProfiling.has(tabId)) {
      throw new Error('CPU profiling is not active for this tab');
    }

    try {
      const result: any = await chrome.debugger.sendCommand({ tabId }, 'Profiler.stop');
      this.activeCPUProfiling.delete(tabId);

      // Parse profile data
      const profileData = result.profile;
      const topFunctions: CPUProfile['topFunctions'] = [];

      if (profileData?.nodes) {
        // Build a map of function times
        const functionTimes = new Map<string, { selfTime: number; totalTime: number; hitCount: number; scriptName: string; lineNumber: number }>();

        for (const node of profileData.nodes) {
          const callFrame = node.callFrame;
          if (!callFrame) continue;

          const key = `${callFrame.functionName}@${callFrame.url}:${callFrame.lineNumber}`;
          const existing = functionTimes.get(key) || {
            selfTime: 0,
            totalTime: 0,
            hitCount: 0,
            scriptName: callFrame.url,
            lineNumber: callFrame.lineNumber,
          };

          existing.hitCount += node.hitCount || 0;
          functionTimes.set(key, existing);
        }

        // Sort by hit count and take top entries
        const sorted = Array.from(functionTimes.entries())
          .sort((a, b) => b[1].hitCount - a[1].hitCount)
          .slice(0, 20);

        for (const [key, data] of sorted) {
          const functionName = key.split('@')[0] || '(anonymous)';
          topFunctions.push({
            functionName,
            scriptName: data.scriptName,
            lineNumber: data.lineNumber,
            selfTime: data.selfTime,
            totalTime: data.totalTime,
            hitCount: data.hitCount,
          });
        }
      }

      const profile: CPUProfile = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        tabId,
        durationMs: profileData?.endTime - profileData?.startTime || 0,
        samples: profileData?.samples?.length || 0,
        topFunctions,
        data: profileData,
      };

      // Store profile
      const profiles = this.cpuProfiles.get(tabId) || [];
      profiles.push(profile);

      // Trim old profiles
      if (profiles.length > this.settings.cpu.maxProfiles) {
        profiles.splice(0, profiles.length - this.settings.cpu.maxProfiles);
      }

      this.cpuProfiles.set(tabId, profiles);

      console.log(`[AdvancedDebugger] CPU profile captured for tab ${tabId}: ${profile.samples} samples`);
      return profile;
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to stop CPU profiling:', error);
      throw error;
    }
  }

  getCPUProfiles(tabId: number): CPUProfile[] {
    return this.cpuProfiles.get(tabId) || [];
  }

  // ============================================
  // Code Coverage
  // ============================================

  async startCoverage(tabId: number): Promise<void> {
    if (!this.settings.coverage.enabled) {
      throw new Error('Code coverage is not enabled in settings');
    }

    if (!(await this.ensureAttached(tabId))) {
      throw new Error('Failed to attach debugger');
    }

    try {
      await chrome.debugger.sendCommand({ tabId }, 'Profiler.enable');
      await chrome.debugger.sendCommand({ tabId }, 'Profiler.startPreciseCoverage', {
        callCount: this.settings.coverage.trackCallCounts,
        detailed: this.settings.coverage.granularity === 'block',
      });

      this.activeCoverage.add(tabId);
      console.log(`[AdvancedDebugger] Code coverage started for tab ${tabId}`);
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to start code coverage:', error);
      throw error;
    }
  }

  async takeCoverageSnapshot(tabId: number): Promise<CoverageReport> {
    if (!this.activeCoverage.has(tabId)) {
      throw new Error('Code coverage is not active for this tab');
    }

    try {
      const result: any = await chrome.debugger.sendCommand({ tabId }, 'Profiler.takePreciseCoverage');

      const includePattern = new RegExp(this.settings.coverage.includeScriptsPattern || '.*');
      const excludePattern = this.settings.coverage.excludeScriptsPattern
        ? new RegExp(this.settings.coverage.excludeScriptsPattern)
        : null;

      const scripts: CoverageReport['scripts'] = [];
      let totalCoveredBytes = 0;
      let totalBytes = 0;

      for (const script of result.result || []) {
        const url = script.url || '';

        // Apply filters
        if (!includePattern.test(url)) continue;
        if (excludePattern && excludePattern.test(url)) continue;

        const functions: CoverageReport['scripts'][0]['functions'] = [];
        let scriptCoveredBytes = 0;
        let scriptTotalBytes = 0;

        for (const func of script.functions || []) {
          const ranges: CoverageReport['scripts'][0]['functions'][0]['ranges'] = [];

          for (const range of func.ranges || []) {
            const rangeSize = range.endOffset - range.startOffset;
            scriptTotalBytes += rangeSize;
            if (range.count > 0) {
              scriptCoveredBytes += rangeSize;
            }

            if (this.settings.coverage.reportUncovered || range.count > 0) {
              ranges.push({
                startOffset: range.startOffset,
                endOffset: range.endOffset,
                count: range.count,
              });
            }
          }

          if (ranges.length > 0 || this.settings.coverage.reportUncovered) {
            functions.push({
              functionName: func.functionName || '(anonymous)',
              ranges,
              isBlockCoverage: func.isBlockCoverage || false,
            });
          }
        }

        if (functions.length > 0) {
          scripts.push({
            scriptId: script.scriptId,
            url,
            functions,
            coveredBytes: scriptCoveredBytes,
            totalBytes: scriptTotalBytes,
            coveragePercent: scriptTotalBytes > 0 ? (scriptCoveredBytes / scriptTotalBytes) * 100 : 0,
          });
        }

        totalCoveredBytes += scriptCoveredBytes;
        totalBytes += scriptTotalBytes;
      }

      const report: CoverageReport = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        tabId,
        scripts,
        totalCoveredBytes,
        totalBytes,
        overallCoveragePercent: totalBytes > 0 ? (totalCoveredBytes / totalBytes) * 100 : 0,
      };

      // Store report
      const reports = this.coverageReports.get(tabId) || [];
      reports.push(report);

      // Keep last 10 reports
      if (reports.length > 10) {
        reports.splice(0, reports.length - 10);
      }

      this.coverageReports.set(tabId, reports);

      console.log(`[AdvancedDebugger] Coverage snapshot: ${report.overallCoveragePercent.toFixed(1)}% covered`);
      return report;
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to take coverage snapshot:', error);
      throw error;
    }
  }

  async stopCoverage(tabId: number): Promise<CoverageReport> {
    const report = await this.takeCoverageSnapshot(tabId);

    try {
      await chrome.debugger.sendCommand({ tabId }, 'Profiler.stopPreciseCoverage');
      this.activeCoverage.delete(tabId);
      console.log(`[AdvancedDebugger] Code coverage stopped for tab ${tabId}`);
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to stop coverage:', error);
    }

    return report;
  }

  getCoverageReports(tabId: number): CoverageReport[] {
    return this.coverageReports.get(tabId) || [];
  }

  // ============================================
  // Network Capture (Debugger-based)
  // ============================================

  async startNetworkCapture(tabId: number): Promise<void> {
    if (!this.settings.network.enabled) {
      throw new Error('Network capture is not enabled in settings');
    }

    if (!(await this.ensureAttached(tabId))) {
      throw new Error('Failed to attach debugger');
    }

    try {
      // Enable Network domain
      await chrome.debugger.sendCommand({ tabId }, 'Network.enable', {
        maxTotalBufferSize: 100 * 1024 * 1024, // 100MB buffer
        maxResourceBufferSize: 10 * 1024 * 1024, // 10MB per resource
      });

      // Setup event listeners
      this.setupNetworkEventListeners(tabId);

      this.activeNetworkCapture.add(tabId);

      // Initialize storage
      if (!this.networkRequests.has(tabId)) {
        this.networkRequests.set(tabId, []);
      }
      if (!this.webSocketFrames.has(tabId)) {
        this.webSocketFrames.set(tabId, []);
      }

      console.log(`[AdvancedDebugger] Network capture started for tab ${tabId}`);
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to start network capture:', error);
      throw error;
    }
  }

  private setupNetworkEventListeners(_tabId: number): void {
    // The debugger.onEvent listener is shared, so we handle events in a central handler
    // We'll set up the listener once and filter by tabId
    if (!this.networkEventListenerSetup) {
      this.networkEventListenerSetup = true;

      chrome.debugger.onEvent.addListener((source, method, params: any) => {
        const eventTabId = source.tabId;
        if (!eventTabId || !this.activeNetworkCapture.has(eventTabId)) return;

        switch (method) {
          case 'Network.requestWillBeSent':
            this.handleNetworkRequestWillBeSent(eventTabId, params);
            break;
          case 'Network.responseReceived':
            this.handleNetworkResponseReceived(eventTabId, params);
            break;
          case 'Network.loadingFinished':
            this.handleNetworkLoadingFinished(eventTabId, params);
            break;
          case 'Network.loadingFailed':
            this.handleNetworkLoadingFailed(eventTabId, params);
            break;
          case 'Network.webSocketCreated':
            this.handleWebSocketCreated(eventTabId, params);
            break;
          case 'Network.webSocketFrameSent':
            this.handleWebSocketFrameSent(eventTabId, params);
            break;
          case 'Network.webSocketFrameReceived':
            this.handleWebSocketFrameReceived(eventTabId, params);
            break;
          case 'Network.webSocketClosed':
            this.handleWebSocketClosed(eventTabId, params);
            break;
        }
      });
    }
  }

  private networkEventListenerSetup = false;

  private shouldCaptureRequest(url: string, resourceType: string): boolean {
    const settings = this.settings.network;

    // Check resource type filter
    const normalizedType = resourceType.toLowerCase() as NetworkResourceType;
    if (settings.filterResourceTypes.length > 0 &&
        !settings.filterResourceTypes.includes(normalizedType)) {
      return false;
    }

    // Check URL patterns
    try {
      if (settings.includeUrlPattern && settings.includeUrlPattern !== '.*') {
        const includeRegex = new RegExp(settings.includeUrlPattern);
        if (!includeRegex.test(url)) return false;
      }

      if (settings.excludeUrlPattern) {
        const excludeRegex = new RegExp(settings.excludeUrlPattern);
        if (excludeRegex.test(url)) return false;
      }
    } catch {
      // Invalid regex, don't filter
    }

    return true;
  }

  private handleNetworkRequestWillBeSent(tabId: number, params: any): void {
    const { requestId, request, type, timestamp } = params;

    if (!this.shouldCaptureRequest(request.url, type || 'other')) {
      return;
    }

    const capturedRequest: CapturedNetworkRequest = {
      id: crypto.randomUUID(),
      requestId,
      tabId,
      timestamp: timestamp * 1000, // Convert to ms
      url: request.url,
      method: request.method,
      resourceType: (type?.toLowerCase() || 'other') as NetworkResourceType,
      requestHeaders: request.headers,
      requestBody: request.postData,
      requestBodyTruncated: request.postData?.length > this.settings.network.maxBodySize,
      completed: false,
    };

    // Truncate request body if needed
    if (capturedRequest.requestBody && capturedRequest.requestBody.length > this.settings.network.maxBodySize) {
      capturedRequest.requestBody = capturedRequest.requestBody.substring(0, this.settings.network.maxBodySize);
      capturedRequest.requestBodyTruncated = true;
    }

    this.pendingRequests.set(requestId, capturedRequest);
  }

  private handleNetworkResponseReceived(_tabId: number, params: any): void {
    const { requestId, response } = params;

    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) return;

    pendingRequest.responseStatusCode = response.status;
    pendingRequest.responseStatusText = response.statusText;
    pendingRequest.responseHeaders = response.headers;
    pendingRequest.mimeType = response.mimeType;
    pendingRequest.fromCache = response.fromDiskCache || response.fromPrefetchCache;
    pendingRequest.fromServiceWorker = response.fromServiceWorker;

    if (response.timing) {
      pendingRequest.timing = {
        requestTime: response.timing.requestTime,
        dnsStart: response.timing.dnsStart,
        dnsEnd: response.timing.dnsEnd,
        connectStart: response.timing.connectStart,
        connectEnd: response.timing.connectEnd,
        sslStart: response.timing.sslStart,
        sslEnd: response.timing.sslEnd,
        sendStart: response.timing.sendStart,
        sendEnd: response.timing.sendEnd,
        receiveHeadersEnd: response.timing.receiveHeadersEnd,
      };
    }
  }

  private async handleNetworkLoadingFinished(tabId: number, params: any): Promise<void> {
    const { requestId } = params;

    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) return;

    // Get response body if enabled
    if (this.settings.network.captureResponseBodies) {
      try {
        const response: any = await chrome.debugger.sendCommand(
          { tabId },
          'Network.getResponseBody',
          { requestId }
        );

        if (response) {
          let body = response.body;
          const base64Encoded = response.base64Encoded;

          // Truncate if needed
          if (body && body.length > this.settings.network.maxBodySize) {
            body = body.substring(0, this.settings.network.maxBodySize);
            pendingRequest.responseBodyTruncated = true;
          }

          pendingRequest.responseBody = body;
          pendingRequest.responseBodyBase64 = base64Encoded;
        }
      } catch (error: any) {
        // Body might not be available for some requests (e.g., redirects)
        if (!error.message?.includes('No resource with given identifier')) {
          console.warn('[AdvancedDebugger] Failed to get response body:', error.message);
        }
      }
    }

    pendingRequest.completed = true;
    this.pendingRequests.delete(requestId);
    this.addNetworkRequest(tabId, pendingRequest);
  }

  private handleNetworkLoadingFailed(_tabId: number, params: any): void {
    const { requestId, errorText } = params;

    const pendingRequest = this.pendingRequests.get(requestId);
    if (!pendingRequest) return;

    pendingRequest.error = errorText;
    pendingRequest.completed = true;
    this.pendingRequests.delete(requestId);
    this.addNetworkRequest(pendingRequest.tabId, pendingRequest);
  }

  private webSocketUrls: Map<string, string> = new Map(); // requestId -> url

  private handleWebSocketCreated(_tabId: number, params: any): void {
    if (!this.settings.network.captureWebSockets) return;
    const { requestId, url } = params;
    this.webSocketUrls.set(requestId, url);
  }

  private handleWebSocketFrameSent(tabId: number, params: any): void {
    if (!this.settings.network.captureWebSockets) return;
    const { requestId, timestamp, response } = params;

    const url = this.webSocketUrls.get(requestId) || 'unknown';

    const frame: WebSocketFrame = {
      id: crypto.randomUUID(),
      requestId,
      tabId,
      timestamp: timestamp * 1000,
      url,
      opcode: response.opcode,
      direction: 'outgoing',
      data: response.payloadData,
      dataTruncated: response.payloadData?.length > this.settings.network.maxBodySize,
    };

    if (frame.data && frame.data.length > this.settings.network.maxBodySize) {
      frame.data = frame.data.substring(0, this.settings.network.maxBodySize);
      frame.dataTruncated = true;
    }

    this.addWebSocketFrame(tabId, frame);
  }

  private handleWebSocketFrameReceived(tabId: number, params: any): void {
    if (!this.settings.network.captureWebSockets) return;
    const { requestId, timestamp, response } = params;

    const url = this.webSocketUrls.get(requestId) || 'unknown';

    const frame: WebSocketFrame = {
      id: crypto.randomUUID(),
      requestId,
      tabId,
      timestamp: timestamp * 1000,
      url,
      opcode: response.opcode,
      direction: 'incoming',
      data: response.payloadData,
      dataTruncated: response.payloadData?.length > this.settings.network.maxBodySize,
    };

    if (frame.data && frame.data.length > this.settings.network.maxBodySize) {
      frame.data = frame.data.substring(0, this.settings.network.maxBodySize);
      frame.dataTruncated = true;
    }

    this.addWebSocketFrame(tabId, frame);
  }

  private handleWebSocketClosed(_tabId: number, params: any): void {
    const { requestId } = params;
    this.webSocketUrls.delete(requestId);
  }

  private addNetworkRequest(tabId: number, request: CapturedNetworkRequest): void {
    const requests = this.networkRequests.get(tabId) || [];
    requests.push(request);

    // Trim if over limit
    if (requests.length > this.settings.network.maxRequests) {
      requests.splice(0, requests.length - this.settings.network.maxRequests);
    }

    this.networkRequests.set(tabId, requests);
  }

  private addWebSocketFrame(tabId: number, frame: WebSocketFrame): void {
    const frames = this.webSocketFrames.get(tabId) || [];
    frames.push(frame);

    // Keep last 1000 frames
    if (frames.length > 1000) {
      frames.splice(0, frames.length - 1000);
    }

    this.webSocketFrames.set(tabId, frames);
  }

  async stopNetworkCapture(tabId: number): Promise<void> {
    if (!this.activeNetworkCapture.has(tabId)) return;

    try {
      await chrome.debugger.sendCommand({ tabId }, 'Network.disable');
      this.activeNetworkCapture.delete(tabId);

      // Clear pending requests for this tab
      for (const [requestId, request] of this.pendingRequests) {
        if (request.tabId === tabId) {
          this.pendingRequests.delete(requestId);
        }
      }

      console.log(`[AdvancedDebugger] Network capture stopped for tab ${tabId}`);
    } catch (error) {
      console.error('[AdvancedDebugger] Failed to stop network capture:', error);
    }
  }

  getNetworkRequests(tabId: number, options?: {
    since?: number;
    resourceTypes?: NetworkResourceType[];
    urlPattern?: string;
  }): CapturedNetworkRequest[] {
    let requests = this.networkRequests.get(tabId) || [];

    if (options?.since) {
      requests = requests.filter(r => r.timestamp >= options.since!);
    }

    if (options?.resourceTypes && options.resourceTypes.length > 0) {
      requests = requests.filter(r => options.resourceTypes!.includes(r.resourceType));
    }

    if (options?.urlPattern) {
      try {
        const regex = new RegExp(options.urlPattern);
        requests = requests.filter(r => regex.test(r.url));
      } catch {
        // Invalid regex, don't filter
      }
    }

    return requests;
  }

  getWebSocketFrames(tabId: number, options?: { since?: number; requestId?: string }): WebSocketFrame[] {
    let frames = this.webSocketFrames.get(tabId) || [];

    if (options?.since) {
      frames = frames.filter(f => f.timestamp >= options.since!);
    }

    if (options?.requestId) {
      frames = frames.filter(f => f.requestId === options.requestId);
    }

    return frames;
  }

  clearNetworkData(tabId: number): void {
    this.networkRequests.set(tabId, []);
    this.webSocketFrames.set(tabId, []);
  }

  isCapturingNetwork(tabId: number): boolean {
    return this.activeNetworkCapture.has(tabId);
  }

  getNetworkSummary(tabId: number): {
    totalRequests: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    totalSize: number;
    webSocketFrames: number;
    errors: number;
  } {
    const requests = this.networkRequests.get(tabId) || [];
    const frames = this.webSocketFrames.get(tabId) || [];

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalSize = 0;
    let errors = 0;

    for (const req of requests) {
      // By type
      byType[req.resourceType] = (byType[req.resourceType] || 0) + 1;

      // By status
      const statusGroup = req.error ? 'error' :
        req.responseStatusCode ? `${Math.floor(req.responseStatusCode / 100)}xx` : 'pending';
      byStatus[statusGroup] = (byStatus[statusGroup] || 0) + 1;

      // Size
      if (req.responseBody) {
        totalSize += req.responseBody.length;
      }

      // Errors
      if (req.error) errors++;
    }

    return {
      totalRequests: requests.length,
      byType,
      byStatus,
      totalSize,
      webSocketFrames: frames.length,
      errors,
    };
  }

  // ============================================
  // Status Methods
  // ============================================

  isTrackingDOM(tabId: number): boolean {
    return this.activeDOMTracking.has(tabId);
  }

  isTrackingAllocations(tabId: number): boolean {
    return this.activeAllocationTracking.has(tabId);
  }

  isProfilingCPU(tabId: number): boolean {
    return this.activeCPUProfiling.has(tabId);
  }

  isTrackingCoverage(tabId: number): boolean {
    return this.activeCoverage.has(tabId);
  }

  getStatus(tabId: number): {
    attached: boolean;
    domTracking: boolean;
    allocationTracking: boolean;
    cpuProfiling: boolean;
    coverageTracking: boolean;
    periodicMemory: boolean;
    networkCapture: boolean;
  } {
    return {
      attached: this.attachedTabs.has(tabId),
      domTracking: this.activeDOMTracking.has(tabId),
      allocationTracking: this.activeAllocationTracking.has(tabId),
      cpuProfiling: this.activeCPUProfiling.has(tabId),
      coverageTracking: this.activeCoverage.has(tabId),
      periodicMemory: this.periodicMemoryIntervals.has(tabId),
      networkCapture: this.activeNetworkCapture.has(tabId),
    };
  }
}

// Export singleton
export const advancedDebugger = new AdvancedDebuggerServiceClass();
