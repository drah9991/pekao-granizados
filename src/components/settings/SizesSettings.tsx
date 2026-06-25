import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Ruler, Info, Calculator, CheckCircle2, Scale, Zap, ShieldCheck, LayoutGrid, Loader2, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useConfigStore } from "@/store/useConfigStore";
import { useAuth } from "@/context/AuthContext";

type Size = Tables<'sizes'>;

export default function SizesSettings() {
  const { storeId: userStoreId } = useAuth();
  const sizes = useConfigStore((state) => state.sizes);
  const loading = useConfigStore((state) => state.loading);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [sizeDialogIsOpen, setSizeDialogIsOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    multiplier: "1.00",
    capacity_value: "0",
    capacity_unit: "ml"
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const openCreateDialog = () => {
    if (!userStoreId) {
      toast.error("Nodo no detectado en el perfil.");
      return;
    }
    setEditingSize(null);
    setFormData({
      name: "",
      multiplier: "1.00",
      capacity_value: "0",
      capacity_unit: "ml"
    });
    setSizeDialogIsOpen(true);
  };

  const openEditDialog = (size: Size) => {
    setEditingSize(size);
    setFormData({
      name: size.name,
      multiplier: size.multiplier.toFixed(2),
      capacity_value: size.capacity_value ? size.capacity_value.toString() : "0",
      capacity_unit: size.capacity_unit || "ml"
    });
    setSizeDialogIsOpen(true);
  };

  const handleSaveSize = async () => {
    const multiplierFloat = parseFloat(formData.multiplier);
    const capacityFloat = parseFloat(formData.capacity_value);
    
    if (!formData.name || isNaN(multiplierFloat) || isNaN(capacityFloat)) {
      toast.error("Identificador, multiplicador y capacidad válidos son obligatorios.");
      return;
    }
    
    if (!userStoreId) return;

    setIsProcessing(true);
    try {
      const sizeData = {
        name: formData.name.trim().toUpperCase(),
        multiplier: multiplierFloat,
        capacity_value: capacityFloat,
        capacity_unit: formData.capacity_unit,
        store_id: userStoreId,
      };

      if (editingSize) {
        const { error } = await supabase
          .from("sizes")
          .update(sizeData)
          .eq("id", editingSize.id)
          .eq("store_id", userStoreId);

        if (error) throw error;
        toast.success("Dimensión de ticket actualizada");
      } else {
        const { error } = await supabase
          .from("sizes")
          .insert([sizeData]);

        if (error) throw error;
        toast.success("Nueva dimensión indexada ✓");
      }

      setSizeDialogIsOpen(false);
      if (userStoreId) {
        await fetchConfig(userStoreId);
      }
    } catch (error: unknown) {
      console.error("Error saving size:", error);
      toast.error("Fallo técnico en persistencia de dimensiones");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSize = async (size: Size) => {
    if (!confirm(`¿Confirmar remoción definitiva del tamaño "${size.name.toUpperCase()}"?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("sizes")
        .delete()
        .eq("id", size.id)
        .eq("store_id", userStoreId);

      if (error) throw error;
      toast.success("Dimensión removida del ecosistema");
      if (userStoreId) {
        await fetchConfig(userStoreId);
      }
    } catch (error: unknown) {
      console.error("Error deleting size:", error);
      toast.error("Error al eliminar dimensión estructural");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSizes = sizes.filter(size =>
    size.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
           <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">Global Tier Architect</h2>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mt-1 italic leading-relaxed">Configuración de Dimensiones y Multiplicadores de Valor</p>
        </div>
        <Button
          className="h-14 px-8 rounded-2xl bg-indigo-500 text-white font-black italic uppercase tracking-widest text-[10px] shadow-glow-pro hover:shadow-indigo-500/40 transition-all gap-4 border-none shadow-pro font-space-grotesk"
          onClick={openCreateDialog}
          disabled={!userStoreId}
        >
          <Plus className="w-5 h-5" /> Indexar Dimensión
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Dimensions Bento */}
        <Card className="xl:col-span-8 bg-[#1C1F26] border border-white/5 rounded-[3.5rem] shadow-pro glass-pro overflow-hidden flex flex-col group">
          <CardHeader className="p-10 border-b border-white/5 bg-white/[0.01] flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-glow-pro">
                    <Ruler className="w-6 h-6" />
                </div>
                <div>
                   <CardTitle className="text-xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Dimension Matrix</CardTitle>
                   <CardDescription className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic tracking-widest leading-none">Vectores de Escalamiento de Precios</CardDescription>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 px-4 h-9 rounded-full border border-white/10 font-black text-[9px] text-white/40 italic uppercase tracking-widest leading-none">
                <LayoutGrid className="w-3.5 h-3.5" /> {filteredSizes.length} DEFINIDOS
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <div className="p-8 border-b border-white/5 bg-white/[0.005]">
                <div className="relative group/search">
                  <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within/search:text-indigo-400 transition-colors" />
                  <Input
                    placeholder="LOCALIZAR DIMENSIÓN POR NOMBRE..."
                    className="pl-16 h-14 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-indigo-500/50 focus:ring-indigo-500/20 shadow-pro transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead className="px-10 h-16 font-black uppercase text-[10px] tracking-widest text-white/40 italic font-space-grotesk">IDENTIFICADOR</TableHead>
                    <TableHead className="px-10 h-16 font-black uppercase text-[10px] tracking-widest text-white/40 italic text-center font-space-grotesk">MULTIPLICADOR</TableHead>
                    <TableHead className="px-10 h-16 font-black uppercase text-[10px] tracking-widest text-white/40 italic text-right font-space-grotesk">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-64 text-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4 opacity-20" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic animate-pulse">Sincronizando Matriz...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredSizes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-64 text-center opacity-20">
                         <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-dashed border-white/20">
                            <Scale className="w-8 h-8" />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-widest italic">Sin Dimensiones Indexadas</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredSizes.map((size, idx) => (
                        <motion.tr 
                          key={size.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group border-b border-white/5 hover:bg-white/[0.04] transition-all"
                        >
                          <TableCell className="px-10 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                <Scale className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-black italic font-space-grotesk text-white tracking-widest">{size.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-10 py-6 text-center">
                            <div className={cn(
                              "inline-flex items-center h-10 px-6 rounded-full text-xs font-black italic tracking-widest border font-space-grotesk",
                              size.multiplier === 1 ? "bg-white/5 text-white/40 border-white/10" : 
                              size.multiplier > 1 ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30 shadow-glow-pro" : 
                              "bg-emerald-500/20 text-emerald-500 border-emerald-500/30 shadow-glow-pro"
                            )}>
                              {size.multiplier.toFixed(2)}x
                            </div>
                          </TableCell>
                          <TableCell className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost" size="icon"
                                className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all shadow-pro"
                                onClick={() => openEditDialog(size)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 hover:bg-rose-500/20 hover:text-rose-500 transition-all shadow-pro"
                                onClick={() => handleDeleteSize(size)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Logic Bento */}
        <div className="xl:col-span-4 space-y-8">
           <Card className="bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-700">
                  <Calculator className="w-24 h-24 text-indigo-400" />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 shadow-glow-pro">
                         <Calculator className="w-6 h-6" />
                      </div>
                      <h4 className="text-lg font-black italic uppercase font-space-grotesk tracking-widest text-white">Logic Kernel</h4>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-indigo-500/20 relative group/calc">
                         <div className="flex items-center gap-2 mb-3">
                             <p className="text-[10px] font-black uppercase text-white/60 italic tracking-widest leading-none">Fórmula de Escalamiento</p>
                             <Popover>
                               <PopoverTrigger asChild>
                                 <button type="button" className="text-white/20 hover:text-indigo-400 transition-colors"><Info className="w-3.5 h-3.5" /></button>
                               </PopoverTrigger>
                               <PopoverContent className="w-64 bg-[#1C1F26] border-white/10 rounded-2xl shadow-pro p-4">
                                 <p className="text-[10px] font-bold text-white/60 italic uppercase tracking-widest leading-relaxed">Ej: Si el Base del producto es $10.000 y el tamaño es Jumbo (1.5x), el precio final al cobrar será de $15.000.</p>
                               </PopoverContent>
                             </Popover>
                         </div>
                         <div className="text-xl font-black italic font-space-grotesk text-white flex items-center justify-between">
                            <span>BASE</span>
                            <span className="text-indigo-400">×</span>
                            <span className="bg-indigo-500/20 px-3 py-1 rounded-lg text-indigo-400">MULT</span>
                         </div>
                         <div className="mt-6 pt-6 border-t border-white/5">
                            <p className="text-[10px] text-white/30 font-bold uppercase italic leading-relaxed tracking-tight">
                                El sistema calcula dinámicamente el valor final aplicando el factor decimal a la base definida en el catálogo de productos.
                            </p>
                         </div>
                      </div>

                      <div className="flex items-start gap-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                         <Info className="w-5 h-5 text-amber-500/40 shrink-0 mt-1" />
                         <p className="text-[10px] text-amber-500/60 font-black uppercase italic leading-tight tracking-tight">
                            Aritmética Float-Point activa. El redondeo se aplica según la configuración fiscal de la sucursal.
                         </p>
                      </div>

                      <Button variant="ghost" className="w-full h-14 rounded-2xl border border-white/5 text-[9px] font-black uppercase italic tracking-widest text-white/40 hover:bg-white/5 hover:text-white group-hover:border-indigo-500/30 transition-all">
                        DOCUMENTACIÓN TÉCNICA <ArrowUpRight className="w-4 h-4 ml-2 opacity-30" />
                      </Button>
                  </div>
              </div>
           </Card>

           <Card className="bg-[#1C1F26] border border-white/5 rounded-[3rem] shadow-pro glass-pro p-10 relative overflow-hidden group">
              <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500 shadow-glow-pro">
                     <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-black italic uppercase font-space-grotesk tracking-widest text-white">Atomic Sync</h4>
              </div>
              <p className="text-[10px] text-white/40 font-bold uppercase italic leading-relaxed">
                Todas las dimensiones indexadas se replican instantáneamente en los nodos POS de la red para asegurar coherencia en la facturación global.
              </p>
           </Card>
        </div>
      </div>

      {/* Modernized Dialog */}
      <Dialog open={sizeDialogIsOpen} onOpenChange={setSizeDialogIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-white/10 rounded-[3rem] text-white shadow-pro">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-glow-pro">
                    <Ruler className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                    {editingSize ? "Ajuste Dimensional" : "Indexar Escala"}
                   </DialogTitle>
                   <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Parametrización de Vectores de Precios</DialogDescription>
                </div>
            </div>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveSize(); }} className="space-y-8">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">IDENTIFICADOR DE TAMAÑO *</Label>
              <Input
                id="name"
                placeholder="EJ: JUMBO 16OZ"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                className="h-16 bg-white/5 border-white/10 rounded-2xl text-[11px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-indigo-500/20 shadow-pro transition-all"
                required
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                  <Label htmlFor="multiplier" className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic">FACTOR MULTIPLICADOR *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-white/20 hover:text-indigo-400 transition-colors"><Info className="w-3.5 h-3.5" /></button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 bg-[#1C1F26] border-white/10 rounded-2xl shadow-pro p-4">
                      <p className="text-[10px] font-bold text-white/60 italic uppercase tracking-widest leading-relaxed">Valor por el que se multiplicará el precio base del catálogo. Ej. 1.25 para aumentar 25%.</p>
                    </PopoverContent>
                  </Popover>
              </div>
              <div className="relative group/field">
                <Input
                  id="multiplier"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1.00"
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                  className="h-20 bg-white/5 border-white/10 rounded-3xl text-4xl font-black italic font-space-grotesk focus:ring-indigo-500/20 shadow-pro pl-12 transition-all"
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 font-black italic text-2xl group-hover/field:text-indigo-500/40 transition-colors">×</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">CAPACIDAD REAL</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.capacity_value}
                  onChange={(e) => setFormData({ ...formData, capacity_value: e.target.value })}
                  className="h-14 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-indigo-500/20 shadow-pro"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2">UNIDAD</Label>
                <Select value={formData.capacity_unit} onValueChange={(val: string) => setFormData({...formData, capacity_unit: val})}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-[10px] font-black uppercase italic tracking-widest font-space-grotesk focus:ring-indigo-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-pro border-white/10 rounded-2xl">
                    <SelectItem value="ml" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Mililitros (ml)</SelectItem>
                    <SelectItem value="oz" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Onzas (oz)</SelectItem>
                    <SelectItem value="gr" className="p-4 border-b border-white/5 last:border-0 text-[10px] font-black uppercase italic">Gramos (gr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-4 pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSizeDialogIsOpen(false)}
                disabled={isProcessing}
                className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40 hover:text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.name || !formData.multiplier}
                className="flex-[2] h-14 rounded-2xl bg-indigo-500 text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-indigo-500/40 transition-all font-space-grotesk"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "VINCULAR DIMENSIÓN ✓"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}