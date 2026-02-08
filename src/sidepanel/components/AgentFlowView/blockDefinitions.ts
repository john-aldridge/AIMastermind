/**
 * Block type definitions for the visual flow editor
 * Defines all available blocks, their defaults, and validation rules
 */

import type { Action } from '../../../types/agentConfig';

export interface BlockDefinition {
  type: string;
  label: string;
  icon: string;
  category: 'dom' | 'control' | 'data' | 'client' | 'llm' | 'chrome' | 'exit';
  description: string;
  defaultConfig: Partial<Action>;
  fields: BlockField[];
}

export interface BlockField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'variable' | 'json';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  default?: any;
}

// DOM Operations
export const DOM_BLOCKS: BlockDefinition[] = [
  {
    type: 'querySelector',
    label: 'Find Element',
    icon: '🔍',
    category: 'dom',
    description: 'Find a single element matching a CSS selector',
    defaultConfig: { type: 'querySelector', selector: '', saveAs: 'element' },
    fields: [
      { key: 'selector', label: 'CSS Selector', type: 'text', required: true, placeholder: '.my-class, #my-id' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: false, placeholder: 'element' },
    ],
  },
  {
    type: 'querySelectorAll',
    label: 'Find All Elements',
    icon: '🔍',
    category: 'dom',
    description: 'Find all elements matching a CSS selector',
    defaultConfig: { type: 'querySelectorAll', selector: '', saveAs: 'elements' },
    fields: [
      { key: 'selector', label: 'CSS Selector', type: 'text', required: true, placeholder: '.items' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: false, placeholder: 'elements' },
    ],
  },
  {
    type: 'click',
    label: 'Click',
    icon: '👆',
    category: 'dom',
    description: 'Click on an element',
    defaultConfig: { type: 'click', target: '' },
    fields: [
      { key: 'target', label: 'Target', type: 'text', required: true, placeholder: '{{element}} or .selector', helpText: 'Variable reference or CSS selector' },
    ],
  },
  {
    type: 'remove',
    label: 'Remove',
    icon: '🗑️',
    category: 'dom',
    description: 'Remove an element from the page',
    defaultConfig: { type: 'remove', target: '' },
    fields: [
      { key: 'target', label: 'Target', type: 'text', required: true, placeholder: '{{element}} or .selector' },
    ],
  },
  {
    type: 'setAttribute',
    label: 'Set Attribute',
    icon: '✏️',
    category: 'dom',
    description: 'Set an attribute on an element',
    defaultConfig: { type: 'setAttribute', target: '', attr: '', value: '' },
    fields: [
      { key: 'target', label: 'Target', type: 'text', required: true, placeholder: '{{element}}' },
      { key: 'attr', label: 'Attribute', type: 'text', required: true, placeholder: 'class' },
      { key: 'value', label: 'Value', type: 'text', required: true, placeholder: 'new-class' },
    ],
  },
  {
    type: 'getAttribute',
    label: 'Get Attribute',
    icon: '📖',
    category: 'dom',
    description: 'Get an attribute value from an element',
    defaultConfig: { type: 'getAttribute', target: '', attr: '', saveAs: '' },
    fields: [
      { key: 'target', label: 'Target', type: 'text', required: true, placeholder: '{{element}}' },
      { key: 'attr', label: 'Attribute', type: 'text', required: true, placeholder: 'href' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: true, placeholder: 'attrValue' },
    ],
  },
  {
    type: 'getText',
    label: 'Get Text',
    icon: '📝',
    category: 'dom',
    description: 'Get text content from an element',
    defaultConfig: { type: 'getText', target: '', saveAs: '' },
    fields: [
      { key: 'target', label: 'Target', type: 'text', required: true, placeholder: '{{element}}' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: true, placeholder: 'textContent' },
    ],
  },
  {
    type: 'setValue',
    label: 'Set Value',
    icon: '✍️',
    category: 'dom',
    description: 'Set the value of an input element',
    defaultConfig: { type: 'setValue', target: '', value: '' },
    fields: [
      { key: 'target', label: 'Target', type: 'text', required: true, placeholder: '{{input}}' },
      { key: 'value', label: 'Value', type: 'text', required: true, placeholder: 'new value' },
    ],
  },
  {
    type: 'addStyle',
    label: 'Add Style',
    icon: '🎨',
    category: 'dom',
    description: 'Add inline styles to an element',
    defaultConfig: { type: 'addStyle', target: '', styles: {} },
    fields: [
      { key: 'target', label: 'Target', type: 'text', required: true, placeholder: '{{element}}' },
      { key: 'styles', label: 'Styles (JSON)', type: 'json', required: true, placeholder: '{"display": "none"}' },
    ],
  },
];

