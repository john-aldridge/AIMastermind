/**
 * AgentFlowParser - Converts AgentConfig to React Flow nodes and edges
 */

import type { Node, Edge } from '@xyflow/react';
import type { AgentConfig, CapabilityConfig, Action, IfAction, ForEachAction, WhileAction } from '../../../types/agentConfig';
import { getCategoryForAction, getIconForAction, CATEGORY_COLORS } from './flowStyles';
import { NODE_DIMENSIONS } from './flowStyles';
import dagre from 'dagre';

export interface NodeAINote {
  content: string;
  generatedAt: string;
  isLoading?: boolean;
  error?: string;
  configHash?: string;  // Hash of node config when note was generated
}

export interface FlowNodeData {
  actionType: string;
  category: keyof typeof CATEGORY_COLORS;
  label: string;
  icon: string;
  inputs: string[];
  outputs: string[];
  config: Record<string, any>;
  capabilityName?: string;
  isCapabilityEntry?: boolean;
  branchType?: 'then' | 'else';
  loopBody?: boolean;
  parentId?: string;
  errors?: string[]; // Validation errors for this node
  aiNote?: NodeAINote; // AI-generated note for this node
  showNotes?: boolean; // Whether to show the AI note section
  isRegenerating?: boolean; // Whether the note is being regenerated
  onRegenerateNote?: () => void; // Callback to regenerate the note
  [key: string]: unknown; // Index signature to satisfy Record<string, unknown>
}

export type FlowNode = Node<FlowNodeData>;

export interface ParsedFlow {
  nodes: FlowNode[];
  edges: Edge[];
}

// Helper to generate unique IDs
let nodeIdCounter = 0;
function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

function resetNodeIdCounter() {
  nodeIdCounter = 0;
}

// Extract variable references from action config
function extractInputVariables(action: Action): string[] {
  const inputs: string[] = [];
  const configStr = JSON.stringify(action);

  // Match {{variableName}} patterns
  const matches = configStr.match(/\{\{(\w+)\}\}/g);
  if (matches) {
    matches.forEach(match => {
      const varName = match.replace(/\{\{|\}\}/g, '');
      if (!inputs.includes(varName)) {
        inputs.push(varName);
      }
    });
  }

  // Also check source references in certain actions
  if ('source' in action && typeof (action as any).source === 'string') {
    const source = (action as any).source;
    if (!inputs.includes(source) && !source.includes('{{')) {
      inputs.push(source);
    }
  }

  if ('target' in action && typeof (action as any).target === 'string') {
    const target = (action as any).target;
    // Extract variable from target if it's a reference
    const varMatch = target.match(/^\{\{(\w+)\}\}$/);
    if (varMatch && !inputs.includes(varMatch[1])) {
      inputs.push(varMatch[1]);
    }
  }

  return inputs;
}

// Extract output variables from action
function extractOutputVariables(action: Action): string[] {
  const outputs: string[] = [];

  if ('saveAs' in action && typeof (action as any).saveAs === 'string') {
    outputs.push((action as any).saveAs);
  }

  if ('itemAs' in action && typeof (action as any).itemAs === 'string') {
    outputs.push((action as any).itemAs);
  }

  if ('variable' in action && action.type === 'set') {
    outputs.push((action as any).variable);
  }

  return outputs;
}

// Get human-readable label for an action
function getActionLabel(action: Action): string {
  const type = action.type;

  switch (type) {
    case 'querySelector':
    case 'querySelectorAll':
      return (action as any).selector?.substring(0, 30) || type;
    case 'click':
    case 'remove':
      return `${type} ${(action as any).target?.substring(0, 20) || ''}`;
    case 'setValue':
      return `${type} "${(action as any).value?.substring(0, 15) || ''}"`;
    case 'wait':
      return `wait ${(action as any).ms}ms`;
    case 'waitFor':
      return `waitFor ${(action as any).selector?.substring(0, 20) || ''}`;
    case 'if':
      return 'if condition';
    case 'forEach':
      return `forEach ${(action as any).source || 'items'}`;
    case 'while':
      return 'while loop';
    case 'set':
      return `set ${(action as any).variable || 'var'}`;
    case 'get':
      return `get ${(action as any).variable || 'var'}`;
    case 'callClient':
      return `${(action as any).client}.${(action as any).method}`;
    case 'notify':
      return `notify "${(action as any).title?.substring(0, 15) || ''}"`;
    case 'return':
      return 'return';
    default:
      return type;
  }
}

