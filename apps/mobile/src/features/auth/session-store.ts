import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

interface SessionState {
  session: Session | null;
  /** false hasta leer la sesión guardada; evita redirigir antes de tiempo. */
  isReady: boolean;
  setSession: (session: Session | null) => void;
}

// Supabase ya persiste la sesión; este store solo la expone a React.
export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  isReady: false,
  setSession: (session) => set({ session, isReady: true }),
}));

export const selectUserId = (state: SessionState): string | null => state.session?.user.id ?? null;
