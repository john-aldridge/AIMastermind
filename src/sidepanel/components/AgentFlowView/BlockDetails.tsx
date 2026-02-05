/**
 * BlockDetails - Property editor panel for selected block
 */

import React, { useState, useEffect } from 'react';
import type { FlowNodeData, FlowNode } from './AgentFlowParser';
import { getBlockDefinition, type BlockField } from './blockDefinitions';
import { CATEGORY_COLORS, getIconForAction } from './flowStyles';

interface BlockDetailsProps {
  selectedNode: FlowNode | null;
  onUpdateNode: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  availableVariables: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const BlockDetails: React.FC<BlockDetailsProps> = ({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  availableVariables,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});

  // Sync local config when selected node changes
  useEffect(() => {
    if (selectedNode) {
      setLocalConfig({ ...selectedNode.data.config });
    } else {
      setLocalConfig({});
    }
  }, [selectedNode?.id, selectedNode?.data.config]);

  const handleFieldChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
  };

  const handleApply = () => {
    if (!selectedNode) return;

    // Parse JSON fields
    const processedConfig = { ...localConfig };
    const blockDef = getBlockDefinition(selectedNode.data.actionType);

    if (blockDef) {
      blockDef.fields.forEach(field => {
        if (field.type === 'json' && typeof processedConfig[field.key] === 'string') {
          try {
            processedConfig[field.key] = JSON.parse(processedConfig[field.key]);
          } catch {
            // Keep as string if invalid JSON
          }
        }
        if (field.type === 'number' && typeof processedConfig[field.key] === 'string') {
          processedConfig[field.key] = Number(processedConfig[field.key]);
        }
      });
    }

    // Update inputs/outputs based on config
    const inputs: string[] = [];
    const outputs: string[] = [];

    // Extract variable references
    const configStr = JSON.stringify(processedConfig);
    const matches = configStr.match(/\{\{(\w+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const varName = match.replace(/\{\{|\}\}/g, '');
        if (!inputs.includes(varName)) inputs.push(varName);
      });
    }

    // Extract outputs
    if (processedConfig.saveAs) outputs.push(processedConfig.saveAs);
    if (processedConfig.itemAs) outputs.push(processedConfig.itemAs);
    if (processedConfig.variable && selectedNode.data.actionType === 'set') {
      outputs.push(processedConfig.variable);
    }

    onUpdateNode(selectedNode.id, {
      config: processedConfig,
      inputs,
      outputs,
      label: getLabel(selectedNode.data.actionType, processedConfig),
    });
  };

  const getLabel = (actionType: string, config: Record<string, any>): string => {
    switch (actionType) {
      case 'querySelector':
      case 'querySelectorAll':
        return config.selector?.substring(0, 30) || actionType;
      case 'click':
      case 'remove':
        return `${actionType} ${config.target?.substring(0, 20) || ''}`;
      case 'wait':
        return `wait ${config.ms}ms`;
      case 'callClient':
        return `${config.client}.${config.method}`;
      default:
        return actionType;
    }
  };

  const renderField = (field: BlockField) => {
    const value = localConfig[field.key] ?? field.default ?? '';

    switch (field.type) {
      case 'text':
      case 'variable':
        return (
          <div key={field.key} className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {field.type === 'variable' && availableVariables.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {availableVariables.slice(0, 5).map(varName => (
                  <button
                    key={varName}
                    onClick={() => handleFieldChange(field.key, varName)}
                    className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                  >
                    {varName}
                  </button>
                ))}
              </div>
            )}
            {field.helpText && (
              <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        );

      case 'boolean':
        return (
          <div key={field.key} className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label className="text-xs font-medium text-gray-700">
              {field.label}
            </label>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select...</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'json':
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        return (
          <div key={field.key} className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={jsonValue}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono text-xs"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-10 bg-gray-100 border-l border-gray-200 flex flex-col items-center py-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Expand details"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="w-64 bg-gray-50 border-l border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <h3 className="font-semibold text-gray-900 text-sm">Properties</h3>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Collapse panel"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-gray-500 text-center">
            Select a block to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const blockDef = getBlockDefinition(selectedNode.data.actionType);
  const colors = CATEGORY_COLORS[selectedNode.data.category];
  const isCapabilityNode = selectedNode.data.isCapabilityEntry;

  return (
    <div className="w-64 bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Properties</h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Collapse panel"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Block Header */}
      <div
        className="p-3 border-b border-gray-200"
        style={{ backgroundColor: colors.light }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getIconForAction(selectedNode.data.actionType)}</span>
          <div>
            <div className="font-semibold text-sm" style={{ color: colors.bg }}>
              {selectedNode.data.actionType}
            </div>
            <div className="text-xs text-gray-500">
              {selectedNode.data.category}
            </div>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-3">
        {isCapabilityNode ? (
          // Capability node fields
          <div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={localConfig.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={localConfig.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Trigger Type</label>
              <select
                value={localConfig.trigger?.type || 'manual'}
                onChange={(e) => handleFieldChange('trigger', { ...localConfig.trigger, type: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="manual">Manual</option>
                <option value="page-load">Page Load</option>
                <option value="mutation">Mutation</option>
                <option value="interval">Interval</option>
                <option value="event">Event</option>
              </select>
            </div>
          </div>
        ) : blockDef ? (
          // Regular block fields from definition
          blockDef.fields.map(field => renderField(field))
        ) : (
          // Fallback: raw JSON editor
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Configuration (JSON)</label>
            <textarea
              value={JSON.stringify(localConfig, null, 2)}
              onChange={(e) => {
                try {
                  setLocalConfig(JSON.parse(e.target.value));
                } catch {
                  // Ignore invalid JSON while typing
                }
              }}
              rows={10}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-gray-200 bg-white space-y-2">
        <button
          onClick={handleApply}
          className="w-full px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors"
        >
          Apply Changes
        </button>
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="w-full px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded hover:bg-red-100 transition-colors"
        >
          {isCapabilityNode ? 'Delete Capability' : 'Delete Block'}
        </button>
      </div>
    </div>
  );
};
