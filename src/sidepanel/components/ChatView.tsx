import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '@/state/appStore';
import { apiService, ToolDefinition } from '@/utils/api';
import { MessageType } from '@/utils/messaging';
import { FileAnalysis } from './FileAnalysis';
import { ClientRegistry } from '@/clients';
import { AgentRegistry } from '@/agents';
import { toolSessionManager } from '@/services/toolSessionManager';
import { ActiveToolsBar } from './ActiveToolsBar';
import { ToolPickerModal } from './ToolPickerModal';
import { ChatSidebar } from './ChatSidebar';

interface TabMetadata {
  tabId: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

interface TabContext extends TabMetadata {
  selected: boolean;
  content?: string;  // Now optional, loaded on-demand
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
  const {
    userConfig,
    consumeTokens,
    activeSessionId,
    sidebarCollapsed,
    setSidebarCollapsed,
    getActiveSession,
    addMessageToActiveSession,
    createNewSession,
    requestDebugNavigation,
  } = useAppStore();

  // Get current session messages
  const activeSession = getActiveSession();
  const chatMessages = useMemo(() => activeSession?.messages || [], [activeSession]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabs, setTabs] = useState<TabContext[]>([]);
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [showAddTabsDropdown, setShowAddTabsDropdown] = useState(false);
  const [showFileAnalysis, setShowFileAnalysis] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ name: string; content: string; info: DownloadInfo } | null>(null);
  const [availableTools, setAvailableTools] = useState<ToolDefinition[]>([]);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [lastError, setLastError] = useState<{
    error: string;
    agentId?: string;
    toolName?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const addTabsDropdownRef = useRef<HTMLDivElement>(null);
  const tabSelectorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Refresh tab metadata on mount (tools loaded later after loadAvailableTools is defined)
  useEffect(() => {
    refreshTabMetadata();
  }, []);

  // Close dropdowns when clicking outside or when sidepanel loses focus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAddTabsDropdown &&
        addTabsDropdownRef.current &&
        !addTabsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAddTabsDropdown(false);
      }
      if (
        showTabSelector &&
        tabSelectorRef.current &&
        !tabSelectorRef.current.contains(event.target as Node)
      ) {
        setShowTabSelector(false);
      }
    };

    const handleBlur = () => {
      if (showAddTabsDropdown) {
        setShowAddTabsDropdown(false);
      }
      if (showTabSelector) {
        setShowTabSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('blur', handleBlur);
    };
  }, [showAddTabsDropdown, showTabSelector]);

  // Listen for tab change messages from background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === MessageType.TAB_CHANGED) {
        refreshTabMetadata();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);


  // Lightweight function that only queries tab metadata (no content capture)
  const refreshTabMetadata = async () => {
    try {
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = activeTab[0]?.id;
      const activeTabUrl = activeTab[0]?.url;

      setTabs(prevTabs => {
        // Preserve selection state for existing tabs
        const prevSelected = new Set(prevTabs.filter(t => t.selected).map(t => t.tabId));

        return allTabs.filter(tab => tab.id).map(tab => ({
          tabId: tab.id!,
          title: tab.title || 'Untitled',
          url: tab.url || '',
          favIconUrl: tab.favIconUrl,
          // Keep previous selection, or auto-select if it's the active tab and no previous selection exists
          selected: prevSelected.has(tab.id!) || (prevSelected.size === 0 && tab.id === activeTabId),
        }));
      });

      // Update tool session context based on active tab URL
      if (activeTabUrl) {
        toolSessionManager.updateContext(activeTabUrl);
      }
    } catch (error) {
      console.error('Error refreshing tab metadata:', error);
    }
  };

  // Capture content just-in-time for selected tabs only (called when sending a message)
  const captureContentForSelectedTabs = async (): Promise<string> => {
    const selectedTabs = tabs.filter(tab => tab.selected);
    if (selectedTabs.length === 0) {
      return 'No tabs selected for context.';
    }

    const contexts: string[] = [];

    for (const tab of selectedTabs) {
      let content = '';
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.tabId },
          func: () => {
            const text = document.body?.innerText || document.body?.textContent || '';
            return text.slice(0, 3000);
          },
        });
        content = results[0]?.result || 'Unable to capture content';
      } catch (error) {
        content = 'Unable to capture content (restricted page)';
      }

      contexts.push(`=== Tab: ${tab.title} ===\nURL: ${tab.url}\n\nContent:\n${content}`);
    }

    return contexts.join('\n\n---\n\n');
  };

  const loadAvailableTools = useCallback(async () => {
    try {
      console.log('[ChatView] Loading available tools based on active session...');
      const tools: ToolDefinition[] = [];

      // Get active client IDs from the tool session manager
      const activeClientIds = await toolSessionManager.getActiveClientIds();
      console.log('[ChatView] Active clients from session:', activeClientIds);

      // Load tools from active clients
      for (const clientId of activeClientIds) {
        // Check if it's a registered client
        if (ClientRegistry.has(clientId)) {
          const clientInstance = ClientRegistry.getInstance(clientId);
          if (!clientInstance) {
            console.warn(`[ChatView] Could not get instance for ${clientId}`);
            continue;
          }

          // Load config from storage
          const storageKey = `client:${clientId}`;
          const data = await chrome.storage.local.get(storageKey);
          const clientConfig = data[storageKey];

          if (clientConfig) {
            clientInstance.setCredentials(clientConfig.credentials || {});
          }

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

        // Check if it's a registered plugin
        if (AgentRegistry.has(clientId)) {
          const pluginInstance = AgentRegistry.getInstance(clientId);
          if (!pluginInstance) {
            console.warn(`[ChatView] Could not get instance for ${clientId}`);
            continue;
          }

          // Load config from storage (if any)
          const storageKey = `plugin:${clientId}`;
          const data = await chrome.storage.local.get(storageKey);
          const pluginConfig = data[storageKey];

          if (pluginConfig?.config) {
            pluginInstance.setConfig(pluginConfig.config);
          }

          // Always resolve dependencies (not gated behind config)
          const dependencies = pluginInstance.getDependencies();
          for (const dep of dependencies) {
            const depInstance = ClientRegistry.getInstance(dep);
            if (depInstance) {
              const clientStorageKey = `client:${dep}`;
              const clientData = await chrome.storage.local.get(clientStorageKey);
              const clientConfig = clientData[clientStorageKey];

              if (clientConfig?.credentials) {
                depInstance.setCredentials(clientConfig.credentials);
                await depInstance.initialize();
                pluginInstance.setDependency(dep, depInstance);
              }
            }
          }

          // Get capabilities and convert to tool definitions
          const capabilities = pluginInstance.getCapabilities();
          console.log(`[ChatView] Plugin ${clientId} has ${capabilities.length} capabilities`);

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
      }

      console.log(`[ChatView] Loaded ${tools.length} tools from ${activeClientIds.length} active clients:`, tools.map(t => t.name));
      setAvailableTools(tools);
    } catch (error) {
      console.error('[ChatView] Error loading tools:', error);
    }
  }, []);

  // Load tools on mount (delayed to ensure clients are registered first)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAvailableTools();
    }, 100);

    return () => clearTimeout(timer);
  }, [loadAvailableTools]);

  // Subscribe to tool session changes to reload tools when context changes
  useEffect(() => {
    const unsubscribe = toolSessionManager.subscribe(() => {
      loadAvailableTools();
    });

    return () => unsubscribe();
  }, [loadAvailableTools]);

  // Callback for ActiveToolsBar to trigger tool reload
  const handleToolsChange = useCallback(() => {
    loadAvailableTools();
  }, [loadAvailableTools]);

  const toggleTabSelection = (tabId: number) => {
    setTabs(tabs.map(tab =>
      tab.tabId === tabId ? { ...tab, selected: !tab.selected } : tab
    ));
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
    const agentIds = AgentRegistry.getAllIds();
    for (const agentId of agentIds) {
      const pluginInstance = AgentRegistry.getInstance(agentId);
      if (!pluginInstance) continue;

      const capabilities = pluginInstance.getCapabilities();
      const capability = capabilities.find(c => c.name === toolName);

      if (capability) {
        console.log(`[ChatView] Tool ${toolName} belongs to plugin ${agentId}`);

        // Load config from storage
        const storageKey = `plugin:${agentId}`;
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

    // Ensure we have an active session
    if (!activeSessionId) {
      createNewSession();
    }

    const userMessageContent = input.trim();

    // Add message to active session
    const userMessage = addMessageToActiveSession({
      role: 'user',
      content: userMessageContent,
    });

    if (!userMessage) {
      console.error('[ChatView] Failed to add user message to session');
      return;
    }

    setInput('');
    setLoading(true);

    // Log user request clearly
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2196F3');
    console.log('%c👤 USER REQUEST:', 'color: #2196F3; font-weight: bold; font-size: 14px');
    console.log(userMessageContent);
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #2196F3');

    try {
      // Capture content just-in-time for selected tabs
      const pageContext = await captureContentForSelectedTabs();

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
      // Include previous messages from the session for context (limit to last 20 for token management)
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: any }> = [];

      // Get current session and add previous messages (excluding welcome message)
      const currentSession = getActiveSession();
      if (currentSession) {
        const previousMessages = currentSession.messages
          .filter((m) => m.id !== 'welcome' && m.id !== userMessage.id)
          .slice(-20); // Last 20 messages for context

        for (const msg of previousMessages) {
          conversationHistory.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add current user message with full context
      conversationHistory.push({
        role: 'user',
        content: contextPrompt,
      });

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

          prompt += '\n\n=== PARALLEL EXECUTION STRATEGY ===';
          prompt += '\nFor EVERY request, analyze and optimize execution:';
          prompt += '\n1. Parse the request into discrete operations';
          prompt += '\n2. Classify each operation as INDEPENDENT or DEPENDENT:';
          prompt += '\n   - INDEPENDENT: Can execute without needing results from other operations';
          prompt += '\n   - DEPENDENT: Requires output from a previous operation';
          prompt += '\n3. Group all independent operations and call their tools SIMULTANEOUSLY in one response';
          prompt += '\n4. Only use multiple iterations for dependent operations that truly need sequential execution';
          prompt += '\n\nExamples of INDEPENDENT operations (execute in parallel):';
          prompt += '\n- Removing different elements (modal, overlay, popup)';
          prompt += '\n- Modifying different properties (blur, scroll, styles)';
          prompt += '\n- Translation using browser_translate_page_native (single call)';
          prompt += '\n- Any operations that modify different parts of the page';
          prompt += '\n\nExamples of DEPENDENT operations (must be sequential):';
          prompt += '\n- Getting text THEN translating it (AI translation workflow)';
          prompt += '\n- Inspecting page THEN removing found elements (if you need to discover selectors first)';
          prompt += '\n\nDefault: Assume operations are INDEPENDENT unless they explicitly require previous results. Always prefer parallel execution for speed.';

          prompt += '\n\nCRITICAL - When removing elements: ALWAYS check the "removed" count in the tool result.';
          prompt += '\nIf removed: 0 - Use browser_inspect_page to find actual selectors';
          prompt += '\nIf removed: 1 but element reappears - Use browser_modify_style to force-hide with CSS (display: none, visibility: hidden, opacity: 0)';
          prompt += '\nFor stubborn elements - Use browser_execute_javascript to inject: const style = document.createElement("style"); style.textContent = ".selector { display: none !important; }"; document.head.appendChild(style);';
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

        // Debug: Log full prompt being sent to API
        const debugPayload = {
          conversationHistory,
          tools: availableTools,
          systemPrompt: buildSystemPrompt(),
        };
        const payloadJson = JSON.stringify(debugPayload, null, 2);
        const estimatedTokens = Math.ceil(payloadJson.length / 4);
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #FF9800');
        console.log('%c📦 API PAYLOAD DEBUG (Iteration ' + iteration + ')', 'color: #FF9800; font-weight: bold;');
        console.log(`Estimated tokens: ~${estimatedTokens.toLocaleString()} (${payloadJson.length.toLocaleString()} chars)`);
        console.log('Full payload (copy from below):');
        console.log(payloadJson);
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #FF9800');

        // Debug: Store payload in window for easy copying
        (window as any).lastApiPayload = payloadJson;
        console.log('%c💾 To copy payload, run in console: copy(window.lastApiPayload)', 'color: #4CAF50');

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
            // Add temporary status message to show what tool is running
            const statusId = `status-${Date.now()}`;
            const statusSession = getActiveSession();
            if (statusSession) {
              useAppStore.setState((state) => ({
                chatSessions: state.chatSessions.map((s) =>
                  s.id === statusSession.id
                    ? {
                        ...s,
                        messages: [
                          ...s.messages,
                          {
                            id: statusId,
                            role: 'assistant' as const,
                            content: `⚙️ Executing: ${toolUse.name}... (iteration ${iteration}/${maxIterations})`,
                            timestamp: Date.now(),
                          },
                        ],
                      }
                    : s
                ),
              }));
            }

            const result = await executeToolCall(toolUse.name, toolUse.input);

            // Remove status message from session
            if (statusSession) {
              useAppStore.setState((state) => ({
                chatSessions: state.chatSessions.map((s) =>
                  s.id === statusSession.id
                    ? { ...s, messages: s.messages.filter((m) => m.id !== statusId) }
                    : s
                ),
              }));
            }

            // Format result for AI - highlight persistent features if present
            let resultContent = JSON.stringify(result, null, 2);
            if (result.contextNote) {
              // Add prominent context note at the beginning
              resultContent = `${result.contextNote}\n\n===== TOOL RESULT =====\n${resultContent}`;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: resultContent,
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

      // Add assistant response to the session
      addMessageToActiveSession({
        role: 'assistant',
        content: finalResponse,
      });

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';

      // Track error for debug option
      setLastError({
        error: errorMessage,
        // These could be populated if we track which agent/tool was being used
      });

      // Add error message to the session with debug prompt
      addMessageToActiveSession({
        role: 'assistant',
        content: `Error: ${errorMessage}\n\nWould you like to debug this issue?`,
      });
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
    if (confirm('Start a new chat?')) {
      createNewSession();
      setCurrentFile(null);
    }
  };

  const handleFileSelected = (filename: string, content: string, fileInfo: DownloadInfo) => {
    setCurrentFile({ name: filename, content, info: fileInfo });
    setShowFileAnalysis(false);

    // Auto-populate input with a question about the file
    setInput(`Analyze this file: ${filename}`);
  };

  // Helper component for tab favicons
  const TabFavicon: React.FC<{ url?: string; size?: number }> = ({ url, size = 16 }) => {
    if (url) {
      return (
        <img
          src={url}
          className="w-4 h-4 rounded flex-shrink-0"
          style={{ width: size, height: size }}
          alt=""
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    // Default globe icon for tabs without favicon
    return (
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" style={{ width: size, height: size }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    );
  };

  const selectedTabs = tabs.filter(t => t.selected);
  const singleTabSelected = selectedTabs.length === 1;

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-full">
      {/* Chat Sidebar */}
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Tab Context Selector */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex-shrink-0 relative">
        <div className="flex items-center justify-between gap-2">
          {/* Left side: Tab info */}
          {singleTabSelected ? (
            // Single tab view: favicon + title
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <TabFavicon url={selectedTabs[0]?.favIconUrl} />
              <span className="text-sm font-medium text-blue-900 truncate">
                {selectedTabs[0]?.title || 'No tab selected'}
              </span>
            </div>
          ) : selectedTabs.length > 1 ? (
            // Multiple tabs view: "X tabs selected" dropdown
            <button
              onClick={() => setShowTabSelector(!showTabSelector)}
              className="flex items-center gap-2 text-sm text-blue-900 hover:text-blue-700 min-w-0"
            >
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="font-medium">{selectedTabs.length} tabs selected</span>
              <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${showTabSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            // No tabs selected
            <span className="text-sm text-gray-500 italic">No tabs selected</span>
          )}

          {/* Right side: Add more tabs button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAddTabsDropdown(!showAddTabsDropdown)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-white border border-blue-200 rounded-md px-2 py-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add tabs</span>
            </button>
          </div>
        </div>

        {/* Selected tabs dropdown (for multiple tabs) */}
        {showTabSelector && selectedTabs.length > 1 && (
          <div ref={tabSelectorRef} className="mt-2 bg-white border border-blue-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <div className="p-2 border-b border-blue-100 text-xs text-gray-500 font-medium">
              Selected tabs
            </div>
            {selectedTabs.map(tab => (
              <div
                key={tab.tabId}
                className="flex items-center gap-2 p-2 hover:bg-blue-50"
              >
                <TabFavicon url={tab.favIconUrl} />
                <span className="text-xs text-blue-900 truncate flex-1 min-w-0">
                  {tab.title}
                </span>
                <button
                  onClick={() => toggleTabSelection(tab.tabId)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0 p-0.5"
                  title="Remove from context"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add more tabs dropdown */}
        {showAddTabsDropdown && (
          <div
            ref={addTabsDropdownRef}
            className="absolute left-4 right-4 top-full mt-1 bg-white border border-blue-200 rounded-lg shadow-lg max-h-64 overflow-hidden z-10"
          >
            <div className="flex items-center justify-between p-2 border-b border-blue-100 sticky top-0 bg-white">
              <span className="text-xs text-gray-500 font-medium">All tabs in window</span>
              <button
                onClick={() => setShowAddTabsDropdown(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-52">
              {tabs.map(tab => (
                <label
                  key={tab.tabId}
                  className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={tab.selected}
                    onChange={() => toggleTabSelection(tab.tabId)}
                    className="flex-shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <TabFavicon url={tab.favIconUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-blue-900 truncate">
                      {tab.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {tab.url}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Tools Bar */}
      <ActiveToolsBar
        onAddTools={() => setShowToolPicker(true)}
        onToolsChange={handleToolsChange}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((message, index) => {
          const isError = message.content.startsWith('Error:');
          const isLastMessage = index === chatMessages.length - 1;
          const showDebugButton = isError && isLastMessage && lastError;

          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : isError
                    ? 'bg-red-50 text-red-900 border border-red-200'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
                {showDebugButton && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <button
                      onClick={() => {
                        if (lastError) {
                          requestDebugNavigation({
                            error: lastError.error,
                            agentId: lastError.agentId,
                            toolName: lastError.toolName,
                            timestamp: Date.now(),
                          });
                          setLastError(null);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Debug in Editor
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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

        {/* Tool Picker Modal */}
        <ToolPickerModal
          isOpen={showToolPicker}
          onClose={() => setShowToolPicker(false)}
        />
      </div>
    </div>
  );
};
