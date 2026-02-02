/**
 * Browser Client Implementation
 *
 * Provides capabilities for manipulating the current web page.
 * No credentials required - uses Chrome extension APIs.
 */

import {
  APIClientBase,
  ClientMetadata,
  CredentialField,
  ClientCapabilityDefinition,
  CapabilityResult,
} from './ClientInterface';

export class BrowserClient extends APIClientBase {
  getMetadata(): ClientMetadata {
    return {
      id: 'browser',
      name: 'Browser',
      description: 'Manipulate the current web page - remove elements, click buttons, modify styles, execute JavaScript',
      version: '1.0.0',
      author: 'Synergy AI',
      icon: '🌐',
      tags: ['browser', 'dom', 'javascript', 'automation', 'page-manipulation'],
    };
  }

  getCredentialFields(): CredentialField[] {
    // No credentials needed - this client is always available
    return [];
  }

  getCapabilities(): ClientCapabilityDefinition[] {
    return [
      {
        name: 'browser_execute_javascript',
        description: 'Execute JavaScript code on the current page and return the result',
        parameters: [
          {
            name: 'code',
            type: 'string',
            description: 'JavaScript code to execute (e.g., "document.title" or "document.querySelector(\'.modal\').remove()")',
            required: true,
          },
        ],
      },
      {
        name: 'browser_remove_element',
        description: 'Remove one or more DOM elements from the page by CSS selector',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for the element(s) to remove (e.g., ".modal", "#popup", ".duet-scrim")',
            required: true,
          },
          {
            name: 'all',
            type: 'boolean',
            description: 'Remove all matching elements (true) or just the first one (false, default)',
            required: false,
            default: false,
          },
        ],
      },
      {
        name: 'browser_click_element',
        description: 'Click on an element on the page',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for the element to click',
            required: true,
          },
        ],
      },
      {
        name: 'browser_modify_style',
        description: 'Modify CSS styles of element(s) on the page',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for the element(s) to modify',
            required: true,
          },
          {
            name: 'styles',
            type: 'object',
            description: 'Object with CSS properties to set (e.g., {"display": "none", "overflow": "visible"})',
            required: true,
          },
        ],
      },
      {
        name: 'browser_get_element_text',
        description: 'Get text content from an element on the page',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for the element',
            required: true,
          },
        ],
      },
      {
        name: 'browser_scroll_to',
        description: 'Scroll to an element on the page',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for the element to scroll to',
            required: true,
          },
          {
            name: 'behavior',
            type: 'string',
            description: 'Scroll behavior: "smooth" or "auto" (default: smooth)',
            required: false,
            default: 'smooth',
          },
        ],
      },
      {
        name: 'browser_fill_input',
        description: 'Fill an input field with text',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for the input element',
            required: true,
          },
          {
            name: 'value',
            type: 'string',
            description: 'Text to fill into the input',
            required: true,
          },
        ],
      },
      {
        name: 'browser_restore_scroll',
        description: 'Restore page scrolling (useful after modals disable it)',
        parameters: [],
      },
      {
        name: 'browser_get_page_text',
        description: 'Extract all text content from the page for translation. Returns text nodes with unique identifiers.',
        parameters: [
          {
            name: 'include_hidden',
            type: 'boolean',
            description: 'Include hidden elements (default: false)',
            required: false,
            default: false,
          },
        ],
      },
      {
        name: 'browser_replace_text',
        description: 'Replace text content on the page with translated versions. Use after translating text from browser_get_page_text.',
        parameters: [
          {
            name: 'replacements',
            type: 'object',
            description: 'Object mapping node IDs to translated text (e.g., {"node_0": "translated text", "node_1": "more text"})',
            required: true,
          },
        ],
      },
      {
        name: 'browser_translate_element',
        description: 'Get text from a specific element for translation',
        parameters: [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for the element to translate',
            required: true,
          },
        ],
      },
      {
        name: 'browser_translate_page_native',
        description: 'Translate the entire page using Chrome\'s built-in Translator API (FAST - use this by default for translation). Much faster than AI translation.',
        parameters: [
          {
            name: 'target_language',
            type: 'string',
            description: 'Target language code (e.g., "en" for English, "es" for Spanish, "fr" for French, "de" for German, "ja" for Japanese). Use BCP 47 language codes.',
            required: true,
          },
          {
            name: 'source_language',
            type: 'string',
            description: 'Source language code (optional - will auto-detect if not provided). Use BCP 47 language codes.',
            required: false,
          },
        ],
      },
      {
        name: 'browser_inspect_page',
        description: 'Inspect the page to find elements (useful when you need to remove something but don\'t know the selector). Returns visible elements with high z-index (likely modals/overlays) and their selectors.',
        parameters: [
          {
            name: 'find_overlays',
            type: 'boolean',
            description: 'Find potential overlay/modal elements (elements with high z-index, fixed/absolute position)',
            required: false,
            default: true,
          },
        ],
      },
    ];
  }

  async validateCredentials(): Promise<{ valid: boolean; errors: string[] }> {
    // No credentials to validate - always valid
    return {
      valid: true,
      errors: [],
    };
  }

  async initialize(): Promise<void> {
    console.log('[BrowserClient] Initialized - ready to manipulate pages');
    // No initialization needed
  }

  async executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (capabilityName) {
        case 'browser_execute_javascript':
          result = await this.executeJavaScript(parameters);
          break;
        case 'browser_remove_element':
          result = await this.removeElement(parameters);
          break;
        case 'browser_click_element':
          result = await this.clickElement(parameters);
          break;
        case 'browser_modify_style':
          result = await this.modifyStyle(parameters);
          break;
        case 'browser_get_element_text':
          result = await this.getElementText(parameters);
          break;
        case 'browser_scroll_to':
          result = await this.scrollTo(parameters);
          break;
        case 'browser_fill_input':
          result = await this.fillInput(parameters);
          break;
        case 'browser_restore_scroll':
          result = await this.restoreScroll(parameters);
          break;
        case 'browser_get_page_text':
          result = await this.getPageText(parameters);
          break;
        case 'browser_replace_text':
          result = await this.replaceText(parameters);
          break;
        case 'browser_translate_element':
          result = await this.translateElement(parameters);
          break;
        case 'browser_translate_page_native':
          result = await this.translatePageNative(parameters);
          break;
        case 'browser_inspect_page':
          result = await this.inspectPage(parameters);
          break;
        default:
          throw new Error(`Unknown capability: ${capabilityName}`);
      }

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }

  // Implementation methods

  private async getCurrentTabId(): Promise<number> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      throw new Error('No active tab found');
    }
    return tabs[0].id;
  }

  private async executeJavaScript(params: any): Promise<any> {
    const { code } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Executing JavaScript:', code);

    // Execute in MAIN world to bypass CSP restrictions
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN', // Execute in page context, not extension context
      func: (codeToExecute: string) => {
        try {
          // In MAIN world, eval works and doesn't violate CSP
          const result = eval(codeToExecute);
          return { success: true, result };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      args: [code],
    });

    const result = results[0]?.result;

    if (!result?.success) {
      throw new Error(result?.error || 'JavaScript execution failed');
    }

    return {
      executed: code,
      result: result.result,
      message: 'JavaScript executed successfully',
    };
  }

  private async removeElement(params: any): Promise<any> {
    const { selector, all = false } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Removing element(s):', selector);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, removeAll: boolean) => {
        if (removeAll) {
          const elements = document.querySelectorAll(sel);
          elements.forEach(el => el.remove());
          return {
            removed: elements.length,
            selector: sel,
          };
        } else {
          const element = document.querySelector(sel);
          if (element) {
            element.remove();
            return {
              removed: 1,
              selector: sel,
            };
          }
          return {
            removed: 0,
            selector: sel,
            error: 'Element not found',
          };
        }
      },
      args: [selector, all],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to execute script');
    }

    return {
      ...result,
      message: result.removed > 0
        ? `Removed ${result.removed} element(s) matching "${selector}"`
        : `No elements found matching "${selector}"`,
    };
  }

  private async clickElement(params: any): Promise<any> {
    const { selector } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Clicking element:', selector);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const element = document.querySelector(sel) as HTMLElement;
        if (element) {
          element.click();
          return {
            clicked: true,
            selector: sel,
          };
        }
        return {
          clicked: false,
          selector: sel,
          error: 'Element not found',
        };
      },
      args: [selector],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to execute script');
    }

    if (!result.clicked) {
      throw new Error(result.error || 'Failed to click element');
    }

    return {
      ...result,
      message: `Clicked element "${selector}"`,
    };
  }

  private async modifyStyle(params: any): Promise<any> {
    const { selector, styles } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Modifying style:', selector, styles);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, styleObj: Record<string, string>) => {
        const elements = document.querySelectorAll(sel);
        if (elements.length === 0) {
          return {
            modified: 0,
            selector: sel,
            error: 'No elements found',
          };
        }

        elements.forEach(el => {
          const htmlEl = el as HTMLElement;
          Object.entries(styleObj).forEach(([prop, value]) => {
            htmlEl.style[prop as any] = value;
          });
        });

        return {
          modified: elements.length,
          selector: sel,
          styles: styleObj,
        };
      },
      args: [selector, styles],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to execute script');
    }

    if (result.modified === 0) {
      throw new Error(result.error || 'No elements found to modify');
    }

    return {
      ...result,
      message: `Modified styles on ${result.modified} element(s)`,
    };
  }

  private async getElementText(params: any): Promise<any> {
    const { selector } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Getting element text:', selector);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const element = document.querySelector(sel);
        if (element) {
          return {
            found: true,
            text: element.textContent || '',
            selector: sel,
          };
        }
        return {
          found: false,
          selector: sel,
          error: 'Element not found',
        };
      },
      args: [selector],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to execute script');
    }

    if (!result.found) {
      throw new Error(result.error || 'Element not found');
    }

    return {
      ...result,
      message: `Retrieved text from "${selector}"`,
    };
  }

  private async scrollTo(params: any): Promise<any> {
    const { selector, behavior = 'smooth' } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Scrolling to element:', selector);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, scrollBehavior: string) => {
        const element = document.querySelector(sel);
        if (element) {
          element.scrollIntoView({
            behavior: scrollBehavior as ScrollBehavior,
            block: 'center',
          });
          return {
            scrolled: true,
            selector: sel,
          };
        }
        return {
          scrolled: false,
          selector: sel,
          error: 'Element not found',
        };
      },
      args: [selector, behavior],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to execute script');
    }

    if (!result.scrolled) {
      throw new Error(result.error || 'Failed to scroll to element');
    }

    return {
      ...result,
      message: `Scrolled to "${selector}"`,
    };
  }

  private async fillInput(params: any): Promise<any> {
    const { selector, value } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Filling input:', selector);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string, val: string) => {
        const element = document.querySelector(sel) as HTMLInputElement;
        if (element) {
          element.value = val;
          // Trigger input event for React/Vue apps
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return {
            filled: true,
            selector: sel,
          };
        }
        return {
          filled: false,
          selector: sel,
          error: 'Element not found',
        };
      },
      args: [selector, value],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to execute script');
    }

    if (!result.filled) {
      throw new Error(result.error || 'Failed to fill input');
    }

    return {
      ...result,
      message: `Filled input "${selector}" with value`,
    };
  }

  private async restoreScroll(_params: any): Promise<any> {
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Restoring scroll');

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        let elementsFixed = 0;

        // Remove scroll-blocking styles from body and html
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.height = '';
        document.body.style.maxHeight = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.position = '';
        document.documentElement.style.height = '';

        // Find and fix all elements with overflow hidden
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          const style = window.getComputedStyle(htmlEl);

          if (style.overflow === 'hidden' || style.overflowY === 'hidden') {
            htmlEl.style.overflow = 'visible';
            htmlEl.style.overflowY = 'visible';
            elementsFixed++;
          }
        });

        // Re-enable scroll events (some sites disable these)
        window.onscroll = null;
        window.onwheel = null;
        window.ontouchmove = null;
        document.onscroll = null;
        document.onwheel = null;
        document.ontouchmove = null;

        return {
          restored: true,
          elementsFixed,
          message: `Scroll restored - fixed ${elementsFixed} elements`,
        };
      },
    });

    const result = results[0]?.result;

    return {
      ...result,
      message: `Page scrolling restored (${result?.elementsFixed || 0} elements fixed)`,
    };
  }

  private async getPageText(params: any): Promise<any> {
    const { include_hidden = false } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Extracting page text for translation');

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (includeHidden: boolean) => {
        const textNodes: Array<{ id: string; text: string; tag: string; selector: string }> = [];
        let nodeId = 0;

        // Function to get CSS selector for element
        function getSelector(element: Element): string {
          if (element.id) return `#${element.id}`;
          if (element.className) {
            const classes = Array.from(element.classList).join('.');
            if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
          }
          return element.tagName.toLowerCase();
        }

        // Function to check if element is visible
        function isVisible(element: HTMLElement): boolean {
          if (!includeHidden) {
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          }
          return true;
        }

        // Walk through text nodes
        function walkTextNodes(node: Node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text && text.length > 0) {
              const parent = node.parentElement;
              if (parent && isVisible(parent)) {
                // Store text node with ID for later replacement
                const id = `text_node_${nodeId++}`;
                (node as any).__translationId = id;
                textNodes.push({
                  id,
                  text,
                  tag: parent.tagName,
                  selector: getSelector(parent),
                });
              }
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            // Skip script, style, and other non-content elements
            if (!['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(element.tagName)) {
              node.childNodes.forEach(walkTextNodes);
            }
          }
        }

        walkTextNodes(document.body);

        return {
          total_nodes: textNodes.length,
          text_nodes: textNodes,
          message: `Extracted ${textNodes.length} text nodes from page`,
        };
      },
      args: [include_hidden],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to extract page text');
    }

    return {
      ...result,
      instructions: 'Translate the text in each text_node, then call browser_replace_text with the translations',
    };
  }

  private async replaceText(params: any): Promise<any> {
    const { replacements } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Replacing text with translations');

    // Ensure replacements is a clean, serializable object
    const cleanReplacements: Record<string, string> = {};
    if (replacements && typeof replacements === 'object') {
      for (const [key, value] of Object.entries(replacements)) {
        if (typeof value === 'string') {
          cleanReplacements[key] = value;
        }
      }
    }

    if (Object.keys(cleanReplacements).length === 0) {
      throw new Error('No valid replacements provided. Replacements must be an object with string values.');
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (translationMap: Record<string, string>) => {
        let replaced = 0;

        // Walk through all text nodes and replace if they have translation ID
        function walkAndReplace(node: Node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const id = (node as any).__translationId;
            if (id && translationMap[id]) {
              node.textContent = translationMap[id];
              replaced++;
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (!['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(element.tagName)) {
              node.childNodes.forEach(walkAndReplace);
            }
          }
        }

        walkAndReplace(document.body);

        return {
          replaced,
          message: `Replaced ${replaced} text nodes with translations`,
        };
      },
      args: [cleanReplacements],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to replace text');
    }

    return result;
  }

  private async translateElement(params: any): Promise<any> {
    const { selector } = params;
    const tabId = await this.getCurrentTabId();

    console.log('[BrowserClient] Getting text from element for translation:', selector);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => {
        const element = document.querySelector(sel);
        if (!element) {
          return {
            found: false,
            error: 'Element not found',
          };
        }

        // Get all text content
        const text = element.textContent || '';

        // Store reference for later replacement
        (element as any).__translationTarget = true;

        return {
          found: true,
          selector: sel,
          text,
          message: 'Text extracted from element',
        };
      },
      args: [selector],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to execute script');
    }

    if (!result.found) {
      throw new Error(result.error || 'Element not found');
    }

    return {
      ...result,
      instructions: 'Translate the text, then use browser_modify_style or browser_execute_javascript to replace it',
    };
  }

  /**
   * Translate page using Chrome's built-in Translator API
   */
  private async translatePageNative(params: any): Promise<any> {
    console.log('[BrowserClient] Translating page with native Chrome API');

    const targetLanguage = params.target_language;
    const sourceLanguage = params.source_language;

    if (!targetLanguage) {
      throw new Error('target_language is required');
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      throw new Error('No active tab found');
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: async (targetLang: string, sourceLang?: string) => {
        // Check if Translator API is available (Chrome 138+)
        if (!('Translator' in self)) {
          return {
            success: false,
            error: 'Chrome Translator API not available. This feature requires Chrome 138+ with the Translation API enabled.',
            instructions: 'Enable chrome://flags/#translation-api (select "Enabled without language pack limit") or use AI translation with browser_get_page_text and browser_replace_text instead.',
          };
        }

        try {
          // Create translator instance using the Translator API
          const translatorOptions: any = {
            targetLanguage: targetLang,
          };

          if (sourceLang) {
            translatorOptions.sourceLanguage = sourceLang;
          }

          const translator = await (self as any).Translator.create(translatorOptions);

          console.log('[Translation] Translator created, starting translation...');

          // Get all text nodes in the document
          const textNodes: { node: Text; originalText: string }[] = [];
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: (node) => {
                const text = node.textContent?.trim();
                if (!text || text.length === 0) return NodeFilter.FILTER_REJECT;

                // Skip script and style elements
                const parent = node.parentElement;
                if (parent?.tagName === 'SCRIPT' || parent?.tagName === 'STYLE') {
                  return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
              },
            }
          );

          let currentNode;
          while ((currentNode = walker.nextNode())) {
            const text = currentNode.textContent?.trim();
            if (text) {
              textNodes.push({
                node: currentNode as Text,
                originalText: text,
              });
            }
          }

          console.log(`[Translation] Found ${textNodes.length} text nodes to translate`);

          // Translate all text nodes
          let translatedCount = 0;
          for (const { node, originalText } of textNodes) {
            try {
              const translated = await translator.translate(originalText);
              if (translated && translated !== originalText) {
                node.textContent = translated;
                translatedCount++;
              }
            } catch (err) {
              console.warn('[Translation] Failed to translate text node:', err);
              // Continue with next node
            }
          }

          return {
            success: true,
            translated_nodes: translatedCount,
            total_nodes: textNodes.length,
            target_language: targetLang,
            source_language: sourceLang || 'auto-detected',
            message: `Successfully translated ${translatedCount} of ${textNodes.length} text nodes`,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            instructions: 'Translation failed. Try using AI translation with browser_get_page_text and browser_replace_text.',
          };
        }
      },
      args: sourceLanguage ? [targetLanguage, sourceLanguage] : [targetLanguage],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to execute translation script');
    }

    if (!result.success) {
      throw new Error(result.error || 'Translation failed');
    }

    return result;
  }

  /**
   * Inspect page to find elements (especially overlays/modals)
   */
  private async inspectPage(_params: any): Promise<any> {
    console.log('[BrowserClient] Inspecting page for elements');

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      throw new Error('No active tab found');
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        const elements: Array<{
          tag: string;
          classes: string[];
          id: string;
          selector: string;
          selectorOptions: string[];
          zIndex: string;
          position: string;
          visible: boolean;
          text: string;
        }> = [];

        // Find all elements with position fixed or absolute and high z-index
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el) => {
          const styles = window.getComputedStyle(el);
          const position = styles.position;
          const zIndex = styles.zIndex;
          const display = styles.display;
          const visibility = styles.visibility;

          // Look for overlays: fixed/absolute position with high z-index
          if (
            (position === 'fixed' || position === 'absolute') &&
            zIndex !== 'auto' &&
            parseInt(zIndex) > 100 &&
            display !== 'none' &&
            visibility !== 'hidden'
          ) {
            const classList = Array.from(el.classList);
            const id = el.id;
            const text = el.textContent?.substring(0, 100) || '';

            // Build a good selector
            let selector = el.tagName.toLowerCase();
            let selectorOptions: string[] = [];

            if (id) {
              selector = `#${id}`;
              selectorOptions.push(`#${id}`);
            }

            if (classList.length > 0) {
              // Add individual class selectors
              classList.forEach(cls => selectorOptions.push(`.${cls}`));
              // Add combined class selector
              selector = `.${classList.join('.')}`;
              selectorOptions.push(selector);
            }

            // Don't include our extension's elements
            if (id === 'ai-mastermind-root' || classList.includes('ai-mastermind')) {
              return; // Skip our extension elements
            }

            elements.push({
              tag: el.tagName.toLowerCase(),
              classes: classList,
              id: id,
              selector: selector,
              selectorOptions: selectorOptions,
              zIndex: zIndex,
              position: position,
              visible: true,
              text: text.trim(),
            });
          }
        });

        // Sort by z-index (highest first)
        elements.sort((a, b) => parseInt(b.zIndex) - parseInt(a.zIndex));

        return {
          overlays: elements,
          total: elements.length,
          message: elements.length > 0
            ? `Found ${elements.length} potential overlay/modal elements`
            : 'No overlay elements found',
        };
      },
      args: [],
    });

    const result = results[0]?.result;
    if (!result) {
      throw new Error('Failed to inspect page');
    }

    return result;
  }
}

