/**
 * Visual styles and color definitions for the Agent Flow Editor
 */

// Block category colors
export const CATEGORY_COLORS = {
  entry: {
    bg: '#9333ea',      // Purple
    border: '#7c3aed',
    text: '#ffffff',
    light: '#f3e8ff',
  },
  dom: {
    bg: '#22c55e',      // Green
    border: '#16a34a',
    text: '#ffffff',
    light: '#dcfce7',
  },
  control: {
    bg: '#f97316',      // Orange
    border: '#ea580c',
    text: '#ffffff',
    light: '#ffedd5',
  },
  data: {
    bg: '#3b82f6',      // Blue
    border: '#2563eb',
    text: '#ffffff',
    light: '#dbeafe',
  },
  client: {
    bg: '#eab308',      // Yellow
    border: '#ca8a04',
    text: '#1f2937',
    light: '#fef9c3',
  },
  llm: {
    bg: '#ec4899',      // Magenta/Pink
    border: '#db2777',
    text: '#ffffff',
    light: '#fce7f3',
  },
  chrome: {
    bg: '#6b7280',      // Gray
    border: '#4b5563',
    text: '#ffffff',
    light: '#f3f4f6',
  },
  exit: {
    bg: '#ef4444',      // Red
    border: '#dc2626',
    text: '#ffffff',
    light: '#fee2e2',
  },
} as const;

// Category icons
export const CATEGORY_ICONS: Record<string, string> = {
  entry: '📥',
  dom: '🔍',
  control: '🔀',
  data: '📦',
  client: '🌐',
  llm: '🤖',
  chrome: '🔧',
  exit: '🚪',
};

// Map action types to categories
export function getCategoryForAction(actionType: string): keyof typeof CATEGORY_COLORS {
  const categoryMap: Record<string, keyof typeof CATEGORY_COLORS> = {
    // DOM actions
    querySelector: 'dom',
    querySelectorAll: 'dom',
    click: 'dom',
    remove: 'dom',
    setAttribute: 'dom',
    getAttribute: 'dom',
    getText: 'dom',
    setValue: 'dom',
    addStyle: 'dom',

    // Control flow
    if: 'control',
    forEach: 'control',
    while: 'control',
    wait: 'control',
    waitFor: 'control',

    // Data operations
    set: 'data',
    get: 'data',
    transform: 'data',
    merge: 'data',

    // Client calls
    callClient: 'client',

    // LLM operations
    inspectPage: 'llm',
    analyzeWithLLM: 'llm',
    callLLMForOperations: 'llm',
    executeSafeOperations: 'llm',
    executeScript: 'llm',

    // Chrome APIs
    'storage.get': 'chrome',
    'storage.set': 'chrome',
    'tabs.create': 'chrome',
    notify: 'chrome',
    translatePage: 'chrome',

    // Process management
    startProcess: 'control',
    stopProcess: 'control',
    registerCleanup: 'control',

    // Exit
    return: 'exit',
  };

  return categoryMap[actionType] || 'data';
}

// Get icon for action type
export function getIconForAction(actionType: string): string {
  const iconMap: Record<string, string> = {
    // DOM
    querySelector: '🔍',
    querySelectorAll: '🔍',
    click: '👆',
    remove: '🗑️',
    setAttribute: '✏️',
    getAttribute: '📖',
    getText: '📝',
    setValue: '✍️',
    addStyle: '🎨',

    // Control
    if: '🔀',
    forEach: '🔁',
    while: '🔄',
    wait: '⏱️',
    waitFor: '⏳',

    // Data
    set: '📥',
    get: '📤',
    transform: '🔄',
    merge: '🔗',

    // Client
    callClient: '🌐',

    // LLM
    inspectPage: '🔬',
    analyzeWithLLM: '🤖',
    callLLMForOperations: '🧠',
    executeSafeOperations: '⚡',
    executeScript: '💻',

    // Chrome
    'storage.get': '📂',
    'storage.set': '💾',
    'tabs.create': '🪟',
    notify: '🔔',
    translatePage: '🌍',

    // Process
    startProcess: '▶️',
    stopProcess: '⏹️',
    registerCleanup: '🧹',

    // Exit
    return: '🚪',
  };

  return iconMap[actionType] || '📦';
}

// React Flow edge styles
export const EDGE_STYLES = {
  execution: {
    stroke: '#64748b',
    strokeWidth: 2,
  },
  data: {
    stroke: '#3b82f6',
    strokeWidth: 2,
    strokeDasharray: '5,5',
  },
  branchTrue: {
    stroke: '#22c55e',
    strokeWidth: 2,
  },
  branchFalse: {
    stroke: '#ef4444',
    strokeWidth: 2,
  },
};

// Node dimensions - larger to accommodate integrated AI notes
export const NODE_DIMENSIONS = {
  width: 280,
  height: 160,
  spacing: {
    horizontal: 80,
    vertical: 150,
  },
};
