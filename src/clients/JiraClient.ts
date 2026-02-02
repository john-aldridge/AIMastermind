/**
 * Jira Client Implementation
 *
 * Example implementation of the APIClientBase for Jira.
 * Demonstrates how to create a fully functional client with
 * API calls, credential management, and capability exposure.
 */

import {
  APIClientBase,
  ClientMetadata,
  CredentialField,
  ClientCapabilityDefinition,
  CapabilityResult,
} from './ClientInterface';

export class JiraClient extends APIClientBase {
  private baseUrl: string = '';
  private authHeader: string = '';

  getMetadata(): ClientMetadata {
    return {
      id: 'jira',
      name: 'Jira',
      description: 'Atlassian Jira integration for issue tracking and project management',
      version: '1.0.0',
      author: 'Synergy AI',
      icon: 'https://www.atlassian.com/favicon.ico',
      homepage: 'https://www.atlassian.com/software/jira',
      tags: ['jira', 'atlassian', 'project-management', 'issues', 'agile'],
    };
  }

  getCredentialFields(): CredentialField[] {
    return [
      {
        key: 'base_url',
        label: 'Jira URL',
        type: 'url',
        required: true,
        placeholder: 'https://yourcompany.atlassian.net or https://jira.yourcompany.com',
        helpText: 'Your Jira instance URL (Cloud or Server/Data Center)',
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
        name: 'jira_search',
        description: 'Search for Jira issues using JQL (Jira Query Language)',
        parameters: [
          {
            name: 'jql',
            type: 'string',
            description: 'JQL query string (e.g., "project = PROJ AND status = Open")',
            required: true,
          },
          {
            name: 'maxResults',
            type: 'number',
            description: 'Maximum number of results to return (default: 50)',
            required: false,
            default: 50,
          },
          {
            name: 'startAt',
            type: 'number',
            description: 'Starting index for pagination (default: 0)',
            required: false,
            default: 0,
          },
        ],
      },
      {
        name: 'jira_get_issue',
        description: 'Get detailed information about a specific Jira issue',
        parameters: [
          {
            name: 'issueKey',
            type: 'string',
            description: 'Issue key (e.g., "PROJ-123")',
            required: true,
          },
          {
            name: 'expand',
            type: 'string',
            description: 'Fields to expand (e.g., "changelog,renderedFields")',
            required: false,
          },
        ],
      },
      {
        name: 'jira_create_issue',
        description: 'Create a new Jira issue',
        parameters: [
          {
            name: 'projectKey',
            type: 'string',
            description: 'Project key (e.g., "PROJ")',
            required: true,
          },
          {
            name: 'summary',
            type: 'string',
            description: 'Issue summary/title',
            required: true,
          },
          {
            name: 'issueType',
            type: 'string',
            description: 'Issue type (e.g., "Bug", "Task", "Story")',
            required: true,
          },
          {
            name: 'description',
            type: 'string',
            description: 'Issue description',
            required: false,
          },
          {
            name: 'priority',
            type: 'string',
            description: 'Priority (e.g., "High", "Medium", "Low")',
            required: false,
          },
        ],
      },
      {
        name: 'jira_update_issue',
        description: 'Update an existing Jira issue',
        parameters: [
          {
            name: 'issueKey',
            type: 'string',
            description: 'Issue key to update',
            required: true,
          },
          {
            name: 'fields',
            type: 'object',
            description: 'Fields to update as key-value pairs',
            required: true,
          },
        ],
      },
      {
        name: 'jira_transition_issue',
        description: 'Change the status of an issue (e.g., Open → In Progress)',
        parameters: [
          {
            name: 'issueKey',
            type: 'string',
            description: 'Issue key',
            required: true,
          },
          {
            name: 'transitionId',
            type: 'string',
            description: 'Transition ID (get from jira_get_transitions)',
            required: true,
          },
          {
            name: 'comment',
            type: 'string',
            description: 'Optional comment to add',
            required: false,
          },
        ],
      },
      {
        name: 'jira_add_comment',
        description: 'Add a comment to a Jira issue',
        parameters: [
          {
            name: 'issueKey',
            type: 'string',
            description: 'Issue key',
            required: true,
          },
          {
            name: 'comment',
            type: 'string',
            description: 'Comment text',
            required: true,
          },
        ],
      },
    ];
  }

