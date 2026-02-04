/**
 * Example config-based agents and clients
 *
 * These examples demonstrate the config-based architecture:
 * - OverlayRemoverAgent: Pure declarative DOM manipulation
 * - PriceExtractorAgent: Uses JavaScript snippets for complex scraping
 * - WeatherClient: Simple REST API client
 */

import { AgentConfig } from '../types/agentConfig';
import { ClientConfig } from '../types/clientConfig';

/**
 * Overlay Remover Agent - Pure declarative (no JavaScript)
 */
export const OverlayRemoverAgentConfig: AgentConfig = {
  id: 'overlay-remover',
  name: 'Overlay Remover',
  description: 'Removes annoying overlay popups, modals, and paywalls from web pages',
  version: '2.0.0',
  author: 'Synergy AI',
  icon: '🚫',
  tags: ['dom-manipulation', 'user-experience', 'productivity'],
  source: 'example',
  containsJavaScript: true,
  requiresPageAccess: true,

  configFields: [],
  dependencies: [],

  capabilities: [
    {
      name: 'remove_overlays_once',
      description: 'Remove all overlay elements from the current page once',
      parameters: [],
      actions: [
        {
          type: 'executeScript',
          script: `
            // Comprehensive overlay removal
            let removed = 0;

            // Selectors for common overlay/modal elements
            const selectors = [
              // Generic modal/overlay classes
              '[class*="modal"]',
              '[class*="Modal"]',
              '[class*="overlay"]',
              '[class*="Overlay"]',
              '[class*="popup"]',
              '[class*="Popup"]',
              '[class*="dialog"]',
              '[class*="Dialog"]',
              '[class*="backdrop"]',
              '[class*="Backdrop"]',
              // Common specific classes
              '.modal', '.popup', '.overlay', '.dialog', '.backdrop',
              '.lightbox', '.interstitial', '.paywall',
              // Fixed/fullscreen positioned elements (likely overlays)
              '[style*="position: fixed"][style*="z-index"]',
              '[style*="position:fixed"][style*="z-index"]',
              // Data attributes often used for modals
              '[data-modal]', '[data-overlay]', '[data-popup]',
              '[role="dialog"]', '[role="alertdialog"]',
              // Cookie consent and newsletter popups
              '[class*="cookie"]', '[class*="Cookie"]',
              '[class*="consent"]', '[class*="Consent"]',
              '[class*="newsletter"]', '[class*="Newsletter"]',
              '[class*="subscribe"]', '[class*="Subscribe"]',
            ];

            // Find and remove overlay elements
            selectors.forEach(selector => {
              try {
                document.querySelectorAll(selector).forEach(el => {
                  const style = window.getComputedStyle(el);
                  const isOverlay =
                    style.position === 'fixed' ||
                    style.position === 'absolute' ||
                    parseInt(style.zIndex) > 100 ||
                    style.display === 'flex' && el.children.length <= 3;

                  // Only remove if it looks like an overlay (not main content)
                  if (isOverlay || el.matches('[role="dialog"], [role="alertdialog"], [data-modal], [data-overlay]')) {
                    el.remove();
                    removed++;
                  }
                });
              } catch (e) {
                // Ignore invalid selectors
              }
            });

            // Remove blur effects from body and html
            document.body.style.overflow = 'auto';
            document.body.style.filter = 'none';
            document.body.style.pointerEvents = 'auto';
            document.documentElement.style.overflow = 'auto';

            // Find and fix any blurred containers
            document.querySelectorAll('*').forEach(el => {
              const style = window.getComputedStyle(el);
              if (style.filter && style.filter !== 'none' && style.filter.includes('blur')) {
                el.style.filter = 'none';
              }
              // Remove overflow hidden that blocks scrolling
              if (style.overflow === 'hidden' && (el === document.body || el === document.documentElement)) {
                el.style.overflow = 'auto';
              }
            });

            // Remove any lingering backdrop elements
            document.querySelectorAll('[class*="backdrop"], [class*="Backdrop"]').forEach(el => {
              el.remove();
              removed++;
            });

            return { removed, success: true };
          `,
          saveAs: 'result',
        },
        {
          type: 'notify',
          title: 'Overlays Removed',
          message: 'Cleaned up overlay elements from page',
        },
        {
          type: 'return',
          value: '{{result}}',
        },
      ],
    },
  ],
};

/**
 * Smart Overlay Remover Agent - LLM-Assisted (no JavaScript)
 *
 * This agent uses the LLM to intelligently identify and remove overlays.
 * It only uses whitelisted, safe BrowserClient operations.
 */
