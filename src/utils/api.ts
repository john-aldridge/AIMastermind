/**
 * API utility functions for interacting with AI models
 * Supports both OpenAI and Claude (Anthropic) APIs
 */

export type AIProvider = 'openai' | 'claude';

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface AIRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: any;
  }>;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
  toolUses?: ToolUse[];
  stopReason?: string;
}

export interface TokenPurchaseRequest {
  amount: number;
  paymentMethod: string;
}

export interface APIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export class APIService {
  private apiKey: string | null = null;
  private provider: AIProvider = 'openai';
  private model: string = 'gpt-4';

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider;
    // Set default model based on provider
    if (provider === 'claude') {
      this.model = 'claude-sonnet-4-5-20250929';
    } else {
      this.model = 'gpt-4';
    }
  }

  setModel(model: string): void {
    this.model = model;
  }

  getConfig(): APIConfig {
    return {
      provider: this.provider,
      apiKey: this.apiKey || '',
      model: this.model,
    };
  }

  async generateContent(request: AIRequest, useOwnKey: boolean): Promise<AIResponse> {
    if (useOwnKey && !this.apiKey) {
      throw new Error('API key not configured');
    }

    if (useOwnKey) {
      if (this.provider === 'claude') {
        return this.generateWithClaude(request);
      } else {
        return this.generateWithOpenAI(request);
      }
    }

    // Fallback to our token system (stub)
    return this.generateWithMockAPI(request);
  }

  private async generateWithClaude(request: AIRequest): Promise<AIResponse> {
    try {
      // Build messages array
      const messages = request.conversationHistory || [
        {
          role: 'user' as const,
          content: request.prompt,
        },
      ];

      const body: any = {
        model: request.model || this.model,
        max_tokens: request.maxTokens || 4096,
        messages,
        ...(request.systemPrompt && { system: request.systemPrompt }),
        ...(request.tools && request.tools.length > 0 && { tools: request.tools }),
      };

      console.log('[API] Calling Claude with tools:', request.tools?.length || 0);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('[API] Claude response:', data);

      // Extract text content and tool uses
      let textContent = '';
      const toolUses: ToolUse[] = [];

      for (const block of data.content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolUses.push({
            id: block.id,
            name: block.name,
            input: block.input,
          });
        }
      }

      return {
        content: textContent,
        tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
        model: data.model,
        toolUses,
        stopReason: data.stop_reason,
      };
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }

  private async generateWithOpenAI(request: AIRequest): Promise<AIResponse> {
    try {
      // Build messages array
      const messages = request.conversationHistory || [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.prompt },
      ];

      // Convert tools to OpenAI format
      const tools = request.tools?.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      }));

      const body: any = {
        model: request.model || this.model,
        messages,
        max_tokens: request.maxTokens || 4096,
        ...(tools && tools.length > 0 && { tools }),
      };

      console.log('[API] Calling OpenAI with tools:', tools?.length || 0);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('[API] OpenAI response:', data);

      const message = data.choices[0].message;
      const toolUses: ToolUse[] = [];

      // Check for tool calls in OpenAI format
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          toolUses.push({
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
          });
        }
      }

      return {
        content: message.content || '',
        tokensUsed: data.usage.total_tokens,
        model: data.model,
        toolUses,
        stopReason: data.choices[0].finish_reason,
      };
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  private async generateWithMockAPI(request: AIRequest): Promise<AIResponse> {
    // Simulate API call for testing
    console.log('Using mock API (no key provided):', request);
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      content: `Mock response for: ${request.prompt}\n\n(This is a simulated response. Configure your API key in Settings to get real AI responses.)`,
      tokensUsed: Math.floor(Math.random() * 100) + 50,
      model: request.model || this.model,
    };
  }

  async purchaseTokens(request: TokenPurchaseRequest): Promise<{ success: boolean; newBalance: number }> {
    try {
      // TODO: Implement payment processing
      console.log('Purchasing tokens:', request);

      // Simulate payment
      await new Promise(resolve => setTimeout(resolve, 1500));

      return {
        success: true,
        newBalance: request.amount,
      };
    } catch (error) {
      console.error('Error purchasing tokens:', error);
      throw error;
    }
  }

  async validateApiKey(key: string, provider: AIProvider): Promise<{ valid: boolean; error?: string }> {
    try {
      if (provider === 'claude') {
        // Test with a simple Claude API call
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
          console.error('Claude API validation failed:', errorMsg);
          return { valid: false, error: errorMsg };
        }

        return { valid: true };
      } else {
        // Test with OpenAI API call
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${key}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
          console.error('OpenAI API validation failed:', errorMsg);
          return { valid: false, error: errorMsg };
        }

        return { valid: true };
      }
    } catch (error) {
      console.error('Error validating API key:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Network error - check your connection'
      };
    }
  }
}

export const apiService = new APIService();
