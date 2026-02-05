/**
 * LoopNode - Container node for forEach/while loops
 */

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FlowNodeData } from '../AgentFlowParser';
import { CATEGORY_COLORS } from '../flowStyles';

interface LoopNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

export const LoopNode = memo(({ data, selected }: LoopNodeProps) => {
  const colors = CATEGORY_COLORS.control;
  const isForEach = data.actionType === 'forEach';
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const hasErrors = data.errors && data.errors.length > 0;

  // Get loop summary
  const getLoopSummary = () => {
    const config = data.config;
    if (isForEach) {
      return `${config.itemAs || 'item'} in ${config.source || 'items'}`;
    } else {
      // while loop
      const condition = config.condition;
      if (!condition) return 'condition';
      return condition.type === 'exists'
        ? `while ${condition.target} exists`
        : `while ${condition.type}`;
    }
  };

  return (
    <div
      className={`
        px-4 py-3 rounded-xl shadow-md border-2 min-w-[180px] transition-all relative
        ${selected ? 'ring-2 ring-offset-2 ring-orange-400' : ''}
      `}
      style={{
        backgroundColor: colors.bg,
        borderColor: hasErrors ? '#ef4444' : colors.border,
        borderStyle: 'dashed',
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
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="!w-3 !h-3 !bg-white !border-2 !border-orange-600"
      />

      {/* Loop-back Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="loop"
        className="!w-3 !h-3 !bg-orange-300 !border-2 !border-orange-600"
        style={{ top: '70%' }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{data.icon}</span>
        <span className="font-bold text-white text-sm uppercase tracking-wide">
          {isForEach ? 'For Each' : 'While'}
        </span>
      </div>

      {/* Loop Info */}
      <div className="text-white font-mono text-sm mb-2">
        {getLoopSummary()}
      </div>

      {/* Max Iterations (for while) */}
      {!isForEach && data.config.maxIterations && (
        <div className="text-orange-200 text-xs">
          max: {data.config.maxIterations} iterations
        </div>
      )}

      {/* Loop Body Indicator */}
      <div className="mt-3 pt-2 border-t border-orange-400/30">
        <div className="text-orange-200 text-xs flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Loop body below
        </div>
      </div>

      {/* Body Handle (output to loop body) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="body"
        className="!w-3 !h-3 !bg-orange-300 !border-2 !border-orange-600"
      />

      {/* Continue Handle (output after loop) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="!w-3 !h-3 !bg-white !border-2 !border-orange-600"
        style={{ top: '30%' }}
      />

      {/* Labels */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-orange-600 font-medium">
        body
      </div>
      <div className="absolute -right-12 top-[30%] -translate-y-1/2 text-xs text-gray-500 font-medium">
        next
      </div>
    </div>
  );
});

LoopNode.displayName = 'LoopNode';
