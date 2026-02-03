/**
 * Overlay Remover Agent
 *
 * Example agent that demonstrates proper use of the Process Registry.
 * This agent removes modal overlays and continuously watches for new ones.
 */

import { AgentBase, AgentMetadata, ConfigField, AgentCapabilityDefinition, CapabilityResult } from '../AgentInterface';

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
      error: `Unknown capability: ${capabilityName}`,
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
          ? `Removed ${removedCount} overlay(s)`
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
        message: `Removed ${initialRemoved} overlay(s) and started watching for new ones`,
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
