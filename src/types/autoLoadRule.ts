export interface AutoLoadRule {
  id: string;
  agentId: string;
  agentName: string;
  urlPattern: string;
  status: 'active' | 'paused';

  // Execution configuration
  executeOnLoad: boolean; // If true, run capability immediately when page loads
  watchForReloads: boolean; // If true, re-execute capability on every page reload
  capabilityName?: string; // Which capability to execute (e.g., 'clean_page')
  reloadCapabilityName?: string; // Capability to execute on reload (defaults to capabilityName if not set)
  parameters?: Record<string, any>; // Parameters to pass to the capability

  createdAt: number;
  updatedAt: number;
  description?: string;
}

export interface AutoLoadRuleStorage {
  rules: AutoLoadRule[];
}
