import React, { useState } from 'react';
import { AgentSourceStorageService } from '@/storage/agentSourceStorage';

// Blank agent template
const BLANK_TEMPLATE = `import { AgentBase, Capability, CapabilityParameter } from '../agents/AgentBase';

/**
 * {{DESCRIPTION}}
 */
export class {{CLASS_NAME}} extends AgentBase {
  getMetadata() {
    return {
      id: '{{AGENT_ID}}',
      name: '{{AGENT_NAME}}',
      description: '{{DESCRIPTION}}',
      version: '1.0.0',
      author: '{{AUTHOR}}',
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
export default {{CLASS_NAME}};
`;

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated: (agentId: string) => void;
}

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({ isOpen, onClose, onAgentCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const generatePluginId = (name: string): string => {
    // Auto-generate ID from name: lowercase, spaces to hyphens, remove special chars
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50);
  };

  const toPascalCase = (str: string): string => {
    return str
      .split(/[\s-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  const handleCreate = async () => {
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Plugin name is required');
      return;
    }

    const agentId = generatePluginId(name);

    if (agentId.length < 3) {
      setError('Plugin name must be at least 3 characters');
      return;
    }

    setIsCreating(true);

    try {
      // Check if plugin already exists
      const existing = await AgentSourceStorageService.loadAgentSource(agentId);
      if (existing) {
        setError(`An agent with a similar name already exists`);
        setIsCreating(false);
        return;
      }

      // Replace template placeholders with actual values
      let code = BLANK_TEMPLATE;
      code = code.replace(/{{AGENT_ID}}/g, agentId);
      code = code.replace(/{{CLASS_NAME}}/g, toPascalCase(name));
      code = code.replace(/{{AGENT_NAME}}/g, name);
      code = code.replace(/{{DESCRIPTION}}/g, description || 'A custom agent');
      code = code.replace(/{{AUTHOR}}/g, author || 'Unknown');

      // Create the agent
      await AgentSourceStorageService.createAgent(
        agentId,
        name,
        code,
        description || 'A custom agent',
        author || undefined
      );

      // Notify parent and close
      onAgentCreated(agentId);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setAuthor('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Plugin</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
          )}

          <div className="space-y-4">
            {/* Plugin Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plugin Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Plugin"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">A descriptive name for your plugin</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this plugin do?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author (optional)</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Plugin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
