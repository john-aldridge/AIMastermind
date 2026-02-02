/**
 * CSS Extractor
 * Extracts all CSS code from the current page
 * - Inline styles from <style> tags
 * - External stylesheets from <link rel="stylesheet">
 */

export interface CSSSource {
  type: 'inline' | 'external';
  url?: string;
  content: string;
  size: number;
  location?: string;
}

export class CSSExtractor {
  private maxStyleSize = 500000; // 500KB max per stylesheet
  private maxTotalSize = 2000000; // 2MB total max

  async extractAllCSS(): Promise<CSSSource[]> {
    const styles: CSSSource[] = [];
    let totalSize = 0;

    console.log('[CSSExtractor] Starting extraction...');

    // 1. Extract inline styles
    const inlineStyles = document.querySelectorAll('style');
    inlineStyles.forEach((style, index) => {
      const content = style.textContent || style.innerHTML || '';
      if (content.trim()) {
        const size = content.length;
        if (totalSize + size > this.maxTotalSize) {
          console.log('[CSSExtractor] Max total size reached, skipping remaining styles');
          return;
        }

        const location = style.closest('head') ? 'head' : 'body';
        styles.push({
          type: 'inline',
          content: size > this.maxStyleSize
            ? content.substring(0, this.maxStyleSize) + '\n\n[... truncated, stylesheet too large]'
            : content,
          size,
          location: `${location} > inline style #${index + 1}`
        });
        totalSize += size;
      }
    });

    console.log(`[CSSExtractor] Found ${styles.length} inline styles`);

    // 2. Extract external stylesheets
    const externalStyles = document.querySelectorAll('link[rel="stylesheet"]');
    console.log(`[CSSExtractor] Found ${externalStyles.length} external stylesheets`);

    // Fetch external stylesheets in parallel
    const fetchPromises = Array.from(externalStyles).map(async (link) => {
      const href = (link as HTMLLinkElement).href;
      if (!href) return null;

      try {
        console.log(`[CSSExtractor] Fetching ${href}`);
        const response = await fetch(href);

        if (!response.ok) {
          console.warn(`[CSSExtractor] Failed to fetch ${href}: ${response.status}`);
          return {
            type: 'external' as const,
            url: href,
            content: `[Failed to fetch: ${response.status} ${response.statusText}]`,
            size: 0
          };
        }

        const content = await response.text();
        const size = content.length;

        if (totalSize + size > this.maxTotalSize) {
          console.log(`[CSSExtractor] Max total size would be exceeded, skipping ${href}`);
          return {
            type: 'external' as const,
            url: href,
            content: `[Skipped: would exceed max total size of ${this.maxTotalSize} bytes]`,
            size: 0
          };
        }

        totalSize += size;

        return {
          type: 'external' as const,
          url: href,
          content: size > this.maxStyleSize
            ? content.substring(0, this.maxStyleSize) + '\n\n[... truncated, stylesheet too large]'
            : content,
          size
        };
      } catch (error) {
        console.error(`[CSSExtractor] Error fetching ${href}:`, error);
        return {
          type: 'external' as const,
          url: href,
          content: `[Error fetching: ${error instanceof Error ? error.message : String(error)}]`,
          size: 0
        };
      }
    });

    const externalResults = await Promise.all(fetchPromises);
    styles.push(...externalResults.filter(s => s !== null) as CSSSource[]);

    console.log(`[CSSExtractor] Extracted ${styles.length} total stylesheets (${totalSize} bytes)`);

    return styles;
  }

  formatSummary(styles: CSSSource[]): string {
    if (styles.length === 0) {
      return 'No CSS found on page.';
    }

    let summary = `=== CSS Code Extracted from Page (${styles.length} stylesheets) ===\n\n`;

    // Inline styles
    const inlineStyles = styles.filter(s => s.type === 'inline');
    if (inlineStyles.length > 0) {
      summary += `== Inline Styles (${inlineStyles.length}) ==\n\n`;
      inlineStyles.forEach((style, index) => {
        summary += `--- Inline Style #${index + 1} (${style.location}) ---\n`;
        summary += `Size: ${style.size} bytes\n\n`;
        summary += style.content + '\n\n';
      });
    }

    // External stylesheets
    const externalStyles = styles.filter(s => s.type === 'external');
    if (externalStyles.length > 0) {
      summary += `== External Stylesheets (${externalStyles.length}) ==\n\n`;
      externalStyles.forEach((style, index) => {
        summary += `--- External Stylesheet #${index + 1}: ${style.url} ---\n`;
        summary += `Size: ${style.size} bytes\n\n`;
        summary += style.content + '\n\n';
      });
    }

    return summary;
  }
}

export const cssExtractor = new CSSExtractor();
