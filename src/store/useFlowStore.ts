// src/store/useFlowStore.ts
import create from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';

export interface FlowState {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  addEdge: (edge: Edge) => void;
  clear: () => void;
  mode: 'edit' | 'preview';
  setMode: (mode: 'edit' | 'preview') => void;
}

export const useFlowStore = create<FlowState>()(
  devtools((set) => ({
    nodes: [],
    edges: [],
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
    addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
    clear: () => set({ nodes: [], edges: [] }),
    mode: 'edit',
    setMode: (mode) => set({ mode }),
  }))
);
