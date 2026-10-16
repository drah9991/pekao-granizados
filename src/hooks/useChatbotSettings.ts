import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { typedFrom, supabaseRpc } from "@/integrations/supabase/types-extensions";
import type { ChatbotSettingsRow } from "@/integrations/supabase/types-extensions";

export type ChatbotSettingsInput = Pick<
  ChatbotSettingsRow,
  "enabled" | "model" | "system_prompt" | "welcome_message" | "temperature" | "max_tokens"
>;

export const CHATBOT_DEFAULTS: ChatbotSettingsInput = {
  enabled: false,
  model: "gpt-4o-mini",
  system_prompt:
    "Eres el Asistente Inteligente de Pekao Central, un sistema de Punto de Venta e Inventario para heladerías y tiendas de granizados. Ayuda de forma amigable y concisa a dueños y cajeros con dudas de ventas, inventario y cuadres de caja. No inventes funcionalidades.",
  welcome_message:
    "¡Hola! Soy el asistente virtual de Pekao Central. ¿En qué te puedo ayudar hoy con tu punto de venta o inventario?",
  temperature: 0.7,
  max_tokens: 500,
};

const queryKey = (storeId: string | null) => ["chatbot-settings", storeId];

export function useChatbotSettings(storeId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKey(storeId),
    enabled: !!storeId,
    staleTime: 60_000,
    queryFn: async (): Promise<ChatbotSettingsRow | null> => {
      const { data, error } = await typedFrom
        .chatbot_settings()
        .select("*")
        .eq("store_id", storeId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKey(storeId) });

  const saveSettings = useMutation({
    mutationFn: async (input: ChatbotSettingsInput) => {
      const { error } = await typedFrom
        .chatbot_settings()
        .upsert({ ...input, store_id: storeId as string, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setApiKey = useMutation({
    mutationFn: async (apiKey: string | null) => {
      const { error } = await supabaseRpc("set_chatbot_api_key", {
        p_store_id: storeId,
        p_api_key: apiKey ?? "",
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { ...query, settings: query.data ?? null, saveSettings, setApiKey };
}
