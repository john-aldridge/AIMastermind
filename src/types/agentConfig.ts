/**
 * Type definitions for config-based agents
 *
 * Agents are defined as JSON configs with optional JavaScript snippets,
 * executed by the agent engine in extension context.
 */

import type { ConfigField } from '../agents/AgentInterface';

/**
 * Agent execution mode
 * - 'safe': Only declarative actions, no JS, no LLM
 * - 'llm-assisted': Uses LLM for decisions but only executes whitelisted operations
 * - 'unrestricted': Current behavior (requires JS settings enabled)
 */
export type AgentMode = 'safe' | 'llm-assisted' | 'unrestricted';

/**
 * LLM configuration for llm-assisted agents
 */
export interface LLMConfig {
  systemPrompt?: string;                // Custom system prompt for LLM
  allowedOperations: string[];          // Whitelist of BrowserClient operations
  maxIterations?: number;               // Rate limiting for iterations (default: 5)
  temperature?: number;                 // LLM temperature (default: 0)
}

/**
 * Safe operation returned by LLM
 */
export interface SafeOperation {
  operation: string;                    // e.g., "browser_remove_element"
  parameters: Record<string, any>;      // Operation parameters
  reason?: string;                      // Why this operation is needed
  priority?: number;                    // Execution priority (lower = first)
}

/**
 * Top-level agent configuration
 */
export interface AgentConfig {
  // Metadata
  id: string;                           // e.g., "overlay-remover"
  name: string;                         // "Overlay Remover"
  description: string;
  version: string;                      // "1.0.0"
  author: string;
  icon?: string;
  homepage?: string;
  tags: string[];

  // Source tracking
  source?: 'user' | 'example' | 'purchased';  // Where this agent came from

  // Execution mode
  mode?: AgentMode;                     // Default: 'unrestricted' for backward compat

  // LLM configuration (for llm-assisted mode)
  llmConfig?: LLMConfig;

  // Security flags
  containsJavaScript?: boolean;         // True if config contains executeScript actions
  requiresPageAccess?: boolean;         // True if config needs DOM access

  // User configuration fields
  configFields: ConfigField[];          // Same as current AgentBase.getConfigFields()

  // Client dependencies
  dependencies: string[];               // ['pinterest', 'jira']

  // Capabilities
  capabilities: CapabilityConfig[];
}

/**
 * A capability that an agent can perform
 */
export interface CapabilityConfig {
  name: string;                         // "remove_overlays"
  description: string;

  // Parameters accepted by this capability
  parameters: ParameterConfig[];

  // Trigger conditions
  trigger?: TriggerConfig;

  // Process management
  isLongRunning?: boolean;
  processType?: 'mutation-observer' | 'interval' | 'event-listener';

  // Execution flow
  actions: Action[];
}

/**
 * Parameter definition for a capability
 */
export interface ParameterConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

/**
 * Trigger configuration for automatic capability execution
 */
export interface TriggerConfig {
  type: 'manual' | 'mutation' | 'interval' | 'page-load' | 'event';
  selector?: string;                    // For mutation triggers
  interval?: number;                    // For interval triggers (ms)
  event?: string;                       // For event triggers
}

/**
 * Action types that can be performed by the agent engine
 */
export type Action =
  // DOM Operations (Declarative - via BrowserClient)
  | QuerySelectorAction
  | QuerySelectorAllAction
  | ClickAction
  | RemoveAction
  | SetAttributeAction
  | GetAttributeAction
  | GetTextAction
  | SetValueAction
  | AddStyleAction

  // JavaScript Execution (runs in page context via BrowserClient)
  | ExecuteScriptAction

  // Client Calls
  | CallClientAction

  // LLM-Assisted Operations (safe mode)
  | InspectPageAction
  | AnalyzeWithLLMAction
  | CallLLMForOperationsAction
  | ExecuteSafeOperationsAction

  // Control Flow
  | IfAction
  | ForEachAction
  | WhileAction
  | WaitAction
  | WaitForAction

  // Data Operations
  | SetVariableAction
  | GetVariableAction
  | TransformAction
  | MergeAction

  // Chrome APIs
  | StorageGetAction
  | StorageSetAction
  | TabsCreateAction
  | NotifyAction
  | TranslatePageAction

  // Process Management
  | StartProcessAction
  | StopProcessAction
  | RegisterCleanupAction

  // Return/Exit
  | ReturnAction;

