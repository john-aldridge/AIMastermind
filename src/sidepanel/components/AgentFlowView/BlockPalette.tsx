/**
 * BlockPalette - Draggable sidebar with available blocks
 */

import React, { useState } from 'react';
import { BLOCK_PALETTE, type BlockDefinition } from './blockDefinitions';
import { CATEGORY_COLORS } from './flowStyles';

interface BlockPaletteProps {
  onDragStart: (event: React.DragEvent, blockDef: BlockDefinition) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const BlockPalette: React.FC<BlockPaletteProps> = ({
  onDragStart,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['DOM', 'Control'])
  );
  const [searchTerm, setSearchTerm] = useState('');

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredPalette = Object.entries(BLOCK_PALETTE).map(([category, blocks]) => ({
    category,
    blocks: blocks.filter(
      block =>
        block.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(({ blocks }) => blocks.length > 0);

  if (isCollapsed) {
    return (
      <div className="w-10 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Expand palette"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="mt-4 space-y-2">
          {Object.keys(BLOCK_PALETTE).map(category => (
            <div
              key={category}
              className="w-6 h-6 rounded flex items-center justify-center text-xs"
              style={{ backgroundColor: CATEGORY_COLORS[BLOCK_PALETTE[category as keyof typeof BLOCK_PALETTE][0].category].light }}
              title={category}
            >
              {category[0]}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
        <h3 className="font-semibold text-gray-900 text-sm">Blocks</h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Collapse palette"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-200 bg-white">
        <input
          type="text"
          placeholder="Search blocks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {filteredPalette.map(({ category, blocks }) => {
          const isExpanded = expandedCategories.has(category) || searchTerm.length > 0;
          const categoryColor = CATEGORY_COLORS[blocks[0].category];

          return (
            <div key={category} className="border-b border-gray-200 last:border-b-0">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: categoryColor.bg }}
                  />
                  <span className="font-medium text-sm text-gray-700">{category}</span>
                  <span className="text-xs text-gray-400">({blocks.length})</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Blocks */}
              {isExpanded && (
                <div className="pb-2 px-2 space-y-1">
                  {blocks.map((block) => (
                    <div
                      key={block.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, block)}
                      className="flex items-center gap-2 px-2 py-1.5 bg-white rounded border border-gray-200 cursor-grab hover:border-gray-300 hover:shadow-sm transition-all active:cursor-grabbing"
                      style={{
                        borderLeftWidth: '3px',
                        borderLeftColor: categoryColor.bg,
                      }}
                      title={block.description}
                    >
                      <span className="text-base">{block.icon}</span>
                      <span className="text-xs font-medium text-gray-700 flex-1 truncate">
                        {block.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="p-2 bg-gray-100 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Drag blocks to the canvas
        </p>
      </div>
    </div>
  );
};
