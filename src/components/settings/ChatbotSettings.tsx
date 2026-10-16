import { useEffect, useState } from "react";
import { Bot, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { CHATBOT_DEFAULTS, useChatbotSettings } from "@/hooks/useChatbotSettings";
import type { ChatbotSettingsInput } from "@/hooks/useChatbotSettings";

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini (rápido y económico)" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { value: "gpt-4o", label: "GPT-4o (más preciso, más costoso)" },
];

const fieldLabel = "text-[10px] font-black uppercase tracking-widest text-muted-foreground";
const fieldInput = "bg-slate-900 border-white/10 rounded-lg text-xs";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Error desconocido");

export default function ChatbotSettings() {
  const { storeId } = useAuth();
  const { settings, isLoading, saveSettings, setApiKey } = useChatbotSettings(storeId);
  const [form, setForm] = useState<ChatbotSettingsInput>(CHATBOT_DEFAULTS);
  const [apiKeyInput, setApiKeyInput] = useState("");

  useEffect(() => {
    if (!settings) return;
    setForm({
      enabled: settings.enabled,
      model: settings.model,
      system_prompt: settings.system_prompt,
      welcome_message: settings.welcome_message,
      temperature: Number(settings.temperature),
      max_tokens: settings.max_tokens,
    });
  }, [settings]);

  const update = <K extends keyof ChatbotSettingsInput>(key: K, value: ChatbotSettingsInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync(form);
      toast.success("Configuración del asistente guardada");
    } catch (error) {
      toast.error("No se pudo guardar: " + errorMessage(error));
    }
  };

  const handleSaveKey = async (value: string | null) => {
    try {
      await setApiKey.mutateAsync(value);
      setApiKeyInput("");
      toast.success(value ? "Clave de API guardada" : "Clave de API eliminada");
    } catch (error) {
      toast.error("No se pudo actualizar la clave: " + errorMessage(error));
    }
  };

  if (!storeId || isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-white">Asistente IA</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-1 italic">
              Parámetros del chatbot de esta sede
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 h-11 rounded-full border border-white/10">
          <Label htmlFor="chatbot-enabled" className={fieldLabel}>
            {form.enabled ? "Activo" : "Desactivado"}
          </Label>
          <Switch id="chatbot-enabled" checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <span className={fieldLabel}>Clave de API de OpenAI</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {settings?.api_key_hint
            ? `Clave configurada: ••••••••${settings.api_key_hint}. Por seguridad nunca se vuelve a mostrar.`
            : "Sin clave propia: se usará la clave global del servidor si existe."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="password"
            autoComplete="off"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-..."
            className={fieldInput}
          />
          <Button onClick={() => handleSaveKey(apiKeyInput)} disabled={!apiKeyInput.trim() || setApiKey.isPending}>
            {setApiKey.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar clave"}
          </Button>
          {settings?.api_key_hint && (
            <Button variant="outline" onClick={() => handleSaveKey(null)} disabled={setApiKey.isPending}>
              <Trash2 className="w-4 h-4 mr-2" /> Quitar
            </Button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label className={fieldLabel}>Modelo</Label>
          <Select value={form.model} onValueChange={(v) => update("model", v)}>
            <SelectTrigger className={fieldInput}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={fieldLabel}>Creatividad (0 - 2)</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={form.temperature}
            onChange={(e) => update("temperature", Math.min(2, Math.max(0, Number(e.target.value))))}
            className={fieldInput}
          />
        </div>
        <div className="space-y-2">
          <Label className={fieldLabel}>Longitud máx. de respuesta (tokens)</Label>
          <Input
            type="number"
            min={50}
            max={4000}
            step={50}
            value={form.max_tokens}
            onChange={(e) => update("max_tokens", Math.min(4000, Math.max(50, Math.round(Number(e.target.value)))))}
            className={fieldInput}
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <Label className={fieldLabel}>Mensaje de bienvenida</Label>
          <Textarea
            rows={2}
            value={form.welcome_message}
            onChange={(e) => update("welcome_message", e.target.value)}
            className={fieldInput}
          />
        </div>
        <div className="space-y-2">
          <Label className={fieldLabel}>Instrucciones del asistente (prompt de sistema)</Label>
          <Textarea
            rows={8}
            value={form.system_prompt}
            onChange={(e) => update("system_prompt", e.target.value)}
            className={fieldInput}
          />
          <p className="text-[11px] text-muted-foreground">
            Define el tono, el alcance y lo que el asistente no debe hacer. Se aplica a todas las conversaciones de esta sede.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveSettings.isPending || !form.system_prompt.trim()}>
          {saveSettings.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
