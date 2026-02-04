/**
 * Type definitions for config-based agents
 *
 * Agents are defined as JSON configs with optional JavaScript snippets,
 * executed by the agent engine in extension context.
 */

import type { ConfigField } from '../agents/AgentInterface';

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
export interface QuerySelectorAction {
  type: 'querySelector';
  selector: string;
  saveAs?: string;
}

export interface QuerySelectorAllAction {
  type: 'querySelectorAll';
  selector: string;
  saveAs?: string;
}

export interface ClickAction {
  type: 'click';
  target: string;
}

export interface RemoveAction {
  type: 'remove';
  target: string;
}

export interface SetAttributeAction {
  type: 'setAttribute';
  target: string;
  attr: string;
  value: string;
}

export interface GetAttributeAction {
  type: 'getAttribute';
  target: string;
  attr: string;
  saveAs: string;
}

export interface GetTextAction {
  type: 'getText';
  target: string;
  saveAs: string;
}

export interface SetValueAction {
  type: 'setValue';
  target: string;
  value: string;
}

export interface AddStyleAction {
  type: 'addStyle';
  target: string;
  styles: Record<string, string>;
}

// JavaScript Execution
export interface ExecuteScriptAction {
  type: 'executeScript';
  script: string;                       // JavaScript code to execute
  args?: string[];                      // Variable names to pass as arguments
  saveAs?: string;                      // Save return value to variable
  timeout?: number;                     // Optional timeout in ms
}

// Client Calls
export interface CallClientAction {
  type: 'callClient';
  client: string;
  method: string;
  params: Record<string, any>;
  saveAs?: string;
}

// Control Flow
export interface IfAction {
  type: 'if';
  condition: Condition;
  then: Action[];
  else?: Action[];
}

export interface ForEachAction {
  type: 'forEach';
  source: string;
  itemAs: string;
  do: Action[];
}

export interface WhileAction {
  type: 'while';
  condition: Condition;
  do: Action[];
  maxIterations?: number;
}

export interface WaitAction {
  type: 'wait';
  ms: number;
}

export interface WaitForAction {
  type: 'waitFor';
  selector: string;
  timeout?: number;
}

// Data Operations
export interface SetVariableAction {
  type: 'set';
  variable: string;
  value: any;
}

export interface GetVariableAction {
  type: 'get';
  variable: string;
  saveAs: string;
}

export interface TransformAction {
  type: 'transform';
  source: string;
  transform: Transform;
  saveAs: string;
}

export interface MergeAction {
  type: 'merge';
  sources: string[];
  saveAs: string;
}

// Chrome APIs
export interface StorageGetAction {
  type: 'storage.get';
  keys: string | string[];
  saveAs: string;
}

export interface StorageSetAction {
  type: 'storage.set';
  items: Record<string, any>;
}

export interface TabsCreateAction {
  type: 'tabs.create';
  url: string;
}

export interface NotifyAction {
  type: 'notify';
  title: string;
  message: string;
}

export interface TranslatePageAction {
  type: 'translatePage';
  targetLanguage: string;              // ISO 639-1 language code (e.g., "en", "es", "fr")
  sourceLanguage?: string;             // Optional: auto-detect if not specified
  fallbackStrategy?: 'native-only' | 'llm-only' | 'google-only' |
                     'native-then-llm' | 'native-then-google' |
                     'llm-then-google' | 'native-then-llm-then-google'; // Default: 'native-then-llm'
}

// Process Management
export interface StartProcessAction {
  type: 'startProcess';
  processId: string;
  actions: Action[];
}

export interface StopProcessAction {
  type: 'stopProcess';
  processId: string;
}

export interface RegisterCleanupAction {
  type: 'registerCleanup';
  processId: string;
  actions: Action[];
}

// Return/Exit
export interface ReturnAction {
  type: 'return';
  value: any;
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
