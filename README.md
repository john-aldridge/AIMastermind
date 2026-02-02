# Synergy AI Chrome Extension

A powerful Chrome extension that allows you to create draggable, AI-powered widgets on any webpage through a simple popup interface.

## Features

- **Master Plans**: Organize your AI widgets into master plans
- **AI-Powered Widgets**: Create custom widgets using natural language prompts
- **Draggable Interface**: Position widgets anywhere on the page
- **Token Management**: Use your own API key or purchase tokens
- **Cloud Sync**: Premium users can sync data across devices (coming soon)
- **Local Storage**: Free users get local storage
- **Manifest V3**: Built with the latest Chrome extension standards

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Zustand** for state management
- **Tailwind CSS** for styling
- **react-draggable** for drag-and-drop functionality
- **Chrome Extension Manifest V3**

## Project Structure

```
mastermind/
├── manifest.json           # Chrome extension manifest
├── public/
│   └── icons/             # Extension icons (16, 32, 48, 128)
├── src/
│   ├── popup/             # Popup UI (React components)
│   │   ├── index.html
│   │   ├── index.tsx
│   │   ├── PopupApp.tsx
│   │   └── components/    # Popup components
│   ├── content/           # Content script (injected into pages)
│   │   ├── index.tsx
│   │   └── ContentApp.tsx
│   ├── background/        # Background service worker
│   │   └── index.ts
│   ├── widgets/           # Widget components
│   │   ├── DraggableWidget.tsx
│   │   └── WidgetRenderer.tsx
│   ├── state/             # Zustand stores
│   │   └── appStore.ts
│   ├── storage/           # Storage logic
│   │   ├── localStorage.ts
│   │   ├── chromeStorage.ts
│   │   └── cloudStorage.ts
│   ├── utils/             # Utility functions
│   │   ├── api.ts
│   │   ├── messaging.ts
│   │   ├── tokenCounter.ts
│   │   └── pricing.ts
│   └── styles/            # Global styles
│       └── globals.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Chrome browser

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mastermind
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### Development

For development with hot reload:

```bash
npm run dev
```

Then load the `dist` folder as an unpacked extension in Chrome. You'll need to click the refresh icon in `chrome://extensions/` after making changes.

## Usage

1. Click the Synergy AI icon in your Chrome toolbar
2. Create a new Master Plan
3. Add widgets to your plan with custom AI prompts
4. Activate the plan to show widgets on the current page
5. Drag widgets to position them as needed

## Configuration

### Using Your Own API Key

1. Open the extension popup
2. Go to Settings
3. Toggle "Use Own Key"
4. Enter your OpenAI API key
5. Click "Save API Key"

Your API key is stored locally and never sent to our servers.

### Token System

- Free users get 1,000 starter tokens
- Purchase additional token packages
- Premium subscription includes monthly token allowance
- Daily usage tracking with automatic reset

## Storage

- **Free Users**: Data stored in Chrome's local storage
- **Premium Users**: Optional cloud sync (Firebase/Supabase integration coming soon)

## Architecture

### State Management

The extension uses Zustand for centralized state management. The main store (`appStore.ts`) manages:
- Master plans
- Sub-extensions (widgets)
- User configuration
- Token balance and usage
- Active widgets

### Messaging

Communication between extension components uses Chrome's messaging API:
- Popup ↔ Background: Runtime messaging
- Popup ↔ Content: Tab messaging
- Background orchestrates state and API calls

### Storage Strategy

Three storage layers:
1. **localStorage**: Quick access for popup UI
2. **chrome.storage**: Persistent cross-session storage
3. **Cloud storage**: Premium users only (to be implemented)

## Customization

### Adding New Widget Types

1. Create a new component in `src/widgets/`
2. Update `WidgetRenderer.tsx` to handle the new type
3. Add configuration options to the store

### Styling

Tailwind CSS utility classes are used throughout. Customize the theme in `tailwind.config.js`.

## Building for Production

```bash
npm run build
```

The production-ready extension will be in the `dist` folder.

## Roadmap

- [ ] Firebase/Supabase integration for cloud sync
- [ ] Multiple AI provider support (Claude, Gemini, etc.)
- [ ] Custom widget templates
- [ ] Widget sharing and marketplace
- [ ] Advanced positioning and resizing
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Export/import plans

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the GitHub issue tracker.
