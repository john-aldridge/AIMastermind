import { AgentTemplate } from '../types/agentSource';

export const BLANK_AGENT_TEMPLATE = `import {
  AgentBase,
  AgentMetadata,
  ConfigField,
  AgentCapabilityDefinition,
  CapabilityResult
} from '@/agents/AgentInterface';

/**
 * Blank agent template
 *
 * Replace "MyAgent" with your agent's name.
 * Update the metadata below with your agent's details.
 */
export class MyAgent extends AgentBase {
  getMetadata(): AgentMetadata {
    return {
      id: 'my-agent',
      name: 'My Agent',
      description: 'A blank agent template',
      version: '1.0.0',
      author: 'Your Name',
      tags: ['custom'],
    };
  }

  getConfigFields(): ConfigField[] {
    return [
      // Add configuration fields here if needed
      // Example:
      // {
      //   key: 'apiKey',
      //   label: 'API Key',
      //   type: 'text',
      //   required: true,
      //   placeholder: 'Enter your API key',
      //   helpText: 'Your API key for authentication'
      // }
    ];
  }

  getDependencies(): string[] {
    return []; // Add client dependencies if needed (e.g., ['anthropic-api'])
  }

  getCapabilities(): AgentCapabilityDefinition[] {
    return [
      {
        name: 'my_capability',
        description: 'Description of what this capability does',
        parameters: [
          {
            name: 'input',
            type: 'string',
            description: 'Input parameter',
            required: true,
          },
        ],
        isLongRunning: false, // Set to true if this capability starts long-running processes
      },
    ];
  }

  async executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    if (capabilityName === 'my_capability') {
      const result = await this.myCapability(parameters.input);
      return {
        success: true,
        data: { result },
      };
    }

    return {
      success: false,
      error: \`Unknown capability: \${capabilityName}\`,
    };
  }

  private async myCapability(input: string): Promise<string> {
    // Implement your capability logic here

    // Example: Access Chrome APIs via this.api bridge
    // Storage API:
    // const data = await this.api.storage.get('myKey');
    // await this.api.storage.set({ myKey: 'value' });
    //
    // Tabs API:
    // await this.api.tabs.create({ url: 'https://example.com' });
    //
    // Notifications API:
    // await this.api.notifications.create({
    //   type: 'basic',
    //   title: 'Alert',
    //   message: 'Task complete'
    // });
    //
    // DOM Manipulation (works natively in page context):
    // document.querySelector('.element').textContent = 'Updated';
    //
    // Long-running processes (use Process Registry):
    // const observer = new MutationObserver(() => { ... });
    // observer.observe(document.body, { childList: true });
    // this.registerProcess('watch', {
    //   type: 'mutation-observer',
    //   cleanup: () => observer.disconnect()
    // });

    return \`Processed: \${input}\`;
  }
}

// Export default for module loading
export default MyAgent;
`;

