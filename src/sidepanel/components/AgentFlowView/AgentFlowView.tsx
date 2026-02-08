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
import { parseAgentConfig, applyLayout, type FlowNodeData, type FlowNode, type NodeAINote } from './AgentFlowParser';
import { convertFlowToConfig, validateFlow, createNewNode, type ValidationError } from './FlowToConfigConverter';
import { BlockPalette } from './BlockPalette';
import { BlockDetails } from './BlockDetails';
import { FlowToolbar } from './FlowToolbar';
import { CapabilityNode } from './nodes/CapabilityNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { LoopNode } from './nodes/LoopNode';
import { type BlockDefinition } from './blockDefinitions';
import { generateNodeNote, generateAllNodeNotes } from './nodeNoteGenerator';

// Custom node types - using 'any' to work around @xyflow/react's strict typing
const nodeTypes: NodeTypes = {
  capability: CapabilityNode as any,
  action: ActionNode as any,
  condition: ConditionNode as any,
  loop: LoopNode as any,
};

/**
 * Measure actual rendered heights of flow nodes from the DOM.
 * Falls back to NODE_DIMENSIONS.height for nodes not yet in the DOM.
 */
function measureNodeHeights(nodeIds: string[]): Map<string, number> {
  const heights = new Map<string, number>();
  for (const id of nodeIds) {
    const el = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`);
    if (el) {
      heights.set(id, el.offsetHeight);
    }
  }
  return heights;
}

interface AgentFlowViewProps {
  config: AgentConfig;
  onConfigChange: (config: AgentConfig) => void;
  onSave?: () => void;
  onValidationChange?: (errors: ValidationError[]) => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
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
  onValidationChange,
  onHasChangesChange,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // AI Notes state
  const [showNotes, setShowNotes] = useState(true);
  const [nodeNotes, setNodeNotes] = useState<Map<string, NodeAINote>>(new Map());
  const [regeneratingNodes, setRegeneratingNodes] = useState<Set<string>>(new Set());
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);
  // Store serialized initial state to compare against for change detection
  const savedStateHash = useRef<string>('');

  // Ref for React Flow wrapper (for drag and drop)
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Helper to create a hash of the current flow state
  const getStateHash = useCallback((n: Node[], e: Edge[]) => {
    return JSON.stringify({
      nodes: n.map(node => ({ id: node.id, type: node.type, data: node.data, position: node.position })),
      edges: e.map(edge => ({ id: edge.id, source: edge.source, target: edge.target }))
    });
  }, []);

  // Initialize flow from config
  useEffect(() => {
    const { nodes: parsedNodes, edges: parsedEdges } = parseAgentConfig(config);
    savedStateHash.current = getStateHash(parsedNodes as Node[], parsedEdges);
    setNodes(parsedNodes as Node[]);
    setEdges(parsedEdges);
    setHasChanges(false);

    // Initialize history
    setHistory([{ nodes: parsedNodes as Node[], edges: parsedEdges }]);
    setHistoryIndex(0);

    // Initialize notes from parsed nodes (if they have persisted notes)
    const initialNotes = new Map<string, NodeAINote>();
    let nodesWithoutNotes = 0;
    parsedNodes.forEach(node => {
      if (node.data.aiNote) {
        initialNotes.set(node.id, node.data.aiNote);
      } else {
        nodesWithoutNotes++;
      }
    });
    setNodeNotes(initialNotes);

    // Auto-generate notes for nodes that don't have them
    if (nodesWithoutNotes > 0 && parsedNodes.length > 0) {
      // Small delay to let the UI render first
      const timeoutId = setTimeout(() => {
        generateAllNodeNotes(
          parsedNodes as FlowNode[],
          parsedEdges,
          true, // Use own API key
          (completed, total) => {
            console.log(`Auto-generating notes: ${completed}/${total}`);
          }
        ).then(newNotes => {
          setNodeNotes(prev => {
            const merged = new Map(prev);
            newNotes.forEach((note, nodeId) => {
              // Only add notes for nodes that don't already have one
              if (!merged.has(nodeId)) {
                merged.set(nodeId, note);
              }
            });
            return merged;
          });

          // Update nodes with their new notes
          setNodes(nds =>
            nds.map(n => {
              const note = newNotes.get(n.id);
              if (note && !n.data.aiNote) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    aiNote: note,
                  },
                };
              }
              return n;
            })
          );
        }).catch(err => {
          console.error('Failed to auto-generate notes:', err);
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [JSON.stringify(config), getStateHash]); // Re-parse when agent changes or config is applied externally

  // Track changes and update history
  useEffect(() => {
    // Validate current flow (always, even on initial load)
    const errors = validateFlow(nodes as FlowNode[], edges);
    setValidationErrors(errors);

    if (isUndoRedo.current) {
      isUndoRedo.current = false;
      return;
    }

    // Compare current state to saved state to detect real changes
    const currentHash = getStateHash(nodes, edges);
    const hasRealChanges = currentHash !== savedStateHash.current;

    if (!hasRealChanges) {
      // State matches saved state - no unsaved changes
      if (hasChanges) {
        setHasChanges(false);
      }
      return;
    }

    // Only track meaningful changes
    if (nodes.length > 0 && !hasChanges) {
      setHasChanges(true);
    }

    // Add to history (truncate any redo states)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });

    // Keep history manageable
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, getStateHash]);

  // Notify parent of validation errors changes
  useEffect(() => {
    onValidationChange?.(validationErrors);
  }, [validationErrors, onValidationChange]);

  // Notify parent of hasChanges changes
  useEffect(() => {
    onHasChangesChange?.(hasChanges);
  }, [hasChanges, onHasChangesChange]);

  // Track last node configs to detect changes for auto-regeneration
  const lastNodeConfigs = useRef<Map<string, string>>(new Map());

  // Debounced auto-regeneration of notes when node config changes
  // Runs even when showNotes is off so notes are ready when toggled on
  useEffect(() => {
    // Find nodes whose config changed since last render
    const changedNodeIds: string[] = [];
    const newConfigMap = new Map<string, string>();

    nodes.forEach(node => {
      const configStr = JSON.stringify((node.data as FlowNodeData).config);
      newConfigMap.set(node.id, configStr);

      const lastConfig = lastNodeConfigs.current.get(node.id);
      if (lastConfig && lastConfig !== configStr) {
        changedNodeIds.push(node.id);
      }
    });

    lastNodeConfigs.current = newConfigMap;

    // Skip if no changes or if generating all notes
    if (changedNodeIds.length === 0 || isGeneratingNotes) return;

    // Debounce: wait 800ms before regenerating
    const timeoutId = setTimeout(() => {
      changedNodeIds.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId) as FlowNode | undefined;
        if (node && !regeneratingNodes.has(nodeId)) {
          handleRegenerateNote(nodeId);
        }
      });
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [nodes, isGeneratingNotes]);

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

  // Regenerate note for a single node (defined here for use in nodesWithData)
  const handleRegenerateNote = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId) as FlowNode | undefined;
    if (!node) return;

    setRegeneratingNodes(prev => new Set(prev).add(nodeId));

    try {
      const note = await generateNodeNote(node, nodes as FlowNode[], edges);
      setNodeNotes(prev => {
        const newNotes = new Map(prev);
        newNotes.set(nodeId, note);
        return newNotes;
      });

      // Also update the node's data with the note
      setNodes(nds =>
        nds.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                aiNote: note,
              },
            };
          }
          return n;
        })
      );
    } catch (error) {
      console.error('Failed to regenerate note:', error);
    } finally {
      setRegeneratingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    }
  }, [nodes, edges, setNodes]);

  // Nodes with error info and note data injected
  const nodesWithData = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        errors: nodeErrorsMap.get(node.id) || [],
        showNotes,
        aiNote: nodeNotes.get(node.id) || node.data.aiNote,
        isRegenerating: regeneratingNodes.has(node.id) ||
          (isGeneratingNotes && !nodeNotes.has(node.id) && !node.data.aiNote),
        onRegenerateNote: () => handleRegenerateNote(node.id),
      },
    }));
  }, [nodes, nodeErrorsMap, showNotes, nodeNotes, regeneratingNodes, isGeneratingNotes, handleRegenerateNote]);

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
      // Update saved state hash so current state is now considered "saved"
      savedStateHash.current = getStateHash(nodes, edges);
      setHasChanges(false);

      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to save flow:', err);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, config, onConfigChange, onSave, validationErrors, getStateHash]);

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


  // Generate notes for all nodes
  const handleGenerateAllNotes = useCallback(async () => {
    setIsGeneratingNotes(true);

    try {
      const newNotes = await generateAllNodeNotes(
        nodes as FlowNode[],
        edges,
        true,
        (completed, total) => {
          console.log(`Generated ${completed}/${total} notes`);
        }
      );

      setNodeNotes(newNotes);

      // Also update all nodes' data with their notes
      setNodes(nds =>
        nds.map(n => {
          const note = newNotes.get(n.id);
          if (note) {
            return {
              ...n,
              data: {
                ...n.data,
                aiNote: note,
              },
            };
          }
          return n;
        })
      );
    } catch (error) {
      console.error('Failed to generate all notes:', error);
    } finally {
      setIsGeneratingNotes(false);
    }
  }, [nodes, edges, setNodes]);

  // Auto-layout nodes using dagre
  const handleAutoLayout = useCallback(() => {
    // Filter out data flow edges (animated) for layout calculation
    const executionEdges = edges.filter(e => !e.animated);

    // Measure actual rendered node heights from the DOM
    const nodeHeights = measureNodeHeights(nodes.map(n => n.id));

    // Apply dagre layout with measured heights
    const layoutedNodes = applyLayout(nodes as FlowNode[], executionEdges, nodeHeights);

    // Update nodes with new positions
    setNodes(layoutedNodes as Node[]);
  }, [nodes, edges, setNodes]);

  // Re-layout after notes change so expanded nodes don't overlap.
  // We serialize the note content hashes to detect actual content changes
  // (not just Map identity), including single-node regenerations.
  const notesContentKey = useMemo(() => {
    const parts: string[] = [];
    nodeNotes.forEach((note, id) => {
      parts.push(`${id}:${note.configHash || ''}`);
    });
    return parts.sort().join('|');
  }, [nodeNotes]);

  const prevNotesKey = useRef('');
  useEffect(() => {
    // Skip initial empty state and no-change cases
    if (!notesContentKey || notesContentKey === prevNotesKey.current || nodes.length === 0) {
      prevNotesKey.current = notesContentKey;
      return;
    }
    prevNotesKey.current = notesContentKey;

    // Let the DOM render the note content first, then measure actual heights
    const timerId = setTimeout(() => {
      const executionEdges = edges.filter(e => !e.animated);
      const nodeHeights = measureNodeHeights(nodes.map(n => n.id));

      if (nodeHeights.size > 0) {
        const layoutedNodes = applyLayout(nodes as FlowNode[], executionEdges, nodeHeights);
        setNodes(layoutedNodes as Node[]);
      }
    }, 150);
    return () => clearTimeout(timerId);
  }, [notesContentKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
            nodes={nodesWithData}
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
        showNotes={showNotes}
        onToggleNotes={() => setShowNotes(!showNotes)}
        onGenerateNotes={handleGenerateAllNotes}
        isGeneratingNotes={isGeneratingNotes}
        onAutoLayout={handleAutoLayout}
      />
    </div>
  );
};

// Wrap with ReactFlowProvider
export const AgentFlowView: React.FC<AgentFlowViewProps> = (props) => (
  <ReactFlowProvider>
    <AgentFlowViewInner {...props} />
  </ReactFlowProvider>
);
