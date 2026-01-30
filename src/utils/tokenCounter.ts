/**
 * Token counting utilities
 * Estimates token usage for API calls and tracks daily limits
 */

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export class TokenCounter {
  private static CHARS_PER_TOKEN = 4; // Rough estimate

  /**
   * Estimate tokens in a text string
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Calculate token usage for a request/response pair
   */
  static calculateUsage(prompt: string, completion: string): TokenUsage {
    const promptTokens = this.estimateTokens(prompt);
    const completionTokens = this.estimateTokens(completion);

    return {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens,
    };
  }

  /**
   * Check if user has enough tokens
   */
  static hasEnoughTokens(available: number, required: number): boolean {
    return available >= required;
  }

  /**
   * Calculate cost in tokens for an estimated response
   */
  static estimateCost(prompt: string, expectedCompletionLength: number = 500): number {
    const promptTokens = this.estimateTokens(prompt);
    const completionTokens = Math.ceil(expectedCompletionLength / this.CHARS_PER_TOKEN);
    return promptTokens + completionTokens;
  }

  /**
   * Check if daily usage should reset
   */
  static shouldResetDailyUsage(lastResetDate: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return lastResetDate !== today;
  }

  /**
   * Format token count for display
   */
  static formatTokenCount(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }
}