// Parse a single action into a node
function parseActionToNode(
  action: Action,
  capabilityName: string,
  parentId?: string
): FlowNode {
  const id = generateNodeId();
  const category = getCategoryForAction(action.type);
  const icon = getIconForAction(action.type);

  // Check if action has persisted AI note
  const actionWithNote = action as Record<string, any>;
  const persistedNote = actionWithNote._aiNote;

  return {
    id,
    type: 'action',
    position: { x: 0, y: 0 }, // Will be set by layout
    data: {
      actionType: action.type,
      category,
      label: getActionLabel(action),
      icon,
      inputs: extractInputVariables(action),
      outputs: extractOutputVariables(action),
      config: action as Record<string, any>,
      capabilityName,
      parentId,
      // Restore AI note from persisted config if available
      ...(persistedNote && {
        aiNote: {
          content: persistedNote.content,
          generatedAt: new Date().toISOString(),
          configHash: persistedNote.configHash,
        },
      }),
    },
  };
}

// Parse actions recursively, handling control flow
function parseActions(
  actions: Action[],
  capabilityName: string,
  parentId?: string
): { nodes: FlowNode[]; edges: Edge[]; firstNodeId?: string; lastNodeIds: string[] } {
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];
  let prevNodeId: string | undefined;
  let prevLastNodeIds: string[] = []; // Track last nodes from branches for connecting to next action
  let firstNodeId: string | undefined;
  const lastNodeIds: string[] = [];

  for (const action of actions) {
    if (action.type === 'if') {
      // Handle if/else branching
      const ifAction = action as IfAction;
      const conditionNode = parseActionToNode(action, capabilityName, parentId);
      conditionNode.type = 'condition';
      nodes.push(conditionNode);

      if (!firstNodeId) firstNodeId = conditionNode.id;

      // Connect from previous node
      if (prevNodeId) {
        edges.push({
          id: `edge_${prevNodeId}_${conditionNode.id}`,
          source: prevNodeId,
          target: conditionNode.id,
          type: 'smoothstep',
        });
      }
      // Connect from previous branch last nodes (if coming after another if/else)
      prevLastNodeIds.forEach(lastId => {
        edges.push({
          id: `edge_${lastId}_merge_${conditionNode.id}`,
          source: lastId,
          target: conditionNode.id,
          type: 'smoothstep',
        });
      });

      // Parse 'then' branch
      if (ifAction.then && ifAction.then.length > 0) {
        const thenResult = parseActions(ifAction.then, capabilityName, conditionNode.id);
        nodes.push(...thenResult.nodes);
        edges.push(...thenResult.edges);

        if (thenResult.firstNodeId) {
          edges.push({
            id: `edge_${conditionNode.id}_then_${thenResult.firstNodeId}`,
            source: conditionNode.id,
            target: thenResult.firstNodeId,
            sourceHandle: 'true',
            type: 'smoothstep',
            label: 'Yes',
            style: { stroke: '#22c55e' },
          });
          lastNodeIds.push(...thenResult.lastNodeIds);
        } else {
          lastNodeIds.push(conditionNode.id);
        }
      } else {
        lastNodeIds.push(conditionNode.id);
      }

      // Parse 'else' branch
      if (ifAction.else && ifAction.else.length > 0) {
        const elseResult = parseActions(ifAction.else, capabilityName, conditionNode.id);
        nodes.push(...elseResult.nodes);
        edges.push(...elseResult.edges);

        if (elseResult.firstNodeId) {
          edges.push({
            id: `edge_${conditionNode.id}_else_${elseResult.firstNodeId}`,
            source: conditionNode.id,
            target: elseResult.firstNodeId,
            sourceHandle: 'false',
            type: 'smoothstep',
            label: 'No',
            style: { stroke: '#ef4444' },
          });
          lastNodeIds.push(...elseResult.lastNodeIds);
        } else {
          lastNodeIds.push(conditionNode.id);
        }
      } else {
        lastNodeIds.push(conditionNode.id);
      }

      prevNodeId = undefined; // Don't connect next to condition directly
      prevLastNodeIds = [...lastNodeIds]; // Store branch endings for connecting to next action
      lastNodeIds.length = 0;

    } else if (action.type === 'forEach' || action.type === 'while') {
      // Handle loops
      const loopAction = action as ForEachAction | WhileAction;
      const loopNode = parseActionToNode(action, capabilityName, parentId);
      loopNode.type = 'loop';
      nodes.push(loopNode);

      if (!firstNodeId) firstNodeId = loopNode.id;

      // Connect from previous node
      if (prevNodeId) {
        edges.push({
          id: `edge_${prevNodeId}_${loopNode.id}`,
          source: prevNodeId,
          target: loopNode.id,
          type: 'smoothstep',
        });
      }
      // Connect from previous branch last nodes (if coming after an if/else)
      prevLastNodeIds.forEach(lastId => {
        edges.push({
          id: `edge_${lastId}_merge_${loopNode.id}`,
          source: lastId,
          target: loopNode.id,
          type: 'smoothstep',
        });
      });

      // Parse loop body
      const doActions = loopAction.do || [];
      if (doActions.length > 0) {
        const bodyResult = parseActions(doActions, capabilityName, loopNode.id);
        nodes.push(...bodyResult.nodes);
        edges.push(...bodyResult.edges);

        // Mark body nodes
        bodyResult.nodes.forEach(n => {
          n.data.loopBody = true;
        });

        if (bodyResult.firstNodeId) {
          edges.push({
            id: `edge_${loopNode.id}_body_${bodyResult.firstNodeId}`,
            source: loopNode.id,
            target: bodyResult.firstNodeId,
            sourceHandle: 'body',
            type: 'smoothstep',
            style: { stroke: '#f97316' },
          });

          // Loop back edge
          bodyResult.lastNodeIds.forEach(lastId => {
            edges.push({
              id: `edge_${lastId}_loopback_${loopNode.id}`,
              source: lastId,
              target: loopNode.id,
              targetHandle: 'loop',
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#f97316', strokeDasharray: '5,5' },
            });
          });
        }
      }

      prevNodeId = loopNode.id;
      prevLastNodeIds = [];
      lastNodeIds.length = 0;
      lastNodeIds.push(loopNode.id);

    } else {
      // Regular action
      const node = parseActionToNode(action, capabilityName, parentId);
      nodes.push(node);

      if (!firstNodeId) firstNodeId = node.id;

      // Connect from previous node
      if (prevNodeId) {
        edges.push({
          id: `edge_${prevNodeId}_${node.id}`,
          source: prevNodeId,
          target: node.id,
          type: 'smoothstep',
        });
      }
      // Connect from previous branch last nodes (if coming after an if/else)
      prevLastNodeIds.forEach(lastId => {
        edges.push({
          id: `edge_${lastId}_merge_${node.id}`,
          source: lastId,
          target: node.id,
          type: 'smoothstep',
        });
      });

      prevNodeId = node.id;
      prevLastNodeIds = [];
      lastNodeIds.length = 0;
      lastNodeIds.push(node.id);
    }
  }

  // If we ended with an if/else, prevLastNodeIds has the branch endings
  if (prevLastNodeIds.length > 0 && lastNodeIds.length === 0) {
    lastNodeIds.push(...prevLastNodeIds);
  }

  return { nodes, edges, firstNodeId, lastNodeIds };
}

