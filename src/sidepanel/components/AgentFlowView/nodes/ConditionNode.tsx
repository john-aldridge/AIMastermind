/**
 * ConditionNode - Diamond-shaped decision node for if/else
 */

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FlowNodeData } from '../AgentFlowParser';
import { CATEGORY_COLORS, NODE_DIMENSIONS } from '../flowStyles';
import { InfoTooltip } from './InfoTooltip';
import { getNodeDescription } from '../nodeDescriptions';

interface ConditionNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

// Inline note section component for ConditionNode
const NoteSection = memo(({
  note,
  isRegenerating,
  onRegenerate,
}: {
  note?: FlowNodeData['aiNote'];
  isRegenerating?: boolean;
  onRegenerate?: () => void;
}) => {
  const isLoading = note?.isLoading || isRegenerating;
  const colors = CATEGORY_COLORS.control;

  return (
    <div
      className="rounded-b-lg px-3 py-2 border-t-0"
      style={{
        backgroundColor: colors.bg,
        width: NODE_DIMENSIONS.width,
      }}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-white/80">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Generating...</span>
        </div>
      ) : note?.content ? (
        <div className="flex gap-1.5 items-start group">
          <span className="text-xs flex-shrink-0">💡</span>
          <p className="text-xs leading-relaxed flex-1 text-white opacity-90">
            {note.content}
          </p>
          {onRegenerate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-0.5 rounded text-white"
              title="Regenerate note"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="h-6" /> // Placeholder to maintain height
      )}
    </div>
  );
});

NoteSection.displayName = 'ConditionNoteSection';

export const ConditionNode = memo(({ data, selected }: ConditionNodeProps) => {
  const colors = CATEGORY_COLORS.control;
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const hasErrors = data.errors && data.errors.length > 0;
  const showNotes = data.showNotes !== false; // Default to true

  // Get condition summary
  const getConditionSummary = () => {
    const condition = data.config.condition;
    if (!condition) return 'condition';

    switch (condition.type) {
      case 'exists':
        return `${condition.target} exists`;
      case 'equals':
        return `${condition.left} == ${JSON.stringify(condition.right)}`;
      case 'greaterThan':
        return `${condition.left} > ${condition.right}`;
      case 'lessThan':
        return `${condition.left} < ${condition.right}`;
      case 'contains':
        return `${condition.source} contains ${JSON.stringify(condition.value)}`;
      case 'isEmpty':
        return `${condition.target} is empty`;
      case 'not':
        return `NOT (...)`;
      case 'and':
        return `AND (${condition.conditions?.length || 0} conditions)`;
      case 'or':
        return `OR (${condition.conditions?.length || 0} conditions)`;
      default:
        return condition.type;
    }
  };

  const diamondHeight = 100;

  return (
    <div
      className={`
        relative transition-all flex flex-col items-center
        ${selected ? 'ring-2 ring-offset-2 ring-orange-400' : ''}
      `}
      style={{
        width: NODE_DIMENSIONS.width,
        minHeight: NODE_DIMENSIONS.height,
      }}
    >
      {/* Error Indicator */}
      {hasErrors && (
        <div
          className="absolute -top-4 -right-4 z-10"
          onMouseEnter={() => setShowErrorTooltip(true)}
          onMouseLeave={() => setShowErrorTooltip(false)}
        >
          <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg cursor-help border-4 border-red-600">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          {showErrorTooltip && (
            <div className="absolute top-16 right-0 w-56 bg-red-50 border border-red-200 rounded-lg shadow-lg p-3 z-20">
              <div className="text-sm text-red-800 font-medium mb-1">Errors:</div>
              <ul className="text-sm text-red-700 space-y-1">
                {data.errors?.map((error, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Diamond shape container */}
      <div
        className="relative"
        style={{
          width: 180,
          height: diamondHeight,
        }}
      >
        <div
          className="w-full h-full"
          style={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            backgroundColor: hasErrors ? '#ef4444' : colors.bg,
          }}
        >
          {/* Inner content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="text-lg mb-1">{data.icon}</span>
            <span className="font-bold text-white text-xs uppercase">IF</span>
            <span className="text-white/80 text-xs truncate max-w-[120px]" title={getConditionSummary()}>
              {getConditionSummary()}
            </span>
          </div>
        </div>

        {/* Input Handle (top) */}
        <Handle
          type="target"
          position={Position.Top}
          id="target"
          className="!w-3 !h-3 !bg-white !border-2 !border-orange-600"
          style={{ top: -6 }}
        />

        {/* True/Yes Handle (left) */}
        <Handle
          type="source"
          position={Position.Left}
          id="true"
          className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-600"
          style={{ left: -6, top: '50%' }}
        />

        {/* False/No Handle (right) */}
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-600"
          style={{ right: -6, top: '50%' }}
        />

        {/* Labels for branches */}
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs font-bold text-green-600">
          Yes
        </div>
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-xs font-bold text-red-600">
          No
        </div>

        {/* Info tooltip */}
        <div className="absolute -top-2 -right-2">
          <InfoTooltip text={getNodeDescription('condition')} position="right" />
        </div>
      </div>

      {/* Integrated Note Section below diamond */}
      <NoteSection
        note={showNotes ? data.aiNote : undefined}
        isRegenerating={data.isRegenerating}
        onRegenerate={data.onRegenerateNote}
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
