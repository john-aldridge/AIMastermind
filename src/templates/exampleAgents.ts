/**
 * Example Agents
 *
 * Read-only example agents that users can view and clone.
 * These are JSON config-based agents that demonstrate the config architecture.
 */

import overlayRemoverConfig from './examples/overlay-remover.json';
import overlayRemoverReadme from './examples/overlay-remover.md?raw';
import priceExtractorConfig from './examples/price-extractor.json';
import priceExtractorReadme from './examples/price-extractor.md?raw';
import pageCleanerConfig from './examples/page-cleaner.json';
import pageCleanerReadme from './examples/page-cleaner.md?raw';
import pageCleanerAdvancedConfig from './examples/page-cleaner-advanced.json';
import pageCleanerAdvancedReadme from './examples/page-cleaner-advanced.md?raw';

export interface ExampleAgent {
  id: string;
  name: string;
  description: string;
  tags: string[];
  code: string;
  readme: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const EXAMPLE_AGENTS: ExampleAgent[] = [
  {
    id: 'overlay-remover',
    name: 'Overlay Remover',
    description: 'Remove modal overlays from web pages using config-based agent',
    tags: ['dom-manipulation', 'config-based', 'declarative'],
    difficulty: 'beginner',
    code: JSON.stringify(overlayRemoverConfig, null, 2),
    readme: overlayRemoverReadme,
  },
  {
    id: 'price-extractor',
    name: 'Price Extractor',
    description: 'Extract product prices from e-commerce sites using JavaScript snippets',
    tags: ['scraping', 'javascript', 'e-commerce'],
    difficulty: 'intermediate',
    code: JSON.stringify(priceExtractorConfig, null, 2),
    readme: priceExtractorReadme,
  },
  {
    id: 'page-cleaner',
    name: 'Page Cleaner & Translator',
    description: 'Remove overlays, blur effects, restore scroll, and translate to English',
    tags: ['dom-manipulation', 'translation', 'ux', 'productivity'],
    difficulty: 'intermediate',
    code: JSON.stringify(pageCleanerConfig, null, 2),
    readme: pageCleanerReadme,
  },
  {
    id: 'page-cleaner-advanced',
    name: 'Page Cleaner & Translator (Advanced)',
    description: 'Clean and translate with manual fallback control',
    tags: ['dom-manipulation', 'translation', 'advanced', 'manual-control'],
    difficulty: 'advanced',
    code: JSON.stringify(pageCleanerAdvancedConfig, null, 2),
    readme: pageCleanerAdvancedReadme,
  }
];

export function getExampleAgent(id: string): ExampleAgent | undefined {
  return EXAMPLE_AGENTS.find((agent) => agent.id === id);
}
