```markdown
# Executable Client Plugin System

This directory contains the **plugin architecture** for API clients in Synergy AI. Unlike the JSON-based MCP configs in `/mcp-clients/`, these are **executable code modules** that can make real API calls, provide custom UI, and expose capabilities to your AI agent.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Synergy AI Extension                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐      ┌──────────────────┐                  │
│  │   Chat     │─────▶│  ClientRegistry  │                  │
│  │   Agent    │      └──────────────────┘                  │
│  └────────────┘               │                             │
│                                │                             │
│                    ┌───────────┴───────────┐                │
│                    │                       │                │
│              ┌─────▼─────┐         ┌──────▼──────┐         │
│              │ JiraClient│         │GitHubClient │         │
│              │  (code)   │         │   (code)    │         │
│              └─────┬─────┘         └──────┬──────┘         │
│                    │                      │                 │
│                    │  HTTP Requests       │                 │
│                    ▼                      ▼                 │
└────────────────────┼──────────────────────┼─────────────────┘
                     │                      │
              ┌──────▼──────┐        ┌─────▼──────┐
              │  Jira API   │        │ GitHub API │
              └─────────────┘        └────────────┘
```

## Key Concepts

### 1. **APIClientBase** - Abstract Base Class

All clients extend `APIClientBase` which provides:
- ✅ Credential management
- ✅ Initialization lifecycle
- ✅ HTTP request helpers
- ✅ Capability exposure to AI
- ✅ Validation framework

### 2. **ClientRegistry** - Central Registry

Singleton that manages all clients:
- Register clients at startup
- Create/get instances
- Discovery and search
- Lifecycle management

### 3. **Executable Code** - Real Implementation

Unlike JSON configs, these clients have:
- ✅ **Real API calls** - Actual `fetch()` requests
- ✅ **Business logic** - Transform data, handle errors
- ✅ **Custom UI** - React components for credentials
- ✅ **Type safety** - Full TypeScript support

## Creating a New Client

### Step 1: Create the Client Class

