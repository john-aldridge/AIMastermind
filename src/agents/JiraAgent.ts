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
import { useAppStore } from '@/state/appStore';

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

Do not use this after jira_find_similar to search for more similar issues — that tool already performs comprehensive multi-query similarity searches with synonym coverage. Use this only when you need to search by different criteria (status, assignee, date ranges, etc.).

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

This performs a thorough multi-query search using AI-generated search terms from the ticket's full content including comments. It searches using multiple keyword variations and synonyms to maximize coverage. Additional similarity searches are not needed.

The agent will:
1. Fetch the reference issue with full details (including comments)
2. Use AI to generate multiple diverse search query sets from the ticket content
3. Execute all queries in parallel for comprehensive coverage
4. Merge and deduplicate results
5. Return similar issues with relevance context`,
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
   * Find issues similar to a reference ticket using AI-generated search queries
   */
  private async findSimilar(
    client: any,
    params: Record<string, any>
  ): Promise<CapabilityResult> {
    const { issueKey, maxResults = 5, project } = params;

    // 1. Get reference issue with full details (including comments)
    const refResult = await client.executeCapability('jira_get_issue', {
      issueKey,
      fields: 'summary,description,comment,status,priority,issuetype,project,labels,components',
      expand: 'renderedFields',
    });

    if (!refResult.success) return refResult;

    const refIssue = refResult.data;

    // Build full ticket content for AI analysis
    const summary = refIssue.fields?.summary || '';
    const description = refIssue.fields?.description || '';
    const comments = refIssue.fields?.comment?.comments || [];
    const commentBodies = comments.map((c: any) => c.body || '').filter(Boolean).join('\n---\n');
    const labels = (refIssue.fields?.labels || []).join(', ');
    const components = (refIssue.fields?.components || []).map((c: any) => c.name).join(', ');

    const ticketContent = [
      `Title: ${summary}`,
      description ? `Description: ${description}` : '',
      labels ? `Labels: ${labels}` : '',
      components ? `Components: ${components}` : '',
      commentBodies ? `Comments:\n${commentBodies}` : '',
    ].filter(Boolean).join('\n\n');

    // Determine project scope
    const searchProject = project || refIssue.fields?.project?.key || this.config.default_project;

    // 2. Generate AI search queries using Haiku
    let searchTermSets: string[];
    try {
      searchTermSets = await this.generateSearchQueries(ticketContent);
      console.log('[JiraAgent] AI generated search queries:', searchTermSets);
    } catch (error) {
      // Fallback to naive approach if Haiku call fails
      console.warn('[JiraAgent] AI query generation failed, using fallback:', error);
      const searchText = `${summary} ${description}`.trim();
      searchTermSets = [this.escapeJql(searchText.substring(0, 200))];
    }

    // 3. Execute all queries in parallel
    const queryPromises = searchTermSets.slice(0, 5).map((terms) => {
      const escapedTerms = this.escapeJql(terms);
      let jql = `text ~ "${escapedTerms}" AND key != ${issueKey}`;
      if (searchProject) {
        jql = `project = ${searchProject} AND ${jql}`;
      }
      console.log('[JiraAgent] Executing JQL:', jql);
      return client.executeCapability('jira_search', {
        jql,
        fields: 'key,summary,description,status,priority,assignee,issuetype',
        maxResults: 10,
      }).catch((err: any) => {
        console.warn('[JiraAgent] Search query failed:', jql, err);
        return { success: false, data: { issues: [] } };
      });
    });

    const searchResults = await Promise.all(queryPromises);

    // 4. Merge and deduplicate results by issue key
    const seenKeys = new Set<string>();
    const allIssues: any[] = [];
    for (const result of searchResults) {
      const issues = result.data?.issues || [];
      for (const issue of issues) {
        if (!seenKeys.has(issue.key)) {
          seenKeys.add(issue.key);
          allIssues.push(issue);
        }
      }
    }

    // Limit to requested maxResults
    const limitedIssues = allIssues.slice(0, maxResults);
    const jqlsUsed = searchTermSets.slice(0, 5).map((terms) => {
      const escapedTerms = this.escapeJql(terms);
      let jql = `text ~ "${escapedTerms}" AND key != ${issueKey}`;
      if (searchProject) jql = `project = ${searchProject} AND ${jql}`;
      return jql;
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
        similarIssues: limitedIssues.map((issue: any) => ({
          key: issue.key,
          summary: issue.fields?.summary,
          status: issue.fields?.status?.name,
          priority: issue.fields?.priority?.name,
          issuetype: issue.fields?.issuetype?.name,
        })),
        total: allIssues.length,
        queriesUsed: searchTermSets.length,
        jqlsUsed,
      },
    };
  }

  /**
   * Use Haiku to generate diverse JQL search term sets from ticket content
   */
  private async generateSearchQueries(ticketContent: string): Promise<string[]> {
    const apiKey = this.getAnthropicApiKey();
    if (!apiKey) {
      throw new Error('No Anthropic API key available');
    }

    const systemPrompt = `You are generating Jira JQL text search queries to find issues similar to this ticket.
Jira uses Lucene — text ~ "words" does keyword OR matching with stemming, but true
synonyms (e.g. "incorrect" vs "wrong") are different tokens and won't match each other.

Generate up to 5 search queries, each as a short string of keywords (no JQL syntax, just
the search terms). Each query should target a different angle or use different
synonyms/terminology to maximize coverage. Focus on:
- Core problem description
- Technical terms from comments (error codes, component names)
- Synonym variations for key concepts
- Area/feature-specific terms

Respond as a JSON array of strings, e.g. ["query1 terms", "query2 terms", ...]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        temperature: 0,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Analyze this ticket and generate search queries:\n\n${ticketContent}` },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Haiku API error: ${(error as any).error?.message || response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.content?.find((b: any) => b.type === 'text')?.text || '';

    // Parse JSON array from response — handle markdown code blocks
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse search queries from Haiku response');
    }

    const queries: string[] = JSON.parse(jsonMatch[0]);
    return queries.filter((q: string) => typeof q === 'string' && q.trim().length > 0).slice(0, 5);
  }

  /**
   * Get Anthropic API key from user's active configuration
   */
  private getAnthropicApiKey(): string | null {
    try {
      const appState = useAppStore.getState();
      const { userConfig } = appState;
      const activeConfigId = userConfig.activeConfigurationId || 'free-model';
      const activeConfig = userConfig.savedConfigurations.find((c: any) => c.id === activeConfigId);

      if (activeConfig?.credentials?.apiKey) {
        return activeConfig.credentials.apiKey;
      }
      return null;
    } catch {
      return null;
    }
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
            // Handle comments specially — extract body text only, cap at 5 by default
            const comments = (value as any).comments || [];
            const effectiveMax = maxComments ?? 5;
            formatted.comments = comments.slice(0, effectiveMax).map((c: any) => c.body || '');
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
