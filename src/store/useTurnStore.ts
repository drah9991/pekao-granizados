import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { typedFrom } from "@/integrations/supabase/types-extensions";
import { toast } from "sonner";

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

interface TurnStoreState {
  activeTurn: CashTurn | null;
  isLoading: boolean;
  
  // Actions
  setActiveTurn: (turn: CashTurn | null) => void;
  setIsLoading: (loading: boolean) => void;
  fetchActiveTurn: (storeId: string | null) => Promise<void>;
  openTurn: (amount: number, user: { id: string } | null, storeId: string | null) => Promise<void>;
  closeTurn: (amount: number, notes?: string) => Promise<void>;
  pauseTurn: () => Promise<void>;
  resumeTurn: () => Promise<void>;
  reopenTurn: (turnId: string) => Promise<void>;
}

export const useTurnStore = create<TurnStoreState>((set, get) => ({
  activeTurn: null,
  isLoading: false,

  setActiveTurn: (activeTurn) => set({ activeTurn }),
  setIsLoading: (isLoading) => set({ isLoading }),

  fetchActiveTurn: async (storeId) => {
    if (!storeId) {
      set({ activeTurn: null, isLoading: false });
      return;
    }
    
    set({ isLoading: true });
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
        set({
          activeTurn: {
            ...data,
            cashier_name: profile?.name as string | undefined
          } as CashTurn
        });
      } else {
        set({ activeTurn: null });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  openTurn: async (amount, user, storeId) => {
    if (!user) {
      toast.error("Falta información del usuario.");
      throw new Error("Usuario no encontrado");
    }
    if (!storeId) {
      toast.error("No tienes una sucursal asignada.");
      throw new Error("Sucursal no asignada");
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
    
    await get().fetchActiveTurn(storeId);
    toast.success("Turno abierto exitosamente");
  },

  pauseTurn: async () => {
    const { activeTurn } = get();
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
    
    await get().fetchActiveTurn(activeTurn.store_id);
    toast.success("Turno pausado");
  },

  resumeTurn: async () => {
    const { activeTurn } = get();
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
    
    await get().fetchActiveTurn(activeTurn.store_id);
    toast.success("Turno reanudado");
  },

  reopenTurn: async (turnId) => {
    const { error } = await typedFrom.cash_turns()
      .update({
        status: 'open',
        notes: '[Reabierto históricamente el ' + new Date().toLocaleString('es-CO') + ']'
      })
      .eq('id', turnId);

    if (error) {
      if (error.message.includes('unique_active_turn')) {
        toast.error("Error: Ya hay un turno activo en esta sucursal.");
      } else {
        toast.error("Error al reabrir el turno: " + error.message);
      }
      throw error;
    }
    
    // We don't have store_id here immediately, but we can fetch it after success
    const { data: turnData } = await typedFrom.cash_turns().select('store_id').eq('id', turnId).single();
    if (turnData) {
      await get().fetchActiveTurn(turnData.store_id);
    }
    toast.success("Turno reabierto con éxito");
  },

  closeTurn: async (amount, notes) => {
    const { activeTurn } = get();
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
    set({ activeTurn: null });
  }
}));
