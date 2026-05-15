import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Enums, Tables } from '@/integrations/supabase/types';
import { identifyUser, clearUser } from '@/lib/sentry';

type AppRole = Enums<'app_role'>;
type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  userRole: AppRole | null;
  storeId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  userRole: null,
  storeId: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthContextType>({
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
          userRole: (roleData?.role as AppRole) || null,
          storeId: profile.store_id,
        }));

        // Identify user in Sentry for error context
        identifyUser({
          id: profile.id,
          email: profile.email || undefined,
          name: profile.name || undefined,
        });
      }
    };

    // 1. Register listener BEFORE getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null });
          clearUser(); // Clear Sentry user context
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

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};
