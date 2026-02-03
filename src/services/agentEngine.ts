/**
 * Agent Engine - Interprets and executes agent configs
 *
 * The engine runs in extension context (not page context), allowing:
 * - Direct access to chrome.* APIs
 * - No CORS restrictions for API calls
 * - Direct client access
 * - Process coordination
 *
 * JavaScript snippets in configs run in page context via BrowserClient.
 */

import {
  AgentConfig,
  CapabilityResult,
  Action,
  Condition,
  Transform,
  ExecuteScriptAction,
} from '../types/agentConfig';
import { BrowserClient } from '../clients/BrowserClient';
import { SettingsService } from './settingsService';
import { ConfigRegistry } from './configRegistry';

/**
 * Execution context for an agent capability
 */
class ExecutionContext {
  private variables: Map<string, any> = new Map();
  private userConfig: Record<string, any>;

  constructor(
    _config: AgentConfig,
    parameters: Record<string, any>,
    userConfig: Record<string, any>
  ) {
    this.userConfig = userConfig;

    // Initialize context with parameters
    for (const [key, value] of Object.entries(parameters)) {
      this.variables.set(key, value);
    }
  }

  /**
   * Set a variable in the context
   */
  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  /**
   * Get a variable from the context
   */
  getVariable(name: string): any {
    return this.variables.get(name);
  }

  /**
   * Check if a variable exists
   */
  hasVariable(name: string): boolean {
    return this.variables.has(name);
  }

  /**
   * Resolve a value that may contain variable references ({{varName}})
   */
  resolveValue(value: any): any {
    if (typeof value === 'string') {
      // Replace {{varName}} with variable value
      return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const trimmed = varName.trim();

        // Handle config references: {{config.fieldName}}
        if (trimmed.startsWith('config.')) {
          const fieldName = trimmed.substring(7);
          return this.userConfig[fieldName] ?? match;
        }

        // Handle parameter/variable references
        if (this.hasVariable(trimmed)) {
          const varValue = this.getVariable(trimmed);
          return varValue !== undefined ? String(varValue) : match;
        }

        return match;
      });
    } else if (typeof value === 'object' && value !== null) {
      // Recursively resolve object properties
      if (Array.isArray(value)) {
        return value.map(item => this.resolveValue(item));
      } else {
        const resolved: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
          resolved[key] = this.resolveValue(val);
        }
        return resolved;
      }
    }

    return value;
  }
}

/**
 * Process management for long-running operations
 */
interface Process {
  id: string;
  observer?: MutationObserver;
  intervalId?: number;
  cleanup?: Action[];
}

/**
 * Agent Engine - Executes agent configs
 */
export class AgentEngine {
  private context?: ExecutionContext;
  private processes: Map<string, Process> = new Map();

