import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Enums, Tables } from '@/integrations/supabase/types';

type AppRole = Enums<'app_role'>;
type Profile = Tables<'profiles'>;

interface AuthState {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  userRole: AppRole | null;
  storeId: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    userRole: null,
    storeId: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchProfileAndRole = async (userId: string) => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error("Error fetching user profile:", profileError);
        if (isMounted) {
          setAuthState(prev => ({ ...prev, user: null, userRole: null, storeId: null }));
        }
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
      }

      if (isMounted) {
        setAuthState(prev => ({
          ...prev,
          user: profile,
          userRole: roleData?.role || null,
          storeId: profile.store_id,
        }));
      }
    };

    // 1. Register listener BEFORE getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null });
          return;
        }

        // Update session synchronously
        setAuthState(prev => ({ ...prev, session }));

        // Defer async work to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) fetchProfileAndRole(session.user.id);
          }, 0);
        }
      }
    );

    // 2. Initial load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (isMounted) {
            setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null });
          }
          return;
        }

        if (isMounted) {
          setAuthState(prev => ({ ...prev, session }));
        }

        await fetchProfileAndRole(session.user.id);
      } catch (err) {
        console.error("Error during initial auth load:", err);
      } finally {
        if (isMounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return authState;
};
