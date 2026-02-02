# Development Guide

## Development Setup

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Loading in Chrome

1. Build the extension: `npm run build`
2. Open Chrome: `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist` folder

### Hot Reload

During development:
- Changes to popup require clicking refresh in `chrome://extensions/`
- Changes to content script require page reload
- Changes to background script require extension reload

## Architecture Overview

### Extension Components

1. **Popup** (`src/popup/`)
   - Main UI for managing plans and widgets
   - React app loaded when extension icon is clicked
   - Communicates with background script

2. **Content Script** (`src/content/`)
   - Injected into every webpage
   - Renders draggable widgets
   - Isolated from page's JavaScript

3. **Background Script** (`src/background/`)
   - Service worker (Manifest V3)
   - Handles API calls and messaging
   - Manages persistent state

### State Management

**Zustand Store** (`src/state/appStore.ts`):
- Master plans and sub-extensions
- User configuration and tokens
- Active widgets

**Storage Layers**:
- `localStorage`: Popup UI state
- `chrome.storage`: Persistent extension data
- Cloud storage: Premium feature (TBD)

### Messaging Flow

```
Popup → Background → Content Script
  ↓         ↓             ↓
Store    API Calls    Render Widgets
```

## Key Files

### Configuration
- `manifest.json` - Extension manifest
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript config
- `tailwind.config.js` - Styling config

### State
- `src/state/appStore.ts` - Main Zustand store

### Storage
- `src/storage/localStorage.ts` - Browser localStorage
- `src/storage/chromeStorage.ts` - Chrome extension storage
- `src/storage/cloudStorage.ts` - Cloud sync (stub)

### API & Utils
- `src/utils/api.ts` - API service
- `src/utils/messaging.ts` - Chrome messaging
- `src/utils/tokenCounter.ts` - Token tracking
- `src/utils/pricing.ts` - Pricing tiers

## Common Tasks

### Adding a New Feature

1. Update the store in `src/state/appStore.ts`
2. Add UI components in appropriate folder
3. Implement messaging if cross-component
4. Update storage logic if persistent
5. Test in all contexts (popup, content, background)

### Adding a New Widget Type

1. Create component in `src/widgets/`
2. Update `WidgetRenderer.tsx`
3. Add configuration UI in popup
4. Update TypeScript interfaces

### Debugging

**Popup**:
- Right-click extension icon → Inspect popup
- Console logs appear in popup DevTools

**Content Script**:
- Open page DevTools (F12)
- Console logs appear in page console
- Look for "Synergy AI" prefix

**Background Script**:
- Go to `chrome://extensions/`
- Click "service worker" link under extension
- Console logs appear in background DevTools

### Testing Message Flow

```typescript
// In popup
import { sendToBackground } from '@/utils/messaging';
const response = await sendToBackground({
  type: MessageType.GENERATE_CONTENT,
  payload: { prompt: 'test' }
});

// In content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content received:', message);
  sendResponse({ success: true });
});
```

## Build Process

### Development Build

```bash
npm run dev
```

Creates `dist/` with source maps and fast rebuilds.

### Production Build

```bash
npm run build
```

Creates optimized `dist/` for distribution.

### Build Output

```
dist/
├── manifest.json
├── icons/
├── popup/
│   ├── index.html
│   └── index.js
├── content/
│   └── index.js
├── background/
│   └── index.js
├── assets/
│   └── *.css
└── chunks/
    └── *.js
```

## API Integration

### OpenAI Integration

Implement in `src/utils/api.ts`:

```typescript
async generateContent(request: AIRequest): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model || 'gpt-4',
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: request.maxTokens || 500,
    }),
  });

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokensUsed: data.usage.total_tokens,
    model: data.model,
  };
}
```

### Backend Integration

For token purchases and premium features, implement API calls in background script.

## Cloud Storage Integration

### Firebase Setup

1. Create Firebase project
2. Add configuration to `.env`
3. Implement in `src/storage/cloudStorage.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ... other config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
```

### Supabase Setup

Alternative to Firebase:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

## Payment Integration

### Stripe Setup

For token purchases:

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
```

## Performance Tips

1. **Minimize re-renders**: Use React.memo for expensive components
2. **Lazy load**: Split code for different extension contexts
3. **Debounce**: Throttle position updates during drag
4. **Cache API responses**: Store recent generations
5. **Optimize images**: Compress icons and assets

## Security Considerations

1. **API Keys**: Never commit API keys to git
2. **Content Security Policy**: Follow Chrome's CSP guidelines
3. **XSS Prevention**: Sanitize user-generated content
4. **Message validation**: Validate all incoming messages
5. **Permissions**: Request minimum required permissions

## Testing

### Manual Testing Checklist

- [ ] Install extension
- [ ] Create a master plan
- [ ] Add widgets to plan
- [ ] Activate plan on a webpage
- [ ] Drag widgets around
- [ ] Close widgets
- [ ] Switch between plans
- [ ] Configure API key
- [ ] Purchase tokens (if implemented)
- [ ] Test on different websites
- [ ] Test with premium features

### Browser Testing

Test on:
- Chrome (primary)
- Edge (Chromium-based)
- Brave (Chromium-based)

## Common Issues

### Extension not loading
- Check manifest.json syntax
- Verify file paths in manifest
- Check console for errors

### Content script not injecting
- Verify matches pattern in manifest
- Check host permissions
- Try refreshing the page

### Popup not opening
- Check popup HTML path in manifest
- Verify build output includes popup files
- Check browser console for errors

### Widgets not draggable
- Verify react-draggable is installed
- Check CSS z-index and pointer-events
- Ensure container has position: fixed

## Publishing

### Prepare for Chrome Web Store

1. Update version in manifest.json
2. Build production version
3. Create promotional images
4. Write store description
5. Zip the dist folder
6. Upload to Chrome Web Store Developer Dashboard

### Required Assets

- 128x128 icon
- 440x280 promotional image (small tile)
- 920x680 promotional image (large tile)
- 1400x560 marquee promotional image
- Screenshots (1280x800 or 640x400)

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Tailwind CSS](https://tailwindcss.com/)
