// src/components/flow/AdvancedSettingsNode.tsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from '@/lib/utils';

/**
 * Nodo para configuración avanzada del sistema.
 * Llamará al RPC `update_advanced_settings` (pendiente de implementación).
 */
export function AdvancedSettingsNode({ data }: any) {
  const title = data?.title || 'Configuración Avanzada';
  const description = data?.description || 'Ajustes avanzados del sistema';

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

export default AdvancedSettingsNode;
