import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Globe, Activity, DollarSign, LayoutGrid } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdministration } from "@/hooks/useAdministration";
import StoreCard from "@/components/stores/StoreCard";
import StoreFormDialog from "@/components/stores/StoreFormDialog";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Stores() {
  const { stores, loading, isProcessing, refreshStores } = useAdministration();
  const { storeId, switchStore, userRole: currentUserRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [storeDialogIsOpen, setStoreDialogIsOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Record<string, unknown> | null>(null);
  const [switchingStoreId, setSwitchingStoreId] = useState<string | null>(null);

  const filteredStores = stores.filter(s =>
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.address || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManageStores = currentUserRole === "admin" || currentUserRole === "manager";
  const canSwitchAnyStore = currentUserRole === "admin" || currentUserRole === "manager" || currentUserRole === "owner";

  const handleSwitchStore = async (newStoreId: string) => {
    setSwitchingStoreId(newStoreId);
    try {
      const switchPromise = switchStore(newStoreId);
      toast.promise(switchPromise, {
        loading: "Reconectando nodo...",
        success: "Nodo conmutado exitosamente",
        error: "Error al reconectar nodo",
      });
      await switchPromise;
    } catch (e) {
      console.error(e);
    } finally {
      setSwitchingStoreId(null);
    }
  };

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
      >
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Red de Nodos
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Maestro de Sucursales • Global Architecture Pro Max
            </p>
          </div>
          <Button
            className="h-14 px-8 rounded-[1.5rem] bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all gap-3"
            onClick={() => { setEditingStore(null); setStoreDialogIsOpen(true); }}
            disabled={!canManageStores}
          >
            <Plus className="w-5 h-5" /> Expandir Red
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">TOTAL SUCURSALES</span>
                    <Globe className="w-5 h-5 text-primary shadow-glow-pro" />
                </div>
                <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground tabular-nums">{stores.length}</div>
            </Card>

            <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic">ESTADO OPERATIVO</span>
                    <Activity className="w-5 h-5 text-emerald-500 shadow-glow-pro" />
                </div>
                <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground">UP</div>
            </Card>

            <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro p-8">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 italic">MONEDA BASE</span>
                    <DollarSign className="w-5 h-5 text-amber-500 shadow-glow-pro" />
                </div>
                <div className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-foreground">COP</div>
            </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="relative group max-w-2xl">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <Input
            placeholder="LOCALIZAR NODO POR NOMBRE O DIRECCIÓN..."
            className="pl-16 h-16 bg-muted/30 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
           <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Mapas de Sucursales</h2>
              <div className="flex items-center gap-3 bg-muted/30 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground italic uppercase">
                 <LayoutGrid className="w-3.5 h-3.5" /> Visión Geográfica
              </div>
           </div>

           {loading ? (
               <div className="flex flex-col items-center justify-center py-24"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-pro" /></div>
           ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <AnimatePresence mode="popLayout">
                        {filteredStores.map((store, idx) => {
                            const isCurrentActive = store.id === storeId;
                            return (
                                <StoreCard 
                                    key={store.id} 
                                    store={store} 
                                    idx={idx} 
                                    onEdit={(s) => { setEditingStore(s); setStoreDialogIsOpen(true); }}
                                    canManage={canManageStores}
                                    isActive={isCurrentActive}
                                    canSwitch={canSwitchAnyStore}
                                    onSwitch={handleSwitchStore}
                                    isSwitching={switchingStoreId === store.id}
                                />
                            );
                        })}
                    </AnimatePresence>
                </div>
           )}
        </motion.div>

        <StoreFormDialog 
            isOpen={storeDialogIsOpen} 
            onClose={() => setStoreDialogIsOpen(false)} 
            editingStore={editingStore} 
            onSave={() => refreshStores()} 
            isProcessing={isProcessing}
        />
      </motion.div>
    </Layout>
  );
}