// Control Flow Blocks
export const CONTROL_BLOCKS: BlockDefinition[] = [
  {
    type: 'if',
    label: 'If/Else',
    icon: '🔀',
    category: 'control',
    description: 'Conditional branching based on a condition',
    defaultConfig: { type: 'if', condition: { type: 'exists', target: '' }, then: [], else: [] },
    fields: [
      { key: 'condition', label: 'Condition', type: 'json', required: true, placeholder: '{"type": "exists", "target": "{{element}}"}' },
    ],
  },
  {
    type: 'forEach',
    label: 'For Each',
    icon: '🔁',
    category: 'control',
    description: 'Loop over each item in an array',
    defaultConfig: { type: 'forEach', source: '', itemAs: 'item', do: [] },
    fields: [
      { key: 'source', label: 'Source Array', type: 'variable', required: true, placeholder: 'elements' },
      { key: 'itemAs', label: 'Item Variable', type: 'variable', required: true, placeholder: 'item', default: 'item' },
    ],
  },
  {
    type: 'while',
    label: 'While Loop',
    icon: '🔄',
    category: 'control',
    description: 'Repeat actions while a condition is true',
    defaultConfig: { type: 'while', condition: { type: 'exists', target: '' }, do: [], maxIterations: 10 },
    fields: [
      { key: 'condition', label: 'Condition', type: 'json', required: true, placeholder: '{"type": "exists", "target": ".element"}' },
      { key: 'maxIterations', label: 'Max Iterations', type: 'number', required: false, default: 10 },
    ],
  },
  {
    type: 'wait',
    label: 'Wait',
    icon: '⏱️',
    category: 'control',
    description: 'Wait for a specified duration',
    defaultConfig: { type: 'wait', ms: 1000 },
    fields: [
      { key: 'ms', label: 'Duration (ms)', type: 'number', required: true, placeholder: '1000', default: 1000 },
    ],
  },
  {
    type: 'waitFor',
    label: 'Wait For Element',
    icon: '⏳',
    category: 'control',
    description: 'Wait for an element to appear',
    defaultConfig: { type: 'waitFor', selector: '', timeout: 5000 },
    fields: [
      { key: 'selector', label: 'CSS Selector', type: 'text', required: true, placeholder: '.loading-complete' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', required: false, default: 5000 },
    ],
  },
];

// Data Operation Blocks
export const DATA_BLOCKS: BlockDefinition[] = [
  {
    type: 'set',
    label: 'Set Variable',
    icon: '📥',
    category: 'data',
    description: 'Set a variable to a value',
    defaultConfig: { type: 'set', variable: '', value: '' },
    fields: [
      { key: 'variable', label: 'Variable Name', type: 'variable', required: true, placeholder: 'myVar' },
      { key: 'value', label: 'Value', type: 'text', required: true, placeholder: 'value or {{ref}}' },
    ],
  },
  {
    type: 'get',
    label: 'Get Variable',
    icon: '📤',
    category: 'data',
    description: 'Get a variable and save to another',
    defaultConfig: { type: 'get', variable: '', saveAs: '' },
    fields: [
      { key: 'variable', label: 'Source Variable', type: 'variable', required: true, placeholder: 'sourceVar' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: true, placeholder: 'targetVar' },
    ],
  },
  {
    type: 'transform',
    label: 'Transform',
    icon: '🔄',
    category: 'data',
    description: 'Transform a value using a function',
    defaultConfig: { type: 'transform', source: '', transform: { type: 'toLowerCase' }, saveAs: '' },
    fields: [
      { key: 'source', label: 'Source', type: 'variable', required: true, placeholder: 'inputVar' },
      { key: 'transform', label: 'Transform', type: 'json', required: true, placeholder: '{"type": "toLowerCase"}' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: true, placeholder: 'outputVar' },
    ],
  },
  {
    type: 'merge',
    label: 'Merge',
    icon: '🔗',
    category: 'data',
    description: 'Merge multiple arrays or objects',
    defaultConfig: { type: 'merge', sources: [], saveAs: '' },
    fields: [
      { key: 'sources', label: 'Sources (comma-separated)', type: 'text', required: true, placeholder: 'arr1, arr2' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: true, placeholder: 'merged' },
    ],
  },
];

// Client Call Blocks
export const CLIENT_BLOCKS: BlockDefinition[] = [
  {
    type: 'callClient',
    label: 'API Call',
    icon: '🌐',
    category: 'client',
    description: 'Call a registered API client',
    defaultConfig: { type: 'callClient', client: '', method: '', params: {}, saveAs: '' },
    fields: [
      { key: 'client', label: 'Client', type: 'text', required: true, placeholder: 'jira, pinterest' },
      { key: 'method', label: 'Method', type: 'text', required: true, placeholder: 'createIssue' },
      { key: 'params', label: 'Parameters (JSON)', type: 'json', required: false, placeholder: '{}' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: false, placeholder: 'result' },
    ],
  },
];

// LLM Operation Blocks
export const LLM_BLOCKS: BlockDefinition[] = [
  {
    type: 'inspectPage',
    label: 'Inspect Page',
    icon: '🔬',
    category: 'llm',
    description: 'Inspect the current page for analysis',
    defaultConfig: { type: 'inspectPage', findOverlays: true, saveAs: 'pageInfo' },
    fields: [
      { key: 'findOverlays', label: 'Find Overlays', type: 'boolean', required: false, default: true },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: false, placeholder: 'pageInfo' },
    ],
  },
  {
    type: 'analyzeWithLLM',
    label: 'AI Analysis',
    icon: '🤖',
    category: 'llm',
    description: 'Send data to LLM for analysis',
    defaultConfig: { type: 'analyzeWithLLM', context: '', prompt: '', saveAs: '' },
    fields: [
      { key: 'context', label: 'Context Variable', type: 'variable', required: true, placeholder: 'pageInfo' },
      { key: 'prompt', label: 'Analysis Prompt', type: 'textarea', required: true, placeholder: 'Analyze this content...' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: false, placeholder: 'analysis' },
    ],
  },
  {
    type: 'callLLMForOperations',
    label: 'AI Operations',
    icon: '🧠',
    category: 'llm',
    description: 'Ask LLM to generate safe operations',
    defaultConfig: { type: 'callLLMForOperations', context: '', goal: '', saveAs: '' },
    fields: [
      { key: 'context', label: 'Context Variable', type: 'variable', required: true, placeholder: 'pageInfo' },
      { key: 'goal', label: 'Goal', type: 'textarea', required: true, placeholder: 'Remove overlays blocking content' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: false, placeholder: 'operations' },
    ],
  },
  {
    type: 'executeSafeOperations',
    label: 'Run Operations',
    icon: '⚡',
    category: 'llm',
    description: 'Execute validated safe operations',
    defaultConfig: { type: 'executeSafeOperations', operations: '', validateFirst: true, stopOnError: false, saveAs: '' },
    fields: [
      { key: 'operations', label: 'Operations Variable', type: 'variable', required: true, placeholder: 'operations' },
      { key: 'validateFirst', label: 'Validate First', type: 'boolean', required: false, default: true },
      { key: 'stopOnError', label: 'Stop on Error', type: 'boolean', required: false, default: false },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: false, placeholder: 'results' },
    ],
  },
  {
    type: 'executeScript',
    label: 'JavaScript',
    icon: '💻',
    category: 'llm',
    description: 'Execute JavaScript in page context',
    defaultConfig: { type: 'executeScript', script: '', args: [], saveAs: '' },
    fields: [
      { key: 'script', label: 'JavaScript Code', type: 'textarea', required: true, placeholder: 'return document.title;' },
      { key: 'args', label: 'Arguments (comma-separated vars)', type: 'text', required: false, placeholder: 'element, data' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: false, placeholder: 'result' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', required: false, default: 5000 },
    ],
  },
];