// Parse a capability into nodes and edges
function parseCapability(capability: CapabilityConfig): { nodes: FlowNode[]; edges: Edge[] } {
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];

  // Create capability entry node
  const entryNodeId = generateNodeId();
  const entryNode: FlowNode = {
    id: entryNodeId,
    type: 'capability',
    position: { x: 0, y: 0 },
    data: {
      actionType: 'capability',
      category: 'entry',
      label: capability.name,
      icon: '📥',
      inputs: capability.parameters.map(p => p.name),
      outputs: [],
      config: {
        name: capability.name,
        description: capability.description,
        parameters: capability.parameters,
        trigger: capability.trigger,
        isLongRunning: capability.isLongRunning,
      },
      capabilityName: capability.name,
      isCapabilityEntry: true,
    },
  };
  nodes.push(entryNode);

  // Parse all actions
  const actionsResult = parseActions(capability.actions, capability.name);
  nodes.push(...actionsResult.nodes);
  edges.push(...actionsResult.edges);

  // Connect entry to first action
  if (actionsResult.firstNodeId) {
    edges.push({
      id: `edge_${entryNodeId}_${actionsResult.firstNodeId}`,
      source: entryNodeId,
      target: actionsResult.firstNodeId,
      type: 'smoothstep',
    });
  }

  return { nodes, edges };
}

