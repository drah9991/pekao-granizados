// src/components/flow/PlaceholderNode.tsx
import React from 'react';
import { Handle, Position } from 'reactflow';
import { cn } from '@/lib/utils';

/**
 * Generic placeholder node for future flows.
 * You can rename the node type and edit its data later.
 */
export function PlaceholderNode({ data }: any) {
  const title = data?.title || 'Placeholder';
  const description = data?.description || 'Future flow node';

  return (
    <div
      className={cn(
        'bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-xl p-3 shadow-md w-48',
        'border border-dashed border-gray-300 dark:border-gray-600'
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

export default PlaceholderNode;
