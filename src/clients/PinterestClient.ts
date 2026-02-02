/**
 * Pinterest Client Implementation
 *
 * Basic Pinterest API client for downloading and accessing Pinterest content.
 * Uses Apify's Pinterest Board Downloader for reliable scraping.
 */

import {
  APIClientBase,
  ClientMetadata,
  CredentialField,
  ClientCapabilityDefinition,
  CapabilityResult,
} from './ClientInterface';

export class PinterestClient extends APIClientBase {
  getMetadata(): ClientMetadata {
    return {
      id: 'pinterest',
      name: 'Pinterest',
      description: 'Pinterest integration for downloading and analyzing boards, pins, and images',
      version: '1.0.0',
      author: 'Synergy AI',
      icon: 'https://www.pinterest.com/favicon.ico',
      homepage: 'https://www.pinterest.com',
      tags: ['pinterest', 'images', 'boards', 'fashion', 'design'],
    };
  }

  getCredentialFields(): CredentialField[] {
    return [
      {
        key: 'apify_api_key',
        label: 'Apify API Key',
        type: 'password',
        required: true,
        placeholder: 'apify_api_xxxxxxxxxxxxxxxx',
        helpText: 'Get your API key from https://console.apify.com/account/integrations',
      },
    ];
  }

  getCapabilities(): ClientCapabilityDefinition[] {
    return [
      {
        name: 'pinterest_get_board_info',
        description: 'Get information about a Pinterest board (title, description, pin count)',
        parameters: [
          {
            name: 'board_url',
            type: 'string',
            description: 'Pinterest board URL (e.g., https://www.pinterest.com/username/board-name/)',
            required: true,
          },
        ],
      },
      {
        name: 'pinterest_download_board_images',
        description: 'Download all images from a Pinterest board with metadata',
        parameters: [
          {
            name: 'board_url',
            type: 'string',
            description: 'Pinterest board URL',
            required: true,
          },
          {
            name: 'max_pins',
            type: 'number',
            description: 'Maximum number of pins to download (default: 100)',
            required: false,
            default: 100,
          },
        ],
      },
      {
        name: 'pinterest_get_pin',
        description: 'Get detailed information about a specific pin',
        parameters: [
          {
            name: 'pin_url',
            type: 'string',
            description: 'Pinterest pin URL',
            required: true,
          },
        ],
      },
      {
        name: 'pinterest_search',
        description: 'Search Pinterest for pins matching a query',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Search query',
            required: true,
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum results to return (default: 20)',
            required: false,
            default: 20,
          },
        ],
      },
    ];
  }

  async validateCredentials(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.credentials.apify_api_key) {
      errors.push('Apify API Key is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async initialize(): Promise<void> {
    console.log('[PinterestClient] Starting initialization...');
    console.log('[PinterestClient] API Key length:', this.credentials.apify_api_key?.length || 0);

    await super.initialize();

    // Test Apify API key by checking account info
    const testUrl = 'https://api.apify.com/v2/actor-tasks';

    try {
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apify_api_key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Apify API returned ${response.status}: ${response.statusText}`);
      }

      console.log('[PinterestClient] Successfully connected to Apify');
    } catch (error) {
      console.error('[PinterestClient] Connection test failed:', error);
      throw new Error(`Failed to connect to Apify: ${error}`);
    }
  }

  async executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (capabilityName) {
        case 'pinterest_get_board_info':
          result = await this.getBoardInfo(parameters);
          break;
        case 'pinterest_download_board_images':
          result = await this.downloadBoardImages(parameters);
          break;
        case 'pinterest_get_pin':
          result = await this.getPin(parameters);
          break;
        case 'pinterest_search':
          result = await this.search(parameters);
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

  private async getBoardInfo(params: any): Promise<any> {
    const { board_url } = params;

    console.log('[PinterestClient] Getting board info for:', board_url);

    // Call Apify Pinterest Board Scraper
    const actorId = 'headlessagent/pinterest-board-downloader';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs`;

    const response = await fetch(runUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apify_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startUrls: [{ url: board_url }],
        maxItems: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`);
    }

    const run = await response.json();
    const runId = run.data.id;

    // Wait for run to complete and get results
    const result = await this.waitForRun(runId);

    return {
      board_url,
      title: result.data?.items?.[0]?.boardName || 'Unknown',
      description: result.data?.items?.[0]?.boardDescription || '',
      pin_count: result.data?.items?.length || 0,
    };
  }

  private async downloadBoardImages(params: any): Promise<any> {
    const { board_url, max_pins = 100 } = params;

    console.log('[PinterestClient] Downloading board images:', board_url);

    const actorId = 'headlessagent/pinterest-board-downloader';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs`;

    const response = await fetch(runUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apify_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startUrls: [{ url: board_url }],
        maxItems: max_pins,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`);
    }

    const run = await response.json();
    const runId = run.data.id;

    // Wait for run to complete and get results
    const result = await this.waitForRun(runId);

    // Transform results to include image URLs and metadata
    const pins = result.data?.items || [];

    return {
      board_url,
      pin_count: pins.length,
      pins: pins.map((pin: any) => ({
        pin_id: pin.id,
        pin_url: pin.url,
        image_url: pin.image,
        title: pin.title,
        description: pin.description,
        repin_count: pin.repins,
        created_at: pin.createdAt,
      })),
    };
  }

  private async getPin(params: any): Promise<any> {
    const { pin_url } = params;

    console.log('[PinterestClient] Getting pin:', pin_url);

    const actorId = 'headlessagent/pinterest-board-downloader';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs`;

    const response = await fetch(runUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apify_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startUrls: [{ url: pin_url }],
        maxItems: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`);
    }

    const run = await response.json();
    const runId = run.data.id;

    const result = await this.waitForRun(runId);
    const pin = result.data?.items?.[0];

    if (!pin) {
      throw new Error('Pin not found');
    }

    return {
      pin_id: pin.id,
      pin_url: pin.url,
      image_url: pin.image,
      title: pin.title,
      description: pin.description,
      repin_count: pin.repins,
      created_at: pin.createdAt,
    };
  }

  private async search(params: any): Promise<any> {
    const { query, limit = 20 } = params;

    console.log('[PinterestClient] Searching for:', query);

    // Apify search functionality
    const actorId = 'headlessagent/pinterest-board-downloader';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs`;

    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;

    const response = await fetch(runUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials.apify_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startUrls: [{ url: searchUrl }],
        maxItems: limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.statusText}`);
    }

    const run = await response.json();
    const runId = run.data.id;

    const result = await this.waitForRun(runId);

    return {
      query,
      result_count: result.data?.items?.length || 0,
      pins: result.data?.items || [],
    };
  }

  private async waitForRun(runId: string, maxWaitMs: number = 60000): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}`;

      const response = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apify_api_key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check run status: ${response.statusText}`);
      }

      const runInfo = await response.json();
      const status = runInfo.data.status;

      console.log(`[PinterestClient] Run ${runId} status: ${status}`);

      if (status === 'SUCCEEDED') {
        // Get results
        const datasetId = runInfo.data.defaultDatasetId;
        const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items`;

        const dataResponse = await fetch(datasetUrl, {
          headers: {
            'Authorization': `Bearer ${this.credentials.apify_api_key}`,
          },
        });

        if (!dataResponse.ok) {
          throw new Error(`Failed to get results: ${dataResponse.statusText}`);
        }

        const items = await dataResponse.json();

        return {
          status: 'SUCCEEDED',
          data: { items },
        };
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Run ${status.toLowerCase()}: ${runInfo.data.statusMessage || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Run timed out waiting for completion');
  }
}
