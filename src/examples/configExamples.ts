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
  version: '1.0.0',
  author: 'Synergy AI',
  icon: '🚫',
  tags: ['dom-manipulation', 'user-experience', 'productivity'],
  containsJavaScript: false,
  requiresPageAccess: true,

  configFields: [
    {
      key: 'aggressive_mode',
      label: 'Aggressive Mode',
      type: 'select',
      required: true,
      default: 'normal',
      options: [
        { value: 'normal', label: 'Normal - Remove obvious overlays' },
        { value: 'aggressive', label: 'Aggressive - Remove all suspicious elements' },
      ],
      helpText: 'How aggressively to remove overlays',
    },
  ],

  dependencies: [],

  capabilities: [
    {
      name: 'remove_overlays_once',
      description: 'Remove all overlay elements from the current page once',
      parameters: [],
      actions: [
        {
          type: 'if',
          condition: {
            type: 'equals',
            left: '{{config.aggressive_mode}}',
            right: 'aggressive',
          },
          then: [
            {
              type: 'querySelectorAll',
              selector: '.modal, .popup, .overlay, [class*="overlay"], [class*="modal"], [class*="popup"], [style*="position: fixed"], [style*="z-index"]',
              saveAs: 'overlays',
            },
          ],
          else: [
            {
              type: 'querySelectorAll',
              selector: '.modal-overlay, .popup-overlay, .paywall-overlay, [class*="overlay"][style*="fixed"]',
              saveAs: 'overlays',
            },
          ],
        },
        {
          type: 'forEach',
          source: 'overlays',
          itemAs: 'overlay',
          do: [
            {
              type: 'remove',
              target: 'overlay',
            },
          ],
        },
        {
          type: 'addStyle',
          target: 'body',
          styles: {
            overflow: 'auto',
          },
        },
        {
          type: 'notify',
          title: 'Overlays Removed',
          message: 'Removed overlay elements from page',
        },
        {
          type: 'return',
          value: {
            success: true,
            message: 'Overlays removed successfully',
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
    PriceExtractorAgentConfig,
  ],
  clients: [
    WeatherClientConfig,
    GitHubClientConfig,
  ],
};
