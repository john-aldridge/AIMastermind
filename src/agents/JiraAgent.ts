/**
 * Jira Agent
 *
 * Intelligent Jira integration that wraps JiraClient with smart search capabilities.
 * Dynamically determines which fields to request based on user queries,
 * letting the LLM decide rather than using rigid field sets.
 */

import {
  AgentBase,
  AgentMetadata,
  ConfigField,
  AgentCapabilityDefinition,
  CapabilityResult,
} from './AgentInterface';

export class JiraAgent extends AgentBase {
  getMetadata(): AgentMetadata {
    return {
      id: 'jira-agent',
      name: 'Jira Smart Agent',
      description: 'Intelligent Jira integration with dynamic field selection. Can search, create, update issues and more.',
      version: '1.0.0',
      author: 'Synergy AI',
      icon: '🎫',
      tags: ['jira', 'atlassian', 'issues', 'search', 'tickets'],
    };
  }

  getConfigFields(): ConfigField[] {
    return [
      {
        key: 'default_project',
        label: 'Default Project Key',
        type: 'text',
        required: false,
        placeholder: 'PROJ',
        helpText: 'Optional: Default project for searches (e.g., "PROJ")',
      },
      {
        key: 'max_results',
        label: 'Default Max Results',
        type: 'number',
        required: false,
        default: 10,
        helpText: 'Default maximum issues per search (can be overridden per-request)',
      },
    ];
  }

  getDependencies(): string[] {
    return ['jira'];
  }

