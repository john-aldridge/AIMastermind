# Configuration Manager

## Overview

The Configuration Manager lets you **save multiple AI provider setups** and quickly switch between them. Perfect for managing different API keys, providers, or accounts!

## Features

✅ **Save Multiple Configurations** - Store unlimited provider setups
✅ **Quick Switching** - Activate any configuration with one click
✅ **Edit & Update** - Modify saved configurations anytime
✅ **Delete Unwanted** - Remove configurations you no longer need
✅ **Visual Status** - See which configuration is currently active
✅ **Named Profiles** - Give each configuration a meaningful name

## How to Use

### 1. Save a Configuration

1. **Go to Settings** in the side panel or popup
2. **Toggle "Use Own API Key"** ON
3. **Select a provider** from the list
4. **Fill in credentials** (API key, etc.)
5. **Choose a model**
6. **Enter a configuration name** (e.g., "Work Claude", "Personal OpenAI")
7. **Click "Save Configuration"**

```
┌──────────────────────────────────┐
│ Configuration Name *             │
│ [Work Claude Account]            │
│ Give this configuration a name...│
│                                  │
│ [Save Configuration]             │
└──────────────────────────────────┘
```

### 2. View Saved Configurations

After saving, you'll see the **"Saved Configurations"** section appear below:

```
┌──────────────────────────────────────┐
│ Saved Configurations                 │
├──────────────────────────────────────┤
│ ✓ Work Claude Account      [Active] │
│   Claude (Anthropic) • Sonnet 4.5    │
│   [Expand ▼]                         │
├──────────────────────────────────────┤
│   Personal OpenAI                    │
│   OpenAI (GPT) • GPT-4 Turbo        │
│   [Activate Configuration]           │
└──────────────────────────────────────┘
```

### 3. Switch Between Configurations

**Quick Activate (Collapsed)**:
- Click **"Activate Configuration"** button on any config

**From Expanded View**:
1. Click the **▼ arrow** to expand a configuration
2. See full details (provider, model, created date)
3. Click **"Activate"** button

The active configuration shows a **green "Active" badge**.

### 4. Edit a Configuration

1. **Expand** the configuration (click ▼)
2. Click **"Edit"** button
3. Form fills with the configuration's data
4. **Modify** any fields
5. Click **"Update Configuration"**

### 5. Delete a Configuration

1. **Expand** the configuration
2. Click **"Delete"** button (red)
3. **Confirm** deletion
4. Configuration is removed

## Use Cases

### Multiple Work Accounts

```
┌─────────────────────────────┐
│ Work Claude - Project A     │
│ Work Claude - Project B     │
│ Work OpenAI - Research Team │
└─────────────────────────────┘
```

Save different API keys for different projects or teams.

### Personal vs Professional

```
┌─────────────────────────────┐
│ Personal Claude             │
│ Work OpenAI                 │
│ Side Project - Groq         │
└─────────────────────────────┘
```

Keep work and personal API usage separate.

### Testing Different Providers

```
┌─────────────────────────────┐
│ Claude Sonnet (Fast)        │
│ Claude Opus (Quality)       │
│ OpenAI GPT-4                │
│ Groq (Super Fast)           │
└─────────────────────────────┘
```

Easily compare performance across providers.

### Cost Optimization

```
┌─────────────────────────────┐
│ Claude Haiku (Cheap)        │
│ GPT-3.5 Turbo (Balanced)    │
│ GPT-4 (Premium)             │
└─────────────────────────────┘
```

Switch based on task complexity and budget.

## Configuration Details

### What's Saved

Each configuration stores:
- **Name** - Your custom identifier
- **Provider** - AI provider (Claude, OpenAI, etc.)
- **Credentials** - API keys and auth details
- **Model** - Selected model for this config
- **Created Date** - When you created it
- **Updated Date** - Last modification time

### What Activating Does

When you activate a configuration:
1. ✅ Loads all credentials
2. ✅ Sets the provider
3. ✅ Selects the model
4. ✅ Marks it as active
5. ✅ Updates API service
6. ✅ Ready to use immediately!

## UI Guide

### Configuration Card (Collapsed)

```
┌────────────────────────────────────┐
│ Work Claude Account      [Active]  │
│ Claude (Anthropic) • Sonnet 4.5    │
│ [▼]                                │
└────────────────────────────────────┘
```

