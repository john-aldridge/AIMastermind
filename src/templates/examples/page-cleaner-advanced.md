# Page Cleaner & Translator Agent (Advanced)

## Overview

This **advanced** version demonstrates manual fallback control for translation using direct `callClient` actions instead of the declarative `translatePage` action. Perfect for power users who want full visibility and control over the translation fallback chain!

## Key Differences from Simple Version

| Feature | Simple Version | Advanced Version |
|---------|---------------|------------------|
| **Translation** | Declarative `translatePage` | Manual `callClient` |
| **Fallback Logic** | Hidden in engine | Explicit in config |
| **Configuration** | Single `fallbackStrategy` param | Full control flow with `if/else` |
| **Visibility** | Method used returned | Every step visible |
| **Debugging** | Harder to debug | Easy to see flow |
| **Complexity** | 1 line | 15+ lines |
| **Best For** | Most users | Power users, learning |

## Features

- **Remove Overlays**: Eliminates modals, popups, scrims, and dialog boxes
- **Remove Blur Effects**: Clears all CSS blur filters
- **Enable Scrolling**: Restores page scroll functionality
- **Manual Translation Fallback**: Explicit control over native → LLM fallback
- **Full Visibility**: See exactly which translation method succeeded

## How It Works

### 1. Clean Page (Same as Simple)
Removes overlays, blur effects, and enables scroll - identical to simple version.

### 2. Translation with Manual Fallback

Instead of using declarative `translatePage`, this version:

```json
{
  "type": "callClient",
  "client": "browser",
  "method": "browser_translate_page_native",
  "params": {"target_language": "en"},
  "saveAs": "nativeResult"
}
```

Then checks the result:

```json
{
  "type": "if",
  "condition": {
    "type": "equals",
    "left": "{{nativeResult.success}}",
    "right": false
  },
  "then": [
    {
      "type": "notify",
      "title": "Translation Fallback",
      "message": "Native translation unavailable, using LLM..."
    },
    {
      "type": "callClient",
      "client": "browser",
      "method": "browser_get_page_text",
      "params": {"include_hidden": false},
      "saveAs": "pageText"
    }
    // ... more LLM steps would go here
  ],
  "else": [
    {
      "type": "notify",
      "title": "Translation Complete",
      "message": "Used native Chrome translation"
    }
  ]
}
```

## Translation Approaches Comparison

### Approach 1: Native Chrome Translation (Used First)

**Method:** `browser_translate_page_native`

**How it works:**
- Uses Chrome 138+ built-in Translation API
- On-device AI models
- Walks through DOM and translates each text node
- No external network calls

**Pros:**
- ⚡ Fast (1-3 seconds)
- 🔒 Private (on-device, no data sent)
- ✨ Clean (no UI banner)
- 🆓 Free (no API costs)

**Cons:**
- ⚠️ Requires Chrome 138+
- ⚠️ Requires flag: `chrome://flags/#translation-api`
- ⚠️ Limited language support

**Result format:**
```json
{
  "success": true,
  "translated": true,
  "target_language": "en",
  "node_count": 152
}
```

---

### Approach 2: LLM Translation Workflow (Fallback)

**Methods:**
1. `browser_get_page_text` - Extract text nodes
2. AI translation call (via LLM client)
3. `browser_replace_text` - Replace with translations

**How it works:**
1. Extract all text nodes with unique IDs
2. Send to LLM for translation
3. Replace original text with translations

**Pros:**
- 🎯 High quality (context-aware)
- 🌍 All languages supported
- 🧠 Understands idioms, technical terms
- 📝 Preserves formatting

**Cons:**
- 🐌 Slower (5-10 seconds)
- 💰 Costs API credits
- 🌐 Requires internet
- ⚙️ More complex (3-step process)

**Result format:**
```json
{
  "success": true,
  "text_nodes": [
    {"id": "node_1", "text": "Welcome to our site", "xpath": "//body/h1"},
    {"id": "node_2", "text": "Read more", "xpath": "//body/p[1]"}
  ]
}
```

---

### Approach 3: Google Translate (Not Used Here)

**Method:** Inject Google Translate widget

**Pros:**
- 🔧 Works on old Chrome
- 🆓 Free

**Cons:**
- 🚫 Shows UI banner
- 📡 Sends data to Google
- 🔌 Requires external script injection
- 🐌 Takes 3-5 seconds to load

---

## Manual vs Declarative: When to Use Each

### Use Declarative (`translatePage`) When:
✅ You want simplicity (1 line)
✅ You trust the engine's fallback logic
✅ You don't need to customize fallback steps
✅ You're building agents for others
✅ You want future-proof configs

### Use Manual (`callClient`) When:
✅ You need full control over fallback
✅ You want to debug translation issues
✅ You need to customize each fallback step
✅ You're learning how translation works
✅ You want visibility into what method succeeded

## Usage

1. Navigate to a foreign language page
2. Open Synergy AI sidepanel
3. Go to Agents tab
4. Find "Page Cleaner & Translator (Advanced)"
5. Click "Execute" on `clean_and_translate_advanced`
6. Watch the notifications to see fallback in action!

