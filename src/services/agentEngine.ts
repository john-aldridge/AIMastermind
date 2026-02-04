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
  SafeOperation,
  InspectPageAction,
  AnalyzeWithLLMAction,
  CallLLMForOperationsAction,
  ExecuteSafeOperationsAction,
} from '../types/agentConfig';
import { BrowserClient } from '../clients/BrowserClient';
import { SettingsService } from './settingsService';
import { ConfigRegistry } from './configRegistry';
import { APIService } from '../utils/api';
import { useAppStore } from '../state/appStore';
import { OperationValidator } from './operationValidator';

/**
 * Execution context for an agent capability
 */
class ExecutionContext {
  private variables: Map<string, any> = new Map();
  private userConfig: Record<string, any>;
  public readonly tabId?: number;
  public readonly agentConfig: AgentConfig;

  constructor(
    config: AgentConfig,
    parameters: Record<string, any>,
    userConfig: Record<string, any>
  ) {
    this.agentConfig = config;
    this.userConfig = userConfig;
    this.tabId = userConfig.tabId;

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
      // Check if the entire string is a single variable reference like "{{varName}}"
      // In this case, return the raw value (including objects) instead of converting to string
      const singleVarMatch = value.match(/^\{\{([^}]+)\}\}$/);
      if (singleVarMatch) {
        const trimmed = singleVarMatch[1].trim();

        // Handle config references: {{config.fieldName}}
        if (trimmed.startsWith('config.')) {
          const fieldName = trimmed.substring(7);
          return this.userConfig[fieldName] ?? value;
        }

        // Handle parameter/variable references - return raw value
        if (this.hasVariable(trimmed)) {
          const varValue = this.getVariable(trimmed);
          return varValue !== undefined ? varValue : value;
        }

        return value;
      }

      // For strings with embedded variables, replace and stringify
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

      // LLM-Assisted Operations
      case 'inspectPage':
        return await this.executeInspectPage(action as InspectPageAction);

      case 'analyzeWithLLM':
        return await this.executeAnalyzeWithLLM(action as AnalyzeWithLLMAction);

      case 'callLLMForOperations':
        return await this.executeCallLLMForOperations(action as CallLLMForOperationsAction);

      case 'executeSafeOperations':
        return await this.executeValidatedOperations(action as ExecuteSafeOperationsAction);

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

