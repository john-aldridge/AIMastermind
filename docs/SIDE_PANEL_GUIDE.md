# Side Panel Mode Guide

## Overview

AI Mastermind now supports **both Side Panel and Popup modes**, with Side Panel as the default for the best experience!

## 🎯 Side Panel Mode (Default & Recommended)

### What is Side Panel Mode?

The Side Panel opens **alongside your browser** - similar to Chrome DevTools, bookmarks sidebar, or ChatGPT's interface.

```
┌────────────┬─────────────────────────────┐
│            │                             │
│  Side      │      Your Webpage           │
│  Panel     │                             │
│            │      ┌──────────┐           │
│  ┌──────┐  │      │ Widget 1 │           │
│  │Plans │  │      └──────────┘           │
│  └──────┘  │                             │
│            │      ┌──────────┐           │
│  Active    │      │ Widget 2 │           │
│  Widgets   │      └──────────┘           │
│            │                             │
└────────────┴─────────────────────────────┘
```

### Benefits

✅ **Always Visible** - Doesn't close when you click outside
✅ **More Space** - Full height of browser, resizable width
✅ **Multi-tasking** - Manage widgets while browsing
✅ **Persistent** - Stays open across tabs
✅ **Better for Work** - Perfect for ongoing AI assistance

### How to Use

1. **First Time**: Click the extension icon
   - Side panel opens automatically
   - Appears on the right side of your browser

2. **Re-opening**:
   - Click extension icon again
   - Or: Right-click icon → "Open side panel"
   - Or: Use Chrome menu → "AI Mastermind" side panel

3. **Resizing**:
   - Drag the left edge to resize
   - Chrome remembers your preferred width

4. **Closing**:
   - Click X in side panel header
   - Panel closes but preference is saved

## 📦 Popup Mode (Optional)

### What is Popup Mode?

Traditional extension popup - small window that opens when you click the icon.

```
        ┌──────────┐
        │ Popup    │
        │          │
        │ Plans    │
        │ Settings │
        │          │
        └──────────┘
```

### When to Use Popup

- You prefer the traditional extension experience
- You want a more compact interface
- You're on a small screen
- You only need quick access

### Benefits

✅ **Compact** - Takes less screen space
✅ **Quick Access** - Single click to open
✅ **Traditional** - Familiar extension pattern
✅ **Lightweight** - Minimal footprint

## 🔄 Switching Between Modes

### From Side Panel → Popup

1. Open the Side Panel
2. Go to **Settings** tab
3. Scroll to **View Mode** section
4. Click **Popup Mode**
5. Click extension icon to open popup

### From Popup → Side Panel

1. Open the Popup
2. Click **"Open Side Panel (More Space)"** button at the top
3. Side panel opens and popup closes

### Via Settings

Both views have a **View Mode Settings** section:

```
┌─────────────────────────────────────────┐
│ View Mode                               │
├─────────────────────────────────────────┤
│ ✓ Side Panel Mode [Recommended]        │
│   Opens alongside browser. More space.  │
│   [Always visible] [More space] [Resizable] │
├─────────────────────────────────────────┤
│   Popup Mode                            │
│   Compact popup window.                 │
│   [Compact] [Traditional]               │
└─────────────────────────────────────────┘
```

## 💾 Preference Persistence

Your choice is **automatically saved** and remembered:

- ✅ Persists across browser restarts
- ✅ Syncs across devices (if using Chrome sync)
- ✅ Can be changed anytime
- ✅ Independent of other settings

## 🎨 Side Panel Features

The side panel includes everything from the popup, plus:

### Enhanced Layout
- **Full height** - More vertical space for scrolling
- **Resizable** - Adjust width to your preference
- **Better visibility** - Mode indicator at top

### Workflow Benefits
- **Keep plans visible** while creating widgets
- **Monitor token usage** without reopening
- **Switch providers** while keeping widgets active
- **Manage multiple plans** with better visibility

## 🔧 Technical Details

### Chrome Requirements
- **Minimum version**: Chrome 114+
- **API used**: `chrome.sidePanel`
- **Permissions**: `sidePanel` permission in manifest

### How It Works

1. **Default Behavior** (First use):
   ```
   Click icon → Opens Side Panel
   ```

2. **After Choosing Popup**:
   ```
   Click icon → Opens Popup
   Button in popup → Switch to Side Panel
   ```

3. **After Choosing Side Panel** (from popup):
   ```
   Click icon → Opens Side Panel
   Button in panel → Switch to Popup
   ```

### Storage

Preference stored in Chrome storage:
```typescript
userConfig: {
  preferPopup: false  // false = side panel (default)
                      // true = popup
}
```

## 📱 Responsive Design

Both views are fully responsive:

### Side Panel
- Minimum width: ~300px
- Maximum width: ~800px (recommended)
- Adapts to content

### Popup
- Fixed width: 400px
- Fixed height: 600px
- Scrollable content

## 🎯 Recommended Use Cases

### Use Side Panel For:
- 📝 **Content creation** - Writing with AI assistance
- 🔍 **Research** - Multiple AI queries while browsing
- 💼 **Work** - Ongoing AI assistance throughout the day
- 🎓 **Learning** - AI tutoring while reading
- 🛠️ **Development** - Code review and suggestions

### Use Popup For:
- ⚡ **Quick checks** - Fast token balance check
- 🎯 **Single tasks** - Create one widget and close
- 📱 **Small screens** - Limited screen real estate
- 🔄 **Occasional use** - Not using AI continuously

## 💡 Pro Tips

1. **Keyboard Shortcut** (if configured):
   - Assign a keyboard shortcut in `chrome://extensions/shortcuts`
   - Quick access to your preferred view

2. **Multiple Windows**:
   - Each window can have its own side panel
   - Perfect for multi-monitor setups

3. **Pin the Extension**:
   - Right-click toolbar → "Pin"
   - Easier access to your preferred mode

4. **Experiment**:
   - Try both modes for different tasks
   - Switch anytime based on your workflow

## 🐛 Troubleshooting

### Side Panel Not Opening?

**Check Chrome Version**:
- Go to `chrome://version/`
- Ensure version ≥ 114

**Try Manually**:
- Right-click extension icon
- Select "Open side panel"

### Preference Not Saving?

**Clear and Reset**:
1. Go to Settings
2. Choose your preferred mode
3. Reload the extension
4. Test both modes

### Button Not Working?

**Reload Extension**:
1. Go to `chrome://extensions/`
2. Click refresh on AI Mastermind
3. Try again

## 🚀 Future Enhancements

Planned features for Side Panel mode:

- [ ] Drag widgets from panel to page
- [ ] Live widget preview in panel
- [ ] Multi-tab widget management
- [ ] Quick widget templates
- [ ] Keyboard shortcuts
- [ ] Dark mode support
- [ ] Panel position (left/right)

## Summary

**Side Panel** is the **recommended default** because it:
- Gives you more space
- Stays open while you work
- Better for AI workflows
- Modern, app-like experience

**Popup** is available if you:
- Prefer traditional extensions
- Want compact interface
- Need quick access only

**Switch anytime** - your preference is remembered!

---

**Ready to try it?** Reload the extension and click the icon to open the Side Panel! 🎉
