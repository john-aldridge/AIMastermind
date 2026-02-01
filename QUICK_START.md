# Quick Start Guide - AI Mastermind with Claude

## 🚀 Using Your Own Claude API Key

### Step 1: Get Your API Key

1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Sign in with your Anthropic account
3. Go to "API Keys" in the sidebar
4. Click "Create Key"
5. Copy your key (starts with `sk-ant-`)

### Step 2: Configure the Extension

1. **Open AI Mastermind**
   - Click the extension icon in Chrome

2. **Go to Settings Tab**
   - Click "Settings" in the popup

3. **Enable Your API Key**
   - Toggle "Use Own Key" ON
   - Select "Claude (Anthropic)"
   - Paste your API key
   - Click "Save API Key"

4. **Verify**
   - You should see a success message
   - Your key is now validated and ready!

### Step 3: Create Your First Widget

1. **Create a Master Plan**
   - Go back to "Plans" tab
   - Click "New Plan"
   - Name it (e.g., "My Productivity Tools")
   - Add a description

2. **Add a Widget**
   - Click "Show Widgets" on your plan
   - Click "+ Add Widget"
   - Give it a name (e.g., "Page Summarizer")
   - Enter an AI prompt:
     ```
     Analyze this webpage and provide a brief summary of the main points.
     ```

3. **Activate Your Plan**
   - Click "Activate" on your plan
   - Visit any webpage
   - Your widget will appear!

## 💡 Widget Prompt Ideas

### Page Summarizer
```
Read this webpage and create a concise 3-bullet summary of the key information.
```

### Code Reviewer
```
Review any code on this page and suggest improvements for readability,
performance, and best practices.
```

### Translation Helper
```
Translate the main content of this page to Spanish while preserving
the formatting and technical terms.
```

### Research Assistant
```
Extract the main facts, statistics, and claims from this article.
Present them as a bulleted list with brief explanations.
```

### Writing Improver
```
Take any selected text and improve its clarity, grammar, and professional tone
while keeping the same meaning.
```

## 🎯 Tips

- **Be Specific**: The more detailed your prompt, the better the results
- **Test Prompts**: Try different prompts to see what works best
- **System Context**: The AI automatically sees the webpage content
- **Drag Widgets**: Click and drag the widget header to reposition
- **Multiple Widgets**: Add several widgets to one plan for different tasks

## 📊 Monitoring Usage

### Check Your API Usage
- Visit [console.anthropic.com](https://console.anthropic.com/)
- Go to "Usage" to see your API consumption
- Set up billing alerts to avoid surprises

### Token Costs (Rough Estimates)
- Simple summary: ~200-500 tokens (~$0.001-0.003)
- Detailed analysis: ~500-1500 tokens (~$0.003-0.01)
- Code review: ~1000-2000 tokens (~$0.006-0.015)

Most widgets cost less than a penny per use!

## 🔒 Security & Privacy

✅ Your API key is stored **locally** in your browser
✅ Keys are **never sent** to our servers
✅ All API calls go **directly** to Anthropic
✅ Your data stays between you and Anthropic

## 🆚 Own Key vs. Extension Tokens

### Using Your Own Key ✨
- Pay-as-you-go pricing
- No monthly limits
- Full control over usage
- Direct Anthropic pricing
- **Recommended for power users**

### Using Extension Tokens
- Prepaid token packages
- Simple setup, no API account
- Fixed pricing
- Good for casual users

## 🐛 Troubleshooting

### "Invalid API Key"
- Check the key starts with `sk-ant-`
- Make sure there are no extra spaces
- Verify in Anthropic Console the key exists

### Widget Not Appearing
- Check the plan is activated
- Refresh the page
- Check browser console for errors

### API Errors
- Ensure you have API credits in your Anthropic account
- Check you haven't exceeded rate limits
- Verify your key has proper permissions

## 📚 Next Steps

- Read [CLAUDE_API_SETUP.md](docs/CLAUDE_API_SETUP.md) for detailed API information
- Check [DEVELOPMENT.md](DEVELOPMENT.md) for customization options
- Explore different Claude models for different use cases

## 💰 Cost Examples (Claude Sonnet 4.5)

| Task | Estimated Tokens | Approximate Cost |
|------|-----------------|------------------|
| Simple summary | 300 | $0.0015 |
| Detailed analysis | 1,000 | $0.005 |
| Code review | 1,500 | $0.0075 |
| Translation | 800 | $0.004 |
| Research extraction | 1,200 | $0.006 |

**Most widgets cost less than 1¢ per use!**

## Support

Need help? Check:
- Extension documentation in the repo
- [Anthropic Documentation](https://docs.anthropic.com/)
- GitHub Issues for bugs and feature requests

Happy widget building! 🎉
