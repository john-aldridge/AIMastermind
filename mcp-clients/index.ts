/**
 * MCP Client Configurations
 *
 * Pre-configured MCP (Model Context Protocol) client definitions
 * that can be imported into Synergy AI.
 */

import atlassianComplete from './mcp-atlassian-complete.json';
import jiraBasic from './jira-mcp-config.json';
import { MCPServerConfig } from '@/utils/mcpImport';

export interface MCPClientMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  sourceUrl?: string;
  requiredCredentials: string[];
  tags: string[];
  config: MCPServerConfig;
}

export const MCP_CLIENTS: MCPClientMetadata[] = [
  {
    id: 'atlassian-complete',
    name: 'Atlassian (Jira & Confluence)',
    description: 'Complete integration with Jira and Confluence. Manage issues, sprints, boards, pages, and more. Based on sooperset/mcp-atlassian.',
    author: 'sooperset',
    sourceUrl: 'https://github.com/sooperset/mcp-atlassian',
    requiredCredentials: [
      'JIRA_URL',
      'JIRA_USERNAME',
      'JIRA_API_TOKEN',
      'CONFLUENCE_URL',
      'CONFLUENCE_USERNAME',
      'CONFLUENCE_API_TOKEN',
    ],
    tags: ['jira', 'confluence', 'atlassian', 'project-management', 'documentation'],
    config: atlassianComplete as MCPServerConfig,
  },
  {
    id: 'jira-basic',
    name: 'Jira (Basic)',
    description: 'Core Jira functionality for issue management, search, and workflow transitions. Lightweight alternative to the full Atlassian client.',
    author: 'Synergy AI',
    requiredCredentials: [
      'JIRA_URL',
      'JIRA_USERNAME',
      'JIRA_API_TOKEN',
    ],
    tags: ['jira', 'project-management', 'issues'],
    config: jiraBasic as MCPServerConfig,
  },
];

/**
 * Get an MCP client configuration by ID
 */
export function getMCPClient(id: string): MCPClientMetadata | undefined {
  return MCP_CLIENTS.find(client => client.id === id);
}

/**
 * Search MCP clients by tag
 */
export function searchMCPClientsByTag(tag: string): MCPClientMetadata[] {
  return MCP_CLIENTS.filter(client =>
    client.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
  );
}

/**
 * Get all available MCP client IDs
 */
export function getAllMCPClientIds(): string[] {
  return MCP_CLIENTS.map(client => client.id);
}

/**
 * Get all unique tags across all MCP clients
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  MCP_CLIENTS.forEach(client => {
    client.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags).sort();
}
