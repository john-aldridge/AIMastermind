# Plugin Editor

An in-browser IDE for viewing, editing, and managing plugin source code with AI assistance, versioning, and TypeScript linting.

## Features

✅ **Monaco Editor Integration** - Full VS Code editor experience
✅ **TypeScript Support** - Syntax highlighting, IntelliSense, and error checking
✅ **Automatic Versioning** - Semantic versioning with history
✅ **AI Assistant** - Context-aware code help integrated into the editor
✅ **Hot Reload** - Test changes instantly without page refresh
✅ **Auto-Save** - Automatic saving every 30 seconds
✅ **Version History** - View and restore previous versions
✅ **Plugin Templates** - Start with blank, example, or data analyzer templates

## Getting Started

### 1. Access the Editor

Click the **Editor** tab in the side panel navigation.

### 2. Create Your First Plugin

1. Click **"Create New Plugin"**
2. Fill in the plugin details:
   - **Plugin ID**: lowercase-with-hyphens (e.g., `my-plugin`)
   - **Name**: Human-readable name (e.g., `My Awesome Plugin`)
   - **Description**: What your plugin does
   - **Author**: Your name (optional)
3. Choose a template:
   - **Blank Plugin**: Minimal starting point
   - **Example Plugin**: Full-featured with multiple capabilities
   - **Data Analyzer**: Template for data processing
4. Click **"Create Plugin"**

### 3. Edit Your Plugin

The editor provides:
- **TypeScript IntelliSense**: Auto-complete for PluginBase API
- **Syntax Highlighting**: Color-coded syntax
- **Error Detection**: Real-time error checking
- **Line Numbers**: Easy navigation

### 4. Use the AI Assistant

The right panel contains an AI chat assistant:
- Ask questions about your code
- Get suggestions for new features
- Debug issues
- Click **"Apply Code"** to insert AI suggestions

Example prompts:
```
"Add a new capability called analyze_item"
"How do I validate parameters?"
"Explain what this code does"
```

### 5. Test Your Plugin

1. Click the **"Test"** button
2. Plugin compiles and hot reloads
3. Go to **Chat** tab to test capabilities

### 6. Save Versions

1. Click **"Save"** when ready
2. Choose version bump:
   - **Patch**: Bug fixes (1.0.0 → 1.0.1)
   - **Minor**: New features (1.0.0 → 1.1.0)
   - **Major**: Breaking changes (1.0.0 → 2.0.0)
3. Enter description
4. Click **"Save"**

## Plugin Structure

Every plugin must extend `PluginBase` and implement three methods:

```typescript
import { PluginBase, Capability } from '../plugins/PluginBase';

export class MyPlugin extends PluginBase {
  // 1. Plugin metadata
  getMetadata() {
    return {
      id: 'my-plugin',
      name: 'My Plugin',
      description: 'What it does',
      version: '1.0.0',
      author: 'Your Name',
    };
  }

  // 2. Define capabilities
  getCapabilities(): Capability[] {
    return [
      {
        name: 'my_capability',
        description: 'What this capability does',
        parameters: [
          {
            name: 'input',
            type: 'string',
            description: 'Input parameter',
            required: true,
          },
        ],
      },
    ];
  }

  // 3. Execute capabilities
  async executeCapability(capabilityName: string, parameters: Record<string, any>): Promise<any> {
    switch (capabilityName) {
      case 'my_capability':
        return this.myCapability(parameters.input);
      default:
        throw new Error(`Unknown capability: ${capabilityName}`);
    }
  }

  private async myCapability(input: string): Promise<string> {
    // Implementation here
    return `Processed: ${input}`;
  }
}

export default MyPlugin;
```

## Version Management

### View History

1. Click the clock icon next to the version dropdown
2. See all versions with timestamps and descriptions
3. Click **"Restore"** to revert to a previous version

### Version Format

Versions follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Auto-Save

The editor auto-saves your work every 30 seconds if there are unsaved changes. A notification appears: "Unsaved changes (auto-save in 30s)".

## Storage

Plugins are stored in `chrome.storage.local` with the following structure:

```typescript
{
  "plugin:source:my-plugin": {
    pluginId: "my-plugin",
    name: "My Plugin",
    activeVersion: "1.0.2",
    versions: {
      "1.0.0": {
        code: "...",
        metadata: {
          timestamp: 1706851234567,
          description: "Initial version"
        }
      },
      "1.0.1": { ... },
      "1.0.2": { ... }
    },
    createdAt: 1706851234567,
    lastUpdatedAt: 1706851456789
  }
}
```

## Keyboard Shortcuts

- **Ctrl/Cmd + S**: Format document (in editor)
- **Enter**: Send message (in AI chat)
- **Shift + Enter**: New line (in AI chat)

## Tips

1. **Use TypeScript Types**: The editor provides IntelliSense for the PluginBase API
2. **Test Early, Test Often**: Use the Test button frequently during development
3. **Descriptive Commit Messages**: Write clear version descriptions for future reference
4. **Ask the AI**: When stuck, ask the AI assistant for help
5. **Start with Templates**: Use the Example template to see common patterns

## Troubleshooting

### Compilation Errors

If you see compilation errors:
1. Check the editor for red squiggles
2. Hover over errors for details
3. Ask the AI assistant for help fixing them
4. Cannot save until compilation succeeds

### Plugin Not Loading

If your plugin doesn't appear in the Chat view:
1. Check that it compiled successfully
2. Click the Test button to hot reload
3. Refresh the extension if needed
4. Check the browser console for errors

### Storage Limits

Chrome extensions have a 10MB storage limit:
- Monitor the number of versions you keep
- Delete old plugins you no longer need
- Large plugins may need to be exported/imported

## Architecture

### Components

1. **PluginEditorView** (`src/sidepanel/components/PluginEditorView.tsx`)
   - Main editor container with split view
   - Manages plugin state and actions

2. **MonacoEditor** (`src/sidepanel/components/MonacoEditor.tsx`)
   - Wrapper around Monaco Editor with TypeScript config

3. **EditorChatPanel** (`src/sidepanel/components/EditorChatPanel.tsx`)
   - AI assistant integrated with current plugin code

4. **PluginSelector** (`src/sidepanel/components/PluginSelector.tsx`)
   - Dropdown to select and manage plugins

5. **VersionManager** (`src/sidepanel/components/VersionManager.tsx`)
   - Version history and restoration

6. **CreatePluginModal** (`src/sidepanel/components/CreatePluginModal.tsx`)
   - Form for creating new plugins

### Services

1. **PluginSourceStorageService** (`src/storage/pluginSourceStorage.ts`)
   - CRUD operations for plugin source code
   - Version management

2. **PluginCompiler** (`src/services/pluginCompiler.ts`)
   - TypeScript to JavaScript compilation
   - Syntax validation
   - Metadata extraction

3. **PluginLoader** (`src/services/pluginLoader.ts`)
   - Load and register plugins from storage
   - Hot reload functionality
   - Validation

## Future Enhancements

- [ ] Diff view between versions
- [ ] Import/export plugins as files
- [ ] Plugin marketplace
- [ ] ESLint integration
- [ ] Prettier auto-formatting
- [ ] Debug console for testing capabilities
- [ ] Plugin dependencies
- [ ] Collaborative editing
- [ ] Code search within plugins
- [ ] Snippet library

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review compilation errors in the editor
3. Ask the AI assistant for help
4. Check the plugin template examples

## License

Part of the AI Mastermind Chrome Extension.
