import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Ruler, Info, Calculator, CheckCircle2, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Size = Tables<'sizes'>;

export default function SizesSettings() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  // Dialog states
  const [sizeDialogIsOpen, setSizeDialogIsOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    multiplier: "1.00",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchUserStoreId();
  }, []);

  useEffect(() => {
    if (userStoreId) {
      fetchSizes();
    }
  }, [userStoreId]);

  const fetchUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado.");
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) {
        setUserStoreId(profile.store_id);
      } else {
        toast.warning("No se encontró un ID de tienda para el usuario.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
    }
  };

  const fetchSizes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sizes")
        .select("*")
        .eq('store_id', userStoreId!)
        .order("multiplier", { ascending: true });

      if (error) throw error;
      setSizes(data || []);
    } catch (error: any) {
      console.error("Error fetching sizes:", error);
      toast.error("Error al cargar tamaños");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    if (!userStoreId) {
      toast.error("Debes tener una tienda asignada.");
      return;
    }
    setEditingSize(null);
    setFormData({
      name: "",
      multiplier: "1.00",
    });
    setSizeDialogIsOpen(true);
  };

  const openEditDialog = (size: Size) => {
    setEditingSize(size);
    setFormData({
      name: size.name,
      multiplier: size.multiplier.toFixed(2),
    });
    setSizeDialogIsOpen(true);
  };

  const handleSaveSize = async () => {
    const multiplierFloat = parseFloat(formData.multiplier);
    
    if (!formData.name || isNaN(multiplierFloat)) {
      toast.error("Nombre y multiplicador válido son obligatorios.");
      return;
    }
    
    if (multiplierFloat <= 0) {
      toast.error("El multiplicador debe ser mayor a cero.");
      return;
    }

    if (!userStoreId) return;

    setIsProcessing(true);
    try {
      const sizeData = {
        name: formData.name.trim(),
        multiplier: multiplierFloat,
        store_id: userStoreId,
      };

      if (editingSize) {
        const { error } = await supabase
          .from("sizes")
          .update(sizeData)
          .eq("id", editingSize.id);

        if (error) throw error;
        toast.success("Tamaño actualizado");
      } else {
        const { error } = await supabase
          .from("sizes")
          .insert([sizeData]);

        if (error) throw error;
        toast.success("Tamaño creado");
      }

      setSizeDialogIsOpen(false);
      fetchSizes();
    } catch (error: any) {
      console.error("Error saving size:", error);
      toast.error("Error al guardar tamaño");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSize = async (size: Size) => {
    if (!confirm(`¿Estás seguro de eliminar el tamaño "${size.name}"?`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("sizes")
        .delete()
        .eq("id", size.id);

      if (error) throw error;
      toast.success("Tamaño eliminado");
      fetchSizes();
    } catch (error: any) {
      console.error("Error deleting size:", error);
      toast.error("Error al eliminar tamaño");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSizes = sizes.filter(size =>
    size.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Ruler className="w-8 h-8 text-primary" />
            Gestión de Tamaños
          </h2>
          <p className="text-muted-foreground font-medium">
            Personaliza el cálculo de precios mediante multiplicadores decimales.
          </p>
        </div>
        <Button
          className="gradient-primary shadow-glow h-12 px-6 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
          onClick={openCreateDialog}
          disabled={!userStoreId}
        >
          <Plus className="w-5 h-5" />
          Nuevo Tamaño
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Search & List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar tamaño por nombre..."
              className="pl-12 h-14 bg-white/5 border-2 border-border focus:border-primary/50 rounded-2xl text-lg font-medium shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!userStoreId}
            />
          </div>

          <Card className="border-2 rounded-[2rem] overflow-hidden shadow-elevated bg-card/50 backdrop-blur-sm">
            <CardHeader className="bg-muted/50 border-b-2 border-border/50 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">Variantes Disponibles</CardTitle>
                  <CardDescription>Escala de precios basada en volumen/tamaño</CardDescription>
                </div>
                <Badge variant="outline" className="h-8 px-4 border-primary/20 text-primary font-bold rounded-full">
                  {filteredSizes.length} Definidos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full shadow-glow" />
                  <p className="text-muted-foreground font-medium animate-pulse">Consultando base de datos...</p>
                </div>
              ) : filteredSizes.length === 0 ? (
                <div className="py-20 text-center">
                   <div className="text-5xl opacity-20 mb-4">📏✨</div>
                   <p className="text-muted-foreground font-medium">No se encontraron tamaños</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-2 border-border/50">
                        <TableHead className="px-6 py-4 font-black uppercase text-[11px] tracking-widest">Nombre del Tamaño</TableHead>
                        <TableHead className="px-6 py-4 font-black uppercase text-[11px] tracking-widest text-center">Multiplicador</TableHead>
                        <TableHead className="px-6 py-4 font-black uppercase text-[11px] tracking-widest text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSizes.map((size) => (
                        <TableRow key={size.id} className="group border-b border-border/30 hover:bg-primary/5 transition-colors">
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Scale className="w-5 h-5" />
                              </div>
                              <span className="font-bold text-lg text-foreground">{size.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-center">
                            <Badge className={cn(
                              "text-sm font-black px-3 py-1 rounded-lg border-none",
                              size.multiplier === 1 ? "bg-slate-200 text-slate-800" : 
                              size.multiplier > 1 ? "gradient-secondary text-white shadow-md" : 
                              "bg-emerald-500 text-white shadow-md"
                            )}>
                              {size.multiplier.toFixed(2)}x
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                                onClick={() => openEditDialog(size)}
                              >
                                <Edit className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                                onClick={() => handleDeleteSize(size)}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Logic Explanation */}
        <div className="space-y-6">
          <Card className="border-2 rounded-[2rem] shadow-card bg-primary/5 border-primary/10 overflow-hidden relative">
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/10 rounded-full blur-3xl" />
            <CardHeader>
              <div className="flex items-center gap-3 text-primary mb-1">
                 <Calculator className="w-6 h-6" />
                 <CardTitle className="text-lg font-black uppercase tracking-tight">Cálculo Lógico</CardTitle>
              </div>
              <CardDescription className="text-foreground/70 font-medium">
                ¿Cómo funcionan los multiplicadores flotantes?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white/40 dark:bg-black/20 rounded-2xl space-y-2 border border-white/50 dark:border-white/5">
                <p className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Precio Final = Base × Multiplicador
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Si un Granizado cuesta <strong>$10,000</strong> y el tamaño es "12oz" con multiplicador <strong>1.50x</strong>, el sistema cobrará <strong>$15,000</strong> automáticamente.
                </p>
              </div>
              
              <div className="flex items-start gap-3 p-2">
                 <Info className="w-5 h-5 text-primary shrink-0 mt-1" />
                 <p className="text-[11px] text-muted-foreground leading-tight">
                   El sistema utiliza aritmética de punto flotante de alta precisión para asegurar que los decimales no se pierdan en transacciones de gran volumen.
                 </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Size Dialog */}
      <Dialog open={sizeDialogIsOpen} onOpenChange={setSizeDialogIsOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 border-none shadow-elevated">
          <DialogHeader className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-4">
               <Ruler className="w-7 h-7" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {editingSize ? "Editar Tamaño" : "Nuevo Tamaño"}
            </DialogTitle>
            <DialogDescription className="text-base font-medium">
              Define los valores para el cálculo automático de precios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveSize(); }} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre del Tamaño *</Label>
              <Input
                id="name"
                placeholder="Ej: 12oz, Jumbo, Pequeño"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-14 rounded-2xl bg-white/5 border-2 border-border focus:border-primary/50 text-lg font-bold px-5"
                required
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="multiplier" className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">Multiplicador Decimal *</Label>
              <div className="relative">
                <Input
                  id="multiplier"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="1.00"
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: e.target.value })}
                  className="h-14 rounded-2xl bg-white/5 border-2 border-border focus:border-primary/50 text-2xl font-black px-5 pr-12"
                  required
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xl font-black text-muted-foreground/30">x</span>
              </div>
              <p className="text-xs text-muted-foreground px-1 font-medium italic">
                Sugerencia: Use 1.00 para el tamaño base. Decimales permitidos (fondo flotante).
              </p>
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSizeDialogIsOpen(false)}
                disabled={isProcessing}
                className="h-14 rounded-2xl border-2 flex-1 font-bold text-muted-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !formData.name || !formData.multiplier}
                className="gradient-primary h-14 rounded-2xl flex-[2] font-black text-lg shadow-glow-primary active:scale-95 transition-all"
              >
                {isProcessing ? "Procesando..." : editingSize ? "Guardar Cambios" : "Crear Tamaño"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}