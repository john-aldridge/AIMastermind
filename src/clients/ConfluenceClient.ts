/**
 * Confluence Client Implementation
 *
 * Atlassian Confluence integration for wiki/documentation management.
 * Supports page creation, search, comments, labels, and analytics.
 */

import {
  APIClientBase,
  ClientMetadata,
  CredentialField,
  ClientCapabilityDefinition,
  CapabilityResult,
} from './ClientInterface';

export class ConfluenceClient extends APIClientBase {
  private baseUrl: string = '';
  private authHeader: string = '';

  getMetadata(): ClientMetadata {
    return {
      id: 'confluence',
      name: 'Confluence',
      description: 'Atlassian Confluence integration for wiki and documentation management',
      version: '1.0.0',
      author: 'Synergy AI',
      icon: 'https://www.atlassian.com/favicon.ico',
      homepage: 'https://www.atlassian.com/software/confluence',
      tags: ['confluence', 'atlassian', 'wiki', 'documentation', 'knowledge-base'],
    };
  }

  getCredentialFields(): CredentialField[] {
    return [
      {
        key: 'base_url',
        label: 'Confluence URL',
        type: 'url',
        required: true,
        placeholder: 'https://wiki.company.com/confluence',
        helpText: 'Your Confluence base URL including any context path (e.g., /confluence or /wiki)',
      },
      {
        key: 'personal_token',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        helpText: 'For Cloud: Get from https://id.atlassian.com/manage-profile/security/api-tokens | For Server/DC: Profile → Personal Access Tokens',
      },
    ];
  }

  getCapabilities(): ClientCapabilityDefinition[] {
    return [
      {
        name: 'confluence_search',
        description: 'Search Confluence content using simple terms or CQL (Confluence Query Language)',
        parameters: [
          {
            name: 'query',
            type: 'string',
            description: 'Search query - simple text or CQL string',
            required: true,
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum results to return (1-50, default: 10)',
            required: false,
            default: 10,
          },
          {
            name: 'spacesFilter',
            type: 'string',
            description: 'Comma-separated space keys to filter (e.g., "DEV,TEAM")',
            required: false,
          },
        ],
      },
      {
        name: 'confluence_get_page',
        description: 'Get content of a specific Confluence page by ID or by title and space key',
        parameters: [
          {
            name: 'pageId',
            type: 'string',
            description: 'Numeric page ID from URL',
            required: false,
          },
          {
            name: 'title',
            type: 'string',
            description: 'Page title (alternative to pageId)',
            required: false,
          },
          {
            name: 'spaceKey',
            type: 'string',
            description: 'Space key (required with title, e.g., "DEV")',
            required: false,
          },
          {
            name: 'includeMetadata',
            type: 'boolean',
            description: 'Include creation date, updates, version, labels (default: true)',
            required: false,
            default: true,
          },
          {
            name: 'convertToMarkdown',
            type: 'boolean',
            description: 'Convert content to markdown vs raw HTML (default: true)',
            required: false,
            default: true,
          },
        ],
      },
      {
        name: 'confluence_get_page_children',
        description: 'Get child pages and folders of a specific Confluence page',
        parameters: [
          {
            name: 'parentId',
            type: 'string',
            description: 'Parent page ID',
            required: true,
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum child items (1-50, default: 25)',
            required: false,
            default: 25,
          },
          {
            name: 'includeContent',
            type: 'boolean',
            description: 'Include page content (default: false)',
            required: false,
            default: false,
          },
        ],
      },
      {
        name: 'confluence_create_page',
        description: 'Create a new Confluence page with markdown, wiki, or storage format content',
        parameters: [
          {
            name: 'spaceKey',
            type: 'string',
            description: 'Space key (e.g., "DEV", "TEAM")',
            required: true,
          },
          {
            name: 'title',
            type: 'string',
            description: 'Page title',
            required: true,
          },
          {
            name: 'content',
            type: 'string',
            description: 'Page content',
            required: true,
          },
          {
            name: 'parentId',
            type: 'string',
            description: 'Parent page ID (optional)',
            required: false,
          },
          {
            name: 'contentFormat',
            type: 'string',
            description: 'Content format: markdown, wiki, or storage (default: markdown)',
            required: false,
            default: 'markdown',
          },
        ],
      },
      {
        name: 'confluence_update_page',
        description: 'Update an existing Confluence page with new title, content, or parent',
        parameters: [
          {
            name: 'pageId',
            type: 'string',
            description: 'Page ID to update',
            required: true,
          },
          {
            name: 'title',
            type: 'string',
            description: 'New page title',
            required: true,
          },
          {
            name: 'content',
            type: 'string',
            description: 'New page content',
            required: true,
          },
          {
            name: 'version',
            type: 'number',
            description: 'Current version number (required for updates)',
            required: true,
          },
          {
            name: 'isMinorEdit',
            type: 'boolean',
            description: 'Mark as minor edit (default: false)',
            required: false,
            default: false,
          },
          {
            name: 'versionComment',
            type: 'string',
            description: 'Version comment describing changes',
            required: false,
          },
        ],
      },
      {
        name: 'confluence_delete_page',
        description: 'Delete an existing Confluence page permanently',
        parameters: [
          {
            name: 'pageId',
            type: 'string',
            description: 'Page ID to delete',
            required: true,
          },
        ],
      },
      {
        name: 'confluence_add_comment',
        description: 'Add a comment to a Confluence page',
        parameters: [
          {
            name: 'pageId',
            type: 'string',
            description: 'Page ID to comment on',
            required: true,
          },
          {
            name: 'content',
            type: 'string',
            description: 'Comment content',
            required: true,
          },
        ],
      },
      {
        name: 'confluence_get_comments',
        description: 'Retrieve all comments for a specific Confluence page',
        parameters: [
          {
            name: 'pageId',
            type: 'string',
            description: 'Page ID',
            required: true,
          },
        ],
      },
      {
        name: 'confluence_add_label',
        description: 'Add a label/tag to a Confluence page for categorization',
        parameters: [
          {
            name: 'pageId',
            type: 'string',
            description: 'Page ID',
            required: true,
          },
          {
            name: 'name',
            type: 'string',
            description: 'Label name',
            required: true,
          },
        ],
      },
      {
        name: 'confluence_get_page_views',
        description: 'Get view statistics for a Confluence page (Cloud only)',
        parameters: [
          {
            name: 'pageId',
            type: 'string',
            description: 'Page ID',
            required: true,
          },
        ],
      },
    ];
  }

