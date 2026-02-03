import { AutoLoadRule, AutoLoadRuleStorage } from '../types/autoLoadRule';

const STORAGE_KEY = 'auto_load_rules';

export class AutoLoadRuleStorageService {
  /**
   * Get all auto-load rules
   */
  static async getAllRules(): Promise<AutoLoadRule[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const storage: AutoLoadRuleStorage = result[STORAGE_KEY] || { rules: [] };
    return storage.rules;
  }

  /**
   * Get a specific rule by ID
   */
  static async getRule(ruleId: string): Promise<AutoLoadRule | null> {
    const rules = await this.getAllRules();
    return rules.find((rule) => rule.id === ruleId) || null;
  }

  /**
   * Create a new auto-load rule
   */
  static async createRule(
    agentId: string,
    agentName: string,
    urlPattern: string,
    description?: string,
    executeOnLoad: boolean = false,
    watchForReloads: boolean = false,
    capabilityName?: string,
    reloadCapabilityName?: string,
    parameters?: Record<string, any>
  ): Promise<AutoLoadRule> {
    const rules = await this.getAllRules();

    const newRule: AutoLoadRule = {
      id: `rule-${Date.now()}`,
      agentId,
      agentName,
      urlPattern,
      status: 'active',
      executeOnLoad,
      watchForReloads,
      capabilityName,
      reloadCapabilityName,
      parameters,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      description,
    };

    rules.push(newRule);
    await this.saveRules(rules);

    return newRule;
  }

  /**
   * Update an existing rule
   */
  static async updateRule(
    ruleId: string,
    updates: Partial<Omit<AutoLoadRule, 'id' | 'createdAt'>>
  ): Promise<AutoLoadRule | null> {
    const rules = await this.getAllRules();
    const ruleIndex = rules.findIndex((rule) => rule.id === ruleId);

    if (ruleIndex === -1) {
      return null;
    }

    rules[ruleIndex] = {
      ...rules[ruleIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    await this.saveRules(rules);
    return rules[ruleIndex];
  }

  /**
   * Delete a rule
   */
  static async deleteRule(ruleId: string): Promise<boolean> {
    const rules = await this.getAllRules();
    const filteredRules = rules.filter((rule) => rule.id !== ruleId);

    if (filteredRules.length === rules.length) {
      return false; // Rule not found
    }

    await this.saveRules(filteredRules);
    return true;
  }

  /**
   * Toggle rule status (active/paused)
   */
  static async toggleRuleStatus(ruleId: string): Promise<AutoLoadRule | null> {
    const rule = await this.getRule(ruleId);
    if (!rule) return null;

    const newStatus = rule.status === 'active' ? 'paused' : 'active';
    return this.updateRule(ruleId, { status: newStatus });
  }

  /**
   * Get active rules that match a URL
   */
  static async getMatchingRules(url: string): Promise<AutoLoadRule[]> {
    const rules = await this.getAllRules();
    return rules.filter((rule) => {
      if (rule.status !== 'active') return false;
      return this.matchesPattern(url, rule.urlPattern);
    });
  }

  /**
   * Check if a URL matches a pattern
   * Supports wildcards: * for any characters
   * Example patterns:
   * - *://example.com/* matches any protocol on example.com
   * - https://example.com/path/* matches all paths under /path/
   * - *.example.com matches all subdomains
   */
  static matchesPattern(url: string, pattern: string): boolean {
    try {
      // Convert pattern to regex
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\*/g, '.*'); // Convert * to .*

      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(url);
    } catch (error) {
      console.error('Invalid pattern:', pattern, error);
      return false;
    }
  }

  /**
   * Save rules to storage
   */
  private static async saveRules(rules: AutoLoadRule[]): Promise<void> {
    const storage: AutoLoadRuleStorage = { rules };
    await chrome.storage.local.set({ [STORAGE_KEY]: storage });
  }

  /**
   * Test a pattern against a URL
   */
  static testPattern(url: string, pattern: string): boolean {
    return this.matchesPattern(url, pattern);
  }
}
