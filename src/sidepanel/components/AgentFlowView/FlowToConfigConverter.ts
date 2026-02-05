/**
 * FlowToConfigConverter - Converts React Flow nodes and edges back to AgentConfig
 */

import type { Edge } from '@xyflow/react';
import type { AgentConfig, CapabilityConfig, Action, IfAction, ForEachAction, WhileAction } from '../../../types/agentConfig';
import type { FlowNode } from './AgentFlowParser';
import { getCategoryForAction, getIconForAction } from './flowStyles';

interface TraversalContext {
  visited: Set<string>;
  nodeMap: Map<string, FlowNode>;
  edgesBySource: Map<string, Edge[]>;
  edgesByTarget: Map<string, Edge[]>;
}

/**
 * Get outgoing edges from a node, optionally filtered by source handle
 */
function getOutgoingEdges(ctx: TraversalContext, nodeId: string, sourceHandle?: string): Edge[] {
  const edges = ctx.edgesBySource.get(nodeId) || [];
  if (sourceHandle !== undefined) {
    return edges.filter(e => e.sourceHandle === sourceHandle);
  }
  // Filter out data flow edges (they have animated style)
  return edges.filter(e => !e.animated);
}

/**
 * Get the main execution edge (not branch edges) from a node
 */
function getMainExecutionEdge(ctx: TraversalContext, nodeId: string): Edge | undefined {
  const edges = getOutgoingEdges(ctx, nodeId);
  return edges.find(e => !e.sourceHandle || e.sourceHandle === 'source');
}

/**
 * Convert a node's config back to an Action
 */
function nodeConfigToAction(node: FlowNode): Action {
  const config = { ...node.data.config };

  // Ensure type is set
  if (!config.type && node.data.actionType !== 'capability') {
    config.type = node.data.actionType;
  }

  // Preserve AI note if present
  if (node.data.aiNote?.content && node.data.aiNote?.configHash) {
    config._aiNote = {
      content: node.data.aiNote.content,
      configHash: node.data.aiNote.configHash,
    };
  }

  return config as Action;
}

/**
 * Recursively traverse and collect actions starting from a node
 */
function traverseActions(
  ctx: TraversalContext,
  startNodeId: string,
  stopAtNodes?: Set<string>
): Action[] {
  const actions: Action[] = [];
  let currentNodeId: string | undefined = startNodeId;

  while (currentNodeId && !ctx.visited.has(currentNodeId)) {
    // Check if we should stop at this node
    if (stopAtNodes?.has(currentNodeId)) {
      break;
    }

    ctx.visited.add(currentNodeId);
    const node = ctx.nodeMap.get(currentNodeId);

    if (!node) break;

    // Skip capability entry nodes - they're not actions
    if (node.data.isCapabilityEntry) {
      const mainEdge = getMainExecutionEdge(ctx, currentNodeId);
      currentNodeId = mainEdge?.target;
      continue;
    }

    // Handle different node types
    if (node.type === 'condition') {
      // This is an if/else node
      const ifAction = nodeConfigToAction(node) as IfAction;

      // Get then branch
      const thenEdges = getOutgoingEdges(ctx, currentNodeId, 'true');
      if (thenEdges.length > 0) {
        const thenStartId = thenEdges[0].target;
        // Don't revisit nodes already processed
        ctx.visited.delete(currentNodeId); // Allow re-entry for then branch tracking
        ifAction.then = traverseActions(
          { ...ctx, visited: new Set(ctx.visited) },
          thenStartId
        );
      } else {
        ifAction.then = [];
      }

      // Get else branch
      const elseEdges = getOutgoingEdges(ctx, currentNodeId, 'false');
      if (elseEdges.length > 0) {
        const elseStartId = elseEdges[0].target;
        ifAction.else = traverseActions(
          { ...ctx, visited: new Set(ctx.visited) },
          elseStartId
        );
      } else {
        ifAction.else = [];
      }

      actions.push(ifAction);

      // After if/else, we need to find the merge point
      // For now, we'll stop traversal after if/else
      break;

    } else if (node.type === 'loop') {
      // This is a forEach or while loop
      const loopAction = nodeConfigToAction(node) as ForEachAction | WhileAction;

      // Get loop body
      const bodyEdges = getOutgoingEdges(ctx, currentNodeId, 'body');
      if (bodyEdges.length > 0) {
        const bodyStartId = bodyEdges[0].target;
        // Track nodes that loop back to prevent infinite traversal
        loopAction.do = traverseActions(
          { ...ctx, visited: new Set(ctx.visited) },
          bodyStartId,
          new Set([currentNodeId]) // Stop when we'd loop back
        );
      } else {
        loopAction.do = [];
      }

      actions.push(loopAction);

      // Continue after the loop
      const mainEdge = getMainExecutionEdge(ctx, currentNodeId);
      currentNodeId = mainEdge?.target;

    } else {
      // Regular action node
      const action = nodeConfigToAction(node);
      actions.push(action);

      // Move to next node
      const mainEdge = getMainExecutionEdge(ctx, currentNodeId);
      currentNodeId = mainEdge?.target;
    }
  }

  return actions;
}

/**
 * Find capability entry nodes
 */
