import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Enums, Tables } from '@/integrations/supabase/types';

type UserRole = Enums<'user_role'>;
type Profile = Tables<'profiles'>;

interface AuthState {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  userRole: UserRole | null;
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

        setAuthState({
          user: profile,
          session,
          isLoading: false,
          userRole: profile.role,
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

            setAuthState({
              user: profile,
              session,
              isLoading: false,
              userRole: profile.role,
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