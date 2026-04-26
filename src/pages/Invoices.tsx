import React from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useInvoices } from "@/hooks/useInvoices";
import InvoiceKPIs from "@/components/invoices/InvoiceKPIs";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, FileText, Printer } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Invoices() {
  const {
    invoices,
    loading,
    searchQuery, setSearchQuery,
    isModalOpen, setIsModalOpen,
    availableOrders,
    selectedOrderId, setSelectedOrderId,
    isSubmitting,
    loadingOrders,
    isViewModalOpen, setIsViewModalOpen,
    selectedInvoice, setSelectedInvoice,
    fetchAvailableOrders,
    handleCreateManualInvoice,
    handlePrintInvoice
  } = useInvoices();

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
              Módulo Fiscal
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Gestión Documental Pro Max • Compliance Standard
            </p>
          </div>
          <Button 
            className="h-14 px-8 rounded-[1.5rem] bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all gap-3"
            onClick={() => { setIsModalOpen(true); fetchAvailableOrders(); }}
          >
            <PlusCircle className="w-5 h-5" />
            Emisión Manual
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <InvoiceKPIs invoices={invoices} />
        </motion.div>

        <motion.div variants={itemVariants} className="relative max-w-xl group">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="BUSCAR POR PREFIJO F- O IDENTIDAD CLIENTE..."
            className="pl-16 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <InvoiceTable 
            invoices={invoices} 
            loading={loading} 
            onView={(inv) => { setSelectedInvoice(inv); setIsViewModalOpen(true); }}
            onPrint={handlePrintInvoice}
          />
        </motion.div>

        {/* Manual Invoice Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-xl bg-background border-border rounded-[3rem] text-foreground shadow-pro">
            <DialogHeader className="mb-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                     <Receipt className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                     <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Emisión Manual</DialogTitle>
                     <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Asignar Certificación Fiscal</DialogDescription>
                  </div>
               </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="p-6 glass-pro bg-white/5 rounded-[2rem] border border-white/5">
                {loadingOrders ? (
                   <div className="flex items-center justify-center p-12"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" /></div>
                ) : availableOrders.length === 0 ? (
                  <p className="text-center text-[10px] font-black uppercase italic opacity-30 p-12">Sin operaciones disponibles.</p>
                ) : (
                  <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                    <SelectTrigger className="h-16 bg-muted border-border rounded-2xl text-[10px] font-black italic uppercase font-space-grotesk">
                      <SelectValue placeholder="SELECCIONAR OPERACIÓN..." />
                    </SelectTrigger>
                    <SelectContent className="glass-pro border-border rounded-2xl">
                      {availableOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id} className="p-4 border-b border-border last:border-0 rounded-none hover:bg-muted/80">
                           <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase italic">#{order.id.slice(0,8)} • {order.customer_name}</span>
                              <span className="text-[9px] text-emerald-500 font-black italic tabular-nums">{formatCOP(order.total)}</span>
                           </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40">ABORTAR</Button>
                <Button onClick={handleCreateManualInvoice} disabled={!selectedOrderId || isSubmitting} className="flex-1 h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest shadow-glow-pro">
                  {isSubmitting ? "CERTIFICANDO..." : "EMITIR DOCUMENTO ✓"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Invoice Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-md bg-background border-border rounded-[3rem] text-foreground shadow-pro">
            <DialogHeader className="mb-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro"><FileText className="w-6 h-6 text-primary" /></div>
                  <div>
                     <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Copia Fiscal</DialogTitle>
                     <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Visualización Auditada</DialogDescription>
                  </div>
               </div>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                <div className="p-6 glass-pro rounded-[2rem] border border-border bg-muted/40 space-y-4">
                   <div className="flex items-center justify-between border-b border-border pb-4">
                      <h3 className="text-2xl font-black italic font-space-grotesk text-white">F-{selectedInvoice.id.slice(0, 8).toUpperCase()}</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-4 text-xs font-black italic font-space-grotesk">
                      <div><p className="text-[9px] text-white/20 uppercase">FECHA</p>{format(new Date(selectedInvoice.order.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</div>
                      <div><p className="text-[9px] text-white/20 uppercase">CLIENTE</p>{selectedInvoice.order.customer_details?.name || 'VENTA GENERAL'}</div>
                   </div>
                </div>
                <div className="p-8 glass-pro rounded-[2.5rem] border border-border bg-emerald-500/5 text-center">
                   <p className="text-[10px] font-black uppercase italic text-emerald-500/60 mb-2">TOTAL PAGADO</p>
                   <p className="text-4xl font-black italic font-space-grotesk text-emerald-500">{formatCOP(selectedInvoice.order.total)}</p>
                </div>
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setIsViewModalOpen(false)} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40">CERRAR</Button>
                  <Button onClick={() => handlePrintInvoice(selectedInvoice)} className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black italic uppercase tracking-widest shadow-glow-pro gap-2">
                    <Printer className="w-4 h-4" /> IMPRIMIR
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}