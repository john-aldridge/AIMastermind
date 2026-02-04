/**
 * Settings service for managing extension settings
 *
 * Handles settings for JavaScript execution in configs and other user preferences.
 */

import { AgentConfig } from '../types/agentConfig';
import { ClientConfig } from '../types/clientConfig';

/**
 * Extension settings interface
 */
export interface ExtensionSettings {
  // JavaScript execution controls
  allowJavaScriptInConfigs: boolean;        // Default: false
  warnBeforeExecutingJS: boolean;           // Default: true
  showJSSnippetsBeforeExecution: boolean;   // Default: true

  // Safe mode controls
  strictSafeMode: boolean;                  // Default: false - When true, only 'safe' mode agents allowed
  allowLLMAssistedAgents: boolean;          // Default: true - Allow llm-assisted mode agents

  // Other settings can be added here
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: ExtensionSettings = {
  allowJavaScriptInConfigs: false,
  warnBeforeExecutingJS: true,
  showJSSnippetsBeforeExecution: true,
  strictSafeMode: false,
  allowLLMAssistedAgents: true,
};

/**
 * Settings storage key
 */
const SETTINGS_KEY = 'extension_settings';

/**
 * Service for managing extension settings
 */
export class SettingsService {
  /**
   * Get current settings
   */
  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(SETTINGS_KEY);
      return {
        ...DEFAULT_SETTINGS,
        ...(result[SETTINGS_KEY] || {}),
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Update settings (partial update)
   */
  static async updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings,
      };
      await chrome.storage.local.set({ [SETTINGS_KEY]: updatedSettings });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  static async resetSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }

  /**
   * Check if an agent config can be executed based on its mode and settings
   */
  static async canExecuteAgentConfig(config: AgentConfig): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const settings = await this.getSettings();
    const mode = config.mode || 'unrestricted'; // Default to unrestricted for backward compat

    // If strict safe mode is enabled, only allow 'safe' mode agents
    if (settings.strictSafeMode && mode !== 'safe') {
      return {
        allowed: false,
        reason: `Strict safe mode is enabled. Only 'safe' mode agents are allowed. This agent uses '${mode}' mode.`,
      };
    }

    // Check LLM-assisted agents
    if (mode === 'llm-assisted' && !settings.allowLLMAssistedAgents) {
      return {
        allowed: false,
        reason: 'LLM-assisted agents are disabled in settings. Enable them to run this agent.',
      };
    }

    // Check if 'safe' mode agent contains JavaScript (shouldn't, but validate)
    if (mode === 'safe' && config.containsJavaScript) {
      return {
        allowed: false,
        reason: 'Safe mode agents cannot contain JavaScript. This agent is misconfigured.',
      };
    }

    // For unrestricted mode or if config contains JavaScript, check JS settings
    if (mode === 'unrestricted' || config.containsJavaScript) {
      if (config.containsJavaScript && !settings.allowJavaScriptInConfigs) {
        return {
          allowed: false,
          reason: 'JavaScript execution is disabled in settings. Enable it in Settings to run this agent.',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if a client config can be executed
   */
  static async canExecuteClientConfig(config: ClientConfig): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const settings = await this.getSettings();

    // Check if config contains JavaScript
    if (config.containsJavaScript) {
      if (!settings.allowJavaScriptInConfigs) {
        return {
          allowed: false,
          reason: 'JavaScript execution is disabled in settings. Enable it in Settings to run this client.',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if JS review dialog should be shown
   */
  static async shouldShowJSReview(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.showJSSnippetsBeforeExecution && settings.allowJavaScriptInConfigs;
  }
}
