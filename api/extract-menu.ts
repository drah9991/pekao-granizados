import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const config = {
  runtime: 'edge',
};

// Importar productos desde una foto es una acción de catálogo (mismos roles que "Productos" en navConfig).
const ALLOWED_ROLES = ['admin', 'owner', 'manager', 'store_manager', 'super_admin'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Vercel acepta cuerpos de ~4,5 MB: ~3 MB de imagen en base64
const MAX_IMAGE_BASE64_CHARS = 4_000_000;
const MAX_BODY_BYTES = 4_200_000;

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Configura el proveedor para usar el AI Gateway de Vercel si existe la variable
// Si no, hace un "fallback" a la API directa de OpenAI.
const openai = createOpenAI({
  baseURL: process.env.AI_GATEWAY_URL
    ? `${process.env.AI_GATEWAY_URL}/openai`
    : 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError(500, 'Servidor sin configuración de Supabase');
  }

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return jsonError(401, 'Sesión requerida');

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError(401, 'Sesión inválida');

    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      admin.from('user_roles').select('role').eq('user_id', userData.user.id),
      admin.from('profiles').select('is_superadmin').eq('id', userData.user.id).maybeSingle(),
    ]);
    const isSuperAdmin = (profile as { is_superadmin?: boolean } | null)?.is_superadmin === true;
    const hasRole = (roleRows ?? []).some((r) => ALLOWED_ROLES.includes(String(r.role)));
    if (!isSuperAdmin && !hasRole) return jsonError(403, 'No autorizado para importar productos');

    if (Number(req.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) {
      return jsonError(413, 'La imagen es demasiado grande (máx. 3 MB)');
    }

    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();

    if (typeof imageBase64 !== 'string' || !imageBase64) {
      return jsonError(400, 'Falta la imagen en base64');
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
      return jsonError(413, 'La imagen es demasiado grande (máx. 3 MB)');
    }
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return jsonError(415, 'Formato no soportado: usa JPG, PNG o WEBP');
    }

    // Convertir el string base64 a un buffer (Uint8Array)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const { object } = await generateObject({
      model: openai('gpt-4o'), // Usamos GPT-4o por ser multimodal
      schema: z.object({
        products: z.array(
          z.object({
            name: z.string().describe("Nombre del producto, por ejemplo: GRANIZADO COCO LOCO"),
            price: z.number().describe("Precio numérico (sin signos, ej: 8500)"),
            category: z.string().describe("Categoría del producto según su tipo (ej: Granizados, Toppings, Bebidas, Helados, etc.)")
          })
        ),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extrae todos los productos, precios y categorías de la foto de este menú. Asegúrate de leer bien los precios y categorizarlos correctamente.'
            },
            {
              type: 'image',
              image: `data:${mimeType};base64,${base64Data}`,
            },
          ],
        },
      ],
    });

    return new Response(JSON.stringify(object.products), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error generando respuesta de IA:', error);
    return jsonError(500, 'Error procesando la imagen');
  }
}