  /**
   * Execute a capability from an agent config
   */
  async executeCapability(
    config: AgentConfig,
    capabilityName: string,
    parameters: Record<string, any>,
    userConfig: Record<string, any>
  ): Promise<CapabilityResult> {
    try {
      // Check if execution is allowed
      const canExecute = await SettingsService.canExecuteAgentConfig(config);
      if (!canExecute.allowed) {
        return {
          success: false,
          error: canExecute.reason,
        };
      }

      // Find the capability
      const capability = config.capabilities.find(c => c.name === capabilityName);
      if (!capability) {
        return {
          success: false,
          error: `Capability "${capabilityName}" not found in agent "${config.id}"`,
        };
      }

      // Initialize execution context
      this.context = new ExecutionContext(config, parameters, userConfig);

      // Execute the action sequence
      const result = await this.executeActions(capability.actions);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Agent engine execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute a sequence of actions
   */
  private async executeActions(actions: Action[]): Promise<any> {
    let lastResult: any;

    for (const action of actions) {
      lastResult = await this.executeAction(action);

      // If action returned a value and specified saveAs, store it
      if (action.type === 'return') {
        return lastResult;
      }
    }

    return lastResult;
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: Action): Promise<any> {
    if (!this.context) {
      throw new Error('Execution context not initialized');
    }

    switch (action.type) {
      // DOM Operations
      case 'querySelector':
        return await this.executeQuerySelector(action);

      case 'querySelectorAll':
        return await this.executeQuerySelectorAll(action);

      case 'click':
        return await this.executeClick(action);

      case 'remove':
        return await this.executeRemove(action);

      case 'setAttribute':
        return await this.executeSetAttribute(action);

      case 'getAttribute':
        return await this.executeGetAttribute(action);

      case 'getText':
        return await this.executeGetText(action);

      case 'setValue':
        return await this.executeSetValue(action);

      case 'addStyle':
        return await this.executeAddStyle(action);

      // JavaScript Execution
      case 'executeScript':
        return await this.executeScript(action);

      // Client Calls
      case 'callClient':
        return await this.executeCallClient(action);

      // Control Flow
      case 'if':
        return await this.executeIf(action);

      case 'forEach':
        return await this.executeForEach(action);

      case 'while':
        return await this.executeWhile(action);

      case 'wait':
        return await this.executeWait(action);

      case 'waitFor':
        return await this.executeWaitFor(action);

      // Data Operations
      case 'set':
        return await this.executeSet(action);

      case 'get':
        return await this.executeGet(action);

      case 'transform':
        return await this.executeTransform(action);

      case 'merge':
        return await this.executeMerge(action);

      // Chrome APIs
      case 'storage.get':
        return await this.executeStorageGet(action);

      case 'storage.set':
        return await this.executeStorageSet(action);

      case 'tabs.create':
        return await this.executeTabsCreate(action);

      case 'notify':
        return await this.executeNotify(action);

      // Process Management
      case 'startProcess':
        return await this.executeStartProcess(action);

      case 'stopProcess':
        return await this.executeStopProcess(action);

      case 'registerCleanup':
        return await this.executeRegisterCleanup(action);

      // Return
      case 'return':
        return this.context.resolveValue(action.value);

      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  // DOM Operations

  private async executeQuerySelector(action: any): Promise<any> {
    const selector = this.context!.resolveValue(action.selector);
    const result = await BrowserClient.executeInPageContext(`
      return document.querySelector('${selector}');
    `);

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  private async executeQuerySelectorAll(action: any): Promise<any> {
    const selector = this.context!.resolveValue(action.selector);
    const result = await BrowserClient.executeInPageContext(`
      return Array.from(document.querySelectorAll('${selector}')).map((el, idx) => ({
        __elementId: 'el_' + idx + '_' + Date.now(),
        tagName: el.tagName,
        id: el.id,
        className: el.className
      }));
    `);

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  private async executeClick(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);

    // If target is a variable, use it; otherwise treat as selector
    if (this.context!.hasVariable(target)) {
      // Target is a variable reference - not supported for now
      throw new Error('Click on stored element references not yet supported');
    } else {
      // Target is a selector
      return await BrowserClient.executeInPageContext(`
        const el = document.querySelector('${target}');
        if (el) {
          el.click();
          return true;
        }
        return false;
      `);
    }
  }

  private async executeRemove(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);

    // If target looks like a variable, get its value
    const targetValue = this.context!.hasVariable(target)
      ? this.context!.getVariable(target)
      : target;

    // If target is an array of elements, remove all
    if (Array.isArray(targetValue)) {
      // For arrays of element references, we need to remove by selector
      // This is a limitation of the serialization approach
      for (const item of targetValue) {
        if (item.id) {
          await BrowserClient.executeInPageContext(`
            const el = document.getElementById('${item.id}');
            if (el) el.remove();
          `);
        } else if (item.className) {
          await BrowserClient.executeInPageContext(`
            const el = document.querySelector('.${item.className.split(' ')[0]}');
            if (el) el.remove();
          `);
        }
      }
      return true;
    }

    // Single selector
    return await BrowserClient.executeInPageContext(`
      const elements = document.querySelectorAll('${targetValue}');
      elements.forEach(el => el.remove());
      return elements.length;
    `);
  }

  private async executeSetAttribute(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);
    const attr = this.context!.resolveValue(action.attr);
    const value = this.context!.resolveValue(action.value);

    return await BrowserClient.executeInPageContext(`
      const el = document.querySelector('${target}');
      if (el) {
        el.setAttribute('${attr}', '${value}');
        return true;
      }
      return false;
    `);
  }

  private async executeGetAttribute(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);
    const attr = this.context!.resolveValue(action.attr);

    const result = await BrowserClient.executeInPageContext(`
      const el = document.querySelector('${target}');
      return el ? el.getAttribute('${attr}') : null;
    `);

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  private async executeGetText(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);

    const result = await BrowserClient.executeInPageContext(`
      const el = document.querySelector('${target}');
      return el ? el.textContent : null;
    `);

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  private async executeSetValue(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);
    const value = this.context!.resolveValue(action.value);

    return await BrowserClient.executeInPageContext(`
      const el = document.querySelector('${target}');
      if (el) {
        el.value = '${value}';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    `);
  }

  private async executeAddStyle(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);
    const styles = this.context!.resolveValue(action.styles);

    return await BrowserClient.executeInPageContext(`
      const elements = document.querySelectorAll('${target}');
      const styles = ${JSON.stringify(styles)};
      elements.forEach(el => {
        Object.assign(el.style, styles);
      });
      return elements.length;
    `);
  }

  // JavaScript Execution

  private async executeScript(action: ExecuteScriptAction): Promise<any> {
    // Check if JS execution is enabled
    const settings = await SettingsService.getSettings();
    if (!settings.allowJavaScriptInConfigs) {
      throw new Error('JavaScript execution is disabled in settings');
    }

    // Prepare arguments from context
    const args = action.args?.map(argName =>
      this.context!.getVariable(argName)
    ) || [];

    // Execute script in page context
    const result = await BrowserClient.executeInPageContext(
      action.script,
      args,
      action.timeout
    );

    // Save result if specified
    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  // Client Calls

  private async executeCallClient(action: any): Promise<any> {
    const clientId = this.context!.resolveValue(action.client);
    const method = this.context!.resolveValue(action.method);
    const params = this.context!.resolveValue(action.params);

    const registry = ConfigRegistry.getInstance();
    const result = await registry.executeClientCapability(clientId, method, params, {});

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result.data);
    }

    return result.data;
  }

