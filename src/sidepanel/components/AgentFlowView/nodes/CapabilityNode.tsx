/**
 * CapabilityNode - Entry point node for a capability
 */

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FlowNodeData } from '../AgentFlowParser';
import { CATEGORY_COLORS } from '../flowStyles';

interface CapabilityNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

export const CapabilityNode = memo(({ data, selected }: CapabilityNodeProps) => {
  const colors = CATEGORY_COLORS.entry;
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const hasErrors = data.errors && data.errors.length > 0;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg shadow-md border-2 min-w-[180px] transition-all relative
        ${selected ? 'ring-2 ring-offset-2 ring-purple-400' : ''}
      `}
      style={{
        backgroundColor: colors.bg,
        borderColor: hasErrors ? '#ef4444' : colors.border,
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
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{data.icon}</span>
        <span className="font-bold text-white text-sm uppercase tracking-wide">
          Capability
        </span>
      </div>

      {/* Capability Name */}
      <div className="text-white font-semibold text-base mb-1">
        {data.label}
      </div>

      {/* Description */}
      {data.config.description && (
        <div className="text-purple-200 text-xs line-clamp-2">
          {data.config.description}
        </div>
      )}

      {/* Parameters */}
      {data.inputs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-purple-400/30">
          <div className="text-purple-200 text-xs">
            Parameters: {data.inputs.join(', ')}
          </div>
        </div>
      )}

      {/* Trigger Info */}
      {data.config.trigger && (
        <div className="mt-1">
          <span className="text-xs px-2 py-0.5 bg-purple-700/50 rounded text-purple-100">
            {data.config.trigger.type}
          </span>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="!w-3 !h-3 !bg-white !border-2 !border-purple-600"
      />
    </div>
  );
});

CapabilityNode.displayName = 'CapabilityNode';
