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
import { PosNode } from '@/components/flow/PosNode';
import { InventoryNode } from '@/components/flow/InventoryNode';
import { SaleNode } from '@/components/flow/SaleNode';
import { TurnNode } from '@/components/flow/TurnNode';
import { SettingsNode } from '@/components/flow/SettingsNode';
import { nodeTypes } from '@/components/flow/nodeTypes';

/**
 * Workflow page – Demo de React Flow con el componente Panel integrado.
 * Muestra un canvas sencillo con dos nodos y un panel posicionado en la
 * esquina superior izquierda que contiene dos botones de ejemplo.
 */
export default function Workflow() {
  // Nodos de ejemplo
  const initialNodes: Node[] = [
    { id: 'pos1', type: 'pos', position: { x: 50, y: 50 }, data: { label: 'POS' } },
    { id: 'inv1', type: 'inventory', position: { x: 300, y: 50 }, data: { label: 'Inventario' } },
    { id: 'sale1', type: 'sale', position: { x: 550, y: 50 }, data: { label: 'Venta' } },
    { id: 'turn1', type: 'turn', position: { x: 800, y: 50 }, data: { label: 'Turno' } },
    { id: 'settings1', type: 'settings', position: { x: 1050, y: 50 }, data: { label: 'Configuración' } },
    { id: 'report1', type: 'report', position: { x: 1300, y: 50 }, data: { label: 'Reportes' } },
    { id: 'userMgmt1', type: 'userManagement', position: { x: 1550, y: 50 }, data: { label: 'Usuarios' } },
    { id: 'audit1', type: 'audit', position: { x: 1800, y: 50 }, data: { label: 'Auditoría' } },
    { id: 'advSettings1', type: 'advancedSettings', position: { x: 2050, y: 50 }, data: { label: 'Config. Avanzada' } },
    { id: 'placeholder1', type: 'placeholder', position: { x: 2300, y: 50 }, data: { label: 'Futuro' } },
  ];

  const initialEdges: Edge[] = [
    { id: 'e-pos-inv', source: 'pos1', target: 'inv1', type: 'smoothstep' },
    { id: 'e-inv-sale', source: 'inv1', target: 'sale1', type: 'smoothstep' },
    { id: 'e-sale-turn', source: 'sale1', target: 'turn1', type: 'smoothstep' },
    { id: 'e-turn-settings', source: 'turn1', target: 'settings1', type: 'smoothstep' },
    { id: 'e-settings-report', source: 'settings1', target: 'report1', type: 'smoothstep' },
    { id: 'e-report-user', source: 'report1', target: 'userMgmt1', type: 'smoothstep' },
    { id: 'e-user-audit', source: 'userMgmt1', target: 'audit1', type: 'smoothstep' },
    { id: 'e-audit-adv', source: 'audit1', target: 'advSettings1', type: 'smoothstep' },
    { id: 'e-adv-placeholder', source: 'advSettings1', target: 'placeholder1', type: 'smoothstep' },
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
        nodeTypes={nodeTypes}
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
          <button
            onClick={() => {
              // Placeholder execute flow
              console.log('Ejecutar flujo');
            }}
            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition"
          >
            Ejecutar Flujo
          </button>
          <button
            onClick={() => {
              // Placeholder sync
              console.log('Sincronizar con Supabase');
            }}
            className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition"
          >
            Sincronizar
          </button>
        </Panel>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
