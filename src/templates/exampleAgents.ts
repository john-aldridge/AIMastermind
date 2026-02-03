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
  }
];

export function getExampleAgent(id: string): ExampleAgent | undefined {
  return EXAMPLE_AGENTS.find((agent) => agent.id === id);
}
