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

  const fetchRoleForUser = async (userId: string): Promise<AppRole | null> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
    return data?.role || null;
  };

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null });
        return;
      }

      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null });
          return;
        }

        const role = await fetchRoleForUser(session.user.id);

        setAuthState({
          user: profile,
          session,
          isLoading: false,
          userRole: role,
          storeId: profile.store_id,
        });
      } else {
        setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null });
      }
    };

    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error("Error fetching user profile on auth state change:", profileError);
              setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null });
              return;
            }

            const role = await fetchRoleForUser(session.user.id);

            setAuthState({
              user: profile,
              session,
              isLoading: false,
              userRole: role,
              storeId: profile.store_id,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({ user: null, session: null, isLoading: false, userRole: null, storeId: null });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return authState;
};
