// src/integrations/supabase/workflows.ts
import { supabase } from '@/integrations/supabase/client';
import type { Definitions } from '@/integrations/supabase/types';

/** Create a new workflow definition */
export async function createWorkflow(name: string, definition: object) {
  const { data, error } = await supabase
    .from('workflows')
    .insert({ name, definition })
    .select('*')
    .single();
  if (error) throw error;
  return data as Definitions['workflows'];
}

/** Fetch a workflow by its id */
export async function getWorkflow(id: number) {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Definitions['workflows'];
}

/** List all workflows for the current user */
export async function listWorkflows() {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Definitions['workflows'][];
}

/** Delete a workflow */
export async function deleteWorkflow(id: number) {
  const { error } = await supabase.from('workflows').delete().eq('id', id);
  if (error) throw error;
  return true;
}
