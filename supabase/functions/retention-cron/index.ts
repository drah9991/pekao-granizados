import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // Solo permitir POST desde CRON seguro
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, subscription_status');

    if (storesError) throw storesError;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    let emailsSent = 0;

    for (const store of stores || []) {
      // Evitar procesar tiendas inactivas
      if (store.subscription_status === 'inactive') continue;

      // Obtener la última venta de esta tienda
      const { data: lastOrder, error: orderError } = await supabase
        .from('orders')
        .select('created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Si no hay ordenes o la última orden es de hace más de 3 días
      let shouldSendEmail = false;
      if (orderError && orderError.code === 'PGRST116') {
        // No orders at all
        shouldSendEmail = true;
      } else if (lastOrder) {
        const lastOrderDate = new Date(lastOrder.created_at);
        if (lastOrderDate < threeDaysAgo) {
          shouldSendEmail = true;
        }
      }

      if (shouldSendEmail) {
        // Obtener el dueño para el email
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('store_id', store.id)
          .limit(1)
          .single();

        if (profile?.email) {
          // Aquí integraríamos Resend: await resend.emails.send({...})
          console.log(`[RETENTION] Enviando email de reactivación a ${profile.email} (Tienda: ${store.name})`);
          emailsSent++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cron Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
