/**
 * Process Registry Types
 *
 * Tracks long-running processes (MutationObserver, setInterval, event listeners, etc.)
 * started by agent capabilities for cleanup and visibility.
 */

export type ProcessType =
  | 'mutation-observer'
  | 'interval'
  | 'timeout'
  | 'event-listener'
  | 'websocket'
  | 'intersection-observer'
  | 'animation-frame'
  | 'custom';

export interface RegisteredProcess {
  id: string; // Unique process ID
  agentId: string;
  capabilityName: string;
  type: ProcessType;
  cleanup: () => void;
  metadata?: {
    description?: string;
    target?: string; // e.g., element selector, event name, etc.
    startTime?: number;
    [key: string]: any;
  };
  registeredAt: number;
}

export interface ProcessRegistryAPI {
  /**
   * Register a long-running process for cleanup tracking
   */
  register(
    agentId: string,
    capabilityName: string,
    process: {
      type: ProcessType;
      cleanup: () => void;
      metadata?: RegisteredProcess['metadata'];
    }
  ): string; // Returns processId

  /**
   * Stop a specific process
   */
  stop(processId: string): boolean;

  /**
   * Stop all processes for a specific agent + capability
   */
  stopCapability(agentId: string, capabilityName: string): number;

  /**
   * Stop all processes for a specific agent
   */
  stopAgent(agentId: string): number;

  /**
   * Stop all registered processes
   */
  stopAll(): number;

  /**
   * List all active processes
   */
  list(): RegisteredProcess[];

  /**
   * Check if a specific process exists
   */
  has(processId: string): boolean;

  /**
   * Get process details by ID
   */
  get(processId: string): RegisteredProcess | undefined;

  /**
   * Get all processes for an agent
   */
  getByAgent(agentId: string): RegisteredProcess[];

  /**
   * Get all processes for an agent capability
   */
  getByCapability(agentId: string, capabilityName: string): RegisteredProcess[];
}

/**
 * Extended to window for global access in content scripts
 */
declare global {
  interface Window {
    __agentProcessRegistry?: ProcessRegistryAPI;
  }
}
