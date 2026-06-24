/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Enums, Tables } from '@/integrations/supabase/types';
import { identifyUser, clearUser } from '@/lib/sentry';
import { offlineService } from '@/lib/OfflineService';

type AppRole = Enums<'app_role'>;
type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: Profile | null;
  session: import('@supabase/supabase-js').Session | null;
  isLoading: boolean;
  userRole: AppRole | null;
  storeId: string | null;
  storeName: string | null;
  switchStore: (newStoreId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  userRole: null,
  storeId: null,
  storeName: null,
  switchStore: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<{
    user: Profile | null;
    session: import('@supabase/supabase-js').Session | null;
    isLoading: boolean;
    userRole: AppRole | null;
    storeId: string | null;
    storeName: string | null;
  }>({
    user: null,
    session: null,
    isLoading: true,
    userRole: null,
    storeId: null,
    storeName: null,
  });

  const isMounted = React.useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchProfileAndRole = async (userId: string) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      if (isMounted.current) {
        setAuthState(prev => ({ ...prev, user: null, userRole: null, storeId: null, storeName: null }));
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

    let storeName = null;
    if (profile.store_id) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('name')
        .eq('id', profile.store_id)
        .maybeSingle();
      if (storeData) {
        storeName = storeData.name;
      }
    }

    if (isMounted.current) {
      setAuthState(prev => ({
        ...prev,
        user: profile,
        userRole: (roleData?.role as AppRole) || null,
        storeId: profile.store_id,
        storeName,
      }));

      // Identify user in Sentry for error context
      identifyUser({
        id: profile.id,
        email: profile.email || undefined,
        name: profile.name || undefined,
      });
    }
  };

  const switchStore = async (newStoreId: string) => {
    const userId = authState.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({ store_id: newStoreId })
      .eq('id', userId);

    if (error) {
      console.error("Error updating user store profile:", error);
      throw error;
    }

    // Refresh profile state
    await fetchProfileAndRole(userId);
  };

  useEffect(() => {
    // 1. Register listener BEFORE getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted.current) return;

        if (event === 'SIGNED_OUT') {
          setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null, storeName: null });
          clearUser(); // Clear Sentry user context
          offlineService.saveAuthSession(null);
          return;
        }

        // Update session synchronously
        setAuthState(prev => ({ ...prev, session }));
        offlineService.saveAuthSession(session);

        // Defer async work to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            if (isMounted.current) fetchProfileAndRole(session.user.id);
          }, 0);
        }
      }
    );

    // 2. Initial load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (isMounted.current) {
            setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null, storeName: null });
          }
          offlineService.saveAuthSession(null);
          return;
        }

        if (isMounted.current) {
          setAuthState(prev => ({ ...prev, session }));
        }
        offlineService.saveAuthSession(session);

        await fetchProfileAndRole(session.user.id);
      } catch (err) {
        console.error("Error during initial auth load:", err);
      } finally {
        if (isMounted.current) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, switchStore }}>
      {children}
    </AuthContext.Provider>
  );
};
