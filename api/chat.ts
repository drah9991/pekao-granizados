import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const config = {
  runtime: 'edge',
};

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
    const { messages } = await req.json();

    const result = await streamText({
      model: openai('gpt-4o-mini'), // GPT-4o-mini es súper rápido e ideal para chat general
      system: `Eres el Asistente Inteligente de Pekao Central.
Pekao Central es un moderno sistema SaaS multi-sede de Punto de Venta (POS) e Inventario diseñado para heladerías y tiendas de granizados.
Tu rol es ayudar de forma amigable y muy concisa a los dueños y cajeros a entender cómo usar el sistema, solucionar dudas de gestión de inventario, cuadres de caja y ventas.
Mantén tus respuestas breves y directas, formateadas en Markdown si es necesario. No inventes funcionalidades que no existan en un POS estándar, pero sugiere cómo hacer las cosas habitualmente.
      `,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return new Response(JSON.stringify({ error: 'Error processing chat' }), {
      status: 500,
    });
  }
}
