/**
 * AI Note Generation Service for Flow Nodes
 * Generates contextual descriptions of what each node does in the workflow
 */

import type { Edge } from '@xyflow/react';
import type { FlowNode, NodeAINote } from './AgentFlowParser';
import { apiService } from '../../../utils/api';
import { getNodeDescription } from './nodeDescriptions';

/**
 * Generate a hash of the node config for change detection
 */
export function generateConfigHash(config: Record<string, any>): string {
  // Create a copy without the _aiNote field to avoid circular hash issues
  const configWithoutNote = { ...config };
  delete configWithoutNote._aiNote;

  const configStr = JSON.stringify(configWithoutNote, Object.keys(configWithoutNote).sort());

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < configStr.length; i++) {
    const char = configStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Build context about upstream and downstream nodes
 */
function buildNodeContext(
  node: FlowNode,
  allNodes: FlowNode[],
  edges: Edge[]
): { upstream: FlowNode[]; downstream: FlowNode[] } {
  const nodeMap = new Map<string, FlowNode>();
  allNodes.forEach(n => nodeMap.set(n.id, n));

  // Find upstream nodes (nodes that connect TO this node)
  const upstream: FlowNode[] = [];
  edges.forEach(edge => {
    if (edge.target === node.id && !edge.animated) {
      const sourceNode = nodeMap.get(edge.source);
      if (sourceNode) upstream.push(sourceNode);
    }
  });

  // Find downstream nodes (nodes that this node connects TO)
  const downstream: FlowNode[] = [];
  edges.forEach(edge => {
    if (edge.source === node.id && !edge.animated) {
      const targetNode = nodeMap.get(edge.target);
      if (targetNode) downstream.push(targetNode);
    }
  });

  return { upstream, downstream };
}

/**
 * Format node info for prompt
 */
function formatNodeInfo(node: FlowNode): string {
  const data = node.data;
  const config = data.config;

  const parts: string[] = [
    `Type: ${data.actionType}`,
  ];

  // Add relevant config details based on action type
  switch (data.actionType) {
    case 'querySelector':
    case 'querySelectorAll':
      parts.push(`Selector: ${config.selector || '(none)'}`);
      if (config.saveAs) parts.push(`Stores result as: ${config.saveAs}`);
      break;
    case 'click':
    case 'remove':
      parts.push(`Target: ${config.target || '(none)'}`);
      break;
    case 'setValue':
      parts.push(`Target: ${config.target || '(none)'}`);
      parts.push(`Value: ${config.value || '(none)'}`);
      break;
    case 'wait':
      parts.push(`Duration: ${config.ms}ms`);
      break;
    case 'waitFor':
      parts.push(`Selector: ${config.selector || '(none)'}`);
      if (config.timeout) parts.push(`Timeout: ${config.timeout}ms`);
      break;
    case 'set':
      parts.push(`Variable: ${config.variable || '(none)'}`);
      parts.push(`Value: ${JSON.stringify(config.value)?.substring(0, 50) || '(none)'}`);
      break;
    case 'get':
      parts.push(`Variable: ${config.variable || '(none)'}`);
      break;
    case 'if':
      parts.push(`Condition: ${JSON.stringify(config.condition)?.substring(0, 50) || '(none)'}`);
      break;
    case 'forEach':
      parts.push(`Source: ${config.source || '(none)'}`);
      parts.push(`Item variable: ${config.itemAs || '(none)'}`);
      break;
    case 'while':
      parts.push(`Condition: ${JSON.stringify(config.condition)?.substring(0, 50) || '(none)'}`);
      break;
    case 'callClient':
      parts.push(`Client: ${config.client || '(none)'}`);
      parts.push(`Method: ${config.method || '(none)'}`);
      break;
    case 'notify':
      parts.push(`Title: ${config.title || '(none)'}`);
      parts.push(`Message: ${config.message?.substring(0, 30) || '(none)'}`);
      break;
    case 'executeScript':
      parts.push(`Script: ${config.script?.substring(0, 50) || '(none)'}...`);
      break;
    case 'capability':
      parts.push(`Name: ${config.name || data.label}`);
      parts.push(`Description: ${config.description || '(none)'}`);
      if (config.trigger?.type) parts.push(`Trigger: ${config.trigger.type}`);
      break;
    default:
      // Add any saveAs if present
      if (config.saveAs) parts.push(`Stores result as: ${config.saveAs}`);
  }

  return parts.join('\n- ');
}

/**
 * Generate a fallback description without AI
 */
export function generateFallbackNote(node: FlowNode): string {
  const data = node.data;
  const config = data.config;

  // Get base description from nodeDescriptions
  const baseDesc = getNodeDescription(data.actionType);

  // Add specific context
  switch (data.actionType) {
    case 'querySelector':
      return `Finds element matching "${config.selector || 'selector'}"${config.saveAs ? ` and stores it as "${config.saveAs}"` : ''}.`;
    case 'querySelectorAll':
      return `Finds all elements matching "${config.selector || 'selector'}"${config.saveAs ? ` and stores them as "${config.saveAs}"` : ''}.`;
    case 'click':
      return `Clicks on the element stored in "${config.target || 'target'}".`;
    case 'remove':
      return `Removes the element stored in "${config.target || 'target'}" from the page.`;
    case 'setValue':
      return `Sets the value of "${config.target || 'target'}" to "${config.value || 'value'}".`;
    case 'wait':
      return `Pauses execution for ${config.ms || 0} milliseconds.`;
    case 'waitFor':
      return `Waits for element "${config.selector || 'selector'}" to appear on the page.`;
    case 'set':
      return `Sets variable "${config.variable || 'var'}" to a value.`;
    case 'get':
      return `Retrieves the value of variable "${config.variable || 'var'}".`;
    case 'if':
      return `Checks a condition and branches the flow accordingly.`;
    case 'forEach':
      return `Loops through each item in "${config.source || 'source'}", making each available as "${config.itemAs || 'item'}".`;
    case 'while':
      return `Repeats actions while a condition is true.`;
    case 'callClient':
      return `Calls ${config.client || 'client'}.${config.method || 'method'}() to interact with an external service.`;
    case 'notify':
      return `Shows a notification: "${config.title || 'Title'}".`;
    case 'capability':
      return `Entry point for the "${config.name || data.label}" capability. ${config.description || ''}`;
    case 'return':
      return `Exits the capability and returns a result.`;
    default:
      return baseDesc;
  }
}

/**
 * Generate an AI note for a single node
 */
export async function generateNodeNote(
  node: FlowNode,
  allNodes: FlowNode[],
  edges: Edge[],
  useOwnApiKey: boolean = true
): Promise<NodeAINote> {
  const configHash = generateConfigHash(node.data.config);

  // Check if we have a cached note with matching hash
  if (node.data.aiNote?.configHash === configHash && node.data.aiNote?.content) {
    return node.data.aiNote;
  }

  try {
    const { upstream, downstream } = buildNodeContext(node, allNodes, edges);

    // Build prompt
    const nodeInfo = formatNodeInfo(node);
    const upstreamInfo = upstream.length > 0
      ? upstream.map(n => `${n.data.actionType}${n.data.isCapabilityEntry ? ' (entry)' : ''}`).join(', ')
      : 'None (first step)';
    const downstreamInfo = downstream.length > 0
      ? downstream.map(n => `${n.data.actionType}`).join(', ')
      : 'None (last step)';

    const systemPrompt = `You explain automation workflow nodes in simple terms.
Keep explanations brief (1-2 sentences). Be specific about what this exact step does.
Don't start with "This node" or "This step". Write in active voice.
Focus on the purpose and effect, not just describing the config.`;

    const userPrompt = `Explain this automation step:
- ${nodeInfo}
- Comes after: ${upstreamInfo}
- Leads to: ${downstreamInfo}

What does this step do in the workflow?`;

    const response = await apiService.generateContent({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 150,
    }, useOwnApiKey);

    return {
      content: response.content.trim(),
      generatedAt: new Date().toISOString(),
      configHash,
    };
  } catch (error) {
    console.error('Failed to generate AI note:', error);

    // Return fallback note on error
    return {
      content: generateFallbackNote(node),
      generatedAt: new Date().toISOString(),
      configHash,
      error: error instanceof Error ? error.message : 'Failed to generate note',
    };
  }
}

/**
 * Generate notes for all nodes that need them
 * Returns a map of nodeId -> note
 */
export async function generateAllNodeNotes(
  nodes: FlowNode[],
  edges: Edge[],
  useOwnApiKey: boolean = true,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, NodeAINote>> {
  const notes = new Map<string, NodeAINote>();
  const nodesToGenerate = nodes.filter(node => {
    const configHash = generateConfigHash(node.data.config);
    // Skip if we have a valid cached note
    return !(node.data.aiNote?.configHash === configHash && node.data.aiNote?.content);
  });

  let completed = 0;
  const total = nodesToGenerate.length;

  // Generate notes sequentially to avoid rate limiting
  for (const node of nodesToGenerate) {
    const note = await generateNodeNote(node, nodes, edges, useOwnApiKey);
    notes.set(node.id, note);
    completed++;
    onProgress?.(completed, total);

    // Small delay between requests to avoid rate limiting
    if (completed < total) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Also include existing valid cached notes
  for (const node of nodes) {
    if (!notes.has(node.id) && node.data.aiNote?.content) {
      notes.set(node.id, node.data.aiNote);
    }
  }

  return notes;
}

/**
 * Check if a node's note needs regeneration
 */
export function nodeNeedsRegeneration(node: FlowNode): boolean {
  if (!node.data.aiNote?.content) return true;

  const currentHash = generateConfigHash(node.data.config);
  return node.data.aiNote.configHash !== currentHash;
}
