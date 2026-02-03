import { AgentSourceStorage, AgentVersionMetadata } from '../types/agentSource';
import { README_TEMPLATE } from '../templates/agentTemplates';

const STORAGE_PREFIX = 'agent:source:';

export class AgentSourceStorageService {
  /**
   * Save a new version of agent source code
   */
  static async saveAgentSource(
    agentId: string,
    code: string,
    description: string,
    author?: string,
    bumpType: 'patch' | 'minor' | 'major' = 'patch',
    readme?: string
  ): Promise<string> {
    const existing = await this.loadAgentSource(agentId);

    if (!existing) {
      throw new Error(`Agent ${agentId} not found. Create it first.`);
    }

    let newVersion: string;
    switch (bumpType) {
      case 'major':
        newVersion = this.incrementMajorVersion(existing.activeVersion);
        break;
      case 'minor':
        newVersion = this.incrementMinorVersion(existing.activeVersion);
        break;
      case 'patch':
      default:
        newVersion = this.incrementVersion(existing.activeVersion);
        break;
    }
    const timestamp = Date.now();

    existing.versions[newVersion] = {
      code,
      readme: readme !== undefined ? readme : existing.versions[existing.activeVersion]?.readme,
      metadata: {
        timestamp,
        description,
        author,
      },
    };

    existing.activeVersion = newVersion;
    existing.lastUpdatedAt = timestamp;

    await this.saveToStorage(agentId, existing);
    return newVersion;
  }

  /**
   * Update the current version without bumping
   */
  static async updateCurrentVersion(
    agentId: string,
    code: string,
    description: string,
    author?: string,
    readme?: string
  ): Promise<string> {
    const existing = await this.loadAgentSource(agentId);

    if (!existing) {
      throw new Error(`Agent ${agentId} not found. Create it first.`);
    }

    const currentVersion = existing.activeVersion;
    const timestamp = Date.now();

    existing.versions[currentVersion] = {
      code,
      readme: readme !== undefined ? readme : existing.versions[currentVersion]?.readme,
      metadata: {
        timestamp,
        description,
        author,
      },
    };

    existing.lastUpdatedAt = timestamp;

    await this.saveToStorage(agentId, existing);
    return currentVersion;
  }

  /**
   * Create a new agent with initial version
   */
  static async createAgent(
    agentId: string,
    name: string,
    code: string,
    description: string,
    author?: string
  ): Promise<AgentSourceStorage> {
    const existing = await this.loadAgentSource(agentId);
    if (existing) {
      throw new Error(`Agent ${agentId} already exists`);
    }

    const timestamp = Date.now();
    const initialVersion = '1.0.0';

    const pluginSource: AgentSourceStorage = {
      agentId,
      name,
      activeVersion: initialVersion,
      versions: {
        [initialVersion]: {
          code,
          readme: README_TEMPLATE,
          metadata: {
            timestamp,
            description,
            author,
          },
        },
      },
      createdAt: timestamp,
      lastUpdatedAt: timestamp,
    };

    await this.saveToStorage(agentId, pluginSource);
    return pluginSource;
  }

  /**
   * Load agent source (active version)
   */
  static async loadAgentSource(agentId: string): Promise<AgentSourceStorage | null> {
    const key = STORAGE_PREFIX + agentId;
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }

  /**
   * Load a specific version of agent source
   */
  static async loadAgentVersion(agentId: string, version: string): Promise<string | null> {
    const agent = await this.loadAgentSource(agentId);
    if (!agent) return null;
    return agent.versions[version]?.code || null;
  }

  /**
   * Get all versions for an agent
   */
  static async listVersions(agentId: string): Promise<Array<{ version: string; metadata: AgentVersionMetadata }>> {
    const agent = await this.loadAgentSource(agentId);
    if (!agent) return [];

    return Object.entries(agent.versions)
      .map(([version, data]) => ({
        version,
        metadata: data.metadata,
      }))
      .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
  }

  /**
   * Delete agent source entirely
   */
  static async deleteAgentSource(agentId: string): Promise<void> {
    const key = STORAGE_PREFIX + agentId;
    await chrome.storage.local.remove(key);
  }

  /**
   * Set the active version for an agent
   */
  static async setActiveVersion(agentId: string, version: string): Promise<void> {
    const agent = await this.loadAgentSource(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.versions[version]) {
      throw new Error(`Version ${version} not found for agent ${agentId}`);
    }

    agent.activeVersion = version;
    agent.lastUpdatedAt = Date.now();

    await this.saveToStorage(agentId, agent);
  }

  /**
   * List all agent sources
   */
  static async listAllAgents(): Promise<AgentSourceStorage[]> {
    const result = await chrome.storage.local.get(null);
    const agents: AgentSourceStorage[] = [];

    for (const [key, value] of Object.entries(result)) {
      if (key.startsWith(STORAGE_PREFIX)) {
        agents.push(value as AgentSourceStorage);
      }
    }

    return agents.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
  }

  /**
   * Update agent metadata (name)
   */
  static async updateAgentMetadata(agentId: string, name: string): Promise<void> {
    const agent = await this.loadAgentSource(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.name = name;
    agent.lastUpdatedAt = Date.now();

    await this.saveToStorage(agentId, agent);
  }

  /**
   * Helper: Save to chrome.storage
   */
  private static async saveToStorage(agentId: string, data: AgentSourceStorage): Promise<void> {
    const key = STORAGE_PREFIX + agentId;
    await chrome.storage.local.set({ [key]: data });
  }

  /**
   * Helper: Increment semantic version (patch)
   */
  private static incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3) {
      throw new Error(`Invalid version format: ${version}`);
    }

    parts[2] += 1; // Increment patch
    return parts.join('.');
  }

  /**
   * Increment major version
   */
  static incrementMajorVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3) {
      throw new Error(`Invalid version format: ${version}`);
    }

    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
    return parts.join('.');
  }

  /**
   * Increment minor version
   */
  static incrementMinorVersion(version: string): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3) {
      throw new Error(`Invalid version format: ${version}`);
    }

    parts[1] += 1;
    parts[2] = 0;
    return parts.join('.');
  }
}