      case 'translatePage':
        return await this.executeTranslatePage(action);

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
    `, [], 5000, this.context!.tabId);

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
    `, [], 5000, this.context!.tabId);

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
      `, [], 5000, this.context!.tabId);
    }
  }

  private async executeRemove(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);

    // If target looks like a variable, get its value
    const targetValue = this.context!.hasVariable(target)
      ? this.context!.getVariable(target)
      : target;

    // Helper to remove a single element object
    const removeElementObject = async (item: any) => {
      if (item.id) {
        await BrowserClient.executeInPageContext(`
          const el = document.getElementById('${item.id}');
          if (el) el.remove();
        `, [], 5000, this.context!.tabId);
      } else if (item.className && typeof item.className === 'string' && item.className.trim()) {
        const firstClass = item.className.split(' ').filter((c: string) => c.trim())[0];
        if (firstClass) {
          await BrowserClient.executeInPageContext(`
            const el = document.querySelector('.${firstClass}');
            if (el) el.remove();
          `, [], 5000, this.context!.tabId);
        }
      } else if (item.tagName) {
        // Fallback: try to remove by tag name (less precise but better than nothing)
        await BrowserClient.executeInPageContext(`
          const el = document.querySelector('${item.tagName.toLowerCase()}');
          if (el) el.remove();
        `, [], 5000, this.context!.tabId);
      }
    };

    // If target is an array of elements, remove all
    if (Array.isArray(targetValue)) {
      for (const item of targetValue) {
        await removeElementObject(item);
      }
      return true;
    }

    // If target is a single element object (from forEach iteration)
    if (typeof targetValue === 'object' && targetValue !== null && (targetValue.id || targetValue.className || targetValue.tagName)) {
      await removeElementObject(targetValue);
      return true;
    }

    // Single selector string
    if (typeof targetValue === 'string') {
      return await BrowserClient.executeInPageContext(`
        const elements = document.querySelectorAll('${targetValue}');
        elements.forEach(el => el.remove());
        return elements.length;
      `, [], 5000, this.context!.tabId);
    }

    console.warn('[AgentEngine] executeRemove: Invalid target value', targetValue);
    return false;
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
    `, [], 5000, this.context!.tabId);
  }

  private async executeGetAttribute(action: any): Promise<any> {
    const target = this.context!.resolveValue(action.target);
    const attr = this.context!.resolveValue(action.attr);

    const result = await BrowserClient.executeInPageContext(`
      const el = document.querySelector('${target}');
      return el ? el.getAttribute('${attr}') : null;
    `, [], 5000, this.context!.tabId);

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
    `, [], 5000, this.context!.tabId);

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
    `, [], 5000, this.context!.tabId);
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
    `, [], 5000, this.context!.tabId);
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
      action.timeout,
      this.context!.tabId
    );

    // Save result if specified
    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result);
    }

    return result;
  }

  // LLM-Assisted Operations

  /**
   * Execute inspectPage action - wraps browser_inspect_page capability
   */
  private async executeInspectPage(action: InspectPageAction): Promise<any> {
    const browserClient = new BrowserClient();

    const result = await browserClient.executeCapability(
      'browser_inspect_page',
      { find_overlays: action.findOverlays ?? true }
    );

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, result.data);
    }

    return result.data;
  }

  /**
   * Execute analyzeWithLLM action - sends data to LLM for analysis
   */
  private async executeAnalyzeWithLLM(action: AnalyzeWithLLMAction): Promise<any> {
    const contextData = this.context!.getVariable(action.context);
    const prompt = this.context!.resolveValue(action.prompt);

    // Get LLM configuration
    const apiService = this.getConfiguredAPIService();

    const systemPrompt = this.context!.agentConfig.llmConfig?.systemPrompt ||
      'You are an assistant that analyzes web page data. Provide concise, actionable analysis.';

    const response = await apiService.generateContent({
      prompt: `${prompt}\n\nContext data:\n${JSON.stringify(contextData, null, 2)}`,
      systemPrompt,
      maxTokens: 2048,
    }, this.isUsingOwnKey());

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, response.content);
    }

    return response.content;
  }

  /**
   * Execute callLLMForOperations action - LLM returns structured operations
   */
  private async executeCallLLMForOperations(action: CallLLMForOperationsAction): Promise<any> {
    const contextData = this.context!.getVariable(action.context);
    const goal = this.context!.resolveValue(action.goal);

    // Get allowed operations from action or agent config
    const allowedOps = action.allowedOperations ||
      this.context!.agentConfig.llmConfig?.allowedOperations ||
      OperationValidator.getSafeOperations();

    // Build prompt for LLM
    const systemPrompt = `You are a browser automation assistant. You analyze page state and return structured operations to achieve user goals.

IMPORTANT: You can ONLY return operations from this whitelist:
${allowedOps.map(op => `- ${op}`).join('\n')}

Return ONLY a JSON array of operations. Each operation MUST have this exact structure:
{
  "operation": "<operation_name>",
  "parameters": {
    "selector": "<CSS selector>",
    ... other parameters as needed
  },
  "reason": "<why this operation is needed>",
  "priority": <number, lower = execute first>
}

CRITICAL: The "parameters" field must be an object containing the operation's parameters.
- browser_remove_element requires: { "selector": "...", "all": true/false }
- browser_modify_style requires: { "selector": "...", "styles": { "property": "value" } }
- browser_restore_scroll requires: {} (empty object)

