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

  // Other settings can be added here
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: ExtensionSettings = {
  allowJavaScriptInConfigs: false,
  warnBeforeExecutingJS: true,
  showJSSnippetsBeforeExecution: true,
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
   * Check if an agent config can be executed
   */
  static async canExecuteAgentConfig(config: AgentConfig): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const settings = await this.getSettings();

    // Check if config contains JavaScript
    if (config.containsJavaScript) {
      if (!settings.allowJavaScriptInConfigs) {
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
