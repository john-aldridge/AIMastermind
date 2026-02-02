# Setting Up Claude API for Synergy AI

This guide will help you set up your Claude API key to use with Synergy AI.

## Step 1: Get Your Claude API Key

### For Claude Pro Users

1. **Visit the Anthropic Console**
   - Go to [console.anthropic.com](https://console.anthropic.com/)
   - Sign in with your Anthropic account

2. **Create an API Key**
   - Navigate to "API Keys" in the left sidebar
   - Click "Create Key"
   - Give your key a name (e.g., "Synergy AI Extension")
   - Copy the key immediately (you won't be able to see it again!)

3. **Save Your Key Securely**
   - Store it in a password manager
   - Keep it confidential - never share it publicly

### API Key Format

Claude API keys start with `sk-ant-` followed by a long string of characters.

Example format: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 2: Configure Synergy AI

### In the Extension

1. **Open the Extension Popup**
   - Click the Synergy AI icon in your Chrome toolbar

2. **Go to Settings**
   - Click the "Settings" tab in the popup

3. **Enable API Key Mode**
   - Toggle the "Use Own Key" switch

4. **Select Claude as Your Provider**
   - Click the "Claude (Anthropic)" button

5. **Enter Your API Key**
   - Paste your Claude API key into the input field
   - Click "Save API Key"
   - The extension will validate your key

6. **Success!**
   - You'll see a confirmation message if the key is valid
   - You can now use Claude AI in your widgets

## Step 3: Using Claude Models

### Available Claude Models

The extension supports all Claude models:

**Claude Sonnet 4.5** (Default - Recommended)
- Model ID: `claude-sonnet-4-5-20250929`
- Best balance of intelligence, speed, and cost
- Perfect for most use cases

**Claude Opus 4.5**
- Model ID: `claude-opus-4-5-20251101`
- Most capable model
- Best for complex reasoning tasks

**Claude Haiku 3.5**
- Model ID: `claude-3-5-haiku-20241022`
- Fast and cost-effective
- Good for simple tasks

The extension defaults to Claude Sonnet 4.5, which provides excellent performance for most widget use cases.

## API Pricing

### Claude API Costs (Pay-as-you-go)

Prices are per million tokens:

**Claude Sonnet 4.5**
- Input: $3.00 per million tokens
- Output: $15.00 per million tokens

**Claude Opus 4.5**
- Input: $15.00 per million tokens
- Output: $75.00 per million tokens

**Claude Haiku 3.5**
- Input: $0.80 per million tokens
- Output: $4.00 per million tokens

### Token Estimation

As a rough guide:
- 1 token ≈ 4 characters
- 1 token ≈ 0.75 words
- 100 words ≈ 133 tokens

Most widget responses will use 100-500 tokens, costing less than $0.01 each with Sonnet.

## Benefits of Using Your Own API Key

✅ **No Token Limits** - Use as much as you want, pay only for what you use
✅ **Full Control** - Manage your own API usage and billing
✅ **Privacy** - Your data goes directly to Anthropic, not through our servers
✅ **Latest Models** - Access to all Claude models as soon as they're released
✅ **Better Rates** - Pay Anthropic's direct pricing, no markup

## Troubleshooting

### "Invalid API Key" Error

**Check:**
- Key format starts with `sk-ant-`
- No extra spaces before/after the key
- Key hasn't been deleted in the Anthropic Console
- Your Anthropic account has API access enabled

### API Call Failures

**Check:**
- You have API credits in your Anthropic account
- Your API key has the necessary permissions
- You haven't exceeded rate limits

### Rate Limits

Claude API has rate limits based on your tier:
- **Tier 1** (New accounts): 50 requests/min
- **Tier 2**: 1,000 requests/min
- **Tier 3**: 2,000 requests/min
- **Tier 4**: 4,000 requests/min

You'll automatically move up tiers as you use the API more.

## Security Best Practices

🔒 **Never commit API keys to Git**
🔒 **Don't share API keys publicly**
🔒 **Rotate keys regularly**
🔒 **Use separate keys for different projects**
🔒 **Monitor your usage in the Anthropic Console**

## Alternative: Use Extension Tokens

If you don't want to manage your own API key:

1. **Use Extension Tokens**
   - Toggle "Use Own Key" OFF in Settings
   - Purchase token packages through the extension
   - We handle the API integration

2. **Benefits**
   - Simple setup, no API account needed
   - Prepaid tokens, no surprise bills
   - Support for users without technical setup

## Support

### For API Issues
- Visit [docs.anthropic.com](https://docs.anthropic.com/)
- Contact Anthropic support through the Console

### For Extension Issues
- Check the extension's GitHub issues
- Report bugs through the feedback system

## Learn More

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Claude Model Comparison](https://docs.anthropic.com/en/docs/about-claude/models)
- [API Rate Limits](https://docs.anthropic.com/en/api/rate-limits)
- [Best Practices](https://docs.anthropic.com/en/docs/build-with-claude/best-practices)
