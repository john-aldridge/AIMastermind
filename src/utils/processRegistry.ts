/**
 * Process Registry Implementation
 *
 * Manages long-running processes started by agent capabilities.
 * This runs in the content script context and is accessible globally via window.__agentProcessRegistry.
 */

import type { ProcessRegistryAPI, RegisteredProcess, ProcessType } from '@/types/processRegistry';

class ProcessRegistry implements ProcessRegistryAPI {
  private processes = new Map<string, RegisteredProcess>();
  private nextId = 1;

  register(
    agentId: string,
    capabilityName: string,
    process: {
      type: ProcessType;
      cleanup: () => void;
      metadata?: RegisteredProcess['metadata'];
    }
  ): string {
    const processId = `proc-${Date.now()}-${this.nextId++}`;

    const registeredProcess: RegisteredProcess = {
      id: processId,
      agentId,
      capabilityName,
      type: process.type,
      cleanup: process.cleanup,
      metadata: {
        ...process.metadata,
        startTime: process.metadata?.startTime || Date.now(),
      },
      registeredAt: Date.now(),
    };

    this.processes.set(processId, registeredProcess);

    console.log(
      `[ProcessRegistry] Registered ${process.type} for ${agentId}.${capabilityName} (ID: ${processId})`
    );

    return processId;
  }

  stop(processId: string): boolean {
    const process = this.processes.get(processId);
    if (!process) {
      console.warn(`[ProcessRegistry] Process ${processId} not found`);
      return false;
    }

    try {
      process.cleanup();
      this.processes.delete(processId);
      console.log(
        `[ProcessRegistry] Stopped ${process.type} for ${process.agentId}.${process.capabilityName} (ID: ${processId})`
      );
      return true;
    } catch (error) {
      console.error(`[ProcessRegistry] Error stopping process ${processId}:`, error);
      // Still remove it from tracking even if cleanup failed
      this.processes.delete(processId);
      return false;
    }
  }

  stopCapability(agentId: string, capabilityName: string): number {
    const toStop = Array.from(this.processes.entries()).filter(
      ([, proc]) => proc.agentId === agentId && proc.capabilityName === capabilityName
    );

    let stoppedCount = 0;
    for (const [processId] of toStop) {
      if (this.stop(processId)) {
        stoppedCount++;
      }
    }

    console.log(
      `[ProcessRegistry] Stopped ${stoppedCount}/${toStop.length} processes for ${agentId}.${capabilityName}`
    );
    return stoppedCount;
  }

  stopAgent(agentId: string): number {
    const toStop = Array.from(this.processes.entries()).filter(
      ([, proc]) => proc.agentId === agentId
    );

    let stoppedCount = 0;
    for (const [processId] of toStop) {
      if (this.stop(processId)) {
        stoppedCount++;
      }
    }

    console.log(`[ProcessRegistry] Stopped ${stoppedCount}/${toStop.length} processes for ${agentId}`);
    return stoppedCount;
  }

  stopAll(): number {
    const allProcessIds = Array.from(this.processes.keys());
    let stoppedCount = 0;

    for (const processId of allProcessIds) {
      if (this.stop(processId)) {
        stoppedCount++;
      }
    }

    console.log(`[ProcessRegistry] Stopped ${stoppedCount}/${allProcessIds.length} processes`);
    return stoppedCount;
  }

  list(): RegisteredProcess[] {
    return Array.from(this.processes.values());
  }

  has(processId: string): boolean {
    return this.processes.has(processId);
  }

  get(processId: string): RegisteredProcess | undefined {
    return this.processes.get(processId);
  }

  getByAgent(agentId: string): RegisteredProcess[] {
    return Array.from(this.processes.values()).filter((proc) => proc.agentId === agentId);
  }

  getByCapability(agentId: string, capabilityName: string): RegisteredProcess[] {
    return Array.from(this.processes.values()).filter(
      (proc) => proc.agentId === agentId && proc.capabilityName === capabilityName
    );
  }
}

/**
 * Initialize the global process registry
 * This should be called once in the content script
 */
export function initializeProcessRegistry(): ProcessRegistryAPI {
  if (typeof window !== 'undefined' && !window.__agentProcessRegistry) {
    window.__agentProcessRegistry = new ProcessRegistry();
    console.log('[ProcessRegistry] Initialized global process registry');
  }
  return window.__agentProcessRegistry!;
}

/**
 * Get the global process registry instance
 */
export function getProcessRegistry(): ProcessRegistryAPI | undefined {
  return window.__agentProcessRegistry;
}
