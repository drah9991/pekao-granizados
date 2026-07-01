// src/lib/flowExecutor.ts
import { Node, Edge } from 'reactflow';
import {
  process_sale,
  update_stock,
  process_transfer_receipt,
  validate_turn,
  process_turn,
  update_settings,
} from '@/integrations/supabase/client';

/**
 * Simple topological sort based on edges.
 * Assumes the workflow graph is a DAG.
 */
function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const adj: Record<string, string[]> = {};
  const indegree: Record<string, number> = {};
  nodes.forEach((n) => {
    adj[n.id] = [];
    indegree[n.id] = 0;
  });
  edges.forEach((e) => {
    // source -> target direction
    if (adj[e.source]) {
      adj[e.source].push(e.target);
      indegree[e.target] = (indegree[e.target] ?? 0) + 1;
    }
  });
  const queue: string[] = [];
  Object.entries(indegree).forEach(([id, deg]) => {
    if (deg === 0) queue.push(id);
  });
  const ordered: Node[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const node = nodes.find((n) => n.id === id)!;
    ordered.push(node);
    adj[id].forEach((nbr) => {
      indegree[nbr]--;
      if (indegree[nbr] === 0) queue.push(nbr);
    });
  }
  return ordered;
}

/**
 * Executes a workflow by iterating nodes in topological order and invoking
 * the appropriate RPC based on the node type.
 */
export async function executeFlow(nodes: Node[], edges: Edge[]): Promise<void> {
  const ordered = topologicalSort(nodes, edges);
  for (const node of ordered) {
    const type = (node.type ?? 'pos') as string; // default to pos
    const data = node.data ?? {};
    try {
      switch (type) {
        case 'pos':
          // No RPC for POS node in this simplified demo
          console.log('Pos node executed', node.id);
          break;
        case 'inventory':
          await update_stock(data);
          console.log('Inventory RPC called for node', node.id);
          break;
        case 'sale':
          await process_sale(data);
          console.log('Sale RPC called for node', node.id);
          break;
        case 'turn':
          await validate_turn(data);
          console.log('Turn validation RPC called for node', node.id);
          break;
        case 'settings':
          await update_settings(data);
          console.log('Settings RPC called for node', node.id);
          break;
        default:
          console.warn('Unknown node type', type);
      }
    } catch (err) {
      console.error('Error executing node', node.id, err);
      // In a real app you might abort or continue based on policy
    }
  }
}
