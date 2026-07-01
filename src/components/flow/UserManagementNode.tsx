// src/components/flow/UserManagementNode.tsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from '@/lib/utils';

/**
 * Nodo para gestionar usuarios y roles.
 * Llamará al RPC `manage_user` (pendiente de implementación).
 */
export function UserManagementNode({ data }: any) {
  const title = data?.title || 'Gestión de Usuarios';
  const description = data?.description || 'Crear, editar y asignar roles';

  return (
    <div
      className={cn(
        'bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-xl p-3 shadow-md w-48',
        'border border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="font-semibold text-center mb-2">{title}</div>
      <div className="text-xs text-muted-foreground text-center mb-2">
        {description}
      </div>
      <Handle type="target" position={Position.Top} id="in" className="bg-primary" />
      <Handle type="source" position={Position.Bottom} id="out" className="bg-primary" />
    </div>
  );
}

export default UserManagementNode;