// Chrome API Blocks
export const CHROME_BLOCKS: BlockDefinition[] = [
  {
    type: 'storage.get',
    label: 'Storage Get',
    icon: '📂',
    category: 'chrome',
    description: 'Get data from Chrome storage',
    defaultConfig: { type: 'storage.get', keys: [], saveAs: '' },
    fields: [
      { key: 'keys', label: 'Keys (comma-separated)', type: 'text', required: true, placeholder: 'key1, key2' },
      { key: 'saveAs', label: 'Save As', type: 'variable', required: true, placeholder: 'storageData' },
    ],
  },
  {
    type: 'storage.set',
    label: 'Storage Set',
    icon: '💾',
    category: 'chrome',
    description: 'Save data to Chrome storage',
    defaultConfig: { type: 'storage.set', items: {} },
    fields: [
      { key: 'items', label: 'Items (JSON)', type: 'json', required: true, placeholder: '{"key": "value"}' },
    ],
  },
  {
    type: 'tabs.create',
    label: 'Open Tab',
    icon: '🪟',
    category: 'chrome',
    description: 'Open a new browser tab',
    defaultConfig: { type: 'tabs.create', url: '' },
    fields: [
      { key: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://example.com' },
    ],
  },
  {
    type: 'notify',
    label: 'Notification',
    icon: '🔔',
    category: 'chrome',
    description: 'Show a browser notification',
    defaultConfig: { type: 'notify', title: '', message: '' },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Notification Title' },
      { key: 'message', label: 'Message', type: 'text', required: true, placeholder: 'Notification message...' },
    ],
  },
  {
    type: 'translatePage',
    label: 'Translate Page',
    icon: '🌍',
    category: 'chrome',
    description: 'Translate page content',
    defaultConfig: { type: 'translatePage', targetLanguage: 'en' },
    fields: [
      { key: 'targetLanguage', label: 'Target Language', type: 'text', required: true, placeholder: 'en, es, fr' },
      { key: 'sourceLanguage', label: 'Source Language', type: 'text', required: false, placeholder: 'auto-detect' },
    ],
  },
];

// Exit Block
export const EXIT_BLOCKS: BlockDefinition[] = [
  {
    type: 'return',
    label: 'Return',
    icon: '🚪',
    category: 'exit',
    description: 'Return a value and exit the capability',
    defaultConfig: { type: 'return', value: null },
    fields: [
      { key: 'value', label: 'Return Value', type: 'json', required: false, placeholder: '{"success": true}' },
    ],
  },
];

// Block palette organized by category
export const BLOCK_PALETTE = {
  DOM: DOM_BLOCKS,
  Control: CONTROL_BLOCKS,
  Data: DATA_BLOCKS,
  Client: CLIENT_BLOCKS,
  LLM: LLM_BLOCKS,
  Chrome: CHROME_BLOCKS,
  Exit: EXIT_BLOCKS,
};

// All blocks in a flat array
export const ALL_BLOCKS = [
  ...DOM_BLOCKS,
  ...CONTROL_BLOCKS,
  ...DATA_BLOCKS,
  ...CLIENT_BLOCKS,
  ...LLM_BLOCKS,
  ...CHROME_BLOCKS,
  ...EXIT_BLOCKS,
];

// Get block definition by type
export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return ALL_BLOCKS.find(block => block.type === type);
}