  async validateCredentials(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.credentials.base_url) {
      errors.push('Confluence URL is required');
    }

    if (!this.credentials.personal_token) {
      errors.push('Personal Access Token is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async initialize(): Promise<void> {
    console.log('[ConfluenceClient] Starting initialization...');
    console.log('[ConfluenceClient] Base URL:', this.credentials.base_url);
    console.log('[ConfluenceClient] Token length:', this.credentials.personal_token?.length || 0);

    await super.initialize();

    // Ensure base URL has protocol
    let baseUrl = this.credentials.base_url.replace(/\/$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
      console.log('[ConfluenceClient] Added https:// protocol to base URL:', baseUrl);
    }
    this.baseUrl = baseUrl;

    // Use Bearer Token authentication
    this.authHeader = `Bearer ${this.credentials.personal_token}`;

    // Test connection - try multiple endpoints for compatibility
    console.log('[ConfluenceClient] Testing connection...');

    const testEndpoints = [
      '/rest/api/space?limit=1',
      '/rest/api/content?limit=1',
    ];

    let lastError: any;
    for (const endpoint of testEndpoints) {
      const testUrl = `${this.baseUrl}${endpoint}`;
      console.log('[ConfluenceClient] Trying endpoint:', testUrl);

      try {
        const response = await this.makeRequest(testUrl);
        const data = await response.json();
        console.log('[ConfluenceClient] Successfully connected to Confluence');
        console.log('[ConfluenceClient] Response data:', data);
        return; // Success!
      } catch (error) {
        console.error(`[ConfluenceClient] Endpoint ${endpoint} failed:`, error);
        lastError = error;
        // Continue to next endpoint
      }
    }

    // If we get here, all endpoints failed
    console.error('[ConfluenceClient] All connection tests failed');
    throw new Error(
      `Failed to connect to Confluence. Please verify:\n` +
      `1. URL includes any context path (e.g., /confluence)\n` +
      `2. Personal Access Token is valid\n` +
      `3. Token has required permissions\n\n` +
      `Last error: ${lastError}`
    );
  }

  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    console.log('[ConfluenceClient] Making request:');
    console.log('  URL:', url);
    console.log('  Method:', options.method || 'GET');
    console.log('  Headers:', { ...headers, Authorization: 'Bearer ***' }); // Hide token

    try {
      const response = await super.makeRequest(url, { ...options, headers });

      console.log('[ConfluenceClient] Response received:');
      console.log('  Status:', response.status, response.statusText);
      console.log('  Headers:', Object.fromEntries(response.headers.entries()));

      // Clone response to read body for logging
      const clonedResponse = response.clone();
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        try {
          const body = await clonedResponse.json();
          console.log('[ConfluenceClient] Response body:', body);
        } catch (e) {
          console.log('[ConfluenceClient] Could not parse response body as JSON');
        }
      } else {
        const text = await clonedResponse.text();
        console.log('[ConfluenceClient] Response body (text):', text.substring(0, 500));
      }

      return response;
    } catch (error) {
      console.error('[ConfluenceClient] Request failed:', error);
      throw error;
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
        case 'confluence_search':
          result = await this.search(parameters);
          break;
        case 'confluence_get_page':
          result = await this.getPage(parameters);
          break;
        case 'confluence_get_page_children':
          result = await this.getPageChildren(parameters);
          break;
        case 'confluence_create_page':
          result = await this.createPage(parameters);
          break;
        case 'confluence_update_page':
          result = await this.updatePage(parameters);
          break;
        case 'confluence_delete_page':
          result = await this.deletePage(parameters);
          break;
        case 'confluence_add_comment':
          result = await this.addComment(parameters);
          break;
        case 'confluence_get_comments':
          result = await this.getComments(parameters);
          break;
        case 'confluence_add_label':
          result = await this.addLabel(parameters);
          break;
        case 'confluence_get_page_views':
          result = await this.getPageViews(parameters);
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

  private async search(params: any): Promise<any> {
    const { query, limit = 10, spacesFilter } = params;

    let url = `${this.baseUrl}/rest/api/content/search?cql=${encodeURIComponent(query)}&limit=${limit}`;

    if (spacesFilter) {
      url += `&spaceKey=${spacesFilter}`;
    }

    const response = await this.makeRequest(url);
    return response.json();
  }

  private async getPage(params: any): Promise<any> {
    const { pageId, title, spaceKey, includeMetadata = true } = params;

    let url: string;

    if (pageId) {
      url = `${this.baseUrl}/rest/api/content/${pageId}?expand=body.storage,version,space`;
    } else if (title && spaceKey) {
      url = `${this.baseUrl}/rest/api/content?title=${encodeURIComponent(title)}&spaceKey=${spaceKey}&expand=body.storage,version,space`;
    } else {
      throw new Error('Either pageId or (title + spaceKey) must be provided');
    }

    if (includeMetadata) {
      url += ',metadata.labels';
    }

    const response = await this.makeRequest(url);
    return response.json();
  }

  private async getPageChildren(params: any): Promise<any> {
    const { parentId, limit = 25, includeContent = false } = params;

    let url = `${this.baseUrl}/rest/api/content/${parentId}/child/page?limit=${limit}`;

    if (includeContent) {
      url += '&expand=body.storage';
    }

    const response = await this.makeRequest(url);
    return response.json();
  }

  private async createPage(params: any): Promise<any> {
    const { spaceKey, title, content, parentId, contentFormat = 'markdown' } = params;

    const payload: any = {
      type: 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: contentFormat === 'markdown' ? 'wiki' : 'storage',
        },
      },
    };