/**
 * Apply dagre layout to nodes - exported for auto-layout feature
 */
export function applyLayout(nodes: FlowNode[], edges: Edge[]): FlowNode[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB',
    ranksep: NODE_DIMENSIONS.spacing.vertical,
    nodesep: NODE_DIMENSIONS.spacing.horizontal,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, {
      width: NODE_DIMENSIONS.width,
      height: NODE_DIMENSIONS.height,
    });
  });

  // Add edges to dagre graph
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions
  return nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_DIMENSIONS.width / 2,
        y: nodeWithPosition.y - NODE_DIMENSIONS.height / 2,
      },
    };
  });
}

// Add data flow edges (animated dotted lines for variable references)
function addDataFlowEdges(nodes: FlowNode[], existingEdges: Edge[]): Edge[] {
  const dataEdges: Edge[] = [];
  const nodeOutputMap = new Map<string, string>(); // variable -> nodeId

  // Build map of which nodes output which variables
  nodes.forEach(node => {
    node.data.outputs.forEach((output: string) => {
      nodeOutputMap.set(output, node.id);
    });
  });

  // Create data flow edges
  nodes.forEach(node => {
    node.data.inputs.forEach((input: string) => {
      const sourceNodeId = nodeOutputMap.get(input);
      if (sourceNodeId && sourceNodeId !== node.id) {
        // Check if this edge doesn't already exist
        const edgeExists = existingEdges.some(
          e => e.source === sourceNodeId && e.target === node.id
        ) || dataEdges.some(
          e => e.source === sourceNodeId && e.target === node.id
        );

        if (!edgeExists) {
          dataEdges.push({
            id: `data_${sourceNodeId}_${node.id}_${input}`,
            source: sourceNodeId,
            target: node.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#3b82f6', strokeDasharray: '5,5', strokeWidth: 1.5 },
            label: input,
            labelStyle: { fontSize: 10, fill: '#3b82f6' },
            labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
          });
        }
      }
    });
  });

  return dataEdges;
}

/**
 * Parse an AgentConfig into React Flow nodes and edges
 */
export function parseAgentConfig(config: AgentConfig): ParsedFlow {
  resetNodeIdCounter();

  const allNodes: FlowNode[] = [];
  const allEdges: Edge[] = [];

  // Parse each capability
  let yOffset = 0;
  config.capabilities.forEach((capability) => {
    const { nodes, edges } = parseCapability(capability);

    // Apply layout to this capability's nodes
    const layoutedNodes = applyLayout(nodes, edges);

    // Offset nodes for this capability (stack capabilities vertically)
    const capabilityNodes = layoutedNodes.map(node => ({
      ...node,
      position: {
        x: node.position.x,
        y: node.position.y + yOffset,
      },
    }));

    allNodes.push(...capabilityNodes);
    allEdges.push(...edges);

    // Calculate next y offset
    const maxY = Math.max(...capabilityNodes.map(n => n.position.y + NODE_DIMENSIONS.height));
    yOffset = maxY + 100; // Gap between capabilities
  });

  // Add data flow edges
  const dataEdges = addDataFlowEdges(allNodes, allEdges);
  allEdges.push(...dataEdges);

  return { nodes: allNodes, edges: allEdges };
}

/**
 * Parse a single capability for editing
 */
export function parseCapabilityConfig(capability: CapabilityConfig): ParsedFlow {
  resetNodeIdCounter();
  const { nodes, edges } = parseCapability(capability);
  const layoutedNodes = applyLayout(nodes, edges);
  const dataEdges = addDataFlowEdges(layoutedNodes, edges);

  return { nodes: layoutedNodes, edges: [...edges, ...dataEdges] };
}