## Example Use Cases

- **Learning**: See exactly how fallback works
- **Debugging**: Identify which translation method fails
- **Custom Logic**: Add your own fallback steps
- **Logging**: Track which method succeeded for analytics
- **Hybrid Approach**: Mix different translation strategies

## Technical Deep Dive

### Native Translation Call

```json
{
  "type": "callClient",
  "client": "browser",
  "method": "browser_translate_page_native",
  "params": {
    "target_language": "en",
    "source_language": null
  },
  "saveAs": "nativeResult"
}
```

**What happens:**
1. Checks if Translation API available (`self.translation`)
2. Creates translator for language pair
3. Walks all text nodes in DOM
4. Translates each node using on-device AI
5. Replaces text in place
6. Returns success/failure + metadata

---

### Fallback Check

```json
{
  "type": "if",
  "condition": {
    "type": "equals",
    "left": "{{nativeResult.success}}",
    "right": false
  },
  "then": [ /* fallback actions */ ]
}
```

**What this checks:**
- If `nativeResult.success === false`, native translation failed
- Could be: Chrome < 138, flag disabled, API unavailable, language not supported
- Executes fallback actions in `then` block

---

### LLM Translation (Conceptual)

Full implementation would look like:

```json
[
  {
    "type": "callClient",
    "client": "browser",
    "method": "browser_get_page_text",
    "params": {"include_hidden": false},
    "saveAs": "pageText"
  },
  {
    "type": "callClient",
    "client": "anthropic",
    "method": "translate_text",
    "params": {
      "text": "{{pageText}}",
      "target_language": "English",
      "preserve_formatting": true
    },
    "saveAs": "translations"
  },
  {
    "type": "callClient",
    "client": "browser",
    "method": "browser_replace_text",
    "params": {"replacements": "{{translations}}"}
  }
]
```

**Why not included here:**
- Would require custom Anthropic client method
- Plan demonstrates the pattern
- Full implementation available via declarative `translatePage`

---

## Benefits of Manual Approach

✅ **Full Control**: See every step of the fallback chain
✅ **Debuggable**: Can log/inspect each result
✅ **Flexible**: Can customize each fallback method
✅ **Educational**: Learn how translation methods work
✅ **Explicit**: All behavior visible in config

## Drawbacks of Manual Approach

❌ **Verbose**: Requires 15+ lines vs 1 line declarative
❌ **Complex**: More to understand and maintain
❌ **Brittle**: If client methods change, config breaks
❌ **Repetitive**: Every agent needs same fallback logic

## When to Choose This Approach

**Choose Advanced (Manual) if you:**
- Want to learn how translation fallback works
- Need to customize individual fallback steps
- Are debugging translation issues
- Want full visibility into which method succeeded
- Need to add custom logging/analytics
- Are building a specialized translation workflow

**Choose Simple (Declarative) if you:**
- Just want translation to work
- Don't need to customize fallback steps
- Want minimal config complexity
- Are building agents for non-technical users
- Value maintainability over control

## Comparison with Simple Version

**Simple version (page-cleaner.json):**
```json
{
  "type": "translatePage",
  "targetLanguage": "en",
  "fallbackStrategy": "native-then-llm"
}
```

**Advanced version (this example):**
```json
{
  "type": "callClient",
  "client": "browser",
  "method": "browser_translate_page_native",
  "params": {"target_language": "en"},
  "saveAs": "nativeResult"
},
{
  "type": "if",
  "condition": {
    "type": "equals",
    "left": "{{nativeResult.success}}",
    "right": false
  },
  "then": [
    /* 10+ lines of fallback logic */
  ]
}
```

**Outcome:** Same functionality, different implementation approach!

## Learn More

This example demonstrates:
- Direct client method calls via `callClient`
- Conditional logic with `if/else` actions
- Variable storage and reference with `saveAs`
- Result checking and branching
- Manual fallback chain construction
- BrowserClient method usage

Compare this with the simple `page-cleaner` example to see both approaches side-by-side!

## Troubleshooting

**Native translation not working?**
- Update to Chrome 138+
- Enable `chrome://flags/#translation-api`
- Restart Chrome after enabling flag
- Check console for `nativeResult` value

**Want to see the fallback?**
- Disable the translation flag to force LLM fallback
- Check notifications to see which path was taken
- Look at `nativeResult.success` in return value

**Want full LLM fallback?**
- Use the simple version with `fallbackStrategy: "native-then-llm"`
- That version has full LLM integration via the agent engine
- This version demonstrates the pattern conceptually

## Security

**⚠️ No JavaScript Execution:**
- This version uses only BrowserClient methods
- No JavaScript injection required (unlike Google Translate)
- More MV3 compliant
- Safer than external script injection

## Further Customization

Want to customize further? You can:
- Add more fallback methods (Google Translate, DeepL, etc.)
- Customize notification messages
- Add logging to storage
- Track which method succeeds for analytics
- Add timeout handling for each method
- Implement retry logic with delays

The manual approach gives you full control to build exactly what you need!
