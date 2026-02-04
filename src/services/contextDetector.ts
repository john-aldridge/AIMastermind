/**
 * Context Detector Service
 *
 * Detects page context from URL patterns and content hints,
 * then matches to relevant clients/agents for intelligent tool selection.
 */

/**
 * Context rule for matching URLs/content to clients
 */
export interface ContextRule {
  clientId: string;
  patterns: string[];  // URL patterns like '*://*.atlassian.net/*'
  domainHints: string[];  // Domain keywords like 'jira', 'atlassian'
  contentHints?: string[];  // Optional content keywords for ambiguous cases
  priority?: number;  // Higher priority rules take precedence (default: 0)
}

/**
 * Context match result
 */
export interface ContextMatch {
  clientId: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  matchedPattern?: string;
  matchedHint?: string;
}

/**
 * Built-in context rules for common services
 */
const BUILT_IN_RULES: ContextRule[] = [
  {
    clientId: 'jira',
    patterns: [
      '*://*.atlassian.net/browse/*',
      '*://*.atlassian.net/jira/*',
      '*://jira.*/*',
      '*://*.jira.com/*',
    ],
    domainHints: ['jira', 'atlassian'],
    contentHints: ['JIRA', 'issue', 'sprint', 'backlog'],
    priority: 10,
  },
  {
    clientId: 'confluence',
    patterns: [
      '*://*.atlassian.net/wiki/*',
      '*://confluence.*/*',
      '*://*.confluence.com/*',
    ],
    domainHints: ['confluence', 'wiki'],
    contentHints: ['Confluence', 'space', 'page tree'],
    priority: 10,
  },
  {
    clientId: 'github',
    patterns: [
      '*://github.com/*',
      '*://gist.github.com/*',
      '*://*.github.io/*',
    ],
    domainHints: ['github'],
    contentHints: ['GitHub', 'repository', 'pull request', 'commit'],
    priority: 10,
  },
  {
    clientId: 'gitlab',
    patterns: [
      '*://gitlab.com/*',
      '*://*.gitlab.com/*',
    ],
    domainHints: ['gitlab'],
    contentHints: ['GitLab', 'merge request'],
    priority: 10,
  },
  {
    clientId: 'slack',
    patterns: [
      '*://*.slack.com/*',
      '*://app.slack.com/*',
    ],
    domainHints: ['slack'],
    contentHints: ['Slack', 'channel', 'workspace'],
    priority: 10,
  },
  {
    clientId: 'notion',
    patterns: [
      '*://www.notion.so/*',
      '*://notion.so/*',
    ],
    domainHints: ['notion'],
    contentHints: ['Notion'],
    priority: 10,
  },
  {
    clientId: 'linear',
    patterns: [
      '*://linear.app/*',
    ],
    domainHints: ['linear'],
    contentHints: ['Linear', 'issue', 'project'],
    priority: 10,
  },
  {
    clientId: 'figma',
    patterns: [
      '*://www.figma.com/*',
      '*://figma.com/*',
    ],
    domainHints: ['figma'],
    contentHints: ['Figma', 'design', 'prototype'],
    priority: 10,
  },
  {
    clientId: 'pinterest',
    patterns: [
      '*://www.pinterest.com/*',
      '*://pinterest.com/*',
      '*://*.pinterest.com/*',
    ],
    domainHints: ['pinterest'],
    contentHints: ['Pinterest', 'pin', 'board'],
    priority: 10,
  },
  // Browser client is always-on, handled separately
];

/**
 * Convert a URL pattern with wildcards to a RegExp
 * Supports patterns like '*://*.example.com/*'
 */
