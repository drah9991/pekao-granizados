/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { typedFrom } from '@/integrations/supabase/types-extensions';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export type CashTurn = {
  id: string;
  store_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  status: 'open' | 'closed' | 'paused';
  notes: string | null;
  cashier_name?: string;
};

interface TurnContextType {
  activeTurn: CashTurn | null;
  isLoading: boolean;
  openTurn: (amount: number) => Promise<void>;
  closeTurn: (amount: number, notes?: string) => Promise<void>;
  pauseTurn: () => Promise<void>;
  resumeTurn: () => Promise<void>;
  reopenTurn: (turnId: string) => Promise<void>;
}

const TurnContext = createContext<TurnContextType | undefined>(undefined);

export function TurnProvider({ children }: { children: ReactNode }) {
  const { user, storeId } = useAuth();
  const [activeTurn, setActiveTurn] = useState<CashTurn | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveTurn = async () => {
    if (!storeId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await typedFrom.cash_turns()
        .select(`
          *,
          profiles:cashier_id (name)
        `)
        .eq('store_id', storeId)
        .in('status', ['open', 'paused'])
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (process.env.NODE_ENV === 'development') console.error('Error fetching turn:', error);
        toast.error("Error al cargar el turno actual: " + error.message);
      } else if (data) {
        const dataRecord = data as Record<string, unknown>;
        const profile = dataRecord.profiles as Record<string, unknown> | undefined;
        setActiveTurn({
          ...data,
          cashier_name: profile?.name as string | undefined
        } as CashTurn);
      } else {
        setActiveTurn(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!storeId) return;
    fetchActiveTurn();

    // Suscripción Realtime
    const channel = supabase
      .channel('cash_turns_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_turns',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          fetchActiveTurn();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const openTurn = async (amount: number) => {
    if (!user) {
      toast.error("Falta información del usuario.");
      throw new Error("Usuario no encontrado");
    }
    if (!storeId) {
      toast.error("No tienes una tienda asignada.");
      throw new Error("Tienda no asignada");
    }

    const { error } = await typedFrom.cash_turns()
      .insert({
        store_id: storeId,
        cashier_id: user.id,
        opening_amount: amount,
        status: 'open'
      });

    if (error) {
      toast.error("Error al abrir turno: " + error.message);
      throw error;
    }
    
    // Manually fetch the active turn to update the state immediately,
    // in case Supabase Realtime replication is not enabled for this table.
    await fetchActiveTurn();
    
    toast.success("Turno abierto exitosamente");
  };

  const pauseTurn = async () => {
    if (!activeTurn) return;

    const { error } = await typedFrom.cash_turns()
      .update({
        status: 'paused',
        notes: (activeTurn.notes ? activeTurn.notes + '\n' : '') + `[Pausado el ${new Date().toLocaleString('es-CO')}]`
      })
      .eq('id', activeTurn.id);

    if (error) {
      toast.error("Error al pausar turno: " + error.message);
      throw error;
    }
    
    await fetchActiveTurn();
    toast.success("Turno pausado");
  };

  const resumeTurn = async () => {
    if (!activeTurn) return;

    const { error } = await typedFrom.cash_turns()
      .update({
        status: 'open',
        notes: (activeTurn.notes ? activeTurn.notes + '\n' : '') + `[Reanudado el ${new Date().toLocaleString('es-CO')}]`
      })
      .eq('id', activeTurn.id);

    if (error) {
      toast.error("Error al reanudar turno: " + error.message);
      throw error;
    }
    
    await fetchActiveTurn();
    toast.success("Turno reanudado");
  };

  const reopenTurn = async (turnId: string) => {
    const { error } = await typedFrom.cash_turns()
      .update({
        status: 'open',
        notes: '[Reabierto históricamente el ' + new Date().toLocaleString('es-CO') + ']'
      })
      .eq('id', turnId);

    if (error) {
      if (error.message.includes('unique_active_turn')) {
        toast.error("Error: Ya hay un turno activo en esta tienda.");
      } else {
        toast.error("Error al reabrir el turno: " + error.message);
      }
      throw error;
    }
    
    await fetchActiveTurn();
    toast.success("Turno reabierto con éxito");
  };

  const closeTurn = async (amount: number, notes?: string) => {
    if (!activeTurn) return;

    const { error } = await typedFrom.cash_turns()
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_amount: amount,
        notes: notes
      })
      .eq('id', activeTurn.id);

    if (error) {
      toast.error("Error al cerrar turno: " + error.message);
      throw error;
    }
    toast.success("Turno cerrado exitosamente");
    setActiveTurn(null);
  };

  return (
    <TurnContext.Provider value={{ activeTurn, isLoading, openTurn, closeTurn, pauseTurn, resumeTurn, reopenTurn }}>
      {children}
    </TurnContext.Provider>
  );
}

export function useTurn() {
  const context = useContext(TurnContext);
  if (context === undefined) {
    throw new Error('useTurn must be used within a TurnProvider');
  }
  return context;
}
