/**
 * Type extensions for tables/columns missing from auto-generated Supabase types.
 * These types augment the Database type for tables/fields added via migrations
 * after the last `supabase gen types` run.
 *
 * Usage: import { typedFrom, supabaseRpc } from './types-extensions';
 *   await typedFrom.notifications().select('*');
 *   await supabaseRpc('process_sale', { sale_data });
 */

import type { Json } from './types';
import { supabase } from './client';
import type {
  PostgrestQueryBuilder,
  PostgrestFilterBuilder,
  PostgrestSingleResponse,
  PostgrestResponse,
} from '@supabase/supabase-js';

// ============================================================
// Type helpers for tables that exist in DB but not in generated types
// ============================================================

export type NotificationType = 'inventory_low' | 'system_event' | 'order_event';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationRow {
  id: string;
  store_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  is_read: boolean;
  metadata: Json;
  created_at: string;
}

export interface NotificationInsert {
  id?: string;
  store_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  is_read?: boolean;
  metadata?: Json;
  created_at?: string;
}

export type CashTurnStatus = 'open' | 'closed' | 'paused';

export interface CashTurnRow {
  id: string;
  store_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  status: CashTurnStatus;
  notes: string | null;
  cashier_name?: string;
  created_at: string | null;
}

export interface CashTurnInsert {
  id?: string;
  store_id: string;
  cashier_id: string;
  opened_at?: string;
  closed_at?: string | null;
  opening_amount: number;
  closing_amount?: number | null;
  status?: CashTurnStatus;
  notes?: string | null;
  created_at?: string | null;
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean | null;
  created_at: string | null;
}

export interface NotificationSettingsRow {
  id: string;
  store_id: string;
  notification_type: string;
  allowed_roles: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface MixPreparationRow {
  id: string;
  inventory_item_id: string;
  store_id: string;
  liters: number;
  ml_converted: number;
  expected_cups: number;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface PricingRuleRow {
  id: string;
  store_id: string;
  name: string;
  type: string;
  discount_type: string;
  discount_value: number;
  target_type: string;
  target_id: string;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  active: boolean;
  created_at: string | null;
}

export interface ProductTypesConfigRow {
  code: string;
  label: string;
  emoji_icon: string;
  sales_mode: string;
  track_mixture_inventory: boolean;
  requires_recipe: boolean;
  active: boolean;
  created_at: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  color_hex: string | null;
  is_active: boolean | null;
  store_id: string | null;
  created_at: string | null;
  requires_recipe?: boolean | null;
  sales_mode?: string | null;
  track_mixture_inventory?: boolean | null;
  inventory_unit?: string | null;
  allow_toppings?: boolean | null;
  emoji_icon?: string | null;
  color_theme?: string | null;
  tax_rate?: number | null;
  alert_threshold?: number | null;
}

/**
 * Extended profile fields added by migrations (document_id, consent_habeas_data, email)
 */
export interface ProfileFields {
  document_id?: string | null;
  consent_habeas_data?: boolean | null;
  email?: string | null;
}

// ============================================================
// Typed query builders for missing tables
// ============================================================

type UnknownRow = Record<string, unknown>;

/**
 * Typed helpers to query tables that exist in the DB but are missing from
 * the auto-generated Database type.
 *
 * Each method returns a properly typed PostgrestFilterBuilder so you can
 * chain .select(), .eq(), .order(), etc. with full type safety.
 */
export const typedFrom = {
  notifications: () =>
    supabase.from('notifications') as unknown as PostgrestQueryBuilder<
      NotificationRow,
      NotificationRow,
      unknown
    >,

  cash_turns: () =>
    supabase.from('cash_turns') as unknown as PostgrestQueryBuilder<
      CashTurnRow,
      CashTurnRow,
      unknown
    >,

  roles: () =>
    supabase.from('roles') as unknown as PostgrestQueryBuilder<
      RoleRow,
      RoleRow,
      unknown
    >,

  notification_settings: () =>
    supabase.from('notification_settings') as unknown as PostgrestQueryBuilder<
      NotificationSettingsRow,
      NotificationSettingsRow,
      unknown
    >,

  mix_preparations: () =>
    supabase.from('mix_preparations') as unknown as PostgrestQueryBuilder<
      MixPreparationRow,
      MixPreparationRow,
      unknown
    >,

  pricing_rules: () =>
    supabase.from('pricing_rules') as unknown as PostgrestQueryBuilder<
      PricingRuleRow,
      PricingRuleRow,
      unknown
    >,

  product_types_config: () =>
    supabase.from('product_types_config') as unknown as PostgrestQueryBuilder<
      ProductTypesConfigRow,
      ProductTypesConfigRow,
      unknown
    >,

  categories: () =>
    supabase.from('categories') as unknown as PostgrestQueryBuilder<
      CategoryRow,
      CategoryRow,
      unknown
    >,
};

/**
 * Typed RPC caller. Wraps supabase.rpc() to avoid (supabase as any).rpc() casts.
 */
export function supabaseRpc<R = unknown>(
  fnName: string,
  params?: Record<string, unknown>
) {
  return supabase.rpc(fnName, params) as unknown as Promise<
    PostgrestSingleResponse<R>
  >;
}
