import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 4000;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotSettingsRow {
  enabled: boolean;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
}

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function parseMessages(body: unknown): ChatMessage[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const messages = raw.slice(-MAX_HISTORY).map((m) => ({
    role: (m as ChatMessage)?.role,
    content: (m as ChatMessage)?.content,
  }));

  const isValid = messages.every(
    (m) =>
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.length <= MAX_MESSAGE_CHARS,
  );
  return isValid ? (messages as ChatMessage[]) : null;
}

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

    const { data: profile } = await admin
      .from('profiles')
      .select('store_id')
      .eq('id', userData.user.id)
      .single();
    const storeId = profile?.store_id as string | undefined;
    if (!storeId) return jsonError(403, 'Usuario sin sede asignada');

    const [{ data: settings }, { data: secret }] = await Promise.all([
      admin.from('chatbot_settings').select('enabled, model, system_prompt, temperature, max_tokens').eq('store_id', storeId).maybeSingle(),
      admin.from('chatbot_secrets').select('api_key').eq('store_id', storeId).maybeSingle(),
    ]);

    const config = settings as ChatbotSettingsRow | null;
    if (!config?.enabled) return jsonError(403, 'El asistente está desactivado para esta sede');

    const apiKey = (secret?.api_key as string | undefined) || process.env.OPENAI_API_KEY;
    if (!apiKey) return jsonError(503, 'El asistente no tiene clave de API configurada');

    const messages = parseMessages(await req.json());
    if (!messages) return jsonError(400, 'Mensajes inválidos');

    const openai = createOpenAI({
      baseURL: process.env.AI_GATEWAY_URL
        ? `${process.env.AI_GATEWAY_URL}/openai`
        : 'https://api.openai.com/v1',
      apiKey,
    });

    const result = streamText({
      model: openai(config.model),
      system: config.system_prompt,
      temperature: Number(config.temperature),
      maxOutputTokens: config.max_tokens,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error('Error in chat route:', error);
    return jsonError(500, 'Error procesando el chat');
  }
}