Example response:
[
  {
    "operation": "browser_remove_element",
    "parameters": { "selector": ".modal-overlay", "all": true },
    "reason": "Remove modal overlay blocking content",
    "priority": 1
  }
]

Do NOT return JavaScript code. Only return the JSON array.
If no operations are needed, return: []`;

    const userPrompt = `Goal: ${goal}

Page State:
${JSON.stringify(contextData, null, 2)}

Return the operations needed to achieve the goal as a JSON array.`;

    // Get configured LLM
    const apiService = this.getConfiguredAPIService();
    const temperature = this.context!.agentConfig.llmConfig?.temperature ?? 0;

    const response = await apiService.generateContent({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 2048,
      temperature,
    }, this.isUsingOwnKey());

    // Parse operations from response
    console.log('[AgentEngine] Raw LLM response:', response.content);
    const operations = OperationValidator.parseOperationsFromResponse(response.content);
    console.log('[AgentEngine] Parsed operations:', JSON.stringify(operations, null, 2));

    if (action.saveAs) {
      this.context!.setVariable(action.saveAs, operations);
    }

    return operations;
  }

  /**
   * Execute validated safe operations from LLM
   */
  private async executeValidatedOperations(action: ExecuteSafeOperationsAction): Promise<any> {
    const operations = this.context!.getVariable(action.operations) as SafeOperation[];
    const validateFirst = action.validateFirst ?? true;
    const stopOnError = action.stopOnError ?? false;

    if (!Array.isArray(operations)) {
      throw new Error(`Operations variable "${action.operations}" is not an array`);
    }

    // Create validator with allowed operations from config
    const allowedOps = this.context!.agentConfig.llmConfig?.allowedOperations;
    const validator = new OperationValidator(allowedOps);

    // Validate all operations first if requested
    if (validateFirst) {
      const validationResult = validator.validateOperations(operations);
      if (!validationResult.valid) {
        console.warn('[AgentEngine] Some operations failed validation:', validationResult.errors);
        if (validationResult.validOperations.length === 0) {
          throw new Error(`All operations failed validation: ${validationResult.errors.join('; ')}`);
        }
      }

      // Use only validated operations
      return await this.executeSafeOperations(
        validationResult.validOperations,
        stopOnError,
        action.saveAs
      );
    }

    // Execute without pre-validation (validate each individually)
    return await this.executeSafeOperations(operations, stopOnError, action.saveAs);
  }

  /**
   * Execute a list of safe operations
   */
  private async executeSafeOperations(
    operations: SafeOperation[],
    stopOnError: boolean,
    saveAs?: string
  ): Promise<any> {
    // Use BrowserClient directly for safe operations
    const browserClient = new BrowserClient();
    const results: Array<{ operation: string; success: boolean; result?: any; error?: string }> = [];

    for (const op of operations) {
      try {
        console.log(`[AgentEngine] Executing safe operation: ${op.operation}`, op.parameters);

        const result = await browserClient.executeCapability(
          op.operation,
          op.parameters
        );

        console.log(`[AgentEngine] Operation ${op.operation} result:`, result);

        results.push({
          operation: op.operation,
          success: result.success,
          result: result.data,
          error: result.error,
        });

        if (!result.success && stopOnError) {
          break;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[AgentEngine] Operation ${op.operation} failed:`, errorMsg);

        results.push({
          operation: op.operation,
          success: false,
          error: errorMsg,
        });

        if (stopOnError) {
          break;
        }
      }
    }

    const finalResult = {
      totalOperations: operations.length,
      executed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };

    if (saveAs) {
      this.context!.setVariable(saveAs, finalResult);
    }

    return finalResult;
  }

  /**
   * Get configured API service for LLM calls
   */
  private getConfiguredAPIService(): APIService {
    const appState = useAppStore.getState();
    const { userConfig } = appState;
    const activeConfigId = userConfig.activeConfigurationId || 'free-model';
    const activeConfig = userConfig.savedConfigurations.find((c: any) => c.id === activeConfigId);

    if (!activeConfig) {
      throw new Error('No active LLM configuration found');
    }

    const apiService = new APIService();
    const provider = activeConfig.providerId === 'anthropic' ||
                     activeConfig.providerId === 'our-models' ? 'claude' : 'openai';

    apiService.setProvider(provider);
    apiService.setModel(activeConfig.model);
    apiService.setApiKey(activeConfig.credentials.apiKey || '');

    return apiService;
  }

  /**
   * Check if using own API key
   */
  private isUsingOwnKey(): boolean {
    const appState = useAppStore.getState();
    return appState.userConfig?.useOwnKey || false;
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
      `, [], 5000, this.context!.tabId);

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

    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.svg'),
        title,
        message,
      });
    } catch (error) {
      // Notification failed (possibly due to icon loading issue), log but don't fail the agent
      console.warn('[AgentEngine] Notification failed:', error);
    }

    return undefined;
  }

  private async executeTranslatePage(action: any): Promise<any> {
    const targetLanguage = this.context!.resolveValue(action.targetLanguage);
    const sourceLanguage = action.sourceLanguage ?
      this.context!.resolveValue(action.sourceLanguage) : null;
    const strategy = action.fallbackStrategy || 'native-then-llm';

    console.log(`[AgentEngine] Translating page with strategy: ${strategy}`);

    const methods = this.getTranslationMethods(strategy);

    for (const method of methods) {
      try {
        console.log(`[AgentEngine] Trying translation method: ${method}`);
        const result = await this.tryTranslationMethod(
          method,
          targetLanguage,
          sourceLanguage
        );

        if (result.success) {
          console.log(`[AgentEngine] Translation succeeded using: ${method}`);
          return {
            ...result,
            method_used: method
          };
        }
      } catch (error) {
        console.log(`[AgentEngine] ${method} translation failed:`, error);
        // Continue to next method in fallback chain
        continue;
      }
    }

    return {
      success: false,
      error: 'All translation methods failed',
      attempted_methods: methods,
      suggestion: 'Try updating Chrome to 138+ or configure an LLM for translation'
    };
  }

  private getTranslationMethods(strategy: string): string[] {
    const strategyMap: Record<string, string[]> = {
      'native-only': ['native'],
      'llm-only': ['llm'],
      'google-only': ['google'],
      'native-then-llm': ['native', 'llm'],
      'native-then-google': ['native', 'google'],
      'llm-then-google': ['llm', 'google'],
      'native-then-llm-then-google': ['native', 'llm', 'google']
    };

    return strategyMap[strategy] || strategyMap['native-then-llm'];
  }

  private async tryTranslationMethod(
    method: string,
    targetLang: string,
    sourceLang: string | null
  ): Promise<any> {
    const registry = ConfigRegistry.getInstance();

    switch (method) {
      case 'native': {
        const result = await registry.executeClientCapability(
          'browser',
          'browser_translate_page_native',
          {
            target_language: targetLang,
            source_language: sourceLang || undefined
          },
          {}
        );
        return result.data;
      }

      case 'llm':
        return await this.executeLLMTranslation(targetLang, sourceLang);

      case 'google':
        return await this.executeGoogleTranslate(targetLang, sourceLang);

      default:
        throw new Error(`Unknown translation method: ${method}`);
    }
  }

  private async executeLLMTranslation(
    targetLang: string,
    _sourceLang: string | null
  ): Promise<any> {
    const registry = ConfigRegistry.getInstance();

    // Step 1: Extract text nodes from page
    const pageTextResult = await registry.executeClientCapability(
      'browser',
      'browser_get_page_text',
      { include_hidden: false },
      {}
    );

    if (!pageTextResult.data || !pageTextResult.data.text_nodes) {
      throw new Error('Failed to extract page text for LLM translation');
    }

    const textNodes = pageTextResult.data.text_nodes;

    if (textNodes.length === 0) {
      return {
        success: true,
        translated_nodes: 0,
        total_nodes: 0,
        method: 'llm',
        message: 'No text to translate'
      };
    }

    // Step 2: Prepare translation prompt for LLM
    const textsToTranslate = textNodes
      .map((node: any) => `${node.id}|||${node.text}`)
      .join('\n');

    const prompt = `Translate the following text nodes to ${targetLang}.
Preserve the ID|||text format exactly. Only translate the text after |||, keep IDs unchanged.

${textsToTranslate}

Return only the translated lines in the same format (ID|||translated_text).`;

    // Step 3: Get user's configured LLM from appStore
    const appState = useAppStore.getState();
    const { userConfig } = appState;
    const activeConfigId = userConfig.activeConfigurationId || 'free-model';
    const activeConfig = userConfig.savedConfigurations.find((c: any) => c.id === activeConfigId);

    if (!activeConfig) {
      throw new Error('No active LLM configuration found');
    }

    // Step 4: Set up API service with user's config
    const apiService = new APIService();
    const provider = activeConfig.providerId === 'anthropic' ||
                     activeConfig.providerId === 'our-models' ? 'claude' : 'openai';

    apiService.setProvider(provider);
    apiService.setModel(activeConfig.model);
    apiService.setApiKey(activeConfig.credentials.apiKey || '');

    // Step 5: Call LLM for translation
    const response = await apiService.generateContent({
      prompt,
      systemPrompt: 'You are a professional translator. Return ONLY the translated text in the exact format requested.',
      maxTokens: 4096
    }, userConfig.useOwnKey);

    // Step 6: Parse response to extract translations
    const lines = response.content.trim().split('\n');
    const replacements: Record<string, string> = {};

    for (const line of lines) {
      const match = line.match(/^(.+?)\|\|\|(.+)$/);
      if (match) {
        const [, nodeId, translatedText] = match;
        replacements[nodeId] = translatedText;
      }
    }

    // Step 7: Replace text on page
    const replaceResult = await registry.executeClientCapability(
      'browser',
      'browser_replace_text',
      { replacements },
      {}
    );

    return {
      success: true,
      translated_nodes: Object.keys(replacements).length,
      total_nodes: textNodes.length,
      method: 'llm',
      model_used: activeConfig.model,
      provider_used: activeConfig.providerId,
      replaced_result: replaceResult.data
    };
  }

  private async executeGoogleTranslate(
    targetLang: string,
    sourceLang: string | null
  ): Promise<any> {
    // Google Translate injection implementation
    const script = `
      (function() {
        // Check if already translated
        if (document.querySelector('.goog-te-banner-frame')) {
          console.log('Page is already being translated');
          return { success: true, message: 'Translation already active' };
        }

        // Remove existing Google Translate elements
        const existing = document.querySelector('#google_translate_element');
        if (existing) existing.remove();

        // Create container
        const container = document.createElement('div');
        container.id = 'google_translate_element';
        container.style.display = 'none';
        document.body.appendChild(container);

        // Create script element
        const script = document.createElement('script');
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';

        // Setup callback
        window.googleTranslateElementInit = function() {
          new google.translate.TranslateElement({
            pageLanguage: ${sourceLang ? `'${sourceLang}'` : 'null'},
            includedLanguages: '${targetLang}',
            autoDisplay: false
          }, 'google_translate_element');

          // Auto-trigger translation
          setTimeout(() => {
            const select = document.querySelector('.goog-te-combo');
            if (select) {
              select.value = '${targetLang}';
              select.dispatchEvent(new Event('change'));
            }
          }, 1000);
        };

        document.head.appendChild(script);

        return { success: true, method: 'google' };
      })();
    `;

    return await BrowserClient.executeInPageContext(script, [], 5000, this.context?.tabId);
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
