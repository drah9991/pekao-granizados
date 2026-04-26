import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Tag, Box, Scale, Droplet, Paintbrush, Loader2, Info, Zap, LayoutGrid, Check, Settings as SettingsIcon, ShieldCheck, Activity, Trash2, Hexagon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type ProductTypeConfig = {
  code: string;
  label: string;
  emoji_icon: string;
  color_theme: string;
  sales_mode: "sizes" | "unit" | "weight";
  track_mixture_inventory: boolean;
  inventory_unit: string;
  allow_toppings: boolean;
  requires_recipe: boolean;
  active: boolean;
  store_id: string | null;
};

const COLOR_PRESETS = [
  { name: "Cyan", class: "bg-cyan-500", glow: "shadow-cyan-500/40" },
  { name: "Rose", class: "bg-rose-500", glow: "shadow-rose-500/40" },
  { name: "Violet", class: "bg-violet-500", glow: "shadow-violet-500/40" },
  { name: "Amber", class: "bg-amber-500", glow: "shadow-amber-500/40" },
  { name: "Emerald", class: "bg-emerald-500", glow: "shadow-emerald-500/40" },
  { name: "Blue", class: "bg-blue-500", glow: "shadow-blue-500/40" },
  { name: "Slate", class: "bg-slate-500", glow: "shadow-slate-500/40" },
];