// DOM Actions
export interface QuerySelectorAction extends ActionWithNote {
  type: 'querySelector';
  selector: string;
  saveAs?: string;
}

export interface QuerySelectorAllAction extends ActionWithNote {
  type: 'querySelectorAll';
  selector: string;
  saveAs?: string;
}

export interface ClickAction extends ActionWithNote {
  type: 'click';
  target: string;
}

export interface RemoveAction extends ActionWithNote {
  type: 'remove';
  target: string;
}

export interface SetAttributeAction extends ActionWithNote {
  type: 'setAttribute';
  target: string;
  attr: string;
  value: string;
}

export interface GetAttributeAction extends ActionWithNote {
  type: 'getAttribute';
  target: string;
  attr: string;
  saveAs: string;
}

export interface GetTextAction extends ActionWithNote {
  type: 'getText';
  target: string;
  saveAs: string;
}

export interface SetValueAction extends ActionWithNote {
  type: 'setValue';
  target: string;
  value: string;
}

export interface AddStyleAction extends ActionWithNote {
  type: 'addStyle';
  target: string;
  styles: Record<string, string>;
}

// JavaScript Execution
export interface ExecuteScriptAction extends ActionWithNote {
  type: 'executeScript';
  script: string;                       // JavaScript code to execute
  args?: string[];                      // Variable names to pass as arguments
  saveAs?: string;                      // Save return value to variable
  timeout?: number;                     // Optional timeout in ms
}

// LLM-Assisted Operations

/**
 * Inspect page using browser_inspect_page capability
 */
export interface InspectPageAction extends ActionWithNote {
  type: 'inspectPage';
  findOverlays?: boolean;               // Look for overlays/modals (default: true)
  saveAs?: string;                      // Save result to variable
}

/**
 * Send data to LLM for analysis
 */
export interface AnalyzeWithLLMAction extends ActionWithNote {
  type: 'analyzeWithLLM';
  context: string;                      // Variable name containing data to analyze
  prompt: string;                       // Analysis prompt
  saveAs?: string;                      // Save analysis result
}

/**
 * Call LLM to get safe operations to execute
 */
export interface CallLLMForOperationsAction extends ActionWithNote {
  type: 'callLLMForOperations';
  context: string;                      // Variable name containing page state
  goal: string;                         // What to achieve (e.g., "Remove overlays blocking content")
  allowedOperations?: string[];         // Override allowed operations from config
  saveAs?: string;                      // Save operations array to variable
}

/**
 * Execute validated safe operations from LLM
 */
export interface ExecuteSafeOperationsAction extends ActionWithNote {
  type: 'executeSafeOperations';
  operations: string;                   // Variable name containing operations array
  validateFirst?: boolean;              // Validate operations before execution (default: true)
  stopOnError?: boolean;                // Stop if any operation fails (default: false)
  saveAs?: string;                      // Save execution results
}

// Client Calls
export interface CallClientAction extends ActionWithNote {
  type: 'callClient';
  client: string;
  method: string;
  params: Record<string, any>;
  saveAs?: string;
}

// Control Flow
export interface IfAction extends ActionWithNote {
  type: 'if';
  condition: Condition;
  then: Action[];
  else?: Action[];
}

export interface ForEachAction extends ActionWithNote {
  type: 'forEach';
  source: string;
  itemAs: string;
  do: Action[];
}

export interface WhileAction extends ActionWithNote {
  type: 'while';
  condition: Condition;
  do: Action[];
  maxIterations?: number;
}

export interface WaitAction extends ActionWithNote {
  type: 'wait';
  ms: number;
}

export interface WaitForAction extends ActionWithNote {
  type: 'waitFor';
  selector: string;
  timeout?: number;
}

// Data Operations
export interface SetVariableAction extends ActionWithNote {
  type: 'set';
  variable: string;
  value: any;
}

export interface GetVariableAction extends ActionWithNote {
  type: 'get';
  variable: string;
  saveAs: string;
}

