import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '@/utils/api';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface EditorChatPanelProps {
  pluginCode: string;
  pluginName: string;
  onApplyCode?: (code: string) => void;
}

export const EditorChatPanel: React.FC<EditorChatPanelProps> = ({ pluginCode, pluginName, onApplyCode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context-aware system prompt
      const systemPrompt = `You are a helpful AI assistant specialized in helping developers write and improve Chrome extension agents (formerly called plugins).

The user is currently editing an agent called "${pluginName}".

Current agent code:
\`\`\`typescript
${pluginCode}
\`\`\`

# Agent Structure

Agents must extend the AgentBase class and implement:

1. **getMetadata()**: Returns AgentMetadata
   - id: string (unique identifier)
   - name: string (display name)
   - description: string
   - version: string
   - author: string
   - tags: string[]

2. **getConfigFields()**: Returns ConfigField[]
   - Define configuration options needed by the agent

3. **getDependencies()**: Returns string[]
   - List of client IDs this agent depends on (e.g., ['anthropic-api'])

4. **getCapabilities()**: Returns AgentCapabilityDefinition[]
   - Each capability has: name, description, parameters
   - Optional: isLongRunning flag (see Process Registry below)

5. **executeCapability()**: Executes a capability
   - Takes capabilityName and parameters
   - Returns Promise<CapabilityResult>
   - CapabilityResult: { success: boolean, data?: any, error?: string }

# Process Registry System

**CRITICAL FOR LONG-RUNNING OPERATIONS:**

When a capability starts any long-running process (MutationObserver, setInterval, event listeners, WebSockets, etc.), it MUST register the process for proper cleanup and visibility.

## Supported Process Types:
- 'mutation-observer' - DOM change observers
- 'interval' - setInterval timers
- 'timeout' - setTimeout (for long-running ones)
- 'event-listener' - Event listeners
- 'websocket' - WebSocket connections
- 'intersection-observer' - Intersection observers
- 'animation-frame' - requestAnimationFrame loops
- 'custom' - Any other long-running process

## How to Register Processes:

Use \`this.registerProcess(capabilityName, processConfig)\` in executeCapability():

\`\`\`typescript
async executeCapability(capabilityName: string, parameters: Record<string, any>): Promise<CapabilityResult> {
  if (capabilityName === 'watch_dom') {
    // Create the observer
    const observer = new MutationObserver((mutations) => {
      console.log('DOM changed:', mutations);
      // Handle changes...
    });

    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });

    // IMPORTANT: Register for tracking and cleanup
    const processId = this.registerProcess('watch_dom', {
      type: 'mutation-observer',
      cleanup: () => observer.disconnect(),
      metadata: {
        description: 'Watch for DOM changes on the page',
        target: 'document.body'
      }
    });

    return {
      success: true,
      data: { processId, message: 'Started watching DOM' }
    };
  }
}
\`\`\`

## More Examples:

### setInterval:
\`\`\`typescript
const intervalId = setInterval(() => {
  // Poll or check something...
}, 5000);

this.registerProcess('poll_status', {
  type: 'interval',
  cleanup: () => clearInterval(intervalId),
  metadata: { description: 'Poll status every 5 seconds', interval: 5000 }
});
\`\`\`

### Event Listener:
\`\`\`typescript
const handler = (e: MouseEvent) => console.log('Clicked:', e.target);
document.addEventListener('click', handler, true);

this.registerProcess('monitor_clicks', {
  type: 'event-listener',
  cleanup: () => document.removeEventListener('click', handler, true),
  metadata: { description: 'Monitor all clicks', event: 'click' }
});
\`\`\`

### WebSocket:
\`\`\`typescript
const ws = new WebSocket('wss://example.com');
ws.onmessage = (e) => console.log('Message:', e.data);

this.registerProcess('websocket_connection', {
  type: 'websocket',
  cleanup: () => ws.close(),
  metadata: { description: 'WebSocket connection', url: 'wss://example.com' }
});
\`\`\`

## Managing Processes:

- \`this.stopProcess(processId)\` - Stop a specific process
- \`this.stopCapabilityProcesses('capability_name')\` - Stop all processes for a capability
- \`this.stopAllProcesses()\` - Stop all processes started by this agent
- \`this.isProcessActive(processId)\` - Check if process is still running
- \`this.getActiveProcesses()\` - Get all active processes for this agent

## Best Practices:

1. **Always register long-running processes** - If it doesn't complete immediately, register it
2. **Provide clear descriptions** - Help users understand what the process does
3. **Test cleanup functions** - Ensure they actually stop the process
4. **Avoid leaks** - Stop old processes before starting new ones of the same type
5. **Mark capabilities as long-running** - Set \`isLongRunning: true\` in capability metadata

## Complete Example:

\`\`\`typescript
getCapabilities(): AgentCapabilityDefinition[] {
  return [
    {
      name: 'remove_overlays',
      description: 'Remove modal overlays and watch for new ones',
      parameters: [],
      isLongRunning: true // Mark as long-running
    }
  ];
}

async executeCapability(capabilityName: string, parameters: Record<string, any>): Promise<CapabilityResult> {
  if (capabilityName === 'remove_overlays') {
    // Remove existing overlays
    const overlays = document.querySelectorAll('[class*="modal"], [class*="overlay"]');
    overlays.forEach(el => el.remove());

    // Watch for new overlays
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            if (node.className.includes('modal') || node.className.includes('overlay')) {
              console.log('Removing new overlay:', node);
              node.remove();
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Register the observer
    this.registerProcess('remove_overlays', {
      type: 'mutation-observer',
      cleanup: () => observer.disconnect(),
      metadata: {
        description: 'Watch for and remove modal overlays',
        target: 'document.body',
        removedCount: overlays.length
      }
    });

    return {
      success: true,
      data: {
        message: \`Removed \${overlays.length} overlays and watching for new ones\`,
        removedCount: overlays.length
      }
    };
  }

  return { success: false, error: 'Unknown capability' };
}
\`\`\`

# When Suggesting Code:

1. **Explain what the change does and why**
2. **Always use registerProcess() for long-running operations**
3. **Provide complete, working code snippets**
4. **Follow TypeScript best practices**
5. **Ensure type safety**
6. **Include proper error handling**
7. **Add meaningful metadata to registered processes**

If the user asks you to modify the code, provide the full updated version or clear instructions on what to change.

Users can view and manage active processes via Settings > Active Processes in the extension UI.`;

      // Call API with context
      const conversationHistory = [
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'user' as const,
          content: input,
        },
      ];

      const apiResponse = await apiService.generateContent(
        {
          prompt: input,
          systemPrompt,
          conversationHistory,
        },
        true // Use own key
      );

      const response = apiResponse.content;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);

      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const extractCodeFromMessage = (content: string): string | null => {
    // Extract TypeScript code blocks
    const codeBlockRegex = /```(?:typescript|ts)\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    return match ? match[1].trim() : null;
  };

  const handleApplyCode = (content: string) => {
    const code = extractCodeFromMessage(content);
    if (code && onApplyCode) {
      onApplyCode(code);
    }
  };

  const clearChat = () => {
    if (confirm('Clear all chat messages?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">AI Assistant</h3>
            <p className="text-xs text-gray-500">Ask me about {pluginName}</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              title="Clear chat"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <p className="mb-2">Ask me anything about your agent!</p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>• "Add a capability that removes modal overlays automatically"</p>
              <p>• "Create a MutationObserver that watches for new elements"</p>
              <p>• "How do I register a long-running process?"</p>
              <p>• "Explain what this code does"</p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              <div className="prose prose-sm max-w-none">
                {message.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      code: ({ inline, className, children, ...props }: any) => {
                        return inline ? (
                          <code className="bg-gray-100 text-gray-800 px-1 rounded" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-gray-100 text-gray-800 p-2 rounded text-xs overflow-x-auto" {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>

              {message.role === 'assistant' && extractCodeFromMessage(message.content) && onApplyCode && (
                <button
                  onClick={() => handleApplyCode(message.content)}
                  className="mt-2 text-xs px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                  Apply Code
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your plugin..."
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
};