  getCapabilities(): AgentCapabilityDefinition[] {
    return [
      // Smart capabilities - agent adds intelligence
      {
        name: 'jira_smart_search',
        description: `Search Jira issues with intelligent field selection.

The agent will determine which fields to request based on your query intent.
You can specify explicit fields if needed, or let the agent decide.

AVAILABLE FIELDS (commonly used):
- key, summary, description, status, priority, assignee, reporter
- issuetype, project, labels, components, fixVersions, versions
- created, updated, duedate, resolution, resolutiondate
- comment (includes all comments), attachment, worklog
- Custom fields vary by instance - use jira_get_fields to discover

JQL SEARCH TIPS:
- Structured filter: project = PROJ AND status = "Open"
- Text search (searches summary, description, comments): text ~ "keyword"
- Comment-only search: comment ~ "workaround"
- Combined: project = PROJ AND text ~ "error" AND status != Done`,
        parameters: [
          {
            name: 'jql',
            type: 'string',
            description: 'JQL query. Can include text~ for keyword search.',
            required: true,
          },
          {
            name: 'fields',
            type: 'string',
            description: 'Optional: comma-separated fields to return. If omitted, agent selects based on query.',
            required: false,
          },
          {
            name: 'maxResults',
            type: 'number',
            description: 'Max results (default: 10)',
            required: false,
            default: 10,
          },
          {
            name: 'maxComments',
            type: 'number',
            description: 'If including comments, limit to this many per issue (default: all)',
            required: false,
          },
        ],
      },
      {
        name: 'jira_find_similar',
        description: `Find Jira issues similar to a reference ticket.

The agent will:
1. Fetch the reference issue with full details (including comments)
2. Extract key information and summarize
3. Search for similar issues using text matching
4. Return similar issues with relevance context`,
        parameters: [
          {
            name: 'issueKey',
            type: 'string',
            description: 'Reference issue key (e.g., "PROJ-123")',
            required: true,
          },
          {
            name: 'maxResults',
            type: 'number',
            description: 'Max similar issues to return (default: 5)',
            required: false,
            default: 5,
          },
          {
            name: 'project',
            type: 'string',
            description: 'Optional: limit search to specific project',
            required: false,
          },
        ],
      },
      // Passthrough capabilities - expose client capabilities via agent
      {
        name: 'jira_get_issue',
        description: 'Get detailed information about a specific Jira issue. Fields returned depend on your request.',
        parameters: [
          {
            name: 'issueKey',
            type: 'string',
            description: 'Issue key (e.g., "PROJ-123")',
            required: true,
          },
          {
            name: 'fields',
            type: 'string',
            description: 'Specific fields to return (comma-separated)',
            required: false,
          },
          {
            name: 'expand',
            type: 'string',
            description: 'Fields to expand (changelog, renderedFields)',
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
        description: 'Change the status of an issue (workflow transition)',
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
            description: 'Optional comment to add with the transition',
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
      {
        name: 'jira_get_fields',
        description: 'Get all available fields in this Jira instance. Use this to discover custom fields.',
        parameters: [],
      },
    ];
  }

  async executeCapability(
    capabilityName: string,
    parameters: Record<string, any>
  ): Promise<CapabilityResult> {
    const startTime = Date.now();

    try {
      // Check dependencies
      if (!this.hasDependencies()) {
        throw new Error('Missing required dependency: Jira client must be configured');
      }

      const jiraClient = this.getDependency('jira');
      let result: any;

      // Smart capabilities - agent adds intelligence
      if (capabilityName === 'jira_smart_search') {
        result = await this.smartSearch(jiraClient, parameters);
        return {
          ...result,
          metadata: {
            ...result.metadata,
            duration: Date.now() - startTime,
          },
        };
      }

      if (capabilityName === 'jira_find_similar') {
        result = await this.findSimilar(jiraClient, parameters);
        return {
          ...result,
          metadata: {
            ...result.metadata,
            duration: Date.now() - startTime,
          },
        };
      }

      // Passthrough capabilities - delegate to client
      const passthroughCapabilities = [
        'jira_get_issue',
        'jira_create_issue',
        'jira_update_issue',
        'jira_transition_issue',
        'jira_add_comment',
        'jira_get_fields',
      ];

      if (passthroughCapabilities.includes(capabilityName)) {
        result = await jiraClient.executeCapability(capabilityName, parameters);
        return {
          ...result,
          metadata: {
            ...result.metadata,
            duration: Date.now() - startTime,
          },
        };
      }

      throw new Error(`Unknown capability: ${capabilityName}`);
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

  /**
   * Smart search with dynamic field selection based on query patterns
   */
  private async smartSearch(
    client: any,
    params: Record<string, any>
  ): Promise<CapabilityResult> {
    const { jql, fields, maxResults, maxComments } = params;
    const effectiveMaxResults = maxResults ?? this.config.max_results ?? 10;

    // If fields not specified, suggest fields based on JQL content
    let fieldsToRequest = fields;
    if (!fieldsToRequest) {
      fieldsToRequest = this.suggestFieldsFromJql(jql);
    }

    const result = await client.executeCapability('jira_search', {
      jql,
      fields: fieldsToRequest,
      maxResults: effectiveMaxResults,
    });

    if (!result.success) return result;

    // Format results, optionally limiting comments
    const formattedIssues = this.formatIssues(result.data.issues, maxComments);

    return {
      success: true,
      data: {
        issues: formattedIssues,
        total: result.data.total,
        jqlUsed: jql,
        fieldsReturned: fieldsToRequest,
      },
    };
  }

  /**
   * Suggest fields based on JQL query patterns
   */
  private suggestFieldsFromJql(jql: string): string {
    // Provide reasonable defaults based on query patterns
    // LLM can always override by specifying fields explicitly

    const hasTextSearch = jql.includes('text ~') || jql.includes('text~');
    const wantsComments = jql.includes('comment ~') || jql.includes('comment~');

    // Base fields always useful
    const baseFields = ['key', 'summary', 'status', 'priority', 'assignee', 'issuetype'];

    if (hasTextSearch || wantsComments) {
      // Include description and comments for text searches
      return [...baseFields, 'description', 'comment'].join(',');
    }

    // Standard search - include description but not comments (lighter payload)
    return [...baseFields, 'description', 'created', 'updated'].join(',');
  }

  /**
   * Find issues similar to a reference ticket
   */
  private async findSimilar(
    client: any,
    params: Record<string, any>
  ): Promise<CapabilityResult> {
    const { issueKey, maxResults = 5, project } = params;

    // 1. Get reference issue with full details
    const refResult = await client.executeCapability('jira_get_issue', {
      issueKey,
      expand: 'renderedFields',
    });

    if (!refResult.success) return refResult;

    const refIssue = refResult.data;

    // 2. Build search text from summary + description
    const summary = refIssue.fields?.summary || '';
    const description = refIssue.fields?.description || '';
    const searchText = `${summary} ${description}`.trim();

    // Extract meaningful search terms (first ~200 chars, escape for JQL)
    const searchTerms = this.escapeJql(searchText.substring(0, 200));

    // 3. Build JQL for similar issues
    let jql = `text ~ "${searchTerms}" AND key != ${issueKey}`;

    // Determine project scope
    const searchProject = project || refIssue.fields?.project?.key || this.config.default_project;
    if (searchProject) {
      jql = `project = ${searchProject} AND ${jql}`;
    }

    // 4. Search for similar issues
    const searchResult = await client.executeCapability('jira_search', {
      jql,
      fields: 'key,summary,description,status,priority,assignee,issuetype',
      maxResults,
    });

    return {
      success: true,
      data: {
        referenceIssue: {
          key: refIssue.key,
          summary: refIssue.fields?.summary,
          description: refIssue.fields?.description?.substring(0, 500),
          status: refIssue.fields?.status?.name,
          issuetype: refIssue.fields?.issuetype?.name,
        },
        similarIssues: searchResult.data?.issues?.map((issue: any) => ({
          key: issue.key,
          summary: issue.fields?.summary,
          status: issue.fields?.status?.name,
          priority: issue.fields?.priority?.name,
          issuetype: issue.fields?.issuetype?.name,
        })) || [],
        total: searchResult.data?.total || 0,
        jqlUsed: jql,
      },
    };
  }

  /**
   * Format issues for output, extracting names from nested objects
   */
  private formatIssues(issues: any[], maxComments?: number): any[] {
    if (!issues) return [];

    return issues.map(issue => {
      const formatted: any = {
        key: issue.key,
      };

      // Copy all returned fields, formatting nested objects
      if (issue.fields) {
        for (const [key, value] of Object.entries(issue.fields)) {
          if (key === 'comment' && value) {
            // Handle comments specially
            const comments = (value as any).comments || [];
            formatted.comments = maxComments
              ? comments.slice(0, maxComments)
              : comments;
            formatted.totalComments = (value as any).total || comments.length;
          } else if (value && typeof value === 'object') {
            // Extract name/displayName from objects like status, priority, assignee
            if ('name' in (value as any)) {
              formatted[key] = (value as any).name;
            } else if ('displayName' in (value as any)) {
              formatted[key] = (value as any).displayName;
            } else if ('key' in (value as any)) {
              formatted[key] = (value as any).key;
            } else {
              formatted[key] = value;
            }
          } else {
            formatted[key] = value;
          }
        }
      }

      return formatted;
    });
  }

  /**
   * Escape special JQL characters in text
   */
  private escapeJql(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .trim();
  }
}
