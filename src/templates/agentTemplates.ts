import { AgentTemplate } from '../types/agentSource';

export const BLANK_AGENT_TEMPLATE = `import { AgentBase, Capability, CapabilityParameter } from '../agents/AgentBase';

/**
 * Blank agent template
 */
export class MyAgent extends AgentBase {
  getMetadata() {
    return {
      id: 'my-agent',
      name: 'My Plugin',
      description: 'A blank plugin template',
      version: '1.0.0',
      author: 'Your Name',
    };
  }

  getCapabilities(): Capability[] {
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
      },
    ];
  }

  async executeCapability(capabilityName: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityName) {
      case 'my_capability':
        return this.myCapability(parameters.input);

      default:
        throw new Error(\`Unknown capability: \${capabilityName}\`);
    }
  }

  private async myCapability(input: string): Promise<string> {
    // Implement your capability logic here
    return \`Processed: \${input}\`;
  }
}

// Export default for module loading
export default MyAgent;
`;

export const EXAMPLE_AGENT_TEMPLATE = `import { AgentBase, Capability, CapabilityParameter } from '../agents/AgentBase';

/**
 * Example agent demonstrating various capabilities
 */
export class ExampleAgent extends AgentBase {
  getMetadata() {
    return {
      id: 'example-agent',
      name: 'Example Plugin',
      description: 'An example agent showing common patterns',
      version: '1.0.0',
      author: 'Example Author',
    };
  }

  getCapabilities(): Capability[] {
    return [
      {
        name: 'text_transform',
        description: 'Transform text in various ways',
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
            description: 'Operation to perform: uppercase, lowercase, reverse, or capitalize',
            required: true,
          },
        ],
      },
      {
        name: 'analyze_data',
        description: 'Analyze structured data and return insights',
        parameters: [
          {
            name: 'data',
            type: 'object',
            description: 'Data to analyze',
            required: true,
          },
        ],
      },
      {
        name: 'generate_report',
        description: 'Generate a formatted report',
        parameters: [
          {
            name: 'title',
            type: 'string',
            description: 'Report title',
            required: true,
          },
          {
            name: 'content',
            type: 'array',
            description: 'Report content items',
            required: true,
          },
        ],
      },
    ];
  }

  async executeCapability(capabilityName: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityName) {
      case 'text_transform':
        return this.textTransform(parameters.text, parameters.operation);

      case 'analyze_data':
        return this.analyzeData(parameters.data);

      case 'generate_report':
        return this.generateReport(parameters.title, parameters.content);

      default:
        throw new Error(\`Unknown capability: \${capabilityName}\`);
    }
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

  private async analyzeData(data: any): Promise<object> {
    // Example analysis
    const analysis = {
      type: typeof data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : undefined,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : undefined,
      summary: \`Data contains \${Array.isArray(data) ? data.length + ' items' : typeof data === 'object' ? Object.keys(data).length + ' properties' : 'a ' + typeof data + ' value'}\`,
    };

    return analysis;
  }

  private async generateReport(title: string, content: any[]): Promise<string> {
    let report = \`# \${title}\\n\\n\`;
    report += \`Generated: \${new Date().toLocaleString()}\\n\\n\`;

    content.forEach((item, index) => {
      report += \`## Item \${index + 1}\\n\`;
      report += \`\${JSON.stringify(item, null, 2)}\\n\\n\`;
    });

    return report;
  }
}

// Export default for module loading
export default ExampleAgent;
`;

export const DATA_ANALYZER_TEMPLATE = `import { AgentBase, Capability, CapabilityParameter } from '../agents/AgentBase';

/**
 * Data analyzer agent for working with structured data
 */
export class DataAnalyzerAgent extends AgentBase {
  getMetadata() {
    return {
      id: 'data-analyzer',
      name: 'Data Analyzer',
      description: 'Analyze and process structured data',
      version: '1.0.0',
      author: 'Your Name',
    };
  }

  getCapabilities(): Capability[] {
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
      },
    ];
  }

  async executeCapability(capabilityName: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityName) {
      case 'extract_fields':
        return this.extractFields(parameters.data, parameters.fields);

      case 'filter_data':
        return this.filterData(parameters.data, parameters.field, parameters.value);

      case 'aggregate_data':
        return this.aggregateData(parameters.data, parameters.groupBy);

      default:
        throw new Error(\`Unknown capability: \${capabilityName}\`);
    }
  }

  private async extractFields(data: any[], fields: string[]): Promise<any[]> {
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
    return data.filter((item) => item[field] === value);
  }

  private async aggregateData(data: any[], groupBy: string): Promise<Record<string, any[]>> {
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

export const PLUGIN_TEMPLATES: AgentTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Plugin',
    description: 'Start from scratch with a minimal template',
    code: BLANK_AGENT_TEMPLATE,
  },
  {
    id: 'example',
    name: 'Example Plugin',
    description: 'Full-featured example with multiple capabilities',
    code: EXAMPLE_AGENT_TEMPLATE,
  },
  {
    id: 'data-analyzer',
    name: 'Data Analyzer',
    description: 'Template for data processing and analysis',
    code: DATA_ANALYZER_TEMPLATE,
  },
];