  // Control Flow

  private async executeIf(action: any): Promise<any> {
    const conditionMet = this.evaluateCondition(action.condition);

    if (conditionMet) {
      return await this.executeActions(action.then);
    } else if (action.else) {
      return await this.executeActions(action.else);
    }

    return undefined;
  }

  private async executeForEach(action: any): Promise<any> {
    const source = this.context!.getVariable(action.source);

    if (!Array.isArray(source)) {
      throw new Error(`forEach source "${action.source}" is not an array`);
    }

    const results = [];
    for (const item of source) {
      this.context!.setVariable(action.itemAs, item);
      const result = await this.executeActions(action.do);
      results.push(result);
    }

    return results;
  }

  private async executeWhile(action: any): Promise<any> {
    const maxIterations = action.maxIterations || 1000;
    let iterations = 0;
    const results = [];

    while (this.evaluateCondition(action.condition) && iterations < maxIterations) {
      const result = await this.executeActions(action.do);
      results.push(result);
      iterations++;
    }

    if (iterations >= maxIterations) {
      console.warn(`While loop reached max iterations (${maxIterations})`);
    }

    return results;
  }

  private async executeWait(action: any): Promise<any> {
    const ms = this.context!.resolveValue(action.ms);
    await new Promise(resolve => setTimeout(resolve, ms));
    return undefined;
  }

