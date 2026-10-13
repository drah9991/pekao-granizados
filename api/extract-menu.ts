import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const config = {
  runtime: 'edge',
};

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

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();

    if (!imageBase64) {
      return new Response('Falta la imagen en base64', { status: 400 });
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
  } catch (error: any) {
    console.error('Error generando respuesta de IA:', error);
    return new Response(JSON.stringify({ error: 'Error procesando la imagen', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
