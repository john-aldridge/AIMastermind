/**
 * AgentFlowView - Main visual flow editor component
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { AgentConfig } from '../../../types/agentConfig';
import { parseAgentConfig, type FlowNodeData, type FlowNode } from './AgentFlowParser';
import { convertFlowToConfig, validateFlow, createNewNode, type ValidationError } from './FlowToConfigConverter';
import { BlockPalette } from './BlockPalette';
import { BlockDetails } from './BlockDetails';
import { FlowToolbar } from './FlowToolbar';
import { CapabilityNode } from './nodes/CapabilityNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { LoopNode } from './nodes/LoopNode';
import { type BlockDefinition } from './blockDefinitions';

// Custom node types - using 'any' to work around @xyflow/react's strict typing
const nodeTypes: NodeTypes = {
  capability: CapabilityNode as any,
  action: ActionNode as any,
  condition: ConditionNode as any,
  loop: LoopNode as any,
};

interface AgentFlowViewProps {
  config: AgentConfig;
  onConfigChange: (config: AgentConfig) => void;
  onSave?: () => void;
}

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const AgentFlowViewInner: React.FC<AgentFlowViewProps> = ({
  config,
  onConfigChange,
  onSave,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  const isInitialLoad = useRef(true);

  // Ref for React Flow wrapper (for drag and drop)
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Initialize flow from config
  useEffect(() => {
    isInitialLoad.current = true;
    const { nodes: parsedNodes, edges: parsedEdges } = parseAgentConfig(config);
    setNodes(parsedNodes as Node[]);
    setEdges(parsedEdges);
    setHasChanges(false);

    // Initialize history
    setHistory([{ nodes: parsedNodes as Node[], edges: parsedEdges }]);
    setHistoryIndex(0);
  }, [config.id]); // Re-parse when agent changes

  // Track changes and update history
  useEffect(() => {
    // Validate current flow (always, even on initial load)
    const errors = validateFlow(nodes as FlowNode[], edges);
    setValidationErrors(errors);

    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    // Skip the initial load - don't mark as changed or add to history
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Only track meaningful changes
    if (nodes.length > 0) {
      setHasChanges(true);

      // Add to history (truncate any redo states)
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ nodes: [...nodes], edges: [...edges] });

      // Keep history manageable
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [nodes, edges]);

  // Get available variables for autocomplete
  const availableVariables = useMemo(() => {
    const vars = new Set<string>();
    nodes.forEach(node => {
      const data = node.data as FlowNodeData;
      data.outputs?.forEach((v: string) => vars.add(v));
    });
    return Array.from(vars);
  }, [nodes]);

  // Compute node errors map and nodes with error info
  const nodeErrorsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    validationErrors.forEach(error => {
      if (error.nodeId) {
        const existing = map.get(error.nodeId) || [];
        existing.push(error.message);
        map.set(error.nodeId, existing);
      }
    });
    return map;
  }, [validationErrors]);

  // Nodes with error info injected
  const nodesWithErrors = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        errors: nodeErrorsMap.get(node.id) || [],
      },
    }));
  }, [nodes, nodeErrorsMap]);

  // Handle edge connection
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node as FlowNode);
    },
    []
  );

  // Handle node update from details panel
  const handleUpdateNode = useCallback(
    (nodeId: string, data: Partial<FlowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...data },
            };
          }
          return node;
        })
      );

      // Update selected node if it's the one being edited
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) =>
          prev ? { ...prev, data: { ...prev.data, ...data } } : null
        );
      }
    },
    [setNodes, selectedNode]
  );

  // Handle node deletion
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  // Handle drag start from palette
  const onDragStart = useCallback(
    (event: React.DragEvent, blockDef: BlockDefinition) => {
      event.dataTransfer.setData('application/json', JSON.stringify(blockDef));
      event.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  // Handle drop on canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const dataStr = event.dataTransfer.getData('application/json');
      if (!dataStr) return;

      try {
        const blockDef: BlockDefinition = JSON.parse(dataStr);

        // Calculate position relative to flow
        const position = {
          x: event.clientX - reactFlowBounds.left - 100,
          y: event.clientY - reactFlowBounds.top - 40,
        };

        const newNode = createNewNode(blockDef.type, position, blockDef.defaultConfig);
        setNodes((nds) => [...nds, newNode as Node]);
      } catch (err) {
        console.error('Failed to parse dropped block:', err);
      }
    },
    [setNodes]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete selected node
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        if (!selectedNode.data.isCapabilityEntry) {
          handleDeleteNode(selectedNode.id);
        }
      }

      // Undo
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }

      // Redo
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        handleRedo();
      }

      // Save
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, historyIndex, history]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedo.current = true;
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedo.current = true;
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history, setNodes, setEdges]);

  // Save flow back to config
  const handleSave = useCallback(async () => {
    if (validationErrors.length > 0) return;

    setIsSaving(true);
    try {
      const updatedConfig = convertFlowToConfig(nodes as FlowNode[], edges, config);
      onConfigChange(updatedConfig);
      setHasChanges(false);

      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to save flow:', err);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, config, onConfigChange, onSave, validationErrors]);

  // Add new capability
  const handleAddCapability = useCallback(() => {
    const maxY = nodes.length > 0
      ? Math.max(...nodes.map(n => n.position?.y ?? 0)) + 200
      : 100;

    const newCapabilityNode: FlowNode = {
      id: `capability_${Date.now()}`,
      type: 'capability',
      position: { x: 100, y: maxY },
      data: {
        actionType: 'capability',
        category: 'entry',
        label: 'new_capability',
        icon: '📥',
        inputs: [],
        outputs: [],
        config: {
          name: 'new_capability',
          description: 'A new capability',
          parameters: [],
          trigger: { type: 'manual' },
        },
        capabilityName: 'new_capability',
        isCapabilityEntry: true,
      },
    };

    setNodes((nds) => [...nds, newCapabilityNode as Node]);
  }, [nodes, setNodes]);

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="flex-1 flex overflow-hidden">
        {/* Block Palette */}
        <BlockPalette
          onDragStart={onDragStart}
          isCollapsed={isPaletteCollapsed}
          onToggleCollapse={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
        />

        {/* Flow Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodesWithErrors}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { strokeWidth: 2, stroke: '#64748b' },
            }}
            connectionLineStyle={{ strokeWidth: 2, stroke: '#64748b' }}
            deleteKeyCode={null} // We handle delete manually
            className="bg-gray-50"
          >
            <Background gap={20} color="#e5e7eb" />
            <Controls position="bottom-left" />
          </ReactFlow>
        </div>

        {/* Block Details Panel */}
        <BlockDetails
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          availableVariables={availableVariables}
          isCollapsed={isDetailsCollapsed}
          onToggleCollapse={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
        />
      </div>

      {/* Toolbar */}
      <FlowToolbar
        onSave={handleSave}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        hasChanges={hasChanges}
        isSaving={isSaving}
        validationErrors={validationErrors}
        onAddCapability={handleAddCapability}
      />
    </div>
  );
};

// Wrap with ReactFlowProvider
export const AgentFlowView: React.FC<AgentFlowViewProps> = (props) => {
  return (
    <ReactFlowProvider>
      <AgentFlowViewInner {...props} />
    </ReactFlowProvider>
  );
};
