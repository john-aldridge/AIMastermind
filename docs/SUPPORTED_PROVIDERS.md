# Supported AI Providers

AI Mastermind supports **20+ AI providers** with a flexible authentication system that adapts to each provider's requirements.

## 🌟 Popular Providers

These providers are featured prominently in the UI:

### 1. Claude (Anthropic)
- **Authentication**: API Key
- **Models**: Sonnet 4.5, Opus 4.5, Haiku 3.5
- **Best For**: Complex reasoning, long context
- **Get API Key**: [console.anthropic.com](https://console.anthropic.com/settings/keys)

### 2. OpenAI (GPT)
- **Authentication**: API Key
- **Models**: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Best For**: General purpose, code generation
- **Get API Key**: [platform.openai.com](https://platform.openai.com/api-keys)

### 3. Google (Gemini)
- **Authentication**: API Key
- **Models**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **Best For**: Multimodal, extremely long context (2M tokens)
- **Get API Key**: [makersuite.google.com](https://makersuite.google.com/app/apikey)

### 4. Groq
- **Authentication**: API Key
- **Models**: Llama 3.3 70B, Mixtral 8x7B
- **Best For**: Ultra-fast inference, real-time applications
- **Get API Key**: [console.groq.com](https://console.groq.com/keys)

### 5. OpenRouter
- **Authentication**: API Key
- **Models**: 100+ models from multiple providers
- **Best For**: Access to multiple providers through one API
- **Get API Key**: [openrouter.ai](https://openrouter.ai/keys)

## 📦 Standard Providers

Additional providers available in "Show All":

### 6. Cohere
- **Authentication**: API Key
- **Models**: Command R+, Command R
- **Best For**: Enterprise use, RAG applications

### 7. Mistral AI
- **Authentication**: API Key
- **Models**: Mistral Large, Mistral Medium
- **Best For**: High-performance open models

### 8. Together AI
- **Authentication**: API Key
- **Models**: Multiple open-source models
- **Best For**: Cost-effective inference

### 9. Fireworks AI
- **Authentication**: API Key
- **Models**: Fast inference of open models
- **Best For**: Production deployments

### 10. Perplexity
- **Authentication**: API Key
- **Models**: pplx-70b-online, pplx-7b-chat
- **Best For**: Search-enhanced generation

### 11. Replicate
- **Authentication**: API Key
- **Models**: Thousands of open models
- **Best For**: Experimentation, custom models

### 12. Hugging Face
- **Authentication**: API Key
- **Models**: Access to HF Inference API
- **Best For**: Open-source model exploration

### 13. DeepSeek
- **Authentication**: API Key
- **Models**: DeepSeek Chat, DeepSeek Coder
- **Best For**: Specialized tasks

### 14. xAI (Grok)
- **Authentication**: API Key
- **Models**: Grok-1
- **Best For**: Real-time information

### 15. AI21 Labs
- **Authentication**: API Key
- **Models**: Jurassic-2 Ultra, Jurassic-2 Mid
- **Best For**: Instruction following

### 16. Anyscale
- **Authentication**: API Key
- **Models**: Various Llama and Mistral models
- **Best For**: Scalable deployments

### 17. Stability AI
- **Authentication**: API Key
- **Models**: Stable Diffusion (future support)
- **Best For**: Image generation (planned)

## 🏢 Enterprise Providers

Require additional configuration beyond API key:

### 18. Azure OpenAI
- **Authentication**: API Key + Endpoint URL + Deployment Name
- **Models**: GPT-4, GPT-3.5 (via Azure)
- **Best For**: Enterprise deployments, compliance requirements
- **Setup**: Azure Portal

### 19. AWS Bedrock
- **Authentication**: AWS Credentials (planned)
- **Models**: Claude, Llama, Titan
- **Best For**: AWS-native deployments

### 20. Google Vertex AI
- **Authentication**: OAuth/Service Account (planned)
- **Models**: Gemini, PaLM
- **Best For**: GCP-native deployments

### 21. Cloudflare Workers AI
- **Authentication**: API Key + Account ID (planned)
- **Models**: Various open models
- **Best For**: Edge deployment

## How It Works

### 1. Flexible Authentication System
Each provider can define:
- **Multiple auth fields** (API key, endpoint URL, account ID, etc.)
- **Field types** (text, password, URL, dropdown)
- **Validation rules**
- **Help text and links**

### 2. Dynamic UI
The Settings UI automatically adapts to show:
- ✅ Provider selector (grid view with search)
- ✅ Dynamic form fields based on provider
- ✅ Model selection dropdown
- ✅ Direct links to get API keys
- ✅ Inline validation and error messages

### 3. Model Selection
Each provider shows:
- Available models
- Context window sizes
- Pricing information (when available)
- Default model selection

## Adding New Providers

The system is designed to be easily extensible. To add a new provider:

1. Add configuration to `src/utils/providers.ts`
2. Define authentication fields
3. Specify API endpoint and request format
4. The UI automatically adapts!

No UI changes needed - everything is data-driven.

## Provider Selection Tips

### For Best Quality
- **Claude Opus 4.5**: Most capable reasoning
- **GPT-4 Turbo**: Balanced performance
- **Gemini Pro 1.5**: Best for very long documents

### For Speed
- **Groq**: Fastest inference
- **Gemini Flash**: Fast and capable
- **Claude Haiku 3.5**: Quick responses

### For Cost
- **Gemini Flash**: Best value
- **GPT-3.5 Turbo**: Cheap and reliable
- **Mixtral via Groq**: Open model, low cost

### For Convenience
- **OpenRouter**: One API, many models
- **Azure OpenAI**: Enterprise support
- **Replicate**: Easy model experimentation

## Authentication Storage

All credentials are:
- 🔒 **Stored locally** in Chrome's secure storage
- 🔒 **Never sent to our servers**
- 🔒 **Encrypted by Chrome**
- 🔒 **Can be deleted anytime**

## Coming Soon

We're planning to add:
- 📋 Provider comparison table
- 📊 Usage statistics per provider
- 🔄 Easy provider switching
- 💰 Cost tracking per provider
- 🎨 Custom provider logos
- ⚡ Provider health status
- 🔔 Rate limit warnings

## Need Help?

- Each provider card includes a direct link to get API keys
- Help text appears under each field
- Error messages show exactly what's wrong
- Check console logs for detailed debugging

## Contribute

Want to see a provider added? Open an issue or PR on GitHub with:
- Provider name and website
- API documentation link
- Authentication method
- Example API call
