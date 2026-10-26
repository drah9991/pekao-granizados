import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { loadManagedUser } from '../_shared/managedUser.ts';
import { canManageUser, FORBIDDEN_MESSAGES } from '../_shared/userAdminPolicy.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Crea un cliente Supabase con la clave de rol de servicio para operaciones de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Autentica la solicitud para asegurar que solo usuarios autorizados puedan llamar a esta función
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, email, password } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rol de gestión, misma sede y sin tocar cuentas de mayor privilegio (ver _shared/userAdminPolicy.ts).
    const [caller, target] = await Promise.all([
      loadManagedUser(supabaseAdmin, user.id),
      loadManagedUser(supabaseAdmin, userId),
    ]);
    if (!target) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const decision = caller ? canManageUser(caller, target, 'update') : { allowed: false as const, reason: 'no_role' as const };
    if (!decision.allowed) {
      return new Response(JSON.stringify({ error: FORBIDDEN_MESSAGES[decision.reason] }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updateParams: Record<string, string> = {};
    if (email) updateParams.email = email;
    if (password) updateParams.password = password;

    if (Object.keys(updateParams).length === 0) {
      return new Response(JSON.stringify({ error: 'No update parameters provided (email or password expected)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the auth user
    const { error: updateError, data } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      updateParams
    );

    if (updateError) {
      console.error('Error updating user:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'User updated successfully', data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
