import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { StoreInfo, TeamMember } from '../types';

const storeKey = (storeId: string) => ['admin', 'store', storeId] as const;

export function useStoreInfo(storeId: string) {
  return useQuery({
    queryKey: storeKey(storeId),
    queryFn: async (): Promise<StoreInfo> => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, address, currency, tax_rate')
        .eq('id', storeId)
        .maybeSingle();
      if (error) throw new Error(`No se pudo cargar la sede: ${error.message}`);
      if (!data) throw new Error('Sede no encontrada o sin permiso para verla.');
      return {
        id: data.id,
        name: data.name,
        address: data.address,
        currency: data.currency,
        taxRate: data.tax_rate === null ? null : Number(data.tax_rate),
      };
    },
  });
}

export function useUpdateStore(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, address }: { name: string; address: string }) => {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) throw new Error('El nombre de la sede es obligatorio.');

      const { data, error } = await supabase
        .from('stores')
        .update({ name: trimmedName, address: address.trim() || null })
        .eq('id', storeId)
        .select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('No tienes permiso para editar la sede.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storeKey(storeId) }),
  });
}

/** Personal de la sede. Los roles de otros solo son visibles para gerentes (RLS). */
export function useTeam(storeId: string) {
  return useQuery({
    queryKey: ['admin', 'team', storeId],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .eq('store_id', storeId)
        .order('name');
      if (error) throw new Error(`No se pudo cargar el equipo: ${error.message}`);

      const ids = (profiles ?? []).map((profile) => profile.id);
      const { data: roleRows, error: rolesError } = ids.length
        ? await supabase.from('user_roles').select('user_id, role').in('user_id', ids)
        : { data: [], error: null };
      if (rolesError) throw new Error(`No se pudieron cargar los roles: ${rolesError.message}`);

      return (profiles ?? []).map((profile) => ({
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        roles: (roleRows ?? []).filter((row) => row.user_id === profile.id).map((row) => String(row.role)),
      }));
    },
  });
}
