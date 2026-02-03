/**
 * Example Agents
 *
 * Read-only example agents that users can view and clone.
 * These are separate from templates and show complete, working implementations.
 */

export interface ExampleAgent {
  id: string;
  name: string;
  description: string;
  tags: string[];
  code: string;
  readme: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const EXAMPLE_AGENTS: ExampleAgent[] = [
  {
    id: 'overlay-remover',
    name: 'Overlay Remover',
    description: 'Remove modal overlays and watch for new ones using MutationObserver',
    tags: ['dom-manipulation', 'process-registry', 'mutation-observer'],
    difficulty: 'intermediate',
    code: `import {
  AgentBase,
  AgentMetadata,
  ConfigField,
  AgentCapabilityDefinition,
  CapabilityResult
} from '@/agents/AgentInterface';

/**
 * Overlay Remover Agent
 *
 * Example agent that demonstrates proper use of the Process Registry.
 * This agent removes modal overlays and continuously watches for new ones.
 */
export class OverlayRemoverAgent extends AgentBase {
  private activeProcessIds = new Map<string, string>(); // capability -> processId

  getMetadata(): AgentMetadata {
    return {
      id: 'overlay-remover',
      name: 'Overlay Remover',
      description: 'Automatically remove modal overlays and popups from web pages',
      version: '1.0.0',
      author: 'Synergy AI',
      tags: ['dom-manipulation', 'ux', 'example'],
    };
  }

  getConfigFields(): ConfigField[] {
    return [
      {
        key: 'aggressive',
        label: 'Aggressive Mode',
        type: 'select',
        required: false,
        options: [
          { value: 'false', label: 'Standard - Only obvious overlays' },
          { value: 'true', label: 'Aggressive - Remove all potential overlays' },
        ],
        default: 'false',
        helpText: 'Aggressive mode may remove legitimate UI elements',
      },
    ];
  }

  getDependencies(): string[] {
    return []; // No external dependencies
  }

  getCapabilities(): AgentCapabilityDefinition[] {
    return [
      {
        name: 'remove_overlays_once',
        description: 'Remove all current modal overlays (one-time action)',
        parameters: [],
        isLongRunning: false,
      },
      {
        name: 'watch_and_remove',
        description: 'Continuously watch for and remove modal overlays',
        parameters: [],
        isLongRunning: true, // Marks this as a long-running capability
      },
      {
        name: 'stop_watching',
        description: 'Stop watching for overlays',
        parameters: [],
        isLongRunning: false,
      },
    ];
  }

  async executeCapability(
    capabilityName: string,
    _parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    if (capabilityName === 'remove_overlays_once') {
      return this.removeOverlaysOnce();
    }

    if (capabilityName === 'watch_and_remove') {
      return this.watchAndRemove();
    }

    if (capabilityName === 'stop_watching') {
      return this.stopWatching();
    }

    return {
      success: false,
      error: \`Unknown capability: \${capabilityName}\`,
    };
  }

  /**
   * Remove all overlays once (not long-running)
   */
  private removeOverlaysOnce(): CapabilityResult {
    const selectors = this.getOverlaySelectors();
    let removedCount = 0;

    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (this.isOverlay(el as HTMLElement)) {
          (el as HTMLElement).remove();
          removedCount++;
        }
      });
    });

    // Also restore body scroll
    document.body.style.overflow = '';
    document.body.style.position = '';

    return {
      success: true,
      data: {
        removedCount,
        message: removedCount > 0
          ? \`Removed \${removedCount} overlay(s)\`
          : 'No overlays found',
      },
    };
  }

  /**
   * Watch for and remove overlays continuously (long-running)
   */
  private watchAndRemove(): CapabilityResult {
    // Stop any existing watcher first
    const existingProcessId = this.activeProcessIds.get('watch_and_remove');
    if (existingProcessId) {
      this.stopProcess(existingProcessId);
    }

    // Remove current overlays
    const initialResult = this.removeOverlaysOnce();
    const initialRemoved = (initialResult.data as any)?.removedCount || 0;

    // Set up MutationObserver to watch for new overlays
    let watchRemovedCount = 0;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && this.isOverlay(node)) {
            console.log('[OverlayRemover] Removing new overlay:', node);
            node.remove();
            watchRemovedCount++;

            // Also check if body scroll was disabled
            if (document.body.style.overflow === 'hidden') {
              document.body.style.overflow = '';
            }
          }
        });
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    // IMPORTANT: Register the process for tracking and cleanup
    const processId = this.registerProcess('watch_and_remove', {
      type: 'mutation-observer',
      cleanup: () => {
        console.log('[OverlayRemover] Stopping overlay watcher');
        observer.disconnect();
      },
      metadata: {
        description: 'Watch for and automatically remove modal overlays',
        target: 'document.body',
        initialRemoved,
        watchRemovedCount,
      },
    });

    // Track the process ID for this capability
    if (processId) {
      this.activeProcessIds.set('watch_and_remove', processId);
    }

    return {
      success: true,
      data: {
        processId,
        initialRemoved,
        message: \`Removed \${initialRemoved} overlay(s) and started watching for new ones\`,
      },
    };
  }

  /**
   * Stop watching for overlays
   */
  private stopWatching(): CapabilityResult {
    const processId = this.activeProcessIds.get('watch_and_remove');

    if (!processId) {
      return {
        success: false,
        error: 'No active watcher found',
      };
    }

    const stopped = this.stopProcess(processId);

    if (stopped) {
      this.activeProcessIds.delete('watch_and_remove');
      return {
        success: true,
        data: { message: 'Stopped watching for overlays' },
      };
    }

    return {
      success: false,
      error: 'Failed to stop watcher',
    };
  }

  /**
   * Get common overlay selectors
   */
  private getOverlaySelectors(): string[] {
    const aggressive = this.config.aggressive === 'true';

    const standardSelectors = [
      '[class*="modal"]',
      '[class*="overlay"]',
      '[class*="popup"]',
      '[class*="dialog"]',
      '[id*="modal"]',
      '[id*="overlay"]',
      '[role="dialog"]',
      '[aria-modal="true"]',
    ];

    const aggressiveSelectors = [
      ...standardSelectors,
      '[class*="backdrop"]',
      '[class*="dimmer"]',
      '[class*="lightbox"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
    ];

    return aggressive ? aggressiveSelectors : standardSelectors;
  }

  /**
   * Check if an element is likely an overlay
   */
  private isOverlay(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);

    // Check for common overlay characteristics
    const isFixed = style.position === 'fixed';
    const isAbsolute = style.position === 'absolute';
    const hasHighZIndex = parseInt(style.zIndex) > 1000;
    const coversScreen =
      element.offsetWidth >= window.innerWidth * 0.8 ||
      element.offsetHeight >= window.innerHeight * 0.8;

    // Check class/id names
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    const hasOverlayName =
      className.includes('modal') ||
      className.includes('overlay') ||
      className.includes('popup') ||
      id.includes('modal') ||
      id.includes('overlay');

    return (
      hasOverlayName &&
      (isFixed || isAbsolute) &&
      (hasHighZIndex || coversScreen)
    );
  }
}

export default OverlayRemoverAgent;`,
    readme: `# Overlay Remover Agent

## Overview
Automatically remove annoying modal overlays, popups, and dialogs from web pages. Supports both one-time removal and continuous monitoring using MutationObserver.

## Features
- **One-time removal**: Remove all current overlays with a single action
- **Continuous monitoring**: Watch for new overlays and remove them automatically
- **Process Registry integration**: Properly tracked long-running processes
- **Configurable aggressiveness**: Standard or aggressive removal modes

## Capabilities

### remove_overlays_once
Remove all current modal overlays from the page (one-time action).

**Parameters:** None

**Example:**
\`\`\`
Ask the AI: "Use overlay-remover to remove overlays once"
\`\`\`

**Returns:**
- \`removedCount\`: Number of overlays removed
- \`message\`: Success message

### watch_and_remove
Continuously watch for and remove modal overlays. This starts a long-running process that will appear in Settings > Active Processes.

**Parameters:** None

**Example:**
\`\`\`
Ask the AI: "Use overlay-remover to watch and remove overlays"
\`\`\`

**Returns:**
- \`processId\`: ID of the registered process
- \`initialRemoved\`: Number of overlays removed initially
- \`message\`: Success message

**Important:** This is a long-running capability. You can view and stop it from Settings > Active Processes.

### stop_watching
Stop watching for overlays.

**Parameters:** None

**Example:**
\`\`\`
Ask the AI: "Use overlay-remover to stop watching"
\`\`\`

## Configuration

### Aggressive Mode
- **Standard**: Only removes obvious overlays (modals, dialogs, popups)
- **Aggressive**: Removes more potential overlays including backdrops and fixed-position elements

Configure in the agent settings before using.

## Process Registry Usage

This agent demonstrates proper use of the Process Registry for long-running operations:

\`\`\`typescript
const processId = this.registerProcess('watch_and_remove', {
  type: 'mutation-observer',
  cleanup: () => observer.disconnect(),
  metadata: {
    description: 'Watch for and automatically remove modal overlays',
    target: 'document.body'
  }
});
\`\`\`

## Usage Examples

### Example 1: Clean a cluttered page
\`\`\`
User: "Remove all the popup overlays from this page"
AI: [Uses remove_overlays_once to clean the page]
\`\`\`

### Example 2: Monitor continuously
\`\`\`
User: "Watch this page and remove any popups that appear"
AI: [Uses watch_and_remove to start monitoring]
\`\`\`

### Example 3: Stop monitoring
\`\`\`
User: "Stop watching for popups"
AI: [Uses stop_watching to stop the process]
\`\`\`

## Notes
- This agent looks for common overlay patterns (class names, z-index, positioning)
- Aggressive mode may accidentally remove legitimate UI elements
- All long-running processes can be managed in Settings > Active Processes
- The watcher automatically stops if you close the tab or reload the page

## Version History
- **1.0.0**: Initial release with Process Registry support`
  },
];

/**
 * Get an example agent by ID
 */
export function getExampleAgent(id: string): ExampleAgent | undefined {
  return EXAMPLE_AGENTS.find(agent => agent.id === id);
}

/**
 * Get all example agent IDs
 */
export function getExampleAgentIds(): string[] {
  return EXAMPLE_AGENTS.map(agent => agent.id);
}
