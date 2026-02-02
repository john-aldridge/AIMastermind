# MCP Client Configurations

This directory contains pre-configured MCP (Model Context Protocol) client definitions that can be imported into Synergy AI.

## Available Clients

### 1. Atlassian (Jira & Confluence) - `mcp-atlassian-complete.json`

**Based on:** [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian)

**Capabilities:**
- 18 Jira tools (search, create/update/delete issues, sprints, boards, SLA metrics)
- 10 Confluence tools (search, create/update/delete pages, comments, labels)

**Required Credentials:**

*For Jira/Confluence Cloud:*
- `JIRA_URL` - Your Jira instance URL (e.g., https://yourcompany.atlassian.net)
- `JIRA_USERNAME` - Your email address
- `JIRA_API_TOKEN` - API token from [Atlassian](https://id.atlassian.com/manage-profile/security/api-tokens)
- `CONFLUENCE_URL` - Your Confluence URL (e.g., https://yourcompany.atlassian.net/wiki)
- `CONFLUENCE_USERNAME` - Your email address
- `CONFLUENCE_API_TOKEN` - API token (can be same as Jira token)
- **Auth Method:** Basic Authentication

*For Jira/Confluence Server or Data Center:*
- `JIRA_URL` - Your Jira instance URL
- `JIRA_PERSONAL_TOKEN` - Personal Access Token (PAT) from your Jira profile
- `CONFLUENCE_URL` - Your Confluence URL
- `CONFLUENCE_PERSONAL_TOKEN` - Personal Access Token (PAT)
- **Auth Method:** Bearer Token (Authorization: Bearer &lt;token&gt;)

**Use Cases:**
- Project management and issue tracking
- Sprint planning and agile workflows
- Documentation management
- Team collaboration

---

### 2. Jira (Basic) - `jira-mcp-config.json`

**Capabilities:**
- 6 core Jira tools (search, get, create, update, transition, SLA)

**Required Credentials:**
- `JIRA_URL` - Your Jira instance URL
- `JIRA_USERNAME` - Your email address
- `JIRA_API_TOKEN` - API token

**Use Cases:**
- Basic Jira integration
- Simple issue management
- Lightweight alternative to full Atlassian client

---

## How to Import

### Method 1: Via Extension UI (Recommended)

1. Open Synergy AI side panel
2. Go to **Clients** tab
3. Click **"Import MCP"**
4. Choose one of these methods:
   - **From URL**: Use the raw GitHub URL after committing these files
   - **Paste JSON**: Copy the contents of any `.json` file and paste it
   - **From GitHub**: Use the repository URL containing these configs

### Method 2: Programmatically

You can also load these configurations in your code:

```typescript
import atlassianConfig from '@/mcp-clients/mcp-atlassian-complete.json';
import jiraConfig from '@/mcp-clients/jira-mcp-config.json';

// Use in your import logic
const client = convertMCPToClient(atlassianConfig);
```

---

## Adding New MCP Clients

To add a new MCP client configuration:

1. **Create a JSON file** in this directory following the format:

```json
{
  "name": "Service Name",
  "description": "Description of what this client does",
  "version": "1.0.0",
  "tools": [
    {
      "name": "tool_name",
      "description": "What this tool does",
      "method": "GET|POST|PUT|DELETE",
      "endpoint": "/api/endpoint",
      "inputSchema": {
        "type": "object",
        "properties": {
          "param1": {
            "type": "string",
            "description": "Parameter description"
          }
        },
        "required": ["param1"]
      }
    }
  ]
}
```

2. **Document it** in this README with:
   - Name and description
   - Required credentials
   - Use cases
   - Source/inspiration (if based on existing MCP server)

3. **Test it** by importing through the extension UI

---

## Authentication Methods

### Jira Cloud vs Server/Data Center

Atlassian offers different authentication methods depending on your deployment type:

#### **Jira/Confluence Cloud**
- **Method:** Basic Authentication
- **Format:** `Authorization: Basic base64(username:api_token)`
- **Credentials Needed:**
  - Username (email address)
  - API Token (from [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens))
- **Getting API Tokens:**
  1. Visit https://id.atlassian.com/manage-profile/security/api-tokens
  2. Click "Create API token"
  3. Name it (e.g., "Synergy AI Extension")
  4. Copy and save the token immediately

#### **Jira/Confluence Server/Data Center**
- **Method:** Bearer Token Authentication
- **Format:** `Authorization: Bearer <personal_access_token>`
- **Credentials Needed:**
  - Personal Access Token (PAT) only - no username required
- **Getting Personal Access Tokens:**
  1. Log in to your Jira/Confluence instance
  2. Go to Profile → Personal Access Tokens
  3. Click "Create token"
  4. Set name and permissions
  5. Copy the token (won't be shown again)

#### **Key Differences**

| Feature | Cloud | Server/Data Center |
|---------|-------|-------------------|
| Auth Type | Basic Auth | Bearer Token |
| Username Required | ✅ Yes | ❌ No |
| Token Type | API Token | Personal Access Token (PAT) |
| Token Location | Atlassian Account | Instance Profile |
| Expiration | Configurable (expires 2026+) | Configurable per instance |

**Note:** The extension automatically detects which authentication method to use based on your deployment type selection.

---

## MCP Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)
- [Anthropic MCP Documentation](https://docs.anthropic.com/en/docs/mcp)
- [Glama MCP Server Directory](https://glama.ai/mcp/servers)

---

## Credential Security

**Important:** Never commit API tokens or credentials to this repository. The JSON files in this directory contain only the **structure** and **schema** of the APIs, not actual credentials.

Users configure their own credentials through the Synergy AI extension UI after importing these configurations.

---

## Contributing

Have a useful MCP client configuration? Add it to this directory with:
- Clear naming convention: `service-name-mcp.json`
- Complete tool definitions with input schemas
- Documentation in this README
- No hardcoded credentials or sensitive data
