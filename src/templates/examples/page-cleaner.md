# Page Cleaner & Translator Agent

## Overview

This comprehensive agent cleans up web pages by removing overlays, blur effects, enabling scroll, and translating content to English. Perfect for dealing with paywalls, modal popups, and foreign language content!

## Features

- **Remove Overlays**: Eliminates modals, popups, scrims, and dialog boxes
- **Remove Blur Effects**: Clears all CSS blur filters and backdrop filters
- **Enable Scrolling**: Restores page scroll functionality
- **Auto-Translate**: Translates page content to English using Google Translate
- **Configurable**: Toggle auto-translation on/off

## How It Works

### 1. Remove Overlays
Searches for and removes elements with common overlay classes and attributes:
- `.modal`, `.popup`, `.overlay`, `.scrim`
- `[role='dialog']`, `[aria-modal='true']`
- Fixed position elements with high z-index

### 2. Remove Blur Effects
Finds elements with blur CSS and removes:
- `filter: blur(...)`
- `backdrop-filter: blur(...)`
- Classes containing "blur"

### 3. Enable Scrolling
Restores scroll on both `<html>` and `<body>` elements by setting:
- `overflow: auto !important`
- `position: static !important`
- `height: auto !important`

### 4. Translate Page
Uses smart translation with automatic fallback:
- **Native (Chrome 138+)**: Uses built-in Translation API (fast, private, on-device)
- **LLM Fallback**: Uses your configured AI model for high-quality translation
- **Auto-selects target language** (English)
- **Works with any source language**

#### Fallback Strategy: `native-then-llm`
1. First tries Chrome's native Translation API (requires Chrome 138+ and flag enabled)
2. If native unavailable, falls back to LLM-based translation using your AI config
3. Skips Google Translate injection (cleaner UX, no banner)

#### Available Fallback Strategies
- `native-only` - Use only Chrome native translation
- `llm-only` - Use only LLM translation
- `google-only` - Use only Google Translate injection
- `native-then-llm` - Try native first, then LLM (default, recommended)
- `native-then-google` - Try native first, then Google Translate
- `llm-then-google` - Try LLM first, then Google Translate
- `native-then-llm-then-google` - Try all three in order

## Configuration

**Auto Translate:**
- **Yes**: Automatically translate to English (default)
- **No**: Skip translation step

## Usage

1. Navigate to a page with overlays, blur, or foreign language
2. Open Synergy AI sidepanel
3. Go to Agents tab
4. Find "Page Cleaner & Translator"
5. Click "Execute" on "clean_and_translate" capability
6. Page is instantly cleaned and translated!

## Example Use Cases

- **Paywalls**: Remove "Subscribe Now" overlays and blur effects
- **Foreign News Sites**: Clean up and translate to English
- **Cookie Banners**: Remove consent modals and restore scroll
- **Newsletter Popups**: Get rid of signup overlays
- **Research Papers**: Translate academic content

## Technical Details

### Declarative Actions Used:
- `querySelectorAll` - Find overlay and blur elements
- `forEach` - Iterate through element collections
- `remove` - Delete DOM elements
- `addStyle` - Apply CSS styles
- `if` - Conditional translation based on config
- `notify` - Show success notification

### Chrome API Actions:
- `translatePage` - Smart translation with automatic fallback
  - `targetLanguage`: ISO 639-1 code (e.g., "en", "es", "fr")
  - `sourceLanguage`: Optional, auto-detects if omitted
  - `fallbackStrategy`: Controls which translation methods to try (default: `native-then-llm`)

**Translation Methods:**
1. **Native (Chrome 138+)**: On-device AI translation via Translation API
   - Fast (1-3 seconds)
   - Private (no data sent to servers)
   - Clean (no UI clutter)
   - Requires `chrome://flags/#translation-api` enabled

2. **LLM**: AI-powered translation using your configured model
   - High quality (context-aware)
   - Supports all languages
   - Uses your API credentials
   - Takes 5-10 seconds

3. **Google Translate**: External service injection
   - Shows translation banner
   - Works on older Chrome versions
   - Sends data to Google servers

### Selectors Used:

**Overlays:**
```
.modal, .popup, .overlay, .scrim,
[class*='overlay'], [class*='modal'],
[role='dialog'], [aria-modal='true'],
[style*='position: fixed'][style*='z-index']
```

**Blur Effects:**
```
[style*='filter'][style*='blur'],
[style*='backdrop-filter'][style*='blur'],
.blur, .blurred, [class*='blur']
```

## Security

**⚠️ Contains JavaScript:**
- This agent may inject Google Translate if fallback reaches that method
- JavaScript runs in page context (isolated from extension)
- Requires JavaScript execution enabled in Settings > Security
- Native and LLM methods don't require JavaScript injection
- User must explicitly allow JavaScript execution for Google Translate fallback

## Benefits

✅ **One-Click Solution**: All cleaning actions in single execution
✅ **Comprehensive**: Handles overlays, blur, scroll, and translation
✅ **Configurable**: Control which features to use
✅ **Fast**: Executes in under 2 seconds
✅ **Safe**: JavaScript isolated to page context

## Learn More

This example demonstrates:
- Multiple declarative actions in sequence
- Conditional logic for optional features
- Chrome API integration (translatePage)
- JavaScript execution for external APIs
- Complex DOM manipulation
- User configuration options

Study this example to learn how to build multi-purpose agents that solve real problems!

## Troubleshooting

**Translation not working?**
- **Native method**: Update to Chrome 138+ and enable `chrome://flags/#translation-api`
- **LLM method**: Ensure you have an active LLM configuration with valid API key
- **Google method**: Ensure JavaScript execution is enabled in Settings
- Check internet connection (LLM and Google methods need network)
- Try manual refresh after execution
- Check console logs to see which method was attempted

**Overlays not removed?**
- Some sites use dynamic overlay injection
- Try the "watch_and_remove" capability on other agents
- Page may need refresh after removal

**Scroll still disabled?**
- Some sites use JavaScript scroll locks
- Try refreshing the page after cleaning
- Check for additional body style attributes
