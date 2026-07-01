// src/components/flow/nodeTypes.ts
import { PosNode } from '@/components/flow/PosNode';
import { InventoryNode } from '@/components/flow/InventoryNode';
import { SaleNode } from '@/components/flow/SaleNode';
import { TurnNode } from '@/components/flow/TurnNode';
import { SettingsNode } from '@/components/flow/SettingsNode';
import { CustomerNode } from '@/components/flow/CustomerNode';
import { ReceiptNode } from '@/components/flow/ReceiptNode';

/**
 * Mapping of custom node type identifiers to React components for React Flow.
 * Use the same keys when defining a node's `type` field.
 */
export const nodeTypes = {
  pos: PosNode,
  inventory: InventoryNode,
  sale: SaleNode,
  turn: TurnNode,
  settings: SettingsNode,
  customer: CustomerNode,
  receipt: ReceiptNode,
};