function patternToRegex(pattern: string): RegExp {
  // Escape special regex characters except *
  let regexStr = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${regexStr}$`, 'i');
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Context Detector class
 */
class ContextDetectorClass {
  private customRules: ContextRule[] = [];
  private cache: Map<string, ContextMatch[]> = new Map();
  private cacheTimeout = 30000; // 30 seconds cache

  /**
   * Add a custom context rule
   */
  addRule(rule: ContextRule): void {
    this.customRules.push(rule);
    this.clearCache();
  }

  /**
   * Remove a custom context rule by clientId
   */
  removeRule(clientId: string): void {
    this.customRules = this.customRules.filter(r => r.clientId !== clientId);
    this.clearCache();
  }

  /**
   * Get all rules (built-in + custom)
   */
  getAllRules(): ContextRule[] {
    return [...BUILT_IN_RULES, ...this.customRules]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Clear the detection cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Detect context from URL and optional content
   * Returns list of matching clients with reasons
   */
  detectContext(url: string, content?: string): ContextMatch[] {
    // Check cache first
    const cacheKey = `${url}:${content?.slice(0, 100) || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const matches: ContextMatch[] = [];
    const domain = extractDomain(url);
    const allRules = this.getAllRules();

    for (const rule of allRules) {
      // Check URL patterns first (highest confidence)
      for (const pattern of rule.patterns) {
        const regex = patternToRegex(pattern);
        if (regex.test(url)) {
          matches.push({
            clientId: rule.clientId,
            reason: `URL matches pattern: ${pattern}`,
            confidence: 'high',
            matchedPattern: pattern,
          });
          break; // Only add one match per rule
        }
      }

      // If no pattern match, check domain hints (medium confidence)
      if (!matches.some(m => m.clientId === rule.clientId)) {
        for (const hint of rule.domainHints) {
          if (domain.includes(hint.toLowerCase())) {
            matches.push({
              clientId: rule.clientId,
              reason: `Domain contains "${hint}"`,
              confidence: 'medium',
              matchedHint: hint,
            });
            break;
          }
        }
      }

      // If still no match and content provided, check content hints (low confidence)
      if (!matches.some(m => m.clientId === rule.clientId) && content && rule.contentHints) {
        const contentLower = content.toLowerCase();
        for (const hint of rule.contentHints) {
          if (contentLower.includes(hint.toLowerCase())) {
            matches.push({
              clientId: rule.clientId,
              reason: `Page content contains "${hint}"`,
              confidence: 'low',
              matchedHint: hint,
            });
            break;
          }
        }
      }
    }

    // Cache the result
    this.cache.set(cacheKey, matches);
    setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

    return matches;
  }

  /**
   * Get client IDs that should be suggested for a given context
   * Only returns clients that are actually registered and configured
   */
  async getSuggestedClients(url: string, content?: string): Promise<ContextMatch[]> {
    const matches = this.detectContext(url, content);

    // Filter to only clients that exist
    // Note: We check configuration status in toolSessionManager
    return matches;
  }

  /**
   * Check if a specific client should be suggested for a URL
   */
  isClientSuggestedFor(clientId: string, url: string, content?: string): boolean {
    const matches = this.detectContext(url, content);
    return matches.some(m => m.clientId === clientId);
  }

  /**
   * Get the reason why a client was suggested
   */
  getSuggestionReason(clientId: string, url: string, content?: string): string | undefined {
    const matches = this.detectContext(url, content);
    const match = matches.find(m => m.clientId === clientId);
    return match?.reason;
  }

  /**
   * Get friendly display text for a context match
   */
  getDisplayReason(match: ContextMatch): string {
    switch (match.confidence) {
      case 'high':
        return `Detected: on ${match.clientId.charAt(0).toUpperCase() + match.clientId.slice(1)} page`;
      case 'medium':
        return `Suggested: ${match.matchedHint} detected in URL`;
      case 'low':
        return `Suggested: ${match.matchedHint} found in page content`;
      default:
        return match.reason;
    }
  }
}

// Export singleton instance
export const contextDetector = new ContextDetectorClass();

// Also export the class for testing
export { ContextDetectorClass };
