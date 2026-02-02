/**
 * JavaScript Extractor
 * Extracts all JavaScript code from the current page
 * - Inline scripts from <script> tags
 * - External scripts from <script src="...">
 * - Dynamically loaded scripts
 */

export interface JavaScriptSource {
  type: 'inline' | 'external';
  url?: string;
  content: string;
  size: number;
  location?: string; // Where in the page (head, body, etc)
}

export class JavaScriptExtractor {
  private maxScriptSize = 500000; // 500KB max per script
  private maxTotalSize = 2000000; // 2MB total max

  async extractAllJavaScript(): Promise<JavaScriptSource[]> {
    const scripts: JavaScriptSource[] = [];
    let totalSize = 0;

    console.log('[JavaScriptExtractor] Starting extraction...');

    // 1. Extract inline scripts
    const inlineScripts = document.querySelectorAll('script:not([src])');
    inlineScripts.forEach((script, index) => {
      const content = script.textContent || script.innerHTML || '';
      if (content.trim()) {
        const size = content.length;
        if (totalSize + size > this.maxTotalSize) {
          console.log('[JavaScriptExtractor] Max total size reached, skipping remaining scripts');
          return;
        }

        const location = script.closest('head') ? 'head' : 'body';
        scripts.push({
          type: 'inline',
          content: size > this.maxScriptSize
            ? content.substring(0, this.maxScriptSize) + '\n\n[... truncated, script too large]'
            : content,
          size,
          location: `${location} > inline script #${index + 1}`
        });
        totalSize += size;
      }
    });

    console.log(`[JavaScriptExtractor] Found ${scripts.length} inline scripts`);

    // 2. Extract external scripts
    const externalScripts = document.querySelectorAll('script[src]');
    console.log(`[JavaScriptExtractor] Found ${externalScripts.length} external scripts`);

    // Fetch external scripts in parallel (with limit)
    const fetchPromises = Array.from(externalScripts).map(async (script) => {
      const src = (script as HTMLScriptElement).src;
      if (!src) return null;

      try {
        console.log(`[JavaScriptExtractor] Fetching ${src}`);
        const response = await fetch(src);

        if (!response.ok) {
          console.warn(`[JavaScriptExtractor] Failed to fetch ${src}: ${response.status}`);
          return {
            type: 'external' as const,
            url: src,
            content: `[Failed to fetch: ${response.status} ${response.statusText}]`,
            size: 0
          };
        }

        const content = await response.text();
        const size = content.length;

        if (totalSize + size > this.maxTotalSize) {
          console.log(`[JavaScriptExtractor] Max total size would be exceeded, skipping ${src}`);
          return {
            type: 'external' as const,
            url: src,
            content: `[Skipped: would exceed max total size of ${this.maxTotalSize} bytes]`,
            size: 0
          };
        }

        totalSize += size;

        return {
          type: 'external' as const,
          url: src,
          content: size > this.maxScriptSize
            ? content.substring(0, this.maxScriptSize) + '\n\n[... truncated, script too large]'
            : content,
          size
        };
      } catch (error) {
        console.error(`[JavaScriptExtractor] Error fetching ${src}:`, error);
        return {
          type: 'external' as const,
          url: src,
          content: `[Error fetching: ${error instanceof Error ? error.message : String(error)}]`,
          size: 0
        };
      }
    });

    const externalResults = await Promise.all(fetchPromises);
    scripts.push(...externalResults.filter(s => s !== null) as JavaScriptSource[]);

    console.log(`[JavaScriptExtractor] Extracted ${scripts.length} total scripts (${totalSize} bytes)`);

    return scripts;
  }

  formatSummary(scripts: JavaScriptSource[]): string {
    if (scripts.length === 0) {
      return 'No JavaScript found on page.';
    }

    let summary = `=== JavaScript Code Extracted from Page (${scripts.length} scripts) ===\n\n`;

    // Inline scripts
    const inlineScripts = scripts.filter(s => s.type === 'inline');
    if (inlineScripts.length > 0) {
      summary += `== Inline Scripts (${inlineScripts.length}) ==\n\n`;
      inlineScripts.forEach((script, index) => {
        summary += `--- Inline Script #${index + 1} (${script.location}) ---\n`;
        summary += `Size: ${script.size} bytes\n\n`;
        summary += script.content + '\n\n';
      });
    }

    // External scripts
    const externalScripts = scripts.filter(s => s.type === 'external');
    if (externalScripts.length > 0) {
      summary += `== External Scripts (${externalScripts.length}) ==\n\n`;
      externalScripts.forEach((script, index) => {
        summary += `--- External Script #${index + 1}: ${script.url} ---\n`;
        summary += `Size: ${script.size} bytes\n\n`;
        summary += script.content + '\n\n';
      });
    }

    return summary;
  }
}

export const javascriptExtractor = new JavaScriptExtractor();