```typescript
// src/clients/MyServiceClient.ts
import { APIClientBase, ClientMetadata, CredentialField, ClientCapabilityDefinition, CapabilityResult } from './ClientInterface';

export class MyServiceClient extends APIClientBase {
  // 1. Define metadata
  getMetadata(): ClientMetadata {
    return {
      id: 'my-service',
      name: 'My Service',
      description: 'Integration with My Service API',
      version: '1.0.0',
      author: 'Your Name',
      tags: ['api', 'service'],
    };
  }

  // 2. Define what credentials you need
  getCredentialFields(): CredentialField[] {
    return [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'Get from: https://myservice.com/api-keys',
      },
      {
        key: 'base_url',
        label: 'API URL',
        type: 'url',
        required: true,
        placeholder: 'https://api.myservice.com',
      },
    ];
  }

  // 3. Define what capabilities you provide
  getCapabilities(): ClientCapabilityDefinition[] {
    return [
      {
        name: 'myservice_get_data',
        description: 'Fetch data from My Service',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Search query',
            required: true,
          },
        ],
      },
    ];
  }

  // 4. Initialize (set up auth, test connection)
  async initialize(): Promise<void> {
    await super.initialize();

    // Test the connection
    const response = await this.makeRequest(
      `${this.credentials.base_url}/health`
    );
    console.log('Connected to My Service');
  }

  // 5. Override makeRequest to add auth headers
  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Authorization': `Bearer ${this.credentials.api_key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return super.makeRequest(url, { ...options, headers });
  }

  // 6. Implement executeCapability
  async executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    try {
      let result: any;

      switch (capabilityName) {
        case 'myservice_get_data':
          result = await this.getData(parameters);
          break;
        default:
          throw new Error(`Unknown capability: ${capabilityName}`);
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // 7. Implement your API methods
  private async getData(params: any): Promise<any> {
    const { query } = params;
    const url = `${this.credentials.base_url}/search?q=${encodeURIComponent(query)}`;
    const response = await this.makeRequest(url);
    return response.json();
  }
}
```

### Step 2: Register Your Client

```typescript
// src/clients/index.ts
import { MyServiceClient } from './MyServiceClient';

export function registerAllClients(): void {
  ClientRegistry.register(JiraClient);
  ClientRegistry.register(MyServiceClient); // ← Add here
}
```

### Step 3: Build and Test

```bash
npm run build
```

The client is now available in your extension!

## Using Clients in the Chat

### How the AI Agent Calls Clients

```typescript
// The chat system gets all capabilities
const jiraClient = ClientRegistry.getInstance('jira');
await jiraClient?.initialize();

const capabilities = jiraClient?.getCapabilitiesForAI();
// These are passed to the AI model as available "tools"

// When AI wants to use a capability:
const result = await jiraClient?.executeCapability('jira_search', {
  jql: 'project = SYNC AND status = Open',
  maxResults: 10,
});

console.log(result.data); // Actual Jira search results
```

### Integration Example

```typescript
// In your chat handler
import { ClientRegistry } from '@/clients';

async function handleChatMessage(message: string) {
  // 1. Get all registered clients
  const clientIds = ClientRegistry.getAllIds();

  // 2. Collect all capabilities
  const allCapabilities = [];
  for (const id of clientIds) {
    const client = ClientRegistry.getInstance(id);
    if (client?.isReady()) {
      allCapabilities.push(...client.getCapabilitiesForAI());
    }
  }

  // 3. Send to AI with available tools
  const response = await callAI({
    message,
    tools: allCapabilities,
  });

  // 4. Execute any tool calls
  if (response.toolCalls) {
    for (const call of response.toolCalls) {
      // Find which client provides this capability
      const clientId = findClientForCapability(call.name);
      const client = ClientRegistry.getInstance(clientId);

      // Execute it
      const result = await client?.executeCapability(
        call.name,
        call.parameters
      );

      // Use result in conversation
      console.log(result.data);
    }
  }
}
```

## Storage Strategy

### Credentials Storage

```typescript
// Credentials are stored in chrome.storage.local
interface StoredClient {
  clientId: string;
  credentials: Record<string, string>;
  isActive: boolean;
  installedAt: number;
}

// Save credentials
await chrome.storage.local.set({
  'client:jira': {
    clientId: 'jira',
    credentials: {
      deployment_type: 'cloud',
      base_url: 'https://mycompany.atlassian.net',
      username: 'user@company.com',
      api_token: 'token_here',
    },
    isActive: true,
    installedAt: Date.now(),
  },
});

// Load on startup
const data = await chrome.storage.local.get('client:jira');
const client = ClientRegistry.getInstance('jira');
client?.setCredentials(data.credentials);
await client?.initialize();
```

### Client State Management

```typescript
// Use Zustand store for UI state
interface ClientState {
  installedClients: string[]; // Client IDs
  activeClients: string[]; // Currently enabled
  credentialsConfigured: Record<string, boolean>;
}
```

## Custom Credential UI

You can provide a custom React component:

```typescript
export class MyClient extends APIClientBase {
  getCredentialUI() {
    return MyCustomCredentialForm;
  }
}

// MyCustomCredentialForm.tsx
const MyCustomCredentialForm: React.FC<{
  credentials: Record<string, string>;
  onChange: (creds: Record<string, string>) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({ credentials, onChange, onSave, onCancel }) => {
  return (
    <div>
      <h3>Custom Configuration UI</h3>
      {/* Your custom form here */}
      <button onClick={onSave}>Save</button>
    </div>
  );
};
```

## Comparison: JSON Configs vs Executable Clients

| Feature | MCP JSON Configs | Executable Clients |
|---------|------------------|-------------------|
| **Definition** | Static JSON schema | TypeScript code |
| **API Calls** | ❌ No | ✅ Yes (real `fetch()`) |
| **Custom Logic** | ❌ No | ✅ Yes (full code) |
| **Custom UI** | ❌ No | ✅ Yes (React components) |
| **Type Safety** | ⚠️ Partial | ✅ Full TypeScript |
| **Error Handling** | ❌ No | ✅ Custom error handling |
| **Data Transform** | ❌ No | ✅ Yes |
| **Testing** | ⚠️ Hard | ✅ Easy (unit tests) |
| **Loading** | Import/paste | Built into bundle |
| **Security** | ✅ Safe | ⚠️ Code execution |

## Best Practices

### 1. Error Handling

```typescript
async executeCapability(name: string, params: any): Promise<CapabilityResult> {
  try {
    const result = await this.apiCall(params);
    return { success: true, data: result };
  } catch (error) {
    // Log for debugging
    console.error(`[${this.getMetadata().name}] Error in ${name}:`, error);

    // Return user-friendly error
    return {
      success: false,
      error: this.formatError(error),
    };
  }
}
```

### 2. Rate Limiting

```typescript
private lastRequestTime: number = 0;
private minRequestInterval: number = 1000; // 1 second

protected async makeRequest(url: string, options?: RequestInit): Promise<Response> {
  // Simple rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - this.lastRequestTime;

  if (timeSinceLastRequest < this.minRequestInterval) {
    await new Promise(resolve =>
      setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
    );
  }

  this.lastRequestTime = Date.now();
  return super.makeRequest(url, options);
}
```

### 3. Caching

```typescript
private cache: Map<string, { data: any; expires: number }> = new Map();

private async getWithCache(key: string, fetcher: () => Promise<any>, ttl: number = 60000): Promise<any> {
  const cached = this.cache.get(key);

  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }

  const data = await fetcher();
  this.cache.set(key, { data, expires: Date.now() + ttl });
  return data;
}
```

### 4. Logging

```typescript
private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
  const prefix = `[${this.getMetadata().name}]`;

  switch (level) {
    case 'info':
      console.log(prefix, message, data);
      break;
    case 'warn':
      console.warn(prefix, message, data);
      break;
    case 'error':
      console.error(prefix, message, data);
      break;
  }
}
```

## Security Considerations

1. **Credential Storage**: Credentials are stored in `chrome.storage.local` (encrypted by Chrome)
2. **HTTPS Only**: Always use HTTPS for API endpoints
3. **No Eval**: Never use `eval()` or `new Function()` with user input
4. **CSP Compliance**: All code must comply with Chrome Extension CSP
5. **Permission Model**: Only request necessary host permissions

## Testing

```typescript
// tests/JiraClient.test.ts
import { JiraClient } from '@/clients/JiraClient';

