import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, ChatMessage } from '@/state/appStore';
import { apiService, ToolDefinition } from '@/utils/api';
import { MessageType } from '@/utils/messaging';
import { FileAnalysis } from './FileAnalysis';
import { ClientRegistry } from '@/clients';
import { PluginRegistry } from '@/plugins';

interface TabContext {
  tabId: number;
  title: string;
  url: string;
  content: string;
  selected: boolean;
}

interface DownloadInfo {
  id: number;
  filePath: string;  // Full path to the downloaded file
  url: string;
  fileSize: number;
  mime: string;
  downloadTime: number;
}

export const ChatView: React.FC = () => {
  const { userConfig, consumeTokens, chatMessages, addChatMessage, clearChatMessages } = useAppStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabs, setTabs] = useState<TabContext[]>([]);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [showFileAnalysis, setShowFileAnalysis] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ name: string; content: string; info: DownloadInfo } | null>(null);
  const [availableTools, setAvailableTools] = useState<ToolDefinition[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Capture context from all tabs and load tools
  useEffect(() => {
    captureAllTabs();

    // Delay loading tools to ensure clients are registered first
    // (registerAllClients runs in SidePanelApp's useEffect which may not be complete yet)
    const timer = setTimeout(() => {
      loadAvailableTools();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Re-capture tabs when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      captureAllTabs();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        captureAllTabs();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const captureAllTabs = async () => {
    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = activeTab[0]?.id;

      const tabContexts: TabContext[] = [];

      for (const tab of allTabs) {
        if (!tab.id) continue;

        let content = '';
        try {
          // Execute script to get page content
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const body = document.body;
              const text = body.innerText || body.textContent || '';
              // Limit to first 3000 characters per tab
              return text.slice(0, 3000);
            },
          });

          content = results[0]?.result || 'Unable to capture content';
        } catch (error) {
          content = 'Unable to capture content (restricted page)';
        }

        tabContexts.push({
          tabId: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          content,
          selected: tab.id === activeTabId, // Auto-select active tab
        });
      }

      setTabs(tabContexts);
    } catch (error) {
      console.error('Error capturing tabs:', error);
    }
  };

  const loadAvailableTools = async () => {
    try {
      console.log('[ChatView] Loading available tools from configured clients and plugins...');
      const tools: ToolDefinition[] = [];

      // Load tools from clients
      const clientIds = ClientRegistry.getAllIds();
      console.log('[ChatView] Found registered clients:', clientIds);

      for (const clientId of clientIds) {
        // Check if client is configured
        const storageKey = `client:${clientId}`;
        const data = await chrome.storage.local.get(storageKey);
        const clientConfig = data[storageKey];

        // Get client instance first to check if it requires credentials
        const clientInstance = ClientRegistry.getInstance(clientId);
        if (!clientInstance) {
          console.warn(`[ChatView] Could not get instance for ${clientId}`);
          continue;
        }

        // Check if client is configured based on whether it requires credentials
        const credentialFields = clientInstance.getCredentialFields();
        const requiresCredentials = credentialFields.length > 0;

        let isConfigured = false;
        if (requiresCredentials) {
          // For clients that require credentials, check they're provided
          isConfigured = !!clientConfig?.credentials && Object.keys(clientConfig.credentials).length > 0;
        } else {
          // For clients with no credentials, just check if storage entry exists
          isConfigured = !!clientConfig;
        }

        if (!isConfigured || !clientConfig?.isActive) {
          console.log(`[ChatView] Client ${clientId} not configured or not active, skipping`);
          continue;
        }

        console.log(`[ChatView] Loading tools from client ${clientId}...`);

        // Load credentials
        clientInstance.setCredentials(clientConfig.credentials || {});

        // Get capabilities and convert to tool definitions
        const capabilities = clientInstance.getCapabilities();
        console.log(`[ChatView] Client ${clientId} has ${capabilities.length} capabilities`);

        for (const capability of capabilities) {
          const properties: Record<string, any> = {};
          const required: string[] = [];

          for (const param of capability.parameters) {
            properties[param.name] = {
              type: param.type,
              description: param.description,
              ...(param.default !== undefined && { default: param.default }),
            };

            if (param.required) {
              required.push(param.name);
            }
          }

          tools.push({
            name: capability.name,
            description: capability.description,
            input_schema: {
              type: 'object',
              properties,
              required,
            },
          });
        }
      }

      // Load tools from plugins
      const pluginIds = PluginRegistry.getAllIds();
      console.log('[ChatView] Found registered plugins:', pluginIds);

      for (const pluginId of pluginIds) {
        // Check if plugin is configured
        const storageKey = `plugin:${pluginId}`;
        const data = await chrome.storage.local.get(storageKey);
        const pluginConfig = data[storageKey];

        if (!pluginConfig?.config || !pluginConfig.isActive) {
          console.log(`[ChatView] Plugin ${pluginId} not configured or not active, skipping`);
          continue;
        }

        console.log(`[ChatView] Loading tools from plugin ${pluginId}...`);

        // Get plugin instance and load config
        const pluginInstance = PluginRegistry.getInstance(pluginId);
        if (!pluginInstance) {
          console.warn(`[ChatView] Could not get instance for ${pluginId}`);
          continue;
        }

        pluginInstance.setConfig(pluginConfig.config);

        // Resolve dependencies
        const dependencies = pluginInstance.getDependencies();
        for (const dep of dependencies) {
          const clientInstance = ClientRegistry.getInstance(dep);
          if (clientInstance) {
            const clientStorageKey = `client:${dep}`;
            const clientData = await chrome.storage.local.get(clientStorageKey);
            const clientConfig = clientData[clientStorageKey];

            if (clientConfig?.credentials) {
              clientInstance.setCredentials(clientConfig.credentials);
              await clientInstance.initialize();
              pluginInstance.setDependency(dep, clientInstance);
            }
          }
        }

        // Get capabilities and convert to tool definitions
        const capabilities = pluginInstance.getCapabilities();
        console.log(`[ChatView] Plugin ${pluginId} has ${capabilities.length} capabilities`);

        for (const capability of capabilities) {
          const properties: Record<string, any> = {};
          const required: string[] = [];

          for (const param of capability.parameters) {
            properties[param.name] = {
              type: param.type,
              description: param.description,
              ...(param.default !== undefined && { default: param.default }),
            };

            if (param.required) {
              required.push(param.name);
            }
          }

          tools.push({
            name: capability.name,
            description: capability.description,
            input_schema: {
              type: 'object',
              properties,
              required,
            },
          });
        }
      }

      console.log(`[ChatView] Loaded ${tools.length} tools total:`, tools.map(t => t.name));
      setAvailableTools(tools);
    } catch (error) {
      console.error('[ChatView] Error loading tools:', error);
    }
  };

  const toggleTabSelection = (tabId: number) => {
    setTabs(tabs.map(tab =>
      tab.tabId === tabId ? { ...tab, selected: !tab.selected } : tab
    ));
  };

  const getSelectedContext = (): string => {
    const selectedTabs = tabs.filter(tab => tab.selected);
    if (selectedTabs.length === 0) {
      return 'No tabs selected for context.';
    }

    return selectedTabs.map(tab =>
      `=== Tab: ${tab.title} ===\nURL: ${tab.url}\n\nContent:\n${tab.content}`
    ).join('\n\n---\n\n');
  };

  const executeToolCall = async (toolName: string, toolInput: Record<string, any>): Promise<any> => {
    console.log(`[ChatView] Executing tool: ${toolName}`, toolInput);

    // Check clients first
    const clientIds = ClientRegistry.getAllIds();
    for (const clientId of clientIds) {
      const clientInstance = ClientRegistry.getInstance(clientId);
      if (!clientInstance) continue;

      const capabilities = clientInstance.getCapabilities();
      const capability = capabilities.find(c => c.name === toolName);

      if (capability) {
        console.log(`[ChatView] Tool ${toolName} belongs to client ${clientId}`);

        // Load credentials from storage
        const storageKey = `client:${clientId}`;
        const data = await chrome.storage.local.get(storageKey);
        const clientConfig = data[storageKey];

        // Set credentials and initialize (even if credentials are empty)
        if (clientConfig) {
          clientInstance.setCredentials(clientConfig.credentials || {});
          await clientInstance.initialize();
        }

        // Execute the capability
        const result = await clientInstance.executeCapability(toolName, toolInput);
        console.log(`[ChatView] Tool ${toolName} result:`, result);
        return result;
      }
    }

    // Check plugins
    const pluginIds = PluginRegistry.getAllIds();
    for (const pluginId of pluginIds) {
      const pluginInstance = PluginRegistry.getInstance(pluginId);
      if (!pluginInstance) continue;

      const capabilities = pluginInstance.getCapabilities();
      const capability = capabilities.find(c => c.name === toolName);

      if (capability) {
        console.log(`[ChatView] Tool ${toolName} belongs to plugin ${pluginId}`);

        // Load config from storage
        const storageKey = `plugin:${pluginId}`;
        const data = await chrome.storage.local.get(storageKey);
        const pluginConfig = data[storageKey];

        if (pluginConfig?.config) {
          pluginInstance.setConfig(pluginConfig.config);

          // Resolve dependencies
          const dependencies = pluginInstance.getDependencies();
          for (const dep of dependencies) {
            const clientInstance = ClientRegistry.getInstance(dep);
            if (clientInstance) {
              const clientStorageKey = `client:${dep}`;
              const clientData = await chrome.storage.local.get(clientStorageKey);
              const clientConfig = clientData[clientStorageKey];

              if (clientConfig?.credentials) {
                clientInstance.setCredentials(clientConfig.credentials);
                await clientInstance.initialize();
                pluginInstance.setDependency(dep, clientInstance);
              }
            }
          }
        }

        // Execute the capability
        const result = await pluginInstance.executeCapability(toolName, toolInput);
        console.log(`[ChatView] Tool ${toolName} result:`, result);
        return result;
      }
    }

    throw new Error(`Tool ${toolName} not found in any configured client or plugin`);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    setInput('');
    setLoading(true);

    // Log user request clearly
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2196F3');
    console.log('%c👤 USER REQUEST:', 'color: #2196F3; font-weight: bold; font-size: 14px');
    console.log(input.trim());
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2196F3');

    try {
      // Construct prompt with context from selected tabs
      const pageContext = getSelectedContext();

      // Add network monitoring data if available
      let contextPrompt = '';

      // Add file content if available
      if (currentFile) {
        contextPrompt = `Here is the content of the file "${currentFile.name}" (${currentFile.info.mime}, ${(currentFile.info.fileSize / 1024).toFixed(1)} KB):\n\n${currentFile.content}\n\n`;
      }

      if (pageContext !== 'No tabs selected for context.') {
        contextPrompt += `Here is the context from the browser tabs the user is viewing:\n\n${pageContext}`;

        // Include network data if monitoring is active
        const selectedTabs = tabs.filter(tab => tab.selected);
        const tabIds = selectedTabs.map(tab => tab.tabId);

        // Request network summary from background script
        try {
          const networkResponse = await chrome.runtime.sendMessage({
            type: MessageType.GET_NETWORK_SUMMARY,
            payload: { tabIds }
          });

          if (networkResponse?.success && networkResponse.data) {
            const summary = networkResponse.data;
            // Only include if there's actual data (not just "No network requests captured")
            if (!summary.includes('No network requests captured')) {
              contextPrompt += `\n\n${summary}`;
            }
          }
        } catch (error) {
          console.error('[ChatView] Error getting network summary:', error);
        }

        // Extract JavaScript and CSS if full-monitoring is enabled
        if (userConfig.networkMonitoringLevel === 'full-monitoring' && selectedTabs.length > 0) {
            const activeTab = selectedTabs[0]; // Use first selected tab

            // Extract JavaScript if enabled
            if (userConfig.extractJavaScript ?? true) {
              console.log('[ChatView] Full monitoring active, extracting JavaScript...');
              try {
                const response = await chrome.tabs.sendMessage(activeTab.tabId, {
                  type: 'EXTRACT_JAVASCRIPT'
                });

                if (response?.success && response.data) {
                  contextPrompt += `\n\n${response.data}`;
                  console.log('[ChatView] JavaScript extraction completed');
                } else {
                  console.warn('[ChatView] JavaScript extraction failed:', response?.error);
                }
              } catch (error) {
                console.error('[ChatView] Error requesting JavaScript extraction:', error);
              }
            }

            // Extract CSS if enabled
            if (userConfig.extractCSS ?? true) {
              console.log('[ChatView] Full monitoring active, extracting CSS...');
              try {
                const response = await chrome.tabs.sendMessage(activeTab.tabId, {
                  type: 'EXTRACT_CSS'
                });

                if (response?.success && response.data) {
                  contextPrompt += `\n\n${response.data}`;
                  console.log('[ChatView] CSS extraction completed');
                } else {
                  console.warn('[ChatView] CSS extraction failed:', response?.error);
                }
              } catch (error) {
                console.error('[ChatView] Error requesting CSS extraction:', error);
              }
            }
          }

        contextPrompt += `\n\nUser question: ${userMessage.content}`;
      } else {
        contextPrompt += userMessage.content;
      }

      // Build conversation history for agentic loop
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: any }> = [
        { role: 'user', content: contextPrompt },
      ];

      let finalResponse = '';
      let totalTokens = 0;
      const maxIterations = 20; // Allow more iterations for complex tasks like translation
      let iteration = 0;

      // Build dynamic system prompt based on available tools
      const buildSystemPrompt = (): string | undefined => {
        if (availableTools.length === 0) return undefined;

        const toolNames = availableTools.map(t => t.name);
        const hasBrowserTools = toolNames.some(name => name.startsWith('browser_'));
        const hasTranslationTools = toolNames.some(name => name.includes('translate') || name.includes('text'));

        let prompt = 'You are a helpful AI assistant with access to various tools and capabilities. You MUST use the available tools to perform actions - do not just describe what would happen.';

        if (hasBrowserTools) {
          prompt += '\n\nIMPORTANT: You have browser manipulation tools that let you directly modify the current web page. When asked to change, translate, remove, or modify anything on the page, you MUST use these tools to actually perform the action, not just explain it.';
          prompt += '\n\nCRITICAL - When removing elements: ALWAYS check the "removed" count in the tool result.';
          prompt += '\n\nIf removed: 0 (element not found):';
          prompt += '\n1. Use browser_inspect_page to find actual selectors';
          prompt += '\n2. Try the selectors from selectorOptions array';
          prompt += '\n\nIf removed: 1 but element reappears (JavaScript recreating it):';
          prompt += '\n1. Use browser_modify_style to force-hide with CSS: {selector: ".element", styles: {"display": "none", "visibility": "hidden", "opacity": "0", "pointer-events": "none"}}';
          prompt += '\n2. Also hide parent elements if needed';
          prompt += '\n3. This prevents JavaScript from recreating visible elements';
          prompt += '\n\nFor stubborn modals: Use browser_execute_javascript to inject persistent CSS:';
          prompt += '\nconst style = document.createElement("style"); style.textContent = ".selector { display: none !important; }"; document.head.appendChild(style);';
        }

        if (hasTranslationTools) {
          prompt += '\n\n=== TRANSLATION OPTIONS ===\n\nYou have TWO ways to translate pages:\n\n**Option 1: Native Chrome Translation (DEFAULT - FAST)**\nUse browser_translate_page_native for instant translation:\n- Takes 1 iteration (very fast)\n- Uses Chrome\'s built-in AI translation\n- Best for basic translation needs\n- Example: browser_translate_page_native(target_language: "en")\n\n**Option 2: AI Translation (SLOWER - use only if requested)**\nUse this ONLY when the user explicitly asks for "AI translation" or wants context-aware translation:\n1. Call browser_get_page_text ONCE to extract ALL text nodes\n2. Translate ALL text nodes at once in a single response\n3. Call browser_replace_text ONCE with all translations\nThis takes 3 iterations.\n\n**DEFAULT BEHAVIOR: Always use browser_translate_page_native unless the user specifically asks for AI translation.**';
        }

        prompt += '\n\nAvailable tools:\n';
        for (const tool of availableTools) {
          prompt += `- ${tool.name}: ${tool.description}\n`;
        }

        prompt += '\n\nContext: The user is viewing browser tabs. The tab content is provided above. When the user refers to "this page", "the current page", or "the connected tab", they mean the content shown in the context. You should use browser tools to manipulate it directly.';
        prompt += '\n\nAlways use tools to perform actions when available. Explain what you\'re doing, execute the tools, and report the results.';

        return prompt;
      };

      // Agentic loop: keep calling LLM until it stops using tools
      while (iteration < maxIterations) {
        iteration++;
        console.log(`[ChatView] Agentic loop iteration ${iteration}`);

        // Call API service with tools
        const response = await apiService.generateContent(
          {
            prompt: '', // Not used when conversationHistory is provided
            conversationHistory,
            tools: availableTools.length > 0 ? availableTools : undefined,
            systemPrompt: buildSystemPrompt(),
          },
          userConfig.useOwnKey
        );

        totalTokens += response.tokensUsed;
        finalResponse = response.content;

        // If no tool uses, we're done
        if (!response.toolUses || response.toolUses.length === 0) {
          console.log('[ChatView] No tool uses, conversation complete');
          break;
        }

        // Execute all tool calls
        console.log(`[ChatView] Executing ${response.toolUses.length} tool calls`);
        const toolResults: any[] = [];

        for (const toolUse of response.toolUses) {
          try {
            // Add status message to show what tool is running
            const statusMessage: ChatMessage = {
              id: `status-${Date.now()}`,
              role: 'assistant',
              content: `⚙️ Executing: ${toolUse.name}... (iteration ${iteration}/${maxIterations})`,
              timestamp: Date.now(),
            };
            addChatMessage(statusMessage);

            const result = await executeToolCall(toolUse.name, toolUse.input);

            // Remove status message
            useAppStore.setState(state => ({
              chatMessages: state.chatMessages.filter(m => m.id !== statusMessage.id)
            }));

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result, null, 2),
            });
          } catch (error) {
            console.error(`[ChatView] Tool ${toolUse.name} failed:`, error);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`,
              is_error: true,
            });
          }
        }

        // Add assistant message with tool uses to history
        const assistantContent: any[] = [];
        if (response.content) {
          assistantContent.push({ type: 'text', text: response.content });
        }
        for (const toolUse of response.toolUses) {
          assistantContent.push({
            type: 'tool_use',
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
          });
        }

        conversationHistory.push({
          role: 'assistant',
          content: assistantContent,
        });

        // Add user message with tool results
        conversationHistory.push({
          role: 'user',
          content: toolResults,
        });
      }

      // Check if we hit max iterations
      if (iteration >= maxIterations) {
        finalResponse += '\n\n⚠️ Note: Reached maximum iteration limit. The task may be incomplete. If needed, you can ask me to continue or try the request again.';
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: finalResponse,
        timestamp: Date.now(),
      };

      addChatMessage(assistantMessage);

      // Log AI response clearly
      console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50');
      console.log('%c🤖 AI RESPONSE:', 'color: #4CAF50; font-weight: bold; font-size: 14px');
      console.log(finalResponse);
      console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50');
      console.log('%c✅ INTERACTION COMPLETE', 'color: #4CAF50; font-weight: bold; font-size: 12px');
      console.log(`Total iterations: ${iteration}, Tokens used: ${totalTokens}`);
      console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n', 'color: #4CAF50');

      // Consume tokens if using free model
      if (!userConfig.useOwnKey && totalTokens > 0) {
        consumeTokens(totalTokens);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now(),
      };
      addChatMessage(errorMessage);
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear chat history?')) {
      clearChatMessages();
      setCurrentFile(null);
    }
  };

  const handleFileSelected = (filename: string, content: string, fileInfo: DownloadInfo) => {
    setCurrentFile({ name: filename, content, info: fileInfo });
    setShowFileAnalysis(false);

    // Auto-populate input with a question about the file
    setInput(`Analyze this file: ${filename}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Context Selector */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowTabSelector(!showTabSelector)}
            className="flex items-center gap-2 text-sm text-blue-900 hover:text-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span className="font-medium">
              {tabs.filter(t => t.selected).length} of {tabs.length} tabs selected
            </span>
            <svg className={`w-3 h-3 transition-transform ${showTabSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={captureAllTabs}
            className="text-xs text-blue-700 hover:text-blue-800"
            title="Refresh tabs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tab List */}
        {showTabSelector && (
          <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
            {tabs.map(tab => (
              <label
                key={tab.tabId}
                className="flex items-start gap-2 p-2 hover:bg-blue-100 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={tab.selected}
                  onChange={() => toggleTabSelection(tab.tabId)}
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-blue-900 truncate">
                    {tab.title}
                  </div>
                  <div className="text-xs text-blue-600 truncate">
                    {tab.url}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : message.content.startsWith('Error:')
                  ? 'bg-red-50 text-red-900 border border-red-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-pulse flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0">
        {/* Current File Badge */}
        {currentFile && (
          <div className="mb-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs text-blue-900 font-medium truncate">{currentFile.name}</span>
            </div>
            <button
              onClick={() => setCurrentFile(null)}
              className="text-blue-600 hover:text-blue-700 flex-shrink-0"
              title="Remove file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Model Selector & Actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Model:</span>
            <span className="text-xs font-medium text-gray-700">
              {userConfig.activeConfigurationId
                ? userConfig.savedConfigurations.find(c => c.id === userConfig.activeConfigurationId)?.name || 'Free Model'
                : 'Free Model'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFileAnalysis(true)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              title="Analyze file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>File</span>
            </button>
            <button
              onClick={handleClearChat}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Clear chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Input Field */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this page..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>

      {/* File Analysis Modal */}
      {showFileAnalysis && (
        <FileAnalysis
          onFileSelected={handleFileSelected}
          onClose={() => setShowFileAnalysis(false)}
        />
      )}
    </div>
  );
};