    if (parentId) {
      payload.ancestors = [{ id: parentId }];
    }

    const response = await this.makeRequest(`${this.baseUrl}/rest/api/content`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  private async updatePage(params: any): Promise<any> {
    const { pageId, title, content, version, isMinorEdit = false, versionComment } = params;

    const payload: any = {
      version: {
        number: version + 1,
        minorEdit: isMinorEdit,
      },
      title,
      type: 'page',
      body: {
        storage: {
          value: content,
          representation: 'storage',
        },
      },
    };

    if (versionComment) {
      payload.version.message = versionComment;
    }

    const response = await this.makeRequest(`${this.baseUrl}/rest/api/content/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  private async deletePage(params: any): Promise<any> {
    const { pageId } = params;

    await this.makeRequest(`${this.baseUrl}/rest/api/content/${pageId}`, {
      method: 'DELETE',
    });

    return { success: true, message: `Page ${pageId} deleted` };
  }

  private async addComment(params: any): Promise<any> {
    const { pageId, content } = params;

    const payload = {
      type: 'comment',
      container: { id: pageId, type: 'page' },
      body: {
        storage: {
          value: content,
          representation: 'storage',
        },
      },
    };

    const response = await this.makeRequest(`${this.baseUrl}/rest/api/content`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  private async getComments(params: any): Promise<any> {
    const { pageId } = params;

    const url = `${this.baseUrl}/rest/api/content/${pageId}/child/comment?expand=body.storage`;
    const response = await this.makeRequest(url);
    return response.json();
  }

  private async addLabel(params: any): Promise<any> {
    const { pageId, name } = params;

    const payload = [
      {
        prefix: 'global',
        name,
      },
    ];

    const response = await this.makeRequest(
      `${this.baseUrl}/rest/api/content/${pageId}/label`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return response.json();
  }

  private async getPageViews(params: any): Promise<any> {
    const { pageId } = params;

    const url = `${this.baseUrl}/rest/api/analytics/content/${pageId}/views`;
    const response = await this.makeRequest(url);
    return response.json();
  }
}
