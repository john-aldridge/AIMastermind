# Process Registry

The Process Registry is a system for tracking and managing long-running processes started by agent capabilities. This ensures proper cleanup when tabs are closed or processes need to be stopped.

## Overview

When an agent capability starts a long-running process (MutationObserver, setInterval, event listener, WebSocket, etc.), it should register that process with the registry. This allows:

1. **Visibility**: Users can see all active processes in the Settings > Active Processes view
2. **Control**: Users can manually stop individual processes or all processes for an agent
3. **Cleanup**: Automatic cleanup when tabs are closed or agents are deactivated
4. **Debugging**: Easy identification of runaway or leaked processes

## Supported Process Types

The registry supports tracking these types of long-running processes:

- `mutation-observer` - MutationObserver watching DOM changes
- `interval` - setInterval timers
- `timeout` - setTimeout timers (for long-running ones)
- `event-listener` - Event listeners that should be cleaned up
- `websocket` - WebSocket connections
- `intersection-observer` - IntersectionObserver instances
- `animation-frame` - requestAnimationFrame loops
- `custom` - Any other long-running process

## Usage in Agents

### Basic Example: MutationObserver

```typescript
async executeCapability(
  capabilityName: string,
  parameters: Record<string, any>
): Promise<CapabilityResult> {
  if (capabilityName === 'watch_dom_changes') {
    // Create the observer
    const observer = new MutationObserver((mutations) => {
      console.log('DOM changed:', mutations.length, 'mutations');
      // Handle mutations...
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Register the process for tracking
    const processId = this.registerProcess('watch_dom_changes', {
      type: 'mutation-observer',
      cleanup: () => observer.disconnect(),
      metadata: {
        description: 'Watch for DOM changes on the page',
        target: 'document.body'
      }
    });

    return {
      success: true,
      data: { processId, message: 'Now watching DOM changes' }
    };
  }

  return { success: false, error: 'Unknown capability' };
}
```

### Example: setInterval

```typescript
async executeCapability(
  capabilityName: string,
  parameters: Record<string, any>
): Promise<CapabilityResult> {
  if (capabilityName === 'poll_status') {
    const interval = parameters.interval || 5000; // Default 5 seconds

    // Start polling
    const intervalId = setInterval(() => {
      console.log('Polling status...');
      // Do polling work...
    }, interval);

    // Register the process
    this.registerProcess('poll_status', {
      type: 'interval',
      cleanup: () => clearInterval(intervalId),
      metadata: {
        description: `Poll status every ${interval}ms`,
        interval
      }
    });

    return {
      success: true,
      data: { message: 'Started polling' }
    };
  }

  return { success: false, error: 'Unknown capability' };
}
```

### Example: Event Listener

```typescript
async executeCapability(
  capabilityName: string,
  parameters: Record<string, any>
): Promise<CapabilityResult> {
  if (capabilityName === 'monitor_clicks') {
    // Create the handler
    const clickHandler = (event: MouseEvent) => {
      console.log('Click detected:', event.target);
      // Handle click...
    };

    // Add listener
    document.addEventListener('click', clickHandler, true);

    // Register the process
    this.registerProcess('monitor_clicks', {
      type: 'event-listener',
      cleanup: () => document.removeEventListener('click', clickHandler, true),
      metadata: {
        description: 'Monitor all clicks on the page',
        target: 'document',
        event: 'click',
        capture: true
      }
    });

    return {
      success: true,
      data: { message: 'Monitoring clicks' }
    };
  }

  return { success: false, error: 'Unknown capability' };
}
```

### Example: WebSocket

```typescript
async executeCapability(
  capabilityName: string,
  parameters: Record<string, any>
): Promise<CapabilityResult> {
  if (capabilityName === 'connect_websocket') {
    const url = parameters.url;

    // Create WebSocket
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      console.log('Received:', event.data);
      // Handle message...
    };

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    // Register the process
    this.registerProcess('connect_websocket', {
      type: 'websocket',
      cleanup: () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      },
      metadata: {
        description: `WebSocket connection to ${url}`,
        url,
        state: 'connecting'
      }
    });

    return {
      success: true,
      data: { message: 'WebSocket connecting' }
    };
  }

  return { success: false, error: 'Unknown capability' };
}
```

## Declarative Long-Running Capabilities

You can optionally mark capabilities as long-running in their metadata:

```typescript
getCapabilities(): AgentCapabilityDefinition[] {
  return [
    {
      name: 'watch_dom_changes',
      description: 'Watch for DOM changes and report them',
      parameters: [],
      isLongRunning: true // Mark as long-running
    },
    {
      name: 'analyze_once',
      description: 'Analyze the page once',
      parameters: [],
      isLongRunning: false // Not long-running
    }
  ];
}
```

This flag is informational and helps users understand which capabilities will start persistent processes.

## Managing Active Processes

### Stopping a Specific Process

```typescript
// Get the process ID from registerProcess()
const processId = this.registerProcess('my_capability', { ... });

// Later, stop it
this.stopProcess(processId);
```

### Stopping All Processes for a Capability

```typescript
// Stop all processes started by a specific capability
this.stopCapabilityProcesses('watch_dom_changes');
```

### Stopping All Agent Processes

```typescript
// Stop all processes started by this agent
this.stopAllProcesses();
```

### Checking if a Process is Active

```typescript
if (this.isProcessActive(processId)) {
  console.log('Process is still running');
}
```

### Getting Active Processes

```typescript
// Get all active processes for this agent
const allProcesses = this.getActiveProcesses();

// Get processes for a specific capability
const capabilityProcesses = this.getCapabilityProcesses('watch_dom_changes');
```

## User Interface

Users can view and manage active processes via:

**Settings > Active Processes**

This view shows:
- All active processes grouped by agent
- Process type (with emoji icon)
- How long each process has been running
- Description and metadata
- Controls to stop individual processes or all processes for an agent

## Best Practices

1. **Always register long-running processes**: If your capability starts any process that doesn't complete immediately, register it.

2. **Provide meaningful metadata**: Include description and relevant details to help users understand what the process is doing.

3. **Clean up properly**: Ensure your cleanup function actually stops the process (disconnect observers, clear intervals, remove listeners, close connections).

4. **Handle errors in cleanup**: Wrap cleanup logic in try-catch if there's a chance it could fail.

5. **Test cleanup**: Verify that stopping a process from the UI actually cleans up the resources.

6. **Avoid leaks**: If you create multiple processes of the same type, make sure to stop old ones before creating new ones (or allow multiple intentionally).

## Example: Capability with Multiple Processes

```typescript
private activeObservers = new Map<string, string>(); // track process IDs

async executeCapability(
  capabilityName: string,
  parameters: Record<string, any>
): Promise<CapabilityResult> {
  if (capabilityName === 'watch_element') {
    const selector = parameters.selector;
    const element = document.querySelector(selector);

    if (!element) {
      return { success: false, error: 'Element not found' };
    }

    // Stop existing observer for this selector
    const existingProcessId = this.activeObservers.get(selector);
    if (existingProcessId) {
      this.stopProcess(existingProcessId);
    }

    // Create new observer
    const observer = new MutationObserver((mutations) => {
      console.log(`Element ${selector} changed:`, mutations);
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Register the process
    const processId = this.registerProcess('watch_element', {
      type: 'mutation-observer',
      cleanup: () => observer.disconnect(),
      metadata: {
        description: `Watching element: ${selector}`,
        target: selector
      }
    });

    // Track the process ID
    this.activeObservers.set(selector, processId);

    return {
      success: true,
      data: { processId, selector }
    };
  }

  return { success: false, error: 'Unknown capability' };
}
```

## Technical Details

### Global Registry

The process registry is available globally in content scripts as `window.__agentProcessRegistry`.

It's automatically initialized when the content script loads.

### Process ID Format

Process IDs are automatically generated as: `proc-${timestamp}-${incrementalId}`

Example: `proc-1704067200000-1`

### Storage

Processes are not persisted to storage - they only exist in memory for the current page session.

When a page is closed or reloaded, all processes are automatically stopped.

## Troubleshooting

### Process not appearing in UI

- Make sure you called `registerProcess()` after starting the process
- Check that the content script is loaded on the page
- Verify the Process Registry is initialized (check console for init message)

### Process not stopping

- Verify your cleanup function is correct
- Check console for errors during cleanup
- Make sure you're passing the correct process ID to `stopProcess()`

### Memory leaks

- Always register processes that allocate resources
- Test that cleanup functions actually free resources
- Use browser DevTools Memory profiler to identify leaks