export const SmartOverlayRemoverAgentConfig: AgentConfig = {
  id: 'smart-overlay-remover',
  name: 'Smart Overlay Remover',
  description: 'Intelligently removes overlays, modals, and paywalls using AI analysis, then translates the page to English. No JavaScript required.',
  version: '1.2.0',
  author: 'Synergy AI',
  icon: '🧠',
  tags: ['dom-manipulation', 'user-experience', 'ai-powered', 'safe'],
  source: 'example',

  // LLM-assisted mode - uses AI but only executes safe operations
  mode: 'llm-assisted',
  containsJavaScript: false,
  requiresPageAccess: true,

  // LLM configuration
  llmConfig: {
    systemPrompt: `You are a browser automation expert that helps remove annoying overlays and modals from web pages.

When analyzing page state, look for:
- Elements with high z-index (usually overlays)
- Fixed/absolute positioned elements covering content
- Elements with classes containing: modal, overlay, popup, dialog, backdrop, cookie, consent, paywall, adblock
- Elements that block scrolling or have blur effects

IMPORTANT: Also check for and remove blur effects! Many sites blur the background when showing overlays.
- Use browser_modify_style with selector "body" or "html" and styles {"filter": "none", "overflow": "auto"}
- Also try selectors like "main", "#content", ".content", or other main content containers

For each overlay found, determine the best selector to remove it.
Prefer more specific selectors (IDs, specific classes) over generic ones.

Always include these operations if overlays are found:
1. Remove the overlay elements
2. Remove blur effects from body/html/main content (use browser_modify_style)
3. Restore scroll functionality`,
    allowedOperations: [
      'browser_remove_element',
      'browser_modify_style',
      'browser_restore_scroll',
    ],
    maxIterations: 5,
    temperature: 0,
  },

  configFields: [],
  dependencies: [],

  capabilities: [
    {
      name: 'smart_remove_overlays',
      description: 'Intelligently detect and remove overlay elements using AI analysis, then translate the page to English',
      parameters: [],
      actions: [
        // Step 1: Inspect the page to find potential overlays
        {
          type: 'inspectPage',
          findOverlays: true,
          saveAs: 'pageState',
        },
        // Step 2: Ask LLM to determine which operations to execute
        {
          type: 'callLLMForOperations',
          context: 'pageState',
          goal: 'Remove all overlay elements that are blocking page content. Include modals, popups, cookie banners, paywalls, adblock detectors, and any backdrop/scrim elements. ALSO remove any blur effects on body, html, or main content containers using browser_modify_style with {"filter": "none"}. Restore scrolling if it has been disabled.',
          saveAs: 'operations',
        },
        // Step 3: Execute the validated operations
        {
          type: 'executeSafeOperations',
          operations: 'operations',
          validateFirst: true,
          stopOnError: false,
          saveAs: 'results',
        },
        // Step 4: Translate the page to English
        {
          type: 'translatePage',
          targetLanguage: 'en',
          fallbackStrategy: 'native-then-llm',
        },
        // Step 5: Notify user of results
        {
          type: 'if',
          condition: {
            type: 'greaterThan',
            left: 'results.successful',
            right: 0,
          },
          then: [
            {
              type: 'notify',
              title: 'Page Cleaned & Translated',
              message: 'Removed overlays and translated page to English',
            },
          ],
          else: [
            {
              type: 'notify',
              title: 'Page Translated',
              message: 'No overlays found, but page translated to English',
            },
          ],
        },
        {
          type: 'return',
          value: '{{results}}',
        },
      ],
    },
    {
      name: 'analyze_page_only',
      description: 'Analyze the page for overlays without removing them (preview mode)',
      parameters: [],
      actions: [
        {
          type: 'inspectPage',
          findOverlays: true,
          saveAs: 'pageState',
        },
        {
          type: 'analyzeWithLLM',
          context: 'pageState',
          prompt: 'Analyze these page elements and identify which ones appear to be overlays, modals, or popups that might be blocking content. For each one, explain why you think it is an overlay and suggest how to remove it.',
          saveAs: 'analysis',
        },
        {
          type: 'return',
          value: {
            pageState: '{{pageState}}',
            analysis: '{{analysis}}',
          },
        },
      ],
    },
  ],
};

/**
 * Price Extractor Agent - Uses JavaScript snippets
 */