Shows:
- Configuration name
- Active status (if active)
- Provider and model
- Expand button

### Configuration Card (Expanded)

```
┌────────────────────────────────────┐
│ Work Claude Account      [Active]  │
│ Claude (Anthropic) • Sonnet 4.5    │
│ [▲]                                │
├────────────────────────────────────┤
│ Provider:  Claude (Anthropic)      │
│ Model:     Sonnet 4.5              │
│ Created:   Jan 31, 2026            │
│                                    │
│ [Activate] [Edit] [Delete]         │
└────────────────────────────────────┘
```

Shows full details and action buttons.

### Active Configuration

**Green badge** and **primary-colored border**:
```
┌────────────────────────────────────┐
│ ✓ Work Claude          [Active]    │ ← Green badge
│   Currently in use                 │
└────────────────────────────────────┘
```

### Empty State

No configurations saved yet:
```
┌────────────────────────────────────┐
│ Saved Configurations               │
├────────────────────────────────────┤
│        ⚙️                          │
│   No saved configurations yet      │
│   Configure a provider above       │
│   and save it for quick access     │
└────────────────────────────────────┘
```

## Tips & Best Practices

### 💡 Naming Conventions

**Good Names:**
- "Work Claude - Marketing"
- "Personal OpenAI GPT-4"
- "Test - Groq Fast"
- "Prod - Claude Opus"

**Avoid:**
- "Config 1"
- "Test"
- "aaa"

### 💡 Organization

Group by:
- **Purpose**: Work, Personal, Testing
- **Project**: Project A, Project B
- **Quality**: Fast, Balanced, Premium
- **Provider**: Claude Work, OpenAI Work

### 💡 Workflow

1. **Save** configurations for different contexts
2. **Activate** the right one for each task
3. **Edit** when API keys change
4. **Delete** old or unused configs

### 💡 Security

- Each config stores credentials securely
- Credentials encrypted by Chrome
- Stored locally on your device
- Never sent to our servers

## Shortcuts

### Save & Activate

The new configuration is **automatically activated** after saving - you can use it immediately!

### Quick Switching

Click "Activate Configuration" on any collapsed card for instant switching.

## Storage

- **Location**: Chrome's secure storage
- **Sync**: Syncs across devices (if Chrome sync enabled)
- **Backup**: Export/import coming soon
- **Limit**: Unlimited configurations

## Troubleshooting

### Configuration Won't Save

**Check:**
- All required fields filled
- API key is valid
- Configuration name is unique
- Network connection active

### Can't Activate Configuration

**Try:**
- Reload the extension
- Check API key is still valid
- Verify provider is working

### Configuration Disappeared

**Possible Causes:**
- Chrome storage cleared
- Extension reinstalled
- Chrome sync disabled

**Solution:**
- Re-enter and save again
- Enable Chrome sync for backup

## Future Features

Coming soon:
- [ ] Export/import configurations
- [ ] Configuration templates
- [ ] Bulk operations
- [ ] Usage statistics per config
- [ ] Automatic switching based on rules
- [ ] Configuration sharing (optional)

## Example Workflow

### Setup Multiple Providers

1. **Save Claude Sonnet**
   ```
   Name: "Claude Sonnet - Fast"
   Provider: Claude (Anthropic)
   Model: Sonnet 4.5
   ```

2. **Save Claude Opus**
   ```
   Name: "Claude Opus - Quality"
   Provider: Claude (Anthropic)
   Model: Opus 4.5
   ```

3. **Save OpenAI**
   ```
   Name: "OpenAI GPT-4"
   Provider: OpenAI
   Model: GPT-4 Turbo
   ```

### Daily Use

**Morning**:
- Activate "Claude Sonnet - Fast" for emails

**Research Work**:
- Switch to "Claude Opus - Quality" for deep analysis

**Code Review**:
- Switch to "OpenAI GPT-4" for coding tasks

All with **one click** - no re-entering credentials!

## Summary

The Configuration Manager gives you:
- ✅ **Flexibility** - Multiple setups ready to go
- ✅ **Speed** - One-click switching
- ✅ **Organization** - Named, organized profiles
- ✅ **Convenience** - No credential re-entry
- ✅ **Security** - Encrypted storage

Save once, switch anytime! 🎉
