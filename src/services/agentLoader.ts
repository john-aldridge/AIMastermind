import { AgentCompiler } from './agentCompiler';
import { AgentSourceStorageService } from '../storage/agentSourceStorage';
import { AgentRegistry } from '../agents/AgentRegistry';

export class AgentLoader {
  /**
   * Load and register an agent from storage
   */
  static async loadAndRegister(agentId: string, version?: string): Promise<void> {
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

    // Execute the compiled JavaScript to register the agent
    this.executeAndRegister(compilationResult.javascript!, agentId);
  }

  /**
   * Hot reload an agent (unregister old, register new)
   */
  static async hotReload(agentId: string): Promise<void> {
    // Unregister existing agent
    this.unloadPlugin(agentId);

    // Load and register new version
    await this.loadAndRegister(agentId);
  }

  /**
   * Unload an agent from the registry
   */
  static unloadPlugin(agentId: string): void {
    // Note: AgentRegistry doesn't have an unregister method yet
    // This is a placeholder for when hot reload is fully implemented
    console.log(`Unloading agent: ${agentId}`);
  }

  /**
   * Execute compiled JavaScript and register agent
   */
  private static executeAndRegister(javascript: string, agentId: string): void {
    try {
      // Create a function wrapper to execute the code in a controlled scope
      // The code should export a class that extends AgentBase
      const wrappedCode = `
        (function() {
          ${javascript}

          // Find the exported agent class
          // This assumes the agent exports a class with 'export class AgentName extends AgentBase'
          // We need to extract and instantiate it

          // For now, we'll use a simpler approach: evaluate the code and expect it to register itself
          // or return the agent class

          return exports;
        })();
      `;

      // Create exports object
      const exports: any = {};

      // Execute the code
      // Note: In a real browser extension environment, we need to be careful with eval
      // Consider using Function constructor or Worker for better isolation
      new Function('exports', 'AgentBase', 'AgentRegistry', wrappedCode)(
        exports,
        // These would need to be imported/passed in
        undefined,
        AgentRegistry
      );

      // Find the agent class in exports
      let AgentClass: any;

      if (exports.default) {
        AgentClass = exports.default;
      } else {
        // Find first exported class
        for (const key in exports) {
          if (typeof exports[key] === 'function') {
            AgentClass = exports[key];
            break;
          }
        }
      }

      if (!AgentClass) {
        throw new Error('No plugin class found in compiled code');
      }

      // Instantiate and register
      const pluginInstance = new AgentClass();
      AgentRegistry.register(pluginInstance);

      console.log(`Agent ${agentId} loaded and registered successfully`);
    } catch (error) {
      throw new Error(`Failed to execute agent code: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Load all agents from storage
   */
  static async loadAllAgents(): Promise<void> {
    const agents = await AgentSourceStorageService.listAllAgents();

    for (const agent of agents) {
      try {
        await this.loadAndRegister(agent.agentId);
        console.log(`Loaded agent: ${agent.name}`);
      } catch (error) {
        console.error(`Failed to load agent ${agent.name}:`, error);
      }
    }
  }
}
