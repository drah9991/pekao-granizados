import { useInventory } from "@/hooks/useInventory";
import { InventoryKPIs } from "@/components/inventory/InventoryKPIs";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { InventoryGrid } from "@/components/inventory/InventoryGrid";
import { InventoryDialogs } from "@/components/inventory/InventoryDialogs";
import MixManagement from "@/components/inventory/MixManagement";
import InventoryEntry from "@/components/inventory/InventoryEntry";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Package, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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

export default function Inventory() {
  const {
    stores,
    selectedStore,
    setSelectedStore,
    searchQuery,
    setSearchQuery,
    filterLowStock,
    setFilterLowStock,
    filterProductType,
    setFilterProductType,
    loading,
    filteredItems,
    stats,
    refreshStock,
    adjustDialog
  } = useInventory();

  const { storeId: userStoreId } = useAuth();

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
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-pro group-hover:scale-110 transition-all duration-700 overflow-hidden relative">
                    <Package className="w-10 h-10 text-primary relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                </div>
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk">
                    Supply Matrix
                    </h1>
                    <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                    Inventory & Supply Logic • Global Intelligence v2.0
                    </p>
                </div>
            </div>
            <div className="flex gap-4">
               <Button
                variant="outline"
                className="h-14 px-8 rounded-2xl bg-muted border border-border font-black italic uppercase tracking-widest text-[10px] hover:bg-muted/80 transition-all gap-3"
                onClick={refreshStock}
              >
                <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} /> Sincronizar
              </Button>
            </div>
        </motion.div>

        {/* Global Overview Bento */}
        <InventoryKPIs stats={stats} />

        {/* Tactical Search & Filters */}
        <InventoryFilters 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedStore={selectedStore}
          setSelectedStore={setSelectedStore}
          filterProductType={filterProductType}
          setFilterProductType={setFilterProductType}
          filterLowStock={filterLowStock}
          setFilterLowStock={setFilterLowStock}
          stores={stores}
        />

        {/* Main Workspace Tabs */}
        <motion.div variants={itemVariants}>
            <Tabs defaultValue="inventory" className="w-full space-y-10">
                <div className="flex items-center justify-between border-b border-border pb-2">
                    <TabsList className="bg-transparent h-12 gap-10">
                        <TabsTrigger value="inventory" className="bg-transparent border-none p-0 text-muted-foreground/40 data-[state=active]:text-primary data-[state=active]:shadow-none font-black italic uppercase tracking-[0.2em] font-space-grotesk text-sm relative group">
                            Stock de Almacén
                            <div className="absolute -bottom-2 left-0 w-0 h-1 bg-primary transition-all duration-500 group-data-[state=active]:w-full rounded-full shadow-glow-pro" />
                        </TabsTrigger>
                        <TabsTrigger value="mixes" className="bg-transparent border-none p-0 text-muted-foreground/40 data-[state=active]:text-primary data-[state=active]:shadow-none font-black italic uppercase tracking-[0.2em] font-space-grotesk text-sm relative group">
                            Preparación de Mezclas
                            <div className="absolute -bottom-2 left-0 w-0 h-1 bg-primary transition-all duration-500 group-data-[state=active]:w-full rounded-full shadow-glow-pro" />
                        </TabsTrigger>
                        <TabsTrigger value="entry" className="bg-transparent border-none p-0 text-muted-foreground/40 data-[state=active]:text-primary data-[state=active]:shadow-none font-black italic uppercase tracking-[0.2em] font-space-grotesk text-sm relative group">
                            Registro de Entrada
                            <div className="absolute -bottom-2 left-0 w-0 h-1 bg-primary transition-all duration-500 group-data-[state=active]:w-full rounded-full shadow-glow-pro" />
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="inventory" className="space-y-10 focus:outline-none">
                  <InventoryGrid 
                    items={filteredItems}
                    onAdjust={adjustDialog.openAdjustDialog}
                    loading={loading}
                  />
                </TabsContent>

                <TabsContent value="mixes" className="focus:outline-none">
                    <MixManagement storeId={userStoreId || stores[0]?.id} />
                </TabsContent>

                <TabsContent value="entry" className="focus:outline-none">
                    <InventoryEntry 
                        storeId={userStoreId || (selectedStore !== 'all' ? selectedStore : stores[0]?.id)} 
                        onSuccess={refreshStock} 
                    />
                </TabsContent>
            </Tabs>
        </motion.div>

        {/* Tactical Adjustment Dialog */}
        <InventoryDialogs 
          isOpen={adjustDialog.isOpen}
          onClose={() => adjustDialog.setIsOpen(false)}
          selectedItem={adjustDialog.selectedItem}
          adjustmentType={adjustDialog.adjustmentType}
          setAdjustmentType={adjustDialog.setAdjustmentType}
          adjustmentQty={adjustDialog.adjustmentQty}
          setAdjustmentQty={adjustDialog.setAdjustmentQty}
          adjustmentReason={adjustDialog.adjustmentReason}
          setAdjustmentReason={adjustDialog.setAdjustmentReason}
          isProcessing={adjustDialog.isProcessing}
          onConfirm={adjustDialog.handleAdjustStock}
        />
      </motion.div>
    </Layout>
  );
}