export const PriceExtractorAgentConfig: AgentConfig = {
  id: 'price-extractor',
  name: 'Price Extractor',
  description: 'Extract product prices from e-commerce sites',
  version: '1.0.0',
  author: 'Synergy AI',
  icon: '💰',
  tags: ['scraping', 'e-commerce', 'price-tracking'],
  source: 'example',
  containsJavaScript: true,
  requiresPageAccess: true,

  configFields: [],
  dependencies: [],

  capabilities: [
    {
      name: 'extract_price',
      description: 'Extract the main product price from the current page',
      parameters: [],
      actions: [
        {
          type: 'executeScript',
          script: `
            // Find price elements using multiple selectors
            const priceSelectors = [
              '.price',
              '[data-price]',
              '.product-price',
              '[itemprop="price"]',
              '.sale-price'
            ];

            for (const selector of priceSelectors) {
              const el = document.querySelector(selector);
              if (el) {
                let priceText = el.textContent || el.getAttribute('content') || el.getAttribute('data-price');

                // Extract numeric value
                const match = priceText.match(/[\\d,]+\\.?\\d*/);
                if (match) {
                  const price = parseFloat(match[0].replace(/,/g, ''));
                  const currency = priceText.match(/[$£€¥]/)?.[0] || 'USD';

                  return {
                    price: price,
                    currency: currency,
                    originalText: priceText.trim(),
                    selector: selector
                  };
                }
              }
            }

            return null;
          `,
          saveAs: 'priceData',
        },
        {
          type: 'if',
          condition: {
            type: 'exists',
            target: 'priceData',
          },
          then: [
            {
              type: 'notify',
              title: 'Price Found',
              message: 'Price extracted successfully',
            },
            {
              type: 'return',
              value: '{{priceData}}',
            },
          ],
          else: [
            {
              type: 'notify',
              title: 'Price Not Found',
              message: 'Could not find price on this page',
            },
            {
              type: 'return',
              value: {
                success: false,
                error: 'No price found',
              },
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Weather API Client - Simple REST client
 */
export const WeatherClientConfig: ClientConfig = {
  id: 'weather-client',
  name: 'Weather API Client',
  description: 'Get weather forecasts from OpenWeatherMap',
  version: '1.0.0',
  author: 'Synergy AI',
  icon: '🌤️',
  tags: ['weather', 'api', 'forecast'],
  containsJavaScript: false,

  auth: {
    type: 'apikey',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Enter your OpenWeatherMap API key',
        helpText: 'Get your API key from openweathermap.org',
      },
    ],
  },

  baseUrl: 'https://api.openweathermap.org/data/2.5',

  capabilities: [
    {
      name: 'get_current_weather',
      description: 'Get current weather for a city',
      method: 'GET',
      path: '/weather',
      parameters: [
        {
          name: 'q',
          type: 'string',
          description: 'City name',
          required: true,
          location: 'query',
        },
        {
          name: 'units',
          type: 'string',
          description: 'Temperature units (metric, imperial)',
          required: false,
          location: 'query',
        },
        {
          name: 'appid',
          type: 'string',
          description: 'API key',
          required: true,
          location: 'query',
        },
      ],
      requestTransform: {
        headers: {
          'Accept': 'application/json',
        },
      },
      responseTransform: {
        extract: '$',
        map: {
          temperature: 'main.temp',
          description: 'weather[0].description',
          humidity: 'main.humidity',
          windSpeed: 'wind.speed',
          city: 'name',
        },
      },
    },
  ],
};

/**
 * GitHub API Client - Bearer auth example
 */
export const GitHubClientConfig: ClientConfig = {
  id: 'github-client',
  name: 'GitHub API Client',
  description: 'Access GitHub repositories and issues',
  version: '1.0.0',
  author: 'Synergy AI',
  icon: '🐙',
  tags: ['github', 'api', 'development'],
  containsJavaScript: false,

  auth: {
    type: 'bearer',
    fields: [
      {
        key: 'token',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        placeholder: 'ghp_xxxxxxxxxxxx',
        helpText: 'Create a token at github.com/settings/tokens',
      },
    ],
  },

  baseUrl: 'https://api.github.com',

  capabilities: [
    {
      name: 'get_user',
      description: 'Get authenticated user information',
      method: 'GET',
      path: '/user',
      parameters: [],
      responseTransform: {
        extract: '$',
        map: {
          username: 'login',
          name: 'name',
          email: 'email',
          publicRepos: 'public_repos',
        },
      },
    },
    {
      name: 'list_repos',
      description: 'List repositories for the authenticated user',
      method: 'GET',
      path: '/user/repos',
      parameters: [
        {
          name: 'sort',
          type: 'string',
          description: 'Sort by: created, updated, pushed, full_name',
          required: false,
          location: 'query',
        },
        {
          name: 'per_page',
          type: 'number',
          description: 'Results per page (max 100)',
          required: false,
          location: 'query',
        },
      ],
      responseTransform: {
        extract: '$',
      },
    },
  ],
};

/**
 * All example configs
 */
export const ExampleConfigs = {
  agents: [
    OverlayRemoverAgentConfig,
    SmartOverlayRemoverAgentConfig,
    PriceExtractorAgentConfig,
  ],
  clients: [
    WeatherClientConfig,
    GitHubClientConfig,
  ],
};
