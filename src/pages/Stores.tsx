import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Store as StoreIcon, MapPin, DollarSign, Settings as SettingsIcon, LayoutGrid, Globe, ShieldCheck, Map, Percent, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables, Enums } from "@/integrations/supabase/types";
import Layout from "@/components/Layout";
import { createNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Store = Tables<'stores'>;
type AppRole = Enums<'app_role'>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

export default function Stores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
  const [currentUserStoreId, setCurrentUserStoreId] = useState<string | null>(null);

  const [storeDialogIsOpen, setStoreDialogIsOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    currency: "COP",
    tax_rate: "0",
    config: {} as any,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchCurrentUserRoleAndStore();
  }, []);

  const fetchCurrentUserRoleAndStore = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setCurrentUserRole((roleData?.role as AppRole) || null);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();
      
      setCurrentUserStoreId(profileData?.store_id || null);
    }
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setStores(data || []);
    } catch (error: any) {
      console.error("Error fetching stores:", error);
      toast.error("Error al cargar tiendas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingStore(null);
    setFormData({
      name: "",
      address: "",
      currency: "COP",
      tax_rate: "0",
      config: {},
    });
    setStoreDialogIsOpen(true);
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address || "",
      currency: store.currency || "COP",
      tax_rate: store.tax_rate?.toString() || "0",
      config: store.config || {},
    });
    setStoreDialogIsOpen(true);
  };

  const handleSaveStore = async () => {
    if (!formData.name) {
      toast.error("El nombre de la tienda es obligatorio.");
      return;
    }

    setIsProcessing(true);
    try {
      const storeData = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        currency: formData.currency.trim(),
        tax_rate: parseFloat(formData.tax_rate),
        config: formData.config,
      };

      if (editingStore) {
        const { error } = await supabase
          .from("stores")
          .update(storeData)
          .eq("id", editingStore.id);

        if (error) throw error;
        toast.success("Nodo actualizado correctamente.");
      } else {
        const { error } = await supabase
          .from("stores")
          .insert([storeData]);

        if (error) throw error;
        toast.success("Nueva sucursal indexada.");
      }

      setStoreDialogIsOpen(false);
      fetchStores();
    } catch (error: any) {
      console.error("Error saving store:", error);
      toast.error("Error en la operación: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteStore = async (store: Store) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("stores")
        .delete()
        .eq("id", store.id);

      if (error) throw error;
      toast.success("Sucursal removida del ecosistema.");
      fetchStores();
    } catch (error: any) {
      console.error("Error deleting store:", error);
      toast.error("Fallo en eliminación: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const canManageStores = currentUserRole === "admin" || currentUserRole === "manager";

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (store.currency || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Red de Nodos
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Maestro de Tiendas • Global Architecture Pro Max
            </p>
          </div>
          <Button
            className="h-14 px-8 rounded-[1.5rem] bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all gap-3"
            onClick={openCreateDialog}
            disabled={!canManageStores}
          >
            <Plus className="w-5 h-5" /> Expandir Red
          </Button>
        </motion.div>

        {/* Global Metrics Bento */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">TOTAL SUCURSALES</span>
                    <Globe className="w-5 h-5 text-primary shadow-glow-pro" />
                </div>
                <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground tabular-nums">{stores.length}</div>
                <div className="mt-2 text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest italic">Nodos Activos en Red</div>
            </Card>

            <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">ESTADO OPERATIVO</span>
                    <Activity className="w-5 h-5 text-emerald-500 shadow-glow-pro" />
                </div>
                <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground">UP</div>
                <div className="mt-2 text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest italic">Sincronización Centralizada al 100%</div>
            </Card>

            <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 italic font-space-grotesk">MONEDA BASE</span>
                    <DollarSign className="w-5 h-5 text-amber-500 shadow-glow-pro" />
                </div>
                <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground">COP</div>
                <div className="mt-2 text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest italic">Standard Fiat Matrix</div>
            </Card>
        </motion.div>

        {/* Search Matrix */}
        <motion.div variants={itemVariants} className="relative group max-w-2xl">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="LOCALIZAR NODO POR NOMBRE O DIRECCIÓN..."
            className="pl-16 h-16 bg-muted/30 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>

        {/* Node Grid */}
        <motion.div variants={itemVariants}>
           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Mapas de Sucursales</h2>
              <div className="flex items-center gap-3 bg-muted/30 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground italic uppercase">
                 <LayoutGrid className="w-3.5 h-3.5" /> Visión Geográfica
              </div>
           </div>

           {loading ? (
               <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-glow-pro" />
                  <p className="text-primary font-black uppercase tracking-widest text-[10px] italic animate-pulse">Escaneando topología de red...</p>
               </div>
           ) : filteredStores.length === 0 ? (
               <Card className="bg-muted border border-border rounded-[3.5rem] p-32 shadow-pro glass-pro text-center opacity-30">
                  <Map className="w-24 h-24 mx-auto mb-6 text-foreground" />
                  <h3 className="text-xl font-black italic uppercase tracking-widest text-foreground">SIN NODOS</h3>
                  <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] mt-3">No se encontraron puntos de venta registrados.</p>
               </Card>
           ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredStores.map((store, idx) => (
                            <motion.div
                                key={store.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.03 }}
                                className="bg-muted border border-border rounded-[3rem] p-10 glass-pro hover:bg-muted/80 hover:border-primary/20 hover:shadow-pro transition-all group relative overflow-hidden"
                            >
                                <div className="flex flex-col gap-8 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-pro group-hover:scale-110 transition-transform duration-500">
                                                <StoreIcon className="w-8 h-8 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl lg:text-3xl font-black italic font-space-grotesk text-foreground tracking-tighter group-hover:text-primary transition-colors truncate pr-2">
                                                    {store.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow-pro" />
                                                    <span className="text-[9px] font-black text-emerald-500 uppercase italic tracking-widest leading-none">NODO ACTIVO</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-muted border border-border hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                                                onClick={() => openEditDialog(store)}
                                                disabled={!canManageStores}
                                            >
                                                <SettingsIcon className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-muted border border-border hover:bg-rose-500/20 hover:text-rose-500 transition-all shadow-pro"
                                                onClick={() => handleDeleteStore(store)}
                                                disabled={!canManageStores}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                                                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic mb-2">LOCALIZACIÓN GEOGRÁFICA</p>
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                                                    <span className="text-xs font-black italic uppercase text-muted-foreground/60 tracking-tight leading-relaxed">
                                                        {store.address || 'COORDENADAS NO INDEXADAS'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                                                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic mb-2">FISCALIDAD (IVA)</p>
                                                    <div className="flex items-center gap-2 text-xl font-black italic font-space-grotesk text-amber-500">
                                                        <Percent className="w-4 h-4 text-amber-500/40" /> {store.tax_rate}%
                                                    </div>
                                                </div>
                                                <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                                                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic mb-2">PROTOCOL MATRIX</p>
                                                    <div className="flex items-center gap-2 text-xl font-black italic font-space-grotesk text-primary">
                                                        <ShieldCheck className="w-4 h-4 text-primary/40" /> 2.0
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-6 border-t border-border/50">
                                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase italic tracking-widest">NODE ID:</span>
                                        <span className="text-[9px] font-bold text-muted-foreground/60 italic font-space-grotesk truncate">{store.id}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
           )}
        </motion.div>

        {/* Form Dialog */}
        <Dialog open={storeDialogIsOpen} onOpenChange={setStoreDialogIsOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-border rounded-[3rem] text-foreground shadow-pro">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro text-primary">
                    <StoreIcon className="w-6 h-6" />
                 </div>
                 <div>
                    <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                       {editingStore ? "Ajuste de Nodo" : "Expansión de Red"}
                    </DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Configuración Técnica de Sucursal y Parámetros Fiscales</DialogDescription>
                 </div>
              </div>
            </DialogHeader>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveStore(); }} className="space-y-6">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">NOMBRE DE SUCURSAL</Label>
                        <Input
                            placeholder="EJ: PEKAO GRANIZADOS - CENTRO"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                            className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic uppercase focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">DIRECCIÓN FÍSICA / AGENCIA</Label>
                        <Textarea
                            placeholder="DIRECCIÓN COMPLETA PARA FACTURACIÓN LEGAL..."
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value.toUpperCase() })}
                            className="bg-muted/40 border-border rounded-2xl text-xs font-black italic focus:ring-primary/20 min-h-[100px]"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">MONEDA (CURRENCY)</Label>
                            <Input
                                placeholder="EJ: COP"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                                className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic focus:ring-primary/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">TASA IMPOSITIVA IVA (%)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="EJ: 19"
                                value={formData.tax_rate}
                                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                                className="h-14 bg-muted/40 border-border rounded-2xl text-xs font-black italic focus:ring-primary/20"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStoreDialogIsOpen(false)}
                        disabled={isProcessing}
                        className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        ABORTAR CAMBIOS
                    </Button>
                    <Button
                        type="submit"
                        disabled={isProcessing || !formData.name}
                        className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all font-space-grotesk"
                    >
                        {isProcessing ? "VALIDANDO..." : editingStore ? "GUARDAR NODO ✓" : "INDEXAR NODO ✓"}
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}
