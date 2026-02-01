/**
 * AI Provider Configuration System
 * Supports multiple authentication methods and provider types
 */

export type AuthFieldType = 'text' | 'password' | 'url' | 'select';

export interface AuthField {
  key: string;
  label: string;
  type: AuthFieldType;
  placeholder: string;
  required: boolean;
  helpText?: string;
  options?: { value: string; label: string }[];
}

export interface ModelOption {
  id: string;
  name: string;
  contextWindow?: number;
  pricing?: {
    input: number;  // per million tokens
    output: number; // per million tokens
  };
}

export interface ProviderConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  website: string;
  apiKeyUrl: string;
  tier: 'popular' | 'standard' | 'enterprise';
  authFields: AuthField[];
  models: ModelOption[];
  defaultModel: string;
  headerFormat: (credentials: Record<string, string>) => Record<string, string>;
  apiEndpoint: string;
  formatRequest: (prompt: string, model: string, credentials: Record<string, string>) => {
    url: string;
    body: any;
  };
  parseResponse: (response: any) => { content: string; tokensUsed: number };
}

export const AI_PROVIDERS: ProviderConfig[] = [
  // Our Models (Managed Platform)
  {
    id: 'our-models',
    name: 'our-models',
    displayName: 'Our Models',
    description: 'Access 100+ models through one billing system',
    website: '',
    apiKeyUrl: '',
    tier: 'popular',
    authFields: [],
    models: [
      {
        id: 'anthropic/claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        contextWindow: 200000,
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        contextWindow: 2000000,
      },
    ],
    defaultModel: 'anthropic/claude-sonnet-4-5',
    headerFormat: () => ({
      'Content-Type': 'application/json',
    }),
    apiEndpoint: '',
    formatRequest: (prompt, model) => ({
      url: '',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }),
  },

  // Anthropic (Claude)
  {
    id: 'anthropic',
    name: 'anthropic',
    displayName: 'Claude (Anthropic)',
    description: 'Most capable models with strong reasoning',
    website: 'https://anthropic.com',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    tier: 'popular',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-ant-api03-...',
        required: true,
        helpText: 'Get your API key from console.anthropic.com',
      },
    ],
    models: [
      {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        contextWindow: 200000,
        pricing: { input: 3, output: 15 },
      },
      {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        contextWindow: 200000,
        pricing: { input: 15, output: 75 },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude Haiku 3.5',
        contextWindow: 200000,
        pricing: { input: 0.8, output: 4 },
      },
    ],
    defaultModel: 'claude-sonnet-4-5-20250929',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'x-api-key': creds.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    formatRequest: (prompt, model) => ({
      url: 'https://api.anthropic.com/v1/messages',
      body: {
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      },
    }),
    parseResponse: (data) => ({
      content: data.content[0].text,
      tokensUsed: data.usage.input_tokens + data.usage.output_tokens,
    }),
  },

  // OpenAI
  {
    id: 'openai',
    name: 'openai',
    displayName: 'OpenAI (GPT)',
    description: 'GPT-4 and GPT-3.5 models',
    website: 'https://openai.com',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    tier: 'popular',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-...',
        required: true,
        helpText: 'Get your API key from platform.openai.com',
      },
    ],
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Latest)',
        contextWindow: 128000,
        pricing: { input: 2.5, output: 10 },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        pricing: { input: 0.15, output: 0.6 },
      },
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        pricing: { input: 10, output: 30 },
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        contextWindow: 8192,
        pricing: { input: 30, output: 60 },
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        pricing: { input: 0.5, output: 1.5 },
      },
    ],
    defaultModel: 'gpt-4o-mini',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.openai.com/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
    }),
  },

  // Google Gemini
  {
    id: 'google',
    name: 'google',
    displayName: 'Google (Gemini)',
    description: 'Gemini Pro and Ultra models',
    website: 'https://ai.google.dev',
    apiKeyUrl: 'https://makersuite.google.com/app/apikey',
    tier: 'popular',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'AIzaSy...',
        required: true,
        helpText: 'Get your API key from Google AI Studio',
      },
    ],
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2000000,
        pricing: { input: 1.25, output: 5 },
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        pricing: { input: 0.075, output: 0.3 },
      },
    ],
    defaultModel: 'gemini-1.5-pro',
    headerFormat: () => ({
      'Content-Type': 'application/json',
    }),
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    formatRequest: (prompt, model, creds) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${creds.apiKey}`,
      body: {
        contents: [{ parts: [{ text: prompt }] }],
      },
    }),
    parseResponse: (data) => ({
      content: data.candidates[0].content.parts[0].text,
      tokensUsed: data.usageMetadata?.totalTokenCount || 0,
    }),
  },

  // Groq
  {
    id: 'groq',
    name: 'groq',
    displayName: 'Groq',
    description: 'Ultra-fast inference with open models',
    website: 'https://groq.com',
    apiKeyUrl: 'https://console.groq.com/keys',
    tier: 'popular',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'gsk_...',
        required: true,
        helpText: 'Get your API key from console.groq.com',
      },
    ],
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        contextWindow: 32768,
        pricing: { input: 0.59, output: 0.79 },
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        contextWindow: 32768,
        pricing: { input: 0.24, output: 0.24 },
      },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
    }),
  },

  // OpenRouter (Aggregator)
  {
    id: 'openrouter',
    name: 'openrouter',
    displayName: 'OpenRouter',
    description: 'Access 100+ models through one API',
    website: 'https://openrouter.ai',
    apiKeyUrl: 'https://openrouter.ai/keys',
    tier: 'popular',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-or-v1-...',
        required: true,
        helpText: 'Get your API key from openrouter.ai',
      },
    ],
    models: [
      {
        id: 'anthropic/claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5 (via OpenRouter)',
        contextWindow: 200000,
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo (via OpenRouter)',
        contextWindow: 128000,
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5 (via OpenRouter)',
        contextWindow: 2000000,
      },
    ],
    defaultModel: 'anthropic/claude-sonnet-4-5',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
      'HTTP-Referer': chrome.runtime.getURL(''),
    }),
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }),
  },

  // Cohere
  {
    id: 'cohere',
    name: 'cohere',
    displayName: 'Cohere',
    description: 'Enterprise-grade language models',
    website: 'https://cohere.com',
    apiKeyUrl: 'https://dashboard.cohere.com/api-keys',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Cohere API key',
        required: true,
      },
    ],
    models: [
      {
        id: 'command-r-plus',
        name: 'Command R+',
        contextWindow: 128000,
      },
      {
        id: 'command-r',
        name: 'Command R',
        contextWindow: 128000,
      },
    ],
    defaultModel: 'command-r-plus',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.cohere.ai/v1/chat',
    formatRequest: (prompt, model) => ({
      url: 'https://api.cohere.ai/v1/chat',
      body: {
        model,
        message: prompt,
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.text,
      tokensUsed: data.meta?.tokens?.total_tokens || 0,
    }),
  },

  // Mistral AI
  {
    id: 'mistral',
    name: 'mistral',
    displayName: 'Mistral AI',
    description: 'High-performance open models',
    website: 'https://mistral.ai',
    apiKeyUrl: 'https://console.mistral.ai/api-keys',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Mistral API key',
        required: true,
      },
    ],
    models: [
      {
        id: 'mistral-large-latest',
        name: 'Mistral Large',
        contextWindow: 128000,
      },
      {
        id: 'mistral-medium-latest',
        name: 'Mistral Medium',
        contextWindow: 32000,
      },
    ],
    defaultModel: 'mistral-large-latest',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.mistral.ai/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
    }),
  },

  // DeepSeek
  {
    id: 'deepseek',
    name: 'deepseek',
    displayName: 'DeepSeek',
    description: 'Specialized chat and coding models',
    website: 'https://deepseek.com',
    apiKeyUrl: 'https://platform.deepseek.com/api-keys',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'sk-...',
        required: true,
      },
    ],
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        contextWindow: 32000,
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        contextWindow: 16000,
      },
    ],
    defaultModel: 'deepseek-chat',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.deepseek.com/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
    }),
  },

  // xAI (Grok)
  {
    id: 'xai',
    name: 'xai',
    displayName: 'xAI (Grok)',
    description: 'Real-time information with Grok models',
    website: 'https://x.ai',
    apiKeyUrl: 'https://console.x.ai',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'xai-...',
        required: true,
      },
    ],
    models: [
      {
        id: 'grok-beta',
        name: 'Grok Beta',
        contextWindow: 131072,
      },
    ],
    defaultModel: 'grok-beta',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.x.ai/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.x.ai/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }),
  },

  // Perplexity
  {
    id: 'perplexity',
    name: 'perplexity',
    displayName: 'Perplexity',
    description: 'Search-enhanced AI responses',
    website: 'https://perplexity.ai',
    apiKeyUrl: 'https://www.perplexity.ai/settings/api',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'pplx-...',
        required: true,
      },
    ],
    models: [
      {
        id: 'llama-3.1-sonar-large-128k-online',
        name: 'Sonar Large (Online)',
        contextWindow: 127072,
      },
      {
        id: 'llama-3.1-sonar-small-128k-online',
        name: 'Sonar Small (Online)',
        contextWindow: 127072,
      },
    ],
    defaultModel: 'llama-3.1-sonar-large-128k-online',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.perplexity.ai/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.perplexity.ai/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }),
  },

  // Replicate
  {
    id: 'replicate',
    name: 'replicate',
    displayName: 'Replicate',
    description: 'Run thousands of open-source models',
    website: 'https://replicate.com',
    apiKeyUrl: 'https://replicate.com/account/api-tokens',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Token',
        type: 'password',
        placeholder: 'r8_...',
        required: true,
      },
    ],
    models: [
      {
        id: 'meta/llama-2-70b-chat',
        name: 'Llama 2 70B Chat',
        contextWindow: 4096,
      },
      {
        id: 'mistralai/mixtral-8x7b-instruct-v0.1',
        name: 'Mixtral 8x7B Instruct',
        contextWindow: 32768,
      },
    ],
    defaultModel: 'meta/llama-2-70b-chat',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Token ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.replicate.com/v1/predictions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.replicate.com/v1/predictions',
      body: {
        version: model,
        input: { prompt, max_tokens: 1024 },
      },
    }),
    parseResponse: (data) => ({
      content: data.output?.join('') || '',
      tokensUsed: 0,
    }),
  },

  // Hugging Face
  {
    id: 'huggingface',
    name: 'huggingface',
    displayName: 'Hugging Face',
    description: 'Access thousands of open models',
    website: 'https://huggingface.co',
    apiKeyUrl: 'https://huggingface.co/settings/tokens',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Token',
        type: 'password',
        placeholder: 'hf_...',
        required: true,
      },
    ],
    models: [
      {
        id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        name: 'Mixtral 8x7B Instruct',
        contextWindow: 32768,
      },
      {
        id: 'meta-llama/Meta-Llama-3-70B-Instruct',
        name: 'Llama 3 70B Instruct',
        contextWindow: 8192,
      },
    ],
    defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api-inference.huggingface.co/models',
    formatRequest: (prompt, model) => ({
      url: `https://api-inference.huggingface.co/models/${model}`,
      body: {
        inputs: prompt,
        parameters: { max_new_tokens: 1024 },
      },
    }),
    parseResponse: (data) => ({
      content: data[0]?.generated_text || data.generated_text || '',
      tokensUsed: 0,
    }),
  },

  // Together AI
  {
    id: 'together',
    name: 'together',
    displayName: 'Together AI',
    description: 'Fast inference for open models',
    website: 'https://together.ai',
    apiKeyUrl: 'https://api.together.xyz/settings/api-keys',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Together AI API key',
        required: true,
      },
    ],
    models: [
      {
        id: 'meta-llama/Llama-3-70b-chat-hf',
        name: 'Llama 3 70B Chat',
        contextWindow: 8192,
      },
      {
        id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        name: 'Mixtral 8x7B Instruct',
        contextWindow: 32768,
      },
    ],
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.together.xyz/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.together.xyz/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }),
  },

  // Fireworks AI
  {
    id: 'fireworks',
    name: 'fireworks',
    displayName: 'Fireworks AI',
    description: 'Production-grade generative AI',
    website: 'https://fireworks.ai',
    apiKeyUrl: 'https://fireworks.ai/api-keys',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'fw_...',
        required: true,
      },
    ],
    models: [
      {
        id: 'accounts/fireworks/models/llama-v3-70b-instruct',
        name: 'Llama 3 70B Instruct',
        contextWindow: 8192,
      },
      {
        id: 'accounts/fireworks/models/mixtral-8x7b-instruct',
        name: 'Mixtral 8x7B Instruct',
        contextWindow: 32768,
      },
    ],
    defaultModel: 'accounts/fireworks/models/llama-v3-70b-instruct',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.fireworks.ai/inference/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }),
  },

  // Anyscale
  {
    id: 'anyscale',
    name: 'anyscale',
    displayName: 'Anyscale',
    description: 'Scalable AI model deployments',
    website: 'https://anyscale.com',
    apiKeyUrl: 'https://console.anyscale.com/credentials',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'esecret_...',
        required: true,
      },
    ],
    models: [
      {
        id: 'meta-llama/Llama-3-70b-chat-hf',
        name: 'Llama 3 70B Chat',
        contextWindow: 8192,
      },
      {
        id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        name: 'Mixtral 8x7B Instruct',
        contextWindow: 32768,
      },
    ],
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.endpoints.anyscale.com/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.endpoints.anyscale.com/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }),
  },

  // AI21 Labs
  {
    id: 'ai21',
    name: 'ai21',
    displayName: 'AI21 Labs',
    description: 'Jurassic-2 foundation models',
    website: 'https://ai21.com',
    apiKeyUrl: 'https://studio.ai21.com/account/api-key',
    tier: 'standard',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your AI21 API key',
        required: true,
      },
    ],
    models: [
      {
        id: 'jamba-instruct',
        name: 'Jamba Instruct',
        contextWindow: 256000,
      },
      {
        id: 'j2-ultra',
        name: 'Jurassic-2 Ultra',
        contextWindow: 8192,
      },
    ],
    defaultModel: 'jamba-instruct',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }),
    apiEndpoint: 'https://api.ai21.com/studio/v1/chat/completions',
    formatRequest: (prompt, model) => ({
      url: 'https://api.ai21.com/studio/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
    }),
  },

  // Azure OpenAI (Enterprise)
  {
    id: 'azure-openai',
    name: 'azure-openai',
    displayName: 'Azure OpenAI',
    description: 'Enterprise OpenAI models on Azure',
    website: 'https://azure.microsoft.com/en-us/products/ai-services/openai-service',
    apiKeyUrl: 'https://portal.azure.com',
    tier: 'enterprise',
    authFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Your Azure API key',
        required: true,
      },
      {
        key: 'endpoint',
        label: 'Endpoint URL',
        type: 'url',
        placeholder: 'https://your-resource.openai.azure.com',
        required: true,
        helpText: 'Your Azure OpenAI resource endpoint',
      },
      {
        key: 'deployment',
        label: 'Deployment Name',
        type: 'text',
        placeholder: 'gpt-4-deployment',
        required: true,
        helpText: 'Your model deployment name',
      },
    ],
    models: [
      {
        id: 'gpt-4',
        name: 'GPT-4 (Azure)',
        contextWindow: 8192,
      },
      {
        id: 'gpt-35-turbo',
        name: 'GPT-3.5 Turbo (Azure)',
        contextWindow: 16385,
      },
    ],
    defaultModel: 'gpt-4',
    headerFormat: (creds) => ({
      'Content-Type': 'application/json',
      'api-key': creds.apiKey,
    }),
    apiEndpoint: '',
    formatRequest: (prompt, _model, creds) => ({
      url: `${creds.endpoint}/openai/deployments/${creds.deployment}/chat/completions?api-version=2024-02-15-preview`,
      body: {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      },
    }),
    parseResponse: (data) => ({
      content: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
    }),
  },
];

export function getProviderById(id: string): ProviderConfig | undefined {
  return AI_PROVIDERS.find(p => p.id === id);
}

export function getProvidersByTier(tier: 'popular' | 'standard' | 'enterprise'): ProviderConfig[] {
  return AI_PROVIDERS.filter(p => p.tier === tier);
}

export function getPopularProviders(): ProviderConfig[] {
  return getProvidersByTier('popular');
}

export function getAllProviders(): ProviderConfig[] {
  return AI_PROVIDERS;
}
