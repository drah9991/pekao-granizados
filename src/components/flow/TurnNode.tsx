// src/components/flow/TurnNode.tsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from '@/lib/utils';

/**
 * Nodo que valida o inicia un turno de caja.
 * Llamará al RPC `validate_turn` (a implementar).
 */
export function TurnNode({ data }: any) {
  const title = data?.title || 'Turno';
  const description = data?.description || 'Validar turno';

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
      {/* Input handle */}
      <Handle type="target" position={Position.Top} id="in" className="bg-primary" />
      {/* Output handle */}
      <Handle type="source" position={Position.Bottom} id="out" className="bg-primary" />
    </div>
  );
}

export default TurnNode;