export interface TransformAction extends ActionWithNote {
  type: 'transform';
  source: string;
  transform: Transform;
  saveAs: string;
}

export interface MergeAction extends ActionWithNote {
  type: 'merge';
  sources: string[];
  saveAs: string;
}

// Chrome APIs
export interface StorageGetAction extends ActionWithNote {
  type: 'storage.get';
  keys: string | string[];
  saveAs: string;
}

export interface StorageSetAction extends ActionWithNote {
  type: 'storage.set';
  items: Record<string, any>;
}

export interface TabsCreateAction extends ActionWithNote {
  type: 'tabs.create';
  url: string;
}

export interface NotifyAction extends ActionWithNote {
  type: 'notify';
  title: string;
  message: string;
}

export interface TranslatePageAction extends ActionWithNote {
  type: 'translatePage';
  targetLanguage: string;              // ISO 639-1 language code (e.g., "en", "es", "fr")
  sourceLanguage?: string;             // Optional: auto-detect if not specified
  fallbackStrategy?: 'native-only' | 'llm-only' | 'google-only' |
                     'native-then-llm' | 'native-then-google' |
                     'llm-then-google' | 'native-then-llm-then-google'; // Default: 'native-then-llm'
}

// Process Management
export interface StartProcessAction extends ActionWithNote {
  type: 'startProcess';
  processId: string;
  actions: Action[];
}

export interface StopProcessAction extends ActionWithNote {
  type: 'stopProcess';
  processId: string;
}

export interface RegisterCleanupAction extends ActionWithNote {
  type: 'registerCleanup';
  processId: string;
  actions: Action[];
}

// Return/Exit
export interface ReturnAction extends ActionWithNote {
  type: 'return';
  value: any;
}

/**
 * AI-generated note for a node, persisted in agent config
 */
export interface AINote {
  content: string;
  configHash: string;  // Hash of node config to detect changes
}

/**
 * Base action interface extension for AI notes
 * All action types can have an optional _aiNote field
 */
export interface ActionWithNote {
  _aiNote?: AINote;
}

/**
 * Condition types for control flow
 */
export type Condition =
  | ExistsCondition
  | EqualsCondition
  | GreaterThanCondition
  | LessThanCondition
  | ContainsCondition
  | IsEmptyCondition
  | AndCondition
  | OrCondition
  | NotCondition;

export interface ExistsCondition {
  type: 'exists';
  target: string;
}

export interface EqualsCondition {
  type: 'equals';
  left: string;
  right: any;
}

export interface GreaterThanCondition {
  type: 'greaterThan';
  left: string;
  right: number;
}

export interface LessThanCondition {
  type: 'lessThan';
  left: string;
  right: number;
}

export interface ContainsCondition {
  type: 'contains';
  source: string;
  value: any;
}

export interface IsEmptyCondition {
  type: 'isEmpty';
  target: string;
}

export interface AndCondition {
  type: 'and';
  conditions: Condition[];
}

export interface OrCondition {
  type: 'or';
  conditions: Condition[];
}

export interface NotCondition {
  type: 'not';
  condition: Condition;
}

/**
 * Transform types for data operations
 */
export type Transform =
  | ToLowerCaseTransform
  | ToUpperCaseTransform
  | TrimTransform
  | SplitTransform
  | JoinTransform
  | ParseIntTransform
  | ParseFloatTransform
  | JsonParseTransform
  | JsonStringifyTransform
  | MapTransform;

export interface ToLowerCaseTransform {
  type: 'toLowerCase';
}

export interface ToUpperCaseTransform {
  type: 'toUpperCase';
}

export interface TrimTransform {
  type: 'trim';
}

export interface SplitTransform {
  type: 'split';
  delimiter: string;
}

export interface JoinTransform {
  type: 'join';
  delimiter: string;
}

export interface ParseIntTransform {
  type: 'parseInt';
}

export interface ParseFloatTransform {
  type: 'parseFloat';
}

export interface JsonParseTransform {
  type: 'jsonParse';
}

export interface JsonStringifyTransform {
  type: 'jsonStringify';
}

export interface MapTransform {
  type: 'map';
  field: string;
}

/**
 * Result returned by capability execution
 */
export interface CapabilityResult {
  success: boolean;
  data?: any;
  error?: string;
}
