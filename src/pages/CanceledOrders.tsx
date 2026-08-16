import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Printer, FileSpreadsheet, Search, Calendar } from "lucide-react";
import { useCanceledOrders } from "@/hooks/useCanceledOrders";

export default function CanceledOrders() {
  const {
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    items,
    loading,
    handleSearch,
    handlePrint,
    handleExportExcel
  } = useCanceledOrders();

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground p-6 lg:p-10 space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Pedidos Cancelados
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Auditoría y control de cancelaciones
            </p>
          </div>
        </div>

        {/* Filters Form */}
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] backdrop-blur-md">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider italic font-space-grotesk text-slate-400">Fecha Inicio</Label>
            <div className="relative w-64">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="pl-10 bg-white/5 border-white/10 rounded-2xl h-10 text-xs" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider italic font-space-grotesk text-slate-400">Fecha Fin</Label>
            <div className="relative w-64">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="pl-10 bg-white/5 border-white/10 rounded-2xl h-10 text-xs" />
            </div>
          </div>

          <Button type="submit" className="bg-primary hover:bg-primary/95 text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-2xl h-10 px-6 border border-primary/20">
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </form>

        {/* Table Content */}
        <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
          <Table>
            <TableHeader className="bg-white/5 border-b border-white/10">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Fecha pedido</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Fecha cancelación</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Producto</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Cantidad</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Motivo</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Cancelado por</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Pedido por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs font-bold text-slate-500 uppercase tracking-widest italic">Cargando cancelaciones...</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs font-bold text-slate-500 uppercase tracking-widest italic">No se encontraron cancelaciones</TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs font-bold font-space-grotesk">{format(new Date(item.created_at), "dd/MM/yyyy hh:mm a")}</TableCell>
                    <TableCell className="text-xs font-bold font-space-grotesk">
                      {item.cancelled_at ? format(new Date(item.cancelled_at), "dd/MM/yyyy hh:mm a") : "N/A"}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-300">{item.product_name}</TableCell>
                    <TableCell className="text-xs font-black font-space-grotesk text-primary">{item.quantity}</TableCell>
                    <TableCell className="text-xs font-medium text-rose-400 italic">{item.cancellation_reason}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-300">{item.cancelled_by}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-300">{item.created_by}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary-foreground text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-xl px-5 h-10 border border-primary/20">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleExportExcel} className="bg-lime-600 hover:bg-lime-500 text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-xl px-5 h-10">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>

      </div>
    </Layout>
  );
}