export const EXAMPLE_AGENT_TEMPLATE = `import {
  AgentBase,
  AgentMetadata,
  ConfigField,
  AgentCapabilityDefinition,
  CapabilityResult
} from '@/agents/AgentInterface';

/**
 * Example agent demonstrating various capabilities including long-running processes
 */
export class ExampleAgent extends AgentBase {
  private watcherProcessId: string | null = null;

  getMetadata(): AgentMetadata {
    return {
      id: 'example-agent',
      name: 'Example Agent',
      description: 'An example agent showing common patterns including Process Registry usage',
      version: '1.0.0',
      author: 'Example Author',
      tags: ['example', 'tutorial'],
    };
  }

  getConfigFields(): ConfigField[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getCapabilities(): AgentCapabilityDefinition[] {
    return [
      {
        name: 'text_transform',
        description: 'Transform text in various ways (uppercase, lowercase, reverse, capitalize)',
        parameters: [
          {
            name: 'text',
            type: 'string',
            description: 'Text to transform',
            required: true,
          },
          {
            name: 'operation',
            type: 'string',
            description: 'Operation: uppercase, lowercase, reverse, or capitalize',
            required: true,
          },
        ],
        isLongRunning: false,
      },
      {
        name: 'watch_clicks',
        description: 'Watch for clicks on the page and log them (demonstrates Process Registry)',
        parameters: [],
        isLongRunning: true, // This starts a long-running process
      },
      {
        name: 'stop_watching',
        description: 'Stop watching for clicks',
        parameters: [],
        isLongRunning: false,
      },
    ];
  }

  async executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    if (capabilityName === 'text_transform') {
      try {
        const result = await this.textTransform(parameters.text, parameters.operation);
        return {
          success: true,
          data: { result },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Transform failed',
        };
      }
    }

    if (capabilityName === 'watch_clicks') {
      return this.watchClicks();
    }

    if (capabilityName === 'stop_watching') {
      return this.stopWatching();
    }

    return {
      success: false,
      error: \`Unknown capability: \${capabilityName}\`,
    };
  }

  private async textTransform(text: string, operation: string): Promise<string> {
    switch (operation.toLowerCase()) {
      case 'uppercase':
        return text.toUpperCase();

      case 'lowercase':
        return text.toLowerCase();

      case 'reverse':
        return text.split('').reverse().join('');

      case 'capitalize':
        return text
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

      default:
        throw new Error(\`Unknown operation: \${operation}\`);
    }
  }

  /**
   * Example of a long-running capability using Process Registry
   */
  private watchClicks(): CapabilityResult {
    // Stop existing watcher if any
    if (this.watcherProcessId) {
      this.stopProcess(this.watcherProcessId);
    }

    let clickCount = 0;

    // Create click handler
    const handleClick = (event: MouseEvent) => {
      clickCount++;
      const target = event.target as HTMLElement;
      console.log(\`[ExampleAgent] Click #\${clickCount} on:\`, target.tagName, target.className);
    };

    // Add event listener
    document.addEventListener('click', handleClick, true);

    // IMPORTANT: Register the process for tracking and cleanup
    const processId = this.registerProcess('watch_clicks', {
      type: 'event-listener',
      cleanup: () => {
        document.removeEventListener('click', handleClick, true);
        console.log(\`[ExampleAgent] Stopped watching clicks. Total: \${clickCount}\`);
      },
      metadata: {
        description: 'Watch for clicks on the page',
        event: 'click',
        capture: true,
      },
    });

    this.watcherProcessId = processId;

    return {
      success: true,
      data: {
        message: 'Started watching for clicks. Check console for output.',
        processId,
      },
    };
  }

  /**
   * Stop the click watcher
   */
  private stopWatching(): CapabilityResult {
    if (!this.watcherProcessId) {
      return {
        success: false,
        error: 'No active watcher found',
      };
    }

    const stopped = this.stopProcess(this.watcherProcessId);

    if (stopped) {
      this.watcherProcessId = null;
      return {
        success: true,
        data: { message: 'Stopped watching for clicks' },
      };
    }

    return {
      success: false,
      error: 'Failed to stop watcher',
    };
  }
}

// Export default for module loading
export default ExampleAgent;
`;

