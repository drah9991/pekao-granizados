import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Panel } from '@/components/ui/Panel'; // Ajusta el alias si no está configurado

/**
 * Workflow page – Demo de React Flow con el componente Panel integrado.
 * Muestra un canvas sencillo con dos nodos y un panel posicionado en la
 * esquina superior izquierda que contiene dos botones de ejemplo.
 */
export default function Workflow() {
  // Nodos de ejemplo
  const initialNodes: Node[] = [
    {
      id: '1',
      position: { x: 50, y: 50 },
      data: { label: 'Nodo 1' },
    },
    {
      id: '2',
      position: { x: 300, y: 150 },
      data: { label: 'Nodo 2' },
    },
  ];

  // Aristas de ejemplo
  const initialEdges: Edge[] = [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
      type: 'smoothstep',
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => [...eds, { ...connection, id: `${connection.source}-${connection.target}` }]),
    [setEdges]
  );

  const clearFlow = () => {
    setNodes([]);
    setEdges([]);
  };

  const saveFlow = () => {
    // Aquí podrías serializar el flujo y enviarlo al backend.
    console.log('Flujo guardado', { nodes, edges });
  };

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-background"
      >
        <Panel position="top-left" className="flex space-x-2 p-2">
          <button
            onClick={saveFlow}
            className="bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700 transition"
          >
            Guardar Flujo
          </button>
          <button
            onClick={clearFlow}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Limpiar
          </button>
        </Panel>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
