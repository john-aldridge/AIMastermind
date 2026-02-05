/**
 * ActionNode - Generic action block component
 */

import { memo, CSSProperties, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FlowNodeData } from '../AgentFlowParser';
import { CATEGORY_COLORS } from '../flowStyles';

interface ActionNodeProps {
  data: FlowNodeData;
  selected?: boolean;
}

export const ActionNode = memo(({ data, selected }: ActionNodeProps) => {
  const colors = CATEGORY_COLORS[data.category] || CATEGORY_COLORS.data;
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const hasErrors = data.errors && data.errors.length > 0;

  // Get summary info based on action type
  const getSummary = () => {
    const config = data.config;
    switch (data.actionType) {
      case 'querySelector':
      case 'querySelectorAll':
        return config.selector;
      case 'click':
      case 'remove':
        return config.target;
      case 'wait':
        return `${config.ms}ms`;
      case 'waitFor':
        return config.selector;
      case 'setValue':
        return config.value?.substring(0, 20);
      case 'notify':
        return config.title;
      case 'callClient':
        return `${config.client}.${config.method}`;
      case 'set':
        return `${config.variable} = ${JSON.stringify(config.value)?.substring(0, 15)}`;
      case 'executeScript':
        return config.script?.substring(0, 30) + '...';
      default:
        return null;
    }
  };

  const summary = getSummary();

  return (
    <div
      className={`
        px-3 py-2 rounded-lg shadow-md border-2 min-w-[160px] max-w-[220px] transition-all relative
        ${selected ? 'ring-2 ring-offset-2' : ''}
        ${hasErrors ? 'border-red-500' : ''}
      `}
      style={{
        backgroundColor: colors.bg,
        borderColor: hasErrors ? '#ef4444' : colors.border,
        '--tw-ring-color': colors.border,
      } as CSSProperties}
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
        className="!w-3 !h-3 !bg-white !border-2"
        style={{ borderColor: colors.border }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{data.icon}</span>
        <span
          className="font-semibold text-sm"
          style={{ color: colors.text }}
        >
          {data.actionType}
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <div
          className="text-xs opacity-90 truncate font-mono"
          style={{ color: colors.text }}
          title={summary}
        >
          {summary}
        </div>
      )}

      {/* Variables */}
      <div className="flex flex-wrap gap-1 mt-2">
        {/* Inputs */}
        {data.inputs.map((input: string) => (
          <span
            key={input}
            className="text-xs px-1.5 py-0.5 rounded bg-white/20 font-mono"
            style={{ color: colors.text }}
            title={`Input: ${input}`}
          >
            {`{{${input}}}`}
          </span>
        ))}

        {/* Outputs */}
        {data.outputs.map((output: string) => (
          <span
            key={output}
            className="text-xs px-1.5 py-0.5 rounded bg-black/20 font-mono"
            style={{ color: colors.text }}
            title={`Output: ${output}`}
          >
            {`→ ${output}`}
          </span>
        ))}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="!w-3 !h-3 !bg-white !border-2"
        style={{ borderColor: colors.border }}
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
