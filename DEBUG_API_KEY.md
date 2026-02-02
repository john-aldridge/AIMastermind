# Debugging Claude API Key Issues

## What I Changed

I've updated the error handling to show **exactly** why your API key validation is failing. Now when you try to save your key, you'll see the specific error message from the API.

## Steps to Debug

### 1. Reload the Extension
```
1. Go to chrome://extensions/
2. Click the refresh icon (🔄) on Synergy AI
3. Try entering your API key again
```

### 2. Check the Error Message
When you click "Save API Key", you should now see a detailed error message telling you:
- The exact HTTP error code
- The error message from Anthropic
- Suggestions on what to check

### 3. Open Browser Console for More Details
```
1. Click the Synergy AI extension icon
2. Right-click anywhere in the popup
3. Select "Inspect" or "Inspect Element"
4. Go to the "Console" tab
5. Try saving your API key again
6. Look for red error messages
```

## Common Issues & Solutions

### Issue 1: "authentication_error" or "invalid_api_key"

**Cause:** The API key format is wrong or the key doesn't exist

**Solutions:**
- ✅ Verify your key starts with `sk-ant-api03-`
- ✅ Copy the ENTIRE key (they're very long)
- ✅ Check for extra spaces before/after the key
- ✅ Verify the key exists in [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- ✅ Make sure you didn't accidentally copy part of the page text with the key

### Issue 2: "permission_error" or "forbidden"

**Cause:** Your Anthropic account doesn't have API access enabled

**Solutions:**
- ✅ Go to [console.anthropic.com/settings/plans](https://console.anthropic.com/settings/plans)
- ✅ Verify you have API access (not just Claude.ai Pro)
- ✅ You may need to add credits to your API account
- ✅ Check if your organization has API access enabled

### Issue 3: CORS or Network Error

**Cause:** Browser security blocking the API call

**Solutions:**
- ✅ This shouldn't happen with proper extension permissions
- ✅ Check if you have any ad blockers or security extensions blocking API calls
- ✅ Temporarily disable other extensions to test

### Issue 4: "rate_limit_error"

**Cause:** Too many validation attempts

**Solutions:**
- ✅ Wait 60 seconds before trying again
- ✅ Your key is probably correct, just wait a moment

## Manual API Key Test

You can test your API key directly using curl:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
  }'
```

**Expected Response:**
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [{"type": "text", "text": "Hello"}],
  ...
}
```

**If you get an error here**, the issue is with your API key or Anthropic account, not the extension.

## What Your API Key Should Look Like

Claude API keys have this format:
```
sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

They are **very long** (around 100+ characters).

## Checking Your Anthropic Console

1. Visit [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. You should see your API keys listed
3. Verify the key you're using is **not deleted**
4. Check the key's permissions

## Alternative: Temporarily Skip Validation

If you're confident your key is correct, I can update the code to skip validation and just save the key. Let me know if you want me to do this.

## Need More Help?

Tell me:
1. What exact error message you're seeing now (after reloading)
2. What you see in the browser console
3. Whether the curl test above works

I'll help you fix it!
