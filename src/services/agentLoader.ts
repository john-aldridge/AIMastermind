import { AgentCompiler } from './agentCompiler';
import { AgentSourceStorageService } from '../storage/agentSourceStorage';
import { injectAgentAPIIntoPage } from '../bridge/injectAgentAPI';

/**
 * AgentLoader - Loads and executes agents in page context (MV3 compliant)
 *
 * This service compiles agent TypeScript code and injects it into the page context
 * using chrome.scripting.executeScript with world: "MAIN".
 * This is compliant with MV3 because:
 * - eval() is allowed in page context (not extension context)
 * - All agent code is stored locally in chrome.storage
 * - AgentAPI bridge provides access to chrome APIs via message passing
 */
export class AgentLoader {
  /**
   * Load and register an agent from storage
   * Injects the agent code into the active tab's page context
   */
  static async loadAndRegister(agentId: string, tabId?: number, version?: string): Promise<void> {
    const pluginSource = await AgentSourceStorageService.loadAgentSource(agentId);

    if (!pluginSource) {
      throw new Error(`Agent ${agentId} not found in storage`);
    }

    const versionToLoad = version || pluginSource.activeVersion;
    const code = pluginSource.versions[versionToLoad]?.code;

    if (!code) {
      throw new Error(`Version ${versionToLoad} not found for agent ${agentId}`);
    }

    // Compile the TypeScript code
    const compilationResult = AgentCompiler.compile(code);

    if (!compilationResult.success) {
      throw new Error(`Compilation failed:\n${compilationResult.errors?.join('\n')}`);
    }

    // Get target tab
    const targetTabId = tabId || await this.getActiveTabId();

    // Inject into page context
    await this.injectAgentIntoPage(targetTabId, agentId, compilationResult.javascript!);
  }

  /**
   * Get the active tab ID
   */
  private static async getActiveTabId(): Promise<number> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0 || !tabs[0].id) {
      throw new Error('No active tab found');
    }
    return tabs[0].id;
  }

  /**
   * Inject agent code into page context (MAIN world)
   * This is MV3 compliant because eval() is allowed in page context
   */
  private static async injectAgentIntoPage(tabId: number, agentId: string, javascript: string): Promise<void> {
    try {
      // First, ensure AgentAPI is injected
      await injectAgentAPIIntoPage(tabId);

      // Then inject agent code into page context where eval is allowed
      await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN', // ✅ Page context - eval allowed here
        func: this.executeAgentInPageContext,
        args: [agentId, javascript]
      });

      console.log(`Agent ${agentId} loaded and injected into page context (tab ${tabId})`);
    } catch (error) {
      throw new Error(`Failed to inject agent code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * This function runs in the page context (MAIN world)
   * It has access to the page's JavaScript but not extension APIs
   *
   * Note: This is injected as a function, so it runs in page context where eval is allowed
   */
  private static executeAgentInPageContext(agentId: string, javascript: string) {
    try {
      // In page context, eval is allowed (not in extension context)
      // This is compliant with MV3 policies

      // Create a module-like environment
      const exports: any = {};
      const module = { exports };

      // Wrap the agent code to provide module context
      const wrappedCode = `
        (function(exports, module, require) {
          ${javascript}
          return exports.default || exports;
        })
      `;

      // Execute the wrapped code
      // eslint-disable-next-line no-eval
      const agentFactory = eval(wrappedCode);
      const agentExports = agentFactory(exports, module, () => {});

      // Find the agent class
      let AgentClass: any;
      if (agentExports && typeof agentExports === 'function') {
        AgentClass = agentExports;
      } else if (agentExports && agentExports.default) {
        AgentClass = agentExports.default;
      } else {
        // Look for any exported class
        for (const key in agentExports) {
          if (typeof agentExports[key] === 'function') {
            AgentClass = agentExports[key];
            break;
          }
        }
      }

      if (!AgentClass) {
        throw new Error('No agent class found in compiled code');
      }

      // Initialize global agent registry in page context if not exists
      if (!(window as any).__agentRegistry) {
        (window as any).__agentRegistry = new Map();
      }

      // Instantiate the agent
      const agentInstance = new AgentClass();

      // Store in page context registry
      (window as any).__agentRegistry.set(agentId, agentInstance);

      console.log(`✅ Agent ${agentId} instantiated and registered in page context`);

    } catch (error) {
      console.error(`❌ Failed to execute agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Hot reload an agent (re-inject with new code)
   */
  static async hotReload(agentId: string, tabId?: number): Promise<void> {
    // Unload the agent first
    const targetTabId = tabId || await this.getActiveTabId();
    await this.unloadPlugin(agentId, targetTabId);

    // Load and inject the new version
    await this.loadAndRegister(agentId, targetTabId);
  }

  /**
   * Unload an agent from page context
   */
  static async unloadPlugin(agentId: string, tabId?: number): Promise<void> {
    const targetTabId = tabId || await this.getActiveTabId();

    try {
      await chrome.scripting.executeScript({
        target: { tabId: targetTabId },
        world: 'MAIN',
        func: (id: string) => {
          const registry = (window as any).__agentRegistry;
          if (registry) {
            const agent = registry.get(id);
            if (agent && typeof agent.cleanup === 'function') {
              agent.cleanup();
            }
            registry.delete(id);
            console.log(`Unloaded agent: ${id}`);
          }
        },
        args: [agentId]
      });
    } catch (error) {
      console.error(`Failed to unload agent ${agentId}:`, error);
    }
  }

  /**
   * Compile code without executing (for validation)
   */
  static async validatePlugin(code: string): Promise<{ valid: boolean; errors: string[] }> {
    const result = AgentCompiler.compile(code);

    if (!result.success) {
      return {
        valid: false,
        errors: result.errors || ['Unknown compilation error'],
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Load all agents from storage into the current tab
   */
  static async loadAllAgents(tabId?: number): Promise<void> {
    const agents = await AgentSourceStorageService.listAllAgents();
    const targetTabId = tabId || await this.getActiveTabId();

    for (const agent of agents) {
      try {
        await this.loadAndRegister(agent.agentId, targetTabId);
        console.log(`Loaded agent: ${agent.name}`);
      } catch (error) {
        console.error(`Failed to load agent ${agent.name}:`, error);
      }
    }
  }
}
