export interface AgentVersionMetadata {
  timestamp: number;
  description: string;
  author?: string;
  changelog?: string;
}

export interface AgentVersion {
  code: string;
  readme?: string;
  metadata: AgentVersionMetadata;
}

export interface AgentSourceStorage {
  agentId: string;
  name: string;
  activeVersion: string;
  versions: {
    [version: string]: AgentVersion;
  };
  createdAt: number;
  lastUpdatedAt: number;
}

export interface CompilationResult {
  success: boolean;
  javascript?: string;
  errors?: string[];
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
}
