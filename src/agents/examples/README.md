# Example Agents

This directory contains example agents that demonstrate best practices and common patterns.

## OverlayRemoverAgent

**File**: `OverlayRemoverAgent.ts`

A complete example demonstrating:
- Proper Process Registry usage for long-running operations
- MutationObserver for continuous DOM monitoring
- Multiple capabilities with different execution patterns
- Configuration options
- Cleanup and process management
- Type-safe parameter handling

### Key Features

1. **Three Capabilities**:
   - `remove_overlays_once` - One-time removal (not long-running)
   - `watch_and_remove` - Continuous monitoring (long-running)
   - `stop_watching` - Stop the watcher

2. **Process Registry Integration**:
   ```typescript
   const processId = this.registerProcess('watch_and_remove', {
     type: 'mutation-observer',
     cleanup: () => observer.disconnect(),
     metadata: {
       description: 'Watch for and automatically remove modal overlays',
       target: 'document.body',
       initialRemoved,
       watchRemovedCount,
     },
   });
   ```

3. **Process Tracking**:
   - Stores process IDs for cleanup
   - Prevents duplicate processes
   - Allows manual stopping via capability

4. **Configuration**:
   - Aggressive vs Standard mode
   - Configurable through agent settings

### How to Use This Example

1. **Study the structure**: See how the agent is organized with clear separation of concerns

2. **Learn Process Registry patterns**:
   - When to register processes (`isLongRunning: true`)
   - How to provide cleanup functions
   - How to track and stop processes

3. **Adapt for your needs**:
   - Replace the overlay logic with your own functionality
   - Keep the process registry patterns
   - Maintain proper cleanup

### Common Patterns Demonstrated

#### Pattern 1: Long-Running Capability with Cleanup

```typescript
// In executeCapability()
const observer = new MutationObserver((mutations) => {
  // Handle mutations...
});

observer.observe(document.body, { childList: true });

// Register for cleanup
const processId = this.registerProcess(capabilityName, {
  type: 'mutation-observer',
  cleanup: () => observer.disconnect(),
  metadata: { description: '...' }
});

// Track process ID for later stopping
this.activeProcessIds.set(capabilityName, processId);
```

#### Pattern 2: Stop Existing Process Before Starting New One

```typescript
// Check for existing process
const existingProcessId = this.activeProcessIds.get(capabilityName);
if (existingProcessId) {
  this.stopProcess(existingProcessId);
}

// Start new process...
```

#### Pattern 3: Manual Stop Capability

```typescript
// Capability to stop the watcher
private stopWatching(): CapabilityResult {
  const processId = this.activeProcessIds.get('watch_and_remove');

  if (!processId) {
    return { success: false, error: 'No active watcher found' };
  }

  const stopped = this.stopProcess(processId);

  if (stopped) {
    this.activeProcessIds.delete('watch_and_remove');
    return { success: true, data: { message: 'Stopped watching' } };
  }

  return { success: false, error: 'Failed to stop watcher' };
}
```

## Creating Your Own Agent

Use this checklist when creating a new agent:

- [ ] Extend `AgentBase`
- [ ] Implement all required methods (getMetadata, getConfigFields, getDependencies, getCapabilities, executeCapability)
- [ ] Mark long-running capabilities with `isLongRunning: true`
- [ ] Use `this.registerProcess()` for any long-running operations
- [ ] Provide meaningful cleanup functions
- [ ] Add descriptive metadata to processes
- [ ] Track process IDs if you need to stop them later
- [ ] Handle errors gracefully
- [ ] Return proper CapabilityResult objects
- [ ] Test process cleanup (check Settings > Active Processes)

## Additional Examples

More examples will be added here as common patterns emerge:

- **IntervalPollerAgent** - Using setInterval with the registry
- **WebSocketAgent** - Managing WebSocket connections
- **EventMonitorAgent** - Tracking multiple event listeners
- **AnalyticsAgent** - Combining multiple process types

## Need Help?

1. Read the full documentation: `/docs/PROCESS_REGISTRY.md`
2. Use the AI assistant in the code editor
3. Check existing agents for patterns
4. View active processes in Settings > Active Processes