export const DATA_ANALYZER_TEMPLATE = `import {
  AgentBase,
  AgentMetadata,
  ConfigField,
  AgentCapabilityDefinition,
  CapabilityResult
} from '@/agents/AgentInterface';

/**
 * Data analyzer agent for working with structured data
 */
export class DataAnalyzerAgent extends AgentBase {
  getMetadata(): AgentMetadata {
    return {
      id: 'data-analyzer',
      name: 'Data Analyzer',
      description: 'Analyze and process structured data',
      version: '1.0.0',
      author: 'Your Name',
      tags: ['data', 'analysis'],
    };
  }

  getConfigFields(): ConfigField[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getCapabilities(): AgentCapabilityDefinition[] {
    return [
      {
        name: 'extract_fields',
        description: 'Extract specific fields from data objects',
        parameters: [
          {
            name: 'data',
            type: 'array',
            description: 'Array of data objects',
            required: true,
          },
          {
            name: 'fields',
            type: 'array',
            description: 'Field names to extract',
            required: true,
          },
        ],
        isLongRunning: false,
      },
      {
        name: 'filter_data',
        description: 'Filter data based on criteria',
        parameters: [
          {
            name: 'data',
            type: 'array',
            description: 'Array of data objects',
            required: true,
          },
          {
            name: 'field',
            type: 'string',
            description: 'Field to filter on',
            required: true,
          },
          {
            name: 'value',
            type: 'any',
            description: 'Value to match',
            required: true,
          },
        ],
        isLongRunning: false,
      },
      {
        name: 'aggregate_data',
        description: 'Aggregate data by field',
        parameters: [
          {
            name: 'data',
            type: 'array',
            description: 'Array of data objects',
            required: true,
          },
          {
            name: 'groupBy',
            type: 'string',
            description: 'Field to group by',
            required: true,
          },
        ],
        isLongRunning: false,
      },
    ];
  }

  async executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    try {
      if (capabilityName === 'extract_fields') {
        const result = await this.extractFields(parameters.data, parameters.fields);
        return {
          success: true,
          data: result,
        };
      }

      if (capabilityName === 'filter_data') {
        const result = await this.filterData(parameters.data, parameters.field, parameters.value);
        return {
          success: true,
          data: result,
        };
      }

      if (capabilityName === 'aggregate_data') {
        const result = await this.aggregateData(parameters.data, parameters.groupBy);
        return {
          success: true,
          data: result,
        };
      }

      return {
        success: false,
        error: \`Unknown capability: \${capabilityName}\`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
      };
    }
  }

  private async extractFields(data: any[], fields: string[]): Promise<any[]> {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    if (!Array.isArray(fields)) {
      throw new Error('Fields must be an array');
    }

    return data.map((item) => {
      const extracted: any = {};
      fields.forEach((field) => {
        if (field in item) {
          extracted[field] = item[field];
        }
      });
      return extracted;
    });
  }

  private async filterData(data: any[], field: string, value: any): Promise<any[]> {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    return data.filter((item) => item[field] === value);
  }

  private async aggregateData(data: any[], groupBy: string): Promise<Record<string, any[]>> {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    const aggregated: Record<string, any[]> = {};

    data.forEach((item) => {
      const key = item[groupBy];
      if (key !== undefined) {
        if (!aggregated[key]) {
          aggregated[key] = [];
        }
        aggregated[key].push(item);
      }
    });

    return aggregated;
  }
}

// Export default for module loading
export default DataAnalyzerAgent;
`;

export const README_TEMPLATE = `# Agent Name

## Overview
A brief description of what this agent does and why it's useful.

## Features
- **Feature 1**: Description of the first key feature
- **Feature 2**: Description of the second key feature
- **Feature 3**: Description of the third key feature

## Capabilities

### capability_name
Description of what this capability does.

**Parameters:**
- \`parameter1\` (string, required): Description of parameter 1
- \`parameter2\` (number, optional): Description of parameter 2

**Example:**
\`\`\`
Ask the AI: "Use [agent-name] to capability_name with parameter1='example'"
\`\`\`

**Returns:**
Description of what this capability returns.

## Usage Examples

### Example 1: Basic Usage
\`\`\`
User: "Use this agent to process my data"
AI: [Uses the agent's capability to process the data]
\`\`\`

### Example 2: Advanced Usage
\`\`\`
User: "Analyze these items and generate a report"
AI: [Uses multiple capabilities to complete the task]
\`\`\`

## Configuration
Any special configuration or setup required for this agent.

## Notes
- Important note 1
- Important note 2
- Limitation or known issue

## Version History
- **1.0.0**: Initial release
`;

