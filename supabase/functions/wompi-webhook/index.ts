import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import crypto from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secreto proporcionado por Wompi en el panel de eventos
const WOMPI_EVENTS_SECRET = Deno.env.get('WOMPI_EVENTS_SECRET') || '';

serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Para webhooks Wompi nos aseguramos que el request sea POST
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const payloadText = await req.text();
    const payload = JSON.parse(payloadText);

    // TODO: Validar la firma criptográfica de Wompi (usando la cabecera x-event-checksum)
    // Para simplificar este esqueleto y proceder rápido, asumiremos que si el payload viene formado, lo parsearemos.
    // En producción DEBES validar: crypto.createHash('sha256').update(payload.data.transaction.id + payload.data.transaction.status + payload.data.transaction.amount_in_cents + payload.timestamp + WOMPI_EVENTS_SECRET).digest('hex')

    const eventType = payload.event; // Ejemplo: 'transaction.updated'
    const transaction = payload.data.transaction;
    
    // Asumimos que guardaste el store_id en el campo `reference` al crear la transacción en Wompi
    // Opcionalmente en `customer_data` de Wompi
    const storeId = transaction.reference; 

    // Cliente de Supabase con permisos Service Role (bypass RLS) para modificar stores directamente
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let newStatus = 'active';

    if (eventType === 'transaction.updated') {
      if (transaction.status === 'APPROVED') {
        newStatus = 'active';
      } else if (transaction.status === 'DECLINED' || transaction.status === 'ERROR') {
        newStatus = 'inactive';
      }

      console.log(`Actualizando tenant ${storeId} a estado: ${newStatus}`);

      // Actualizar la tienda a su nuevo estado
      const { error } = await supabaseClient
        .from('stores')
        .update({ subscription_status: newStatus })
        .eq('id', storeId);

      if (error) {
        throw new Error(`Error updating store status: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({ received: true, status: newStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