describe('JiraClient', () => {
  let client: JiraClient;

  beforeEach(() => {
    client = new JiraClient();
    client.setCredentials({
      deployment_type: 'cloud',
      base_url: 'https://test.atlassian.net',
      username: 'test@example.com',
      api_token: 'test-token',
    });
  });

  test('should initialize successfully', async () => {
    await expect(client.initialize()).resolves.not.toThrow();
    expect(client.isReady()).toBe(true);
  });

  test('should search issues', async () => {
    const result = await client.executeCapability('jira_search', {
      jql: 'project = TEST',
      maxResults: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Future Enhancements

- [ ] **Hot Reloading**: Reload clients without restarting extension
- [ ] **Marketplace**: Download clients from a marketplace
- [ ] **Sandboxing**: Run clients in isolated Web Workers
- [ ] **Version Management**: Support multiple versions of same client
- [ ] **Analytics**: Track capability usage and performance
- [ ] **Client Dependencies**: Allow clients to depend on other clients

## Contributing

To add a new client to the built-in collection:

1. Create `src/clients/YourServiceClient.ts`
2. Extend `APIClientBase`
3. Implement all required methods
4. Register in `src/clients/index.ts`
5. Add tests in `tests/YourServiceClient.test.ts`
6. Update this README with examples
7. Submit PR!

---

**Questions?** Check the example `JiraClient.ts` for a complete, working implementation.
```
