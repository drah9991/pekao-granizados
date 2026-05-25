import { useSales } from "@/hooks/useSales";
import { SalesKPIs } from "@/components/sales/SalesKPIs";
import { SalesFilters } from "@/components/sales/SalesFilters";
import { SalesTable } from "@/components/sales/SalesTable";
import { OrderDetailsDialog, CancelOrderDialog, EditOrderDialog } from "@/components/sales/SalesDialogs";
import { printReceipt } from "@/utils/Sales/printUtils";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const Sales = () => {
  const {
    filteredOrders,
    loading,
    searchQuery,
    setSearchQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
    dateRange,
    setDateRange,
    quickFilter,
    handleQuickFilterChange,
    stats,
    statusCounts,
    refreshOrders,
    isAudioEnabled,
    toggleAudio,
    testAudioChime,
    dialogs
  } = useSales();

  return (
    <Layout>
      <div className="min-h-screen bg-transparent p-6 lg:p-12 space-y-12">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-[1600px] mx-auto space-y-12"
        >
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full animate-pulse shadow-glow-pro" />
                <h1 className="text-4xl lg:text-6xl font-black font-space-grotesk italic tracking-tighter text-foreground uppercase">
                  Historial de <span className="text-primary">Ventas</span>
                </h1>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.4em] italic pl-6">
                Gestión Avanzada • {stats.totalCount} Órdenes Registradas
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* KDS Audio Controls */}
              <div className="flex items-center bg-muted/20 border border-border/50 rounded-[1.5rem] p-1.5 glass-pro shadow-sm">
                <Button
                  onClick={toggleAudio}
                  variant="ghost"
                  className={cn(
                    "h-12 px-5 rounded-[1.1rem] text-[9px] font-black uppercase tracking-widest italic font-space-grotesk transition-all duration-300 gap-2",
                    isAudioEnabled 
                      ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20" 
                      : "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                  )}
                  title={isAudioEnabled ? "Silenciar campana de cocina" : "Activar campana de cocina"}
                >
                  {isAudioEnabled ? (
                    <>
                      <Volume2 className="h-4.5 w-4.5 animate-pulse" />
                      <span>Audio Cocina: SI</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4.5 w-4.5" />
                      <span>Audio Cocina: NO</span>
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={testAudioChime}
                  variant="ghost"
                  className="h-12 px-4 rounded-[1.1rem] text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all gap-1.5"
                  title="Reproducir campana de prueba y activar audio"
                >
                  <span>Probar</span>
                </Button>
              </div>

              <Button 
                onClick={refreshOrders} 
                disabled={loading}
                variant="outline"
                className="h-16 px-8 rounded-[1.5rem] bg-muted/40 border-border border-2 text-[10px] font-black uppercase tracking-widest italic font-space-grotesk hover:bg-muted transition-all shadow-pro group"
              >
                <RefreshCw className={`mr-3 h-4 w-4 text-primary transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                Sincronizar Datos
              </Button>
            </div>
          </div>

          {/* KPIs Section */}
          <SalesKPIs stats={stats} />

          {/* Filters Section */}
          <SalesFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            quickFilter={quickFilter}
            handleQuickFilterChange={handleQuickFilterChange}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />

          {/* Main Content Table */}
          {loading ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-6 bg-muted/20 rounded-[3rem] border border-border/50 border-dashed">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">Procesando Base de Datos...</span>
            </div>
          ) : (
            <SalesTable 
              orders={filteredOrders}
              selectedStatusFilter={selectedStatusFilter}
              setSelectedStatusFilter={setSelectedStatusFilter}
              statusCounts={statusCounts}
              onViewDetails={dialogs.handleViewDetails}
              onConfirmCancel={dialogs.handleCancelClick}
              onEdit={dialogs.handleEdit}
            />
          )}
        </motion.div>

        {/* Dialogs */}
        <OrderDetailsDialog 
          order={dialogs.selectedOrder}
          isOpen={dialogs.isDetailsOpen}
          onClose={() => dialogs.setIsDetailsOpen(false)}
          onPrint={printReceipt}
        />

        <CancelOrderDialog 
          order={dialogs.selectedOrder}
          isOpen={dialogs.isCancelOpen}
          onClose={() => dialogs.setIsCancelOpen(false)}
          onConfirm={dialogs.handleConfirmCancel}
        />

        <EditOrderDialog 
          order={dialogs.selectedOrder}
          isOpen={dialogs.isEditOpen}
          onClose={() => dialogs.setIsEditOpen(false)}
          onSave={dialogs.handleUpdateOrder}
        />
      </div>
    </Layout>
  );
};

export default Sales;
