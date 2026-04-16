import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Tag, Code, ShieldCheck, Zap, LayoutGrid, Hash, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, Enums } from "@/integrations/supabase/types";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type SkuAcronym = Tables<'sku_acronyms'>;
type ProductType = Enums<'product_type'>;

const productTypeOptions: { value: ProductType; label: string }[] = [
  { value: "granizado", label: "Granizado" },
  { value: "topping", label: "Topping" },
  { value: "sachet", label: "Sachet" },
  { value: "sweet", label: "Dulce" },
  { value: "other", label: "Otro" },
];

export default function SkuAcronymsSettings() {
  const { userRole, isLoading: isLoadingAuth } = useAuth();
  const [acronyms, setAcronyms] = useState<SkuAcronym[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [acronymDialogIsOpen, setAcronymDialogIsOpen] = useState(false);
  const [editingAcronym, setEditingAcronym] = useState<SkuAcronym | null>(null);
  const [formData, setFormData] = useState({
    type: "" as ProductType | "",
    code: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAcronyms();
  }, []);

  const fetchAcronyms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sku_acronyms")
        .select("*")
        .order("type", { ascending: true });

      if (error) throw error;
      setAcronyms(data || []);
    } catch (error: any) {
      console.error("Error fetching SKU acronyms:", error);
      toast.error("Fallo técnico al cargar matriz de acrónimos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingAcronym(null);
    setFormData({ type: "", code: "" });
    setAcronymDialogIsOpen(true);
  };

  const openEditDialog = (acronym: SkuAcronym) => {
    setEditingAcronym(acronym);
    setFormData({
      type: acronym.type as ProductType,
      code: acronym.code,
    });
    setAcronymDialogIsOpen(true);
  };

  const handleSaveAcronym = async () => {
    if (!formData.type || !formData.code) {
      toast.error("Tipo y Código son obligatorios para la integridad SKU.");
      return;
    }

    setIsProcessing(true);
    try {
      const acronymData = {
        type: formData.type as ProductType,
        code: formData.code.toUpperCase().trim(),
      };

      if (editingAcronym) {
        const { error } = await supabase
          .from("sku_acronyms")
          .update(acronymData)
          .eq("id", editingAcronym.id);

        if (error) throw error;
        toast.success("Acrónimo SKU re-indexado");
      } else {
        const { error } = await supabase
          .from("sku_acronyms")
          .insert([acronymData]);

        if (error) throw error;
        toast.success("Nuevo acrónimo vinculado ✓");
      }

      setAcronymDialogIsOpen(false);
      fetchAcronyms();
    } catch (error: any) {
      console.error("Error saving SKU acronym:", error);
      toast.error("Error en persistencia: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAcronym = async (acronym: SkuAcronym) => {
    if (!canManageSkuAcronyms) {
      toast.error("Privilegios insuficientes para remoción de acrónimos.");
      return;
    }
    if (!confirm(`¿Confirmar remoción de "${acronym.code.toUpperCase()}" de la matriz SKU?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("sku_acronyms")
        .delete()
        .eq("id", acronym.id);

      if (error) throw error;
      toast.success("Acrónimo removido de la lógica global");
      fetchAcronyms();
    } catch (error: any) {
      console.error("Error deleting SKU acronym:", error);
      toast.error("Error al eliminar: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const canManageSkuAcronyms = userRole === "admin" || userRole === "manager";

  const filteredAcronyms = acronyms.filter(acronym =>
    acronym.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acronym.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">SKU Code Architecture</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mt-1 italic leading-relaxed">Definición de Identificadores Atómicos para el Inventario</p>
        </div>
        <Button
          className="h-14 px-8 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-[10px] shadow-glow-pro hover:shadow-primary/40 transition-all gap-4 border-none shadow-pro font-space-grotesk"
          onClick={openCreateDialog}
          disabled={!canManageSkuAcronyms}
        >
          <Plus className="w-5 h-5" /> Inyectar Acrónimo
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Search & Stats Bento */}
        <Card className="xl:col-span-12 bg-[#1C1F26] border border-white/5 rounded-[3.5rem] shadow-pro glass-pro overflow-hidden group">
            <div className="p-8 border-b border-white/5 bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative group/search flex-1 max-w-2xl">
                    <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within/search:text-primary transition-colors" />
                    <Input
                        placeholder="BUSCAR VÍNCULO POR TIPO O CÓDIGO SKU..."
                        className="pl-16 h-14 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-6 h-14 rounded-2xl border border-white/10 font-black text-[10px] text-white/40 italic uppercase tracking-[0.2em] leading-none">
                    <Code className="w-4 h-4 text-primary" /> {filteredAcronyms.length} CÓDIGOS VINCULADOS
                </div>
            </div>
            
            <CardContent className="p-0">
                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-6">
                        <Loader2 className="w-12 h-12 animate-spin text-primary shadow-glow-pro opacity-30" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/20 italic animate-pulse">Sincronizando Prefijos SKU...</p>
                    </div>
                ) : filteredAcronyms.length === 0 ? (
                    <div className="py-32 flex flex-col items-center justify-center opacity-20">
                        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-dashed border-white/20 mb-6">
                            <Tag className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase font-space-grotesk tracking-widest">Matriz Vacía</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest mt-2 italic">No se han detectado acrónimos en el kernel</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-b border-white/5 hover:bg-transparent">
                                    <TableHead className="px-10 h-16 font-black uppercase text-[10px] tracking-widest text-white/40 italic font-space-grotesk">TIPO OPERATIVO</TableHead>
                                    <TableHead className="px-10 h-16 font-black uppercase text-[10px] tracking-widest text-white/40 italic font-space-grotesk">ALPHA-CODE</TableHead>
                                    <TableHead className="px-10 h-16 font-black uppercase text-[10px] tracking-widest text-white/40 italic text-right font-space-grotesk">ACCIONES</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {filteredAcronyms.map((acronym, idx) => (
                                        <motion.tr 
                                            key={acronym.id}
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group border-b border-white/5 hover:bg-white/[0.04] transition-all"
                                        >
                                            <TableCell className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                        <LayoutGrid className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-sm font-black italic font-space-grotesk text-white tracking-widest uppercase">
                                                        {productTypeOptions.find(o => o.value === acronym.type)?.label || acronym.type}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-10 py-6">
                                                <div className="inline-flex items-center h-10 px-6 rounded-full text-xs font-black italic tracking-[0.3em] bg-white/5 text-primary border border-primary/20 shadow-glow-pro font-space-grotesk">
                                                    {acronym.code}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-10 py-6 text-right">
                                                <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 hover:bg-primary/20 hover:text-white transition-all shadow-pro"
                                                        onClick={() => openEditDialog(acronym)}
                                                        disabled={!canManageSkuAcronyms}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 hover:bg-rose-500/20 hover:text-rose-500 transition-all shadow-pro"
                                                        onClick={() => handleDeleteAcronym(acronym)}
                                                        disabled={!canManageSkuAcronyms}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-10 flex gap-8 items-start relative overflow-hidden group shadow-pro"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-primary group-hover:rotate-12 transition-transform duration-500">
            <Info className="w-6 h-6" />
        </div>
        <div className="relative z-10">
            <p className="text-[11px] font-black text-white/50 uppercase italic tracking-widest mb-3 leading-none">Protocolo de Nombrado Dinámico</p>
            <p className="text-[11px] text-white/30 font-bold uppercase italic leading-relaxed tracking-tight max-w-4xl">
              Los acrónimos definidos aquí actúan como los prefijos maestros en la generación automática de <strong className="text-primary/80">SKU Core Identifiers</strong>. Cualquier modificación afectará únicamente a los nuevos productos indexados, manteniendo la integridad histórica de los activos previos.
            </p>
        </div>
      </motion.div>

      {/* Modernized Dialog */}
      <Dialog open={acronymDialogIsOpen} onOpenChange={setAcronymDialogIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-white/10 rounded-[3rem] text-white shadow-pro">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-glow-pro">
                    <Hash className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                    {editingAcronym ? "Ajuste de Prefijo" : "Nuevo Enlace SKU"}
                   </DialogTitle>
                   <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Parametrización de Identificadores de Activos</DialogDescription>
                </div>
            </div>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveAcronym(); }} className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="type" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">TIPO DE PRODUCTO *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: ProductType) => setFormData({ ...formData, type: value })}
                disabled={!!editingAcronym}
              >
                <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl text-[11px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-primary/20 shadow-pro transition-all">
                  <SelectValue placeholder="SELECCIONAR VECTOR OPERATIVO" />
                </SelectTrigger>
                <SelectContent className="glass-pro border-white/10 rounded-2xl">
                  {productTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[10px] font-black uppercase italic p-3 border-b border-white/5 last:border-0 hover:bg-primary/10 transition-colors">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="code" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">ALPHA-CODE (3-4 CARACTERES) *</Label>
              <div className="relative group/field">
                <Input
                  id="code"
                  placeholder="EJ: GRN"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="h-20 bg-white/5 border-white/10 rounded-3xl text-4xl font-black italic font-space-grotesk focus:ring-primary/20 shadow-pro pl-10 transition-all uppercase tracking-widest"
                  maxLength={4}
                  required
                />
              </div>
              <p className="text-[9px] text-white/20 font-bold uppercase italic tracking-tighter px-2">
                Este código se inyectará como prefijo en todos los códigos de barra y referencias internas del sistema.
              </p>
            </div>

            <DialogFooter className="gap-4 pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAcronymDialogIsOpen(false)}
                disabled={isProcessing}
                className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40 hover:text-white hover:bg-white/5"
              >
                Abortar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.type || !formData.code}
                className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all font-space-grotesk"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "VINCULAR CÓDIGO ✓"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