  private async executeWaitFor(action: any): Promise<any> {
    const selector = this.context!.resolveValue(action.selector);
    const timeout = action.timeout || 5000;

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const exists = await BrowserClient.executeInPageContext(`
        return document.querySelector('${selector}') !== null;
      `);

      if (exists) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`waitFor timed out waiting for selector: ${selector}`);
  }

  // Data Operations

  private async executeSet(action: any): Promise<any> {
    const value = this.context!.resolveValue(action.value);
    this.context!.setVariable(action.variable, value);
    return value;
  }

  private async executeGet(action: any): Promise<any> {
    const value = this.context!.getVariable(action.variable);

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, value);
    }

    return value;
  }

  private async executeTransform(action: any): Promise<any> {
    const source = this.context!.getVariable(action.source);
    const result = this.applyTransform(source, action.transform);

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  private async executeMerge(action: any): Promise<any> {
    const values = action.sources.map((source: string) =>
      this.context!.getVariable(source)
    );

    const result = Object.assign({}, ...values);

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  // Chrome APIs

  private async executeStorageGet(action: any): Promise<any> {
    const keys = this.context!.resolveValue(action.keys);
    const result = await chrome.storage.local.get(keys);

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  private async executeStorageSet(action: any): Promise<any> {
    const items = this.context!.resolveValue(action.items);
    await chrome.storage.local.set(items);
    return undefined;
  }

  private async executeTabsCreate(action: any): Promise<any> {
    const url = this.context!.resolveValue(action.url);
    const tab = await chrome.tabs.create({ url });
    return tab;
  }

  private async executeNotify(action: any): Promise<any> {
    const title = this.context!.resolveValue(action.title);
    const message = this.context!.resolveValue(action.message);

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon128.png'),
      title,
      message,
    });

    return undefined;
  }

  // Process Management

  private async executeStartProcess(action: any): Promise<any> {
    const processId = this.context!.resolveValue(action.processId);

    // Create process
    const process: Process = {
      id: processId,
    };

    this.processes.set(processId, process);

    // Execute actions in background (simplified - full implementation would use MutationObserver)
    // For now, just execute once
    await this.executeActions(action.actions);

    return { processId };
  }

  private async executeStopProcess(action: any): Promise<any> {
    const processId = this.context!.resolveValue(action.processId);
    const process = this.processes.get(processId);

    if (process) {
      // Run cleanup if registered
      if (process.cleanup) {
        await this.executeActions(process.cleanup);
      }

      // Clean up resources
      if (process.observer) {
        process.observer.disconnect();
      }
      if (process.intervalId) {
        clearInterval(process.intervalId);
      }

      this.processes.delete(processId);
    }

    return undefined;
  }

  private async executeRegisterCleanup(action: any): Promise<any> {
    const processId = this.context!.resolveValue(action.processId);
    const process = this.processes.get(processId);

    if (process) {
      process.cleanup = action.actions;
    }

    return undefined;
  }

  // Condition Evaluation

  private evaluateCondition(condition: Condition): boolean {
    switch (condition.type) {
      case 'exists':
        return this.context!.hasVariable(condition.target);

      case 'equals': {
        const left = this.context!.resolveValue(condition.left);
        const right = this.context!.resolveValue(condition.right);
        return left === right;
      }

      case 'greaterThan': {
        const left = this.context!.getVariable(condition.left);
        return left > condition.right;
      }

      case 'lessThan': {
        const left = this.context!.getVariable(condition.left);
        return left < condition.right;
      }

      case 'contains': {
        const source = this.context!.getVariable(condition.source);
        if (Array.isArray(source)) {
          return source.includes(condition.value);
        } else if (typeof source === 'string') {
          return source.includes(condition.value);
        }
        return false;
      }

      case 'isEmpty': {
        const target = this.context!.getVariable(condition.target);
        if (target === null || target === undefined) {
          return true;
        }
        if (Array.isArray(target)) {
          return target.length === 0;
        }
        if (typeof target === 'string') {
          return target.length === 0;
        }
        if (typeof target === 'object') {
          return Object.keys(target).length === 0;
        }
        return false;
      }

      case 'and':
        return condition.conditions.every(c => this.evaluateCondition(c));

      case 'or':
        return condition.conditions.some(c => this.evaluateCondition(c));

      case 'not':
        return !this.evaluateCondition(condition.condition);

      default:
        throw new Error(`Unknown condition type: ${(condition as any).type}`);
    }
  }

  // Transform Application

  private applyTransform(value: any, transform: Transform): any {
    switch (transform.type) {
      case 'toLowerCase':
        return String(value).toLowerCase();

      case 'toUpperCase':
        return String(value).toUpperCase();

      case 'trim':
        return String(value).trim();

      case 'split':
        return String(value).split(transform.delimiter);

      case 'join':
        return Array.isArray(value) ? value.join(transform.delimiter) : value;

      case 'parseInt':
        return parseInt(String(value), 10);

      case 'parseFloat':
        return parseFloat(String(value));

      case 'jsonParse':
        return JSON.parse(String(value));

      case 'jsonStringify':
        return JSON.stringify(value);

      case 'map':
        if (Array.isArray(value)) {
          return value.map(item => item[transform.field]);
        }
        return value;

      default:
        throw new Error(`Unknown transform type: ${(transform as any).type}`);
    }
  }

  /**
   * Clean up all processes
   */
  async cleanup(): Promise<void> {
    for (const [processId] of this.processes) {
      await this.executeStopProcess({ type: 'stopProcess', processId });
    }
  }
}