export const DOM_WATCHER_TEMPLATE = `import {
  AgentBase,
  AgentMetadata,
  ConfigField,
  AgentCapabilityDefinition,
  CapabilityResult
} from '@/agents/AgentInterface';

/**
 * DOM Watcher Agent
 *
 * Template for agents that watch and manipulate the DOM.
 * Demonstrates proper use of MutationObserver with Process Registry.
 */
export class DOMWatcherAgent extends AgentBase {
  private observerProcessId: string | null = null;

  getMetadata(): AgentMetadata {
    return {
      id: 'dom-watcher',
      name: 'DOM Watcher',
      description: 'Watch for DOM changes and manipulate elements',
      version: '1.0.0',
      author: 'Your Name',
      tags: ['dom', 'automation'],
    };
  }

  getConfigFields(): ConfigField[] {
    return [];
  }

  getDependencies(): string[] {
    return [];
  }

  getCapabilities(): AgentCapabilityDefinition[] {
    return [
      {
        name: 'remove_elements',
        description: 'Remove elements matching a CSS selector (one-time)',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for elements to remove',
            required: true,
          },
        ],
        isLongRunning: false,
      },
      {
        name: 'watch_and_remove',
        description: 'Continuously watch for and remove elements matching a selector',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for elements to watch and remove',
            required: true,
          },
        ],
        isLongRunning: true,
      },
      {
        name: 'stop_watching',
        description: 'Stop watching for DOM changes',
        parameters: [],
        isLongRunning: false,
      },
    ];
  }

  async executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    if (capabilityName === 'remove_elements') {
      return this.removeElements(parameters.selector);
    }

    if (capabilityName === 'watch_and_remove') {
      return this.watchAndRemove(parameters.selector);
    }

    if (capabilityName === 'stop_watching') {
      return this.stopWatching();
    }

    return {
      success: false,
      error: \`Unknown capability: \${capabilityName}\`,
    };
  }

  /**
   * Remove elements once (not long-running)
   */
  private removeElements(selector: string): CapabilityResult {
    try {
      const elements = document.querySelectorAll(selector);
      const count = elements.length;

      elements.forEach((el) => el.remove());

      return {
        success: true,
        data: {
          removedCount: count,
          message: \`Removed \${count} element(s) matching "\${selector}"\`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove elements',
      };
    }
  }

  /**
   * Watch for and remove elements continuously (long-running)
   */
  private watchAndRemove(selector: string): CapabilityResult {
    // Stop existing observer if any
    if (this.observerProcessId) {
      this.stopProcess(this.observerProcessId);
    }

    // Remove existing elements first
    const initialRemoval = this.removeElements(selector);
    const initialCount = (initialRemoval.data as any)?.removedCount || 0;

    let watchRemovedCount = 0;

    // Create MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check added nodes
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if the node itself matches
            if (node.matches(selector)) {
              console.log(\`[DOMWatcher] Removing matched element:\`, node);
              node.remove();
              watchRemovedCount++;
            }

            // Check children
            const matchedChildren = node.querySelectorAll(selector);
            matchedChildren.forEach((child) => {
              console.log(\`[DOMWatcher] Removing matched child:\`, child);
              child.remove();
              watchRemovedCount++;
            });
          }
        });
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // IMPORTANT: Register the process for tracking and cleanup
    const processId = this.registerProcess('watch_and_remove', {
      type: 'mutation-observer',
      cleanup: () => {
        observer.disconnect();
        console.log(
          \`[DOMWatcher] Stopped watching. Initial: \${initialCount}, Watch: \${watchRemovedCount}\`
        );
      },
      metadata: {
        description: \`Watch for and remove elements matching "\${selector}"\`,
        target: 'document.body',
        selector,
        initialRemoved: initialCount,
        watchRemoved: watchRemovedCount,
      },
    });

    this.observerProcessId = processId;

    return {
      success: true,
      data: {
        processId,
        initialRemoved: initialCount,
        message: \`Removed \${initialCount} element(s) and started watching for more\`,
        selector,
      },
    };
  }

  /**
   * Stop the DOM watcher
   */
  private stopWatching(): CapabilityResult {
    if (!this.observerProcessId) {
      return {
        success: false,
        error: 'No active watcher found',
      };
    }

    const stopped = this.stopProcess(this.observerProcessId);

    if (stopped) {
      this.observerProcessId = null;
      return {
        success: true,
        data: { message: 'Stopped watching for DOM changes' },
      };
    }

    return {
      success: false,
      error: 'Failed to stop watcher',
    };
  }
}

// Export default for module loading
export default DOMWatcherAgent;
`;

export const PLUGIN_TEMPLATES: AgentTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Agent',
    description: 'Start from scratch with a minimal template',
    code: BLANK_AGENT_TEMPLATE,
  },
  {
    id: 'example',
    name: 'Example Agent',
    description: 'Full-featured example with Process Registry usage',
    code: EXAMPLE_AGENT_TEMPLATE,
  },
  {
    id: 'dom-watcher',
    name: 'DOM Watcher',
    description: 'Watch and manipulate DOM elements with MutationObserver',
    code: DOM_WATCHER_TEMPLATE,
  },
  {
    id: 'data-analyzer',
    name: 'Data Analyzer',
    description: 'Template for data processing and analysis',
    code: DATA_ANALYZER_TEMPLATE,
  },
];