export default function ProductTypesMaster() {
  const [types, setTypes] = useState<ProductTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductTypeConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ProductTypeConfig>>({
    code: "",
    label: "",
    emoji_icon: "📦",
    color_theme: "bg-slate-500",
    sales_mode: "unit",
    track_mixture_inventory: false,
    inventory_unit: "un",
    allow_toppings: false,
    requires_recipe: false,
    active: true,
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_types_config")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          toast.error("ERROR: Matriz de Tipos no migrada en el Kernel.");
        } else {
          throw error;
        }
      }
      if (data) setTypes(data as ProductTypeConfig[]);
    } catch (err: any) {
      console.error("Error fetching product types:", err);
      toast.error("Fallo técnico en sincronización de tipos.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (typeToEdit?: ProductTypeConfig) => {
    if (typeToEdit) {
      setEditingType(typeToEdit);
      setFormData(typeToEdit);
    } else {
      setEditingType(null);
      setFormData({
        code: "",
        label: "",
        emoji_icon: "📦",
        color_theme: "bg-slate-500",
        sales_mode: "unit",
        track_mixture_inventory: false,
        inventory_unit: "un",
        allow_toppings: false,
        requires_recipe: false,
        active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.label) {
      toast.error("Código y Etiqueta son requeridos para indexar.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: userStore } = await supabase.from("profiles").select("store_id").eq("id", (await supabase.auth.getUser()).data.user?.id).single();

      const payload = {
        ...formData,
        code: formData.code.toLowerCase().replace(/\s+/g, '_'),
        store_id: editingType ? editingType.store_id : userStore?.store_id || null
      };

      if (editingType) {
        const { error } = await supabase
          .from("product_types_config")
          .update(payload)
          .eq("code", editingType.code);
        if (error) throw error;
        toast.success("Tipo operativo re-calibrado ✓");
      } else {
        const { error } = await supabase
          .from("product_types_config")
          .insert(payload);
        if (error) throw error;
        toast.success("Nuevo tipo indexado en el ecosistema");
      }

      setDialogOpen(false);
      fetchTypes();
    } catch (err: any) {
      console.error("Error saving product type:", err);
      toast.error("Fallo técnico en persistencia: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary italic animate-pulse">Indexando Matriz de Categorías...</p>
        </div>
    );
  }

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div>
          <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">Category Engine Master</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-1 italic leading-relaxed">Parametrización Operativa y Lógica de Venta</p>
        </div>
        <Button 
            onClick={() => handleOpenDialog()} 
            className="h-14 px-8 rounded-2xl bg-indigo-500 text-white font-black italic uppercase tracking-widest text-[10px] shadow-glow-pro hover:shadow-indigo-500/40 transition-all gap-4 border-none shadow-pro font-space-grotesk"
        >
          <Plus className="w-5 h-5" /> Nuevo Protocolo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
            {types.map((type, idx) => (
            <motion.div 
                key={type.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                    "relative p-8 rounded-[2.5rem] border border-white/5 bg-[#1C1F26] shadow-pro glass-pro transition-all cursor-pointer group hover:border-primary/20 hover:shadow-glow-pro duration-700 overflow-hidden",
                    !type.active && 'opacity-40 grayscale'
                )}
                onClick={() => handleOpenDialog(type)}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
                
                {/* Visual Preview Header */}
                <div className="flex items-center gap-6 mb-8 relative z-10">
                    <div className={cn(
                        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-pro transition-transform duration-700 group-hover:scale-110 border border-white/10",
                        type.color_theme
                    )}>
                        <span className="drop-shadow-2xl">{type.emoji_icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-black italic uppercase font-space-grotesk text-white tracking-tighter truncate group-hover:text-primary transition-colors">
                            {type.label}
                        </h3>
                        <code className="text-[9px] uppercase font-black text-white/20 tracking-[0.3em] italic leading-none">{type.code}</code>
                    </div>
                </div>

                {/* Technical Parameters Badges */}
                <div className="space-y-3 relative z-10">
                    {[
                        { icon: Box, label: "MODO VENTA", value: type.sales_mode },
                        { icon: Droplet, label: "FLUJO VOL.", value: type.track_mixture_inventory ? 'ACTIVO' : 'UNITARIO', color: type.track_mixture_inventory ? 'text-emerald-500' : 'text-white/40' },
                        { icon: Scale, label: "MUNIT BASE", value: type.inventory_unit }
                    ].map((param, pIdx) => (
                        <div key={pIdx} className="flex items-center justify-between text-[9px] p-3 px-4 bg-white/[0.02] border border-white/5 rounded-2xl group-hover:bg-white/[0.04] transition-colors">
                            <span className="flex items-center gap-2 text-white/20 font-black uppercase tracking-widest italic font-space-grotesk">
                                <param.icon className="w-3.5 h-3.5" /> {param.label}
                            </span>
                            <span className={cn("font-black uppercase italic tracking-widest", param.color || "text-white/60")}>
                                {param.value}
                            </span>
                        </div>
                    ))}
                </div>
                
                {/* Visual Indicator of Mixture Track */}
                {type.track_mixture_inventory && (
                    <div className="absolute bottom-4 right-8 text-[8px] font-black italic tracking-widest text-[#00FFA3] animate-pulse flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#00FFA3] rounded-full" /> ALPHA MIX ENABLED
                    </div>
                )}
            </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-white/10 rounded-[3.5rem] text-white shadow-pro">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-glow-pro font-space-grotesk">
                    <Hexagon className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                    {editingType ? `Calibración: ${editingType.label}` : 'Nuevo Protocolo de Producto'}
                   </DialogTitle>
                   <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Arquitectura Técnica y Reglas de Venta</DialogDescription>
                </div>
            </div>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {/* Visual Section */}
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.30em] text-indigo-400 flex items-center gap-2 italic">
                <Paintbrush className="w-4 h-4" /> 01. IDENTIDAD VISUAL POS
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">ETIQUETA PÚBLICA</Label>
                  <Input 
                    value={formData.label || ""} 
                    onChange={e => setFormData({...formData, label: e.target.value.toUpperCase()})} 
                    placeholder="EJ: GRANIZADOS MAESTROS" 
                    className="h-14 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-primary/20 shadow-pro"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">ÍCONO / EMOJI</Label>
                  <Input 
                    value={formData.emoji_icon || ""} 
                    onChange={e => setFormData({...formData, emoji_icon: e.target.value})} 
                    className="h-14 text-2xl text-center bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">CHROMA THEME</Label>
                <div className="flex gap-4 flex-wrap p-6 bg-white/[0.03] rounded-[2rem] border border-white/5">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color.class}
                      onClick={() => setFormData({...formData, color_theme: color.class})}
                      className={cn(
                        "w-12 h-12 rounded-2xl transition-all duration-500 shadow-pro border-2 border-transparent",
                        color.class,
                        formData.color_theme === color.class ? cn("ring-4 ring-indigo-500 ring-offset-4 ring-offset-[#1C1F26] scale-110", color.glow) : "opacity-40 hover:opacity-100"
                      )}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {!editingType && (
                <div className="space-y-2 group">
                  <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">CÓDIGO ALPHA-KEY (SISTEMA)</Label>
                  <Input 
                    value={formData.code || ""} 
                    onChange={e => setFormData({...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_')})} 
                    placeholder="ej: granizado_premium" 
                    className="h-14 bg-white/5 border-white/10 rounded-2xl font-mono text-xs uppercase tracking-widest font-black text-primary italic"
                  />
                  <p className="text-[8px] text-white/20 font-bold uppercase italic tracking-widest leading-none pl-2">Vínculo atómico estático una vez creado.</p>
                </div>
              )}
            </div>

            {/* Technical Parameterization */}
            <div className="space-y-6 pt-6 border-t border-white/5">
              <h4 className="text-[10px] font-black uppercase tracking-[0.30em] text-indigo-400 flex items-center gap-2 italic">
                <Box className="w-4 h-4" /> 02. LÓGICA CORE & INVENTARIO
              </h4>

              <div className="space-y-3">
                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">VECTOR DE VENTA (SALES MODE)</Label>
                <Select value={formData.sales_mode} onValueChange={(val: any) => setFormData({...formData, sales_mode: val})}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-pro border-white/10 rounded-2xl">
                    <SelectItem value="sizes" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Por Tamaños / Dimensiones (Vasos)</SelectItem>
                    <SelectItem value="unit" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Por Unidad Discreta (Toppings, Dulces)</SelectItem>
                    <SelectItem value="weight" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Por Carga Gravimétrica (Peso)</SelectItem>
                  </SelectContent>
                </Select>
                {formData.sales_mode === 'sizes' && (
                  <div className="flex items-start gap-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 animate-in fade-in slide-in-from-top-2">
                     <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                     <p className="text-[10px] text-indigo-400 font-bold uppercase italic leading-none tracking-tight">
                        Requiere selección de dimensión en el Punto de Venta.
                     </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { label: "TRACKING VOLUMÉTRICO", desc: "Usa tanques y litros", key: "track_mixture_inventory" },
                    { label: "FÓRMULA OBLIGATORIA", desc: "Bloquea venta sin receta", key: "requires_recipe" },
                    { label: "MÓDULOS EXTRA", desc: "Permite Toppings/Sachets", key: "allow_toppings" },
                    { label: "ESTADO ACTIVO", desc: "Visibilidad en el sistema", key: "active" }
                ].map((toggle) => (
                    <div key={toggle.key} className="flex items-center justify-between p-5 rounded-[2rem] border border-white/5 bg-white/[0.02]">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest italic text-white/60">{toggle.label}</Label>
                            <p className="text-[8px] text-white/20 font-bold uppercase italic tracking-tighter leading-none">{toggle.desc}</p>
                        </div>
                        <Switch 
                            checked={formData[toggle.key as keyof ProductTypeConfig] as boolean} 
                            onCheckedChange={(c) => setFormData({...formData, [toggle.key]: c})} 
                            className="scale-90 data-[state=checked]:bg-indigo-500"
                        />
                    </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">UNIDAD DE MEDIDA BASE</Label>
                <Select value={formData.inventory_unit} onValueChange={(val: string) => setFormData({...formData, inventory_unit: val})}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-pro border-white/10 rounded-2xl">
                    <SelectItem value="ml" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Mililitros (ml) - Líquidos</SelectItem>
                    <SelectItem value="un" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Unidades (un) - Pre-empaquetados</SelectItem>
                    <SelectItem value="gr" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Gramos (gr) - Sólidos/Polvos</SelectItem>
                    <SelectItem value="oz" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Onzas (oz)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-4 mt-6">
            <Button variant="ghost" className="h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40 hover:text-white hover:bg-white/5" onClick={() => setDialogOpen(false)}>
              Abortar Sincronización
            </Button>
            <Button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="h-14 px-10 rounded-2xl bg-indigo-500 text-white font-black italic uppercase tracking-widest text-[10px] shadow-glow-pro hover:shadow-indigo-500/40 transition-all font-space-grotesk gap-3 border-none"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingType ? "RE-CALIBRAR TIPO ✓" : "INDEXAR TIPO ✓"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
