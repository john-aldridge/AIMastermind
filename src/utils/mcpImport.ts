/**
 * MCP (Model Context Protocol) Import Utilities
 * Converts MCP server configurations to our APIClient format
 */

import { APIClient, ClientCapability } from '@/state/appStore';

// MCP Tool definition (from MCP spec)
export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  // Additional fields that some MCP servers might include
  method?: string;
  endpoint?: string;
  url?: string;
}

// MCP Server configuration
export interface MCPServerConfig {
  name: string;
  description?: string;
  version?: string;
  tools?: MCPTool[];
  resources?: any[];
  // Authentication info if provided
  auth?: {
    type: string;
    [key: string]: any;
  };
}

/**
 * Fetches and parses an MCP configuration from a URL
 */
export async function fetchMCPConfig(url: string): Promise<MCPServerConfig> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch MCP config: ${response.statusText}`);
    }

    const config = await response.json();
    return config;
  } catch (error) {
    throw new Error(`Error fetching MCP config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses MCP configuration from JSON string
 */
export function parseMCPConfig(jsonString: string): MCPServerConfig {
  try {
    const config = JSON.parse(jsonString);
    return config;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Converts an MCP tool to our ClientCapability format
 */
function convertMCPToolToCapability(tool: MCPTool): ClientCapability {
  return {
    name: tool.name,
    description: tool.description,
    method: tool.method || 'POST',
    endpoint: tool.endpoint || tool.url || `/${tool.name.toLowerCase().replace(/\s+/g, '-')}`,
    inputSchema: tool.inputSchema as any,
  };
}

/**
 * Converts an MCP server configuration to our APIClient format
 */
export function convertMCPToClient(mcpConfig: MCPServerConfig): Omit<APIClient, 'id' | 'createdAt' | 'updatedAt'> {
  const capabilities: ClientCapability[] = (mcpConfig.tools || []).map(convertMCPToolToCapability);

  // Extract provider name from the config name
  const providerName = mcpConfig.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return {
    name: mcpConfig.name,
    description: mcpConfig.description || `Imported from MCP: ${mcpConfig.name}`,
    provider: providerName,
    credentials: {},
    capabilities,
    isActive: false,
    isPurchased: true, // Mark as "from store" since it's an MCP import
  };
}

/**
 * Validates an MCP configuration
 */
export function validateMCPConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name) {
    errors.push('Missing required field: name');
  }

  if (!config.tools || !Array.isArray(config.tools)) {
    errors.push('Missing or invalid tools array');
  } else if (config.tools.length === 0) {
    errors.push('No tools defined in configuration');
  } else {
    // Validate each tool
    config.tools.forEach((tool: any, index: number) => {
      if (!tool.name) {
        errors.push(`Tool ${index}: missing name`);
      }
      if (!tool.description) {
        errors.push(`Tool ${index}: missing description`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Infers MCP configuration from a GitHub repository
 * Tries common paths where MCP configs might be located
 */
export async function importFromGitHub(repoUrl: string): Promise<MCPServerConfig> {
  // Extract owner/repo from GitHub URL
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }

  const [, owner, repo] = match;
  const repoName = repo.replace(/\.git$/, '');

  // Try common MCP config locations
  const possiblePaths = [
    `https://raw.githubusercontent.com/${owner}/${repoName}/main/mcp.json`,
    `https://raw.githubusercontent.com/${owner}/${repoName}/master/mcp.json`,
    `https://raw.githubusercontent.com/${owner}/${repoName}/main/server-config.json`,
    `https://raw.githubusercontent.com/${owner}/${repoName}/main/config.json`,
  ];

  for (const path of possiblePaths) {
    try {
      return await fetchMCPConfig(path);
    } catch (error) {
      // Try next path
      continue;
    }
  }

  throw new Error('Could not find MCP configuration in repository. Please provide a direct URL to the config file.');
}