function findCapabilityEntryNodes(nodes: FlowNode[]): FlowNode[] {
  return nodes.filter(node => node.data.isCapabilityEntry);
}

/**
 * Convert a capability's flow back to CapabilityConfig
 */
function convertCapabilityFlow(
  entryNode: FlowNode,
  ctx: TraversalContext
): CapabilityConfig {
  const config = entryNode.data.config;

  // Get the first action node after the entry
  const mainEdge = getMainExecutionEdge(ctx, entryNode.id);
  const actions: Action[] = [];

  if (mainEdge) {
    const startNodeId = mainEdge.target;
    const traversedActions = traverseActions(
      { ...ctx, visited: new Set() },
      startNodeId
    );
    actions.push(...traversedActions);
  }

  return {
    name: config.name || entryNode.data.label,
    description: config.description || '',
    parameters: config.parameters || [],
    trigger: config.trigger,
    isLongRunning: config.isLongRunning,
    processType: config.processType,
    actions,
  };
}

/**
 * Convert React Flow nodes and edges back to AgentConfig
 * @param nodes - React Flow nodes
 * @param edges - React Flow edges
 * @param originalConfig - Original config to preserve metadata
 */
export function convertFlowToConfig(
  nodes: FlowNode[],
  edges: Edge[],
  originalConfig: AgentConfig
): AgentConfig {
  // Build lookup maps
  const nodeMap = new Map<string, FlowNode>();
  nodes.forEach(node => nodeMap.set(node.id, node));

  const edgesBySource = new Map<string, Edge[]>();
  const edgesByTarget = new Map<string, Edge[]>();

  edges.forEach(edge => {
    // Skip data flow edges
    if (edge.animated) return;

    const sourceEdges = edgesBySource.get(edge.source) || [];
    sourceEdges.push(edge);
    edgesBySource.set(edge.source, sourceEdges);

    const targetEdges = edgesByTarget.get(edge.target) || [];
    targetEdges.push(edge);
    edgesByTarget.set(edge.target, targetEdges);
  });

  const ctx: TraversalContext = {
    visited: new Set(),
    nodeMap,
    edgesBySource,
    edgesByTarget,
  };

  // Find capability entry nodes
  const entryNodes = findCapabilityEntryNodes(nodes);

  // Convert each capability
  const capabilities: CapabilityConfig[] = entryNodes.map(entryNode =>
    convertCapabilityFlow(entryNode, ctx)
  );

  // Return updated config, preserving original metadata
  return {
    ...originalConfig,
    capabilities,
  };
}

/**
 * Validation error with node reference
 */
export interface ValidationError {
  nodeId: string | null; // null for global errors
  message: string;
}

/**
 * Validate the flow before converting
 * Returns an array of validation errors with node IDs
 */
export function validateFlow(nodes: FlowNode[], edges: Edge[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for at least one capability entry
  const entryNodes = findCapabilityEntryNodes(nodes);
  if (entryNodes.length === 0) {
    errors.push({ nodeId: null, message: 'Flow must have at least one capability entry node' });
  }

  // Check for disconnected nodes (except capability entries)
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    if (!edge.animated) { // Skip data flow edges
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }
  });

  // Entry nodes count as connected
  entryNodes.forEach(node => connectedNodeIds.add(node.id));

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id) && !node.data.isCapabilityEntry) {
      errors.push({ nodeId: node.id, message: 'Disconnected from the flow' });
    }
  });

  // Check for required fields in action configs
  nodes.forEach(node => {
    if (node.data.isCapabilityEntry) return;

    const config = node.data.config;
    const type = node.data.actionType;

    // Basic required field checks
    switch (type) {
      case 'querySelector':
      case 'querySelectorAll':
        if (!config.selector) {
          errors.push({ nodeId: node.id, message: 'Selector is required' });
        }
        break;
      case 'click':
      case 'remove':
        if (!config.target) {
          errors.push({ nodeId: node.id, message: 'Target is required' });
        }
        break;
      case 'wait':
        if (typeof config.ms !== 'number') {
          errors.push({ nodeId: node.id, message: 'Duration (ms) is required' });
        }
        break;
      case 'callClient':
        if (!config.client || !config.method) {
          errors.push({ nodeId: node.id, message: 'Client and method are required' });
        }
        break;
    }
  });

  return errors;

}

/**
 * Helper to convert validation errors to string array (for backward compatibility)
 */
export function getValidationErrorMessages(errors: ValidationError[]): string[] {
  return errors.map(e => e.message);
}

/**
 * Helper to get errors for a specific node
 */
export function getNodeErrors(errors: ValidationError[], nodeId: string): string[] {
  return errors.filter(e => e.nodeId === nodeId).map(e => e.message);
}

/**
 * Create a new node for adding to the flow
 */
export function createNewNode(
  actionType: string,
  position: { x: number; y: number },
  config: Partial<Action>
): FlowNode {
  const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const category = getCategoryForAction(actionType);
  const icon = getIconForAction(actionType);

  return {
    id,
    type: actionType === 'if' ? 'condition' :
          (actionType === 'forEach' || actionType === 'while') ? 'loop' : 'action',
    position,
    data: {
      actionType,
      category,
      label: actionType,
      icon,
      inputs: [],
      outputs: [],
      config: { type: actionType, ...config } as Record<string, any>,
    },
  };
}