  async validateCredentials(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.credentials.base_url) {
      errors.push('Jira URL is required');
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
    console.log('[JiraClient] Starting initialization...');
    console.log('[JiraClient] Base URL:', this.credentials.base_url);
    console.log('[JiraClient] Token length:', this.credentials.personal_token?.length || 0);

    await super.initialize();

    // Ensure base URL has protocol
    let baseUrl = this.credentials.base_url.replace(/\/$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
      console.log('[JiraClient] Added https:// protocol to base URL:', baseUrl);
    }
    this.baseUrl = baseUrl;

    // Use Bearer Token authentication (works for both Cloud and Server/DC PATs)
    this.authHeader = `Bearer ${this.credentials.personal_token}`;

    // Test connection - try API v2 first (works on both Cloud and older Server/DC)
    const testUrl = `${this.baseUrl}/rest/api/2/myself`;
    console.log('[JiraClient] Testing connection to:', testUrl);

    try {
      const response = await this.makeRequest(testUrl);
      const data = await response.json();
      console.log('[JiraClient] Successfully connected to Jira');
      console.log('[JiraClient] User info:', data);
    } catch (error) {
      console.error('[JiraClient] Connection test failed:', error);
      throw new Error(`Failed to connect to Jira: ${error}`);
    }
  }

  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Add auth header
    const headers = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    console.log('[JiraClient] Making request:');
    console.log('  URL:', url);
    console.log('  Method:', options.method || 'GET');
    console.log('  Headers:', { ...headers, Authorization: 'Bearer ***' }); // Hide token

    try {
      const response = await super.makeRequest(url, { ...options, headers });

      console.log('[JiraClient] Response received:');
      console.log('  Status:', response.status, response.statusText);
      console.log('  Headers:', Object.fromEntries(response.headers.entries()));

      // Clone response to read body for logging
      const clonedResponse = response.clone();
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        try {
          const body = await clonedResponse.json();
          console.log('[JiraClient] Response body:', body);
        } catch (e) {
          console.log('[JiraClient] Could not parse response body as JSON');
        }
      } else {
        const text = await clonedResponse.text();
        console.log('[JiraClient] Response body (text):', text.substring(0, 500));
      }

      return response;
    } catch (error) {
      console.error('[JiraClient] Request failed:', error);
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
        case 'jira_search':
          result = await this.search(parameters);
          break;
        case 'jira_get_issue':
          result = await this.getIssue(parameters);
          break;
        case 'jira_create_issue':
          result = await this.createIssue(parameters);
          break;
        case 'jira_update_issue':
          result = await this.updateIssue(parameters);
          break;
        case 'jira_transition_issue':
          result = await this.transitionIssue(parameters);
          break;
        case 'jira_add_comment':
          result = await this.addComment(parameters);
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
    const { jql, maxResults = 50, startAt = 0 } = params;

    const url = `${this.baseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}`;
    const response = await this.makeRequest(url);
    return response.json();
  }

  private async getIssue(params: any): Promise<any> {
    const { issueKey, expand } = params;

    let url = `${this.baseUrl}/rest/api/2/issue/${issueKey}`;
    if (expand) {
      url += `?expand=${expand}`;
    }

    const response = await this.makeRequest(url);
    return response.json();
  }

  private async createIssue(params: any): Promise<any> {
    const { projectKey, summary, issueType, description, priority } = params;

    const payload: any = {
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType },
      },
    };

    if (description) {
      // Use plain text for description (works on all versions)
      payload.fields.description = description;
    }

    if (priority) {
      payload.fields.priority = { name: priority };
    }

    const response = await this.makeRequest(`${this.baseUrl}/rest/api/2/issue`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.json();
  }

  private async updateIssue(params: any): Promise<any> {
    const { issueKey, fields } = params;

    await this.makeRequest(`${this.baseUrl}/rest/api/2/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    });

    return { success: true };
  }

  private async transitionIssue(params: any): Promise<any> {
    const { issueKey, transitionId, comment } = params;

    const payload: any = {
      transition: { id: transitionId },
    };

    if (comment) {
      payload.update = {
        comment: [
          {
            add: {
              body: comment,
            },
          },
        ],
      };
    }

    await this.makeRequest(
      `${this.baseUrl}/rest/api/2/issue/${issueKey}/transitions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return { success: true };
  }

  private async addComment(params: any): Promise<any> {
    const { issueKey, comment } = params;

    const payload = {
      body: comment,
    };

    const response = await this.makeRequest(
      `${this.baseUrl}/rest/api/2/issue/${issueKey}/comment`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return response.json();
  }
}
