import React, { useState } from "react";
import Layout from "@/components/Layout";
import { useTurn } from "@/hooks/useTurn";
import { useCashReconciliations } from "@/hooks/useCashReconciliations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";
import { Printer, Search, Plus, Calendar, RotateCcw, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CashReconciliations() {
  const { activeTurn, openTurn } = useTurn();
  const navigate = useNavigate();

  const {
    fromDate, setFromDate,
    toDate, setToDate,
    selectedCaja, setSelectedCaja,
    selectedResponsable, setSelectedResponsable,
    cashiers,
    stores,
    turns,
    loading,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    totalPages,
    fetchReconciliations,
    closeTurnById
  } = useCashReconciliations();

  const [digitalMenuOpen, setDigitalMenuOpen] = useState(false);

  // Turn Dialogs
  const [isOpeningDialog, setIsOpeningDialog] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [turnToCloseId, setTurnToCloseId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchReconciliations();
  };

  const handleOpenTurnClick = () => {
    if (activeTurn) {
      toast.warning("Ya existe un turno activo para tu usuario.");
      return;
    }
    setOpeningAmount("");
    setIsOpeningDialog(true);
  };

  const executeOpenTurn = async () => {
    try {
      const amount = parseFloat(openingAmount) || 0;
      await openTurn(amount);
      setIsOpeningDialog(false);
      fetchReconciliations();
    } catch (e: any) {
      toast.error("Error al abrir turno: " + e.message);
    }
  };

  const handleCloseTurnClick = (turnId: string) => {
    setTurnToCloseId(turnId);
    setClosingAmount("");
    setClosingNotes("");
    setIsClosingDialog(true);
  };

  const executeCloseTurn = async () => {
    if (!turnToCloseId) return;
    const amount = parseFloat(closingAmount) || 0;
    const success = await closeTurnById(turnToCloseId, amount, closingNotes);
    if (success) {
      setIsClosingDialog(false);
      setTurnToCloseId(null);
    }
  };

  const printTurnReport = (turn: any) => {
    // Generate a simple print layout for Arqueo details
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Arqueo - ${turn.store?.name || "Caja"}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 18px; font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .totals { border-top: 1px dashed #000; margin-top: 15px; padding-top: 10px; }
            .footer { border-top: 2px dashed #000; margin-top: 30px; padding-top: 10px; text-align: center; font-size: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div class="title">PEKAO GRANIZADOS</div>
            <div>${turn.store?.name || "Caja Principal"}</div>
            <div>Reporte de Cuadre de Caja</div>
          </div>
          <div class="row"><strong>Fecha Inicio:</strong> <span>${format(new Date(turn.opened_at), "dd/MM/yyyy HH:mm")}</span></div>
          <div class="row"><strong>Fecha Fin:</strong> <span>${turn.closed_at ? format(new Date(turn.closed_at), "dd/MM/yyyy HH:mm") : "ACTIVO"}</span></div>
          <div class="row"><strong>Responsable:</strong> <span>${turn.profile?.name || "Desconocido"}</span></div>
          <div class="row"><strong>Estado:</strong> <span>${turn.status === "closed" ? "Cerrado" : "Abierto"}</span></div>

          <div class="totals">
            <div class="row"><strong>Monto Inicial:</strong> <span>$${Number(turn.opening_amount || 0).toLocaleString()}</span></div>
            <div class="row"><strong>Monto Cierre:</strong> <span>$${turn.closing_amount !== null ? "$" + Number(turn.closing_amount).toLocaleString() : "N/A"}</span></div>
            <div class="row"><strong>Notas:</strong> <span>${turn.notes || "Sin observaciones"}</span></div>
          </div>
          <div class="footer">
            <p>Impreso el ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background text-foreground p-6 lg:p-10 space-y-8">

        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Cuadres de Caja
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Registro Histórico de Turnos y Auditoría
            </p>
          </div>
        </div>

        {/* Filters Form */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] backdrop-blur-md">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider italic font-space-grotesk text-slate-400">Fecha Inicio</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="pl-10 bg-white/5 border-white/10 rounded-2xl h-11 text-xs" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider italic font-space-grotesk text-slate-400">Fecha Fin</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="pl-10 bg-white/5 border-white/10 rounded-2xl h-11 text-xs" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider italic font-space-grotesk text-slate-400">Nombre de Caja</Label>
            <Select value={selectedCaja} onValueChange={setSelectedCaja}>
              <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-11 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="glass-pro">
                <SelectItem value="all">Todas las cajas</SelectItem>
                {stores.map(st => (
                  <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider italic font-space-grotesk text-slate-400">Responsable</Label>
            <Select value={selectedResponsable} onValueChange={setSelectedResponsable}>
              <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-11 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="glass-pro">
                <SelectItem value="all">Todos los cajeros</SelectItem>
                {cashiers.map(csh => (
                  <SelectItem key={csh.id} value={csh.id}>{csh.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex flex-col justify-end">
            <Button type="submit" className="w-full bg-primary hover:bg-primary-foreground text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-2xl h-11 border border-primary/20">
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </form>

        {/* Toolbar Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10">
            <Switch checked={digitalMenuOpen} onCheckedChange={setDigitalMenuOpen} />
            <Label className="text-[10px] font-black uppercase tracking-wider font-space-grotesk text-slate-400 cursor-pointer">
              Abrir Menú Digital
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleOpenTurnClick} className="bg-primary hover:bg-primary/80 text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-2xl px-6 h-11 border border-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Nueva
            </Button>
            <Button variant="ghost" onClick={fetchReconciliations} className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl text-xs font-black font-space-grotesk uppercase tracking-wider italic h-11">
              <RotateCcw className="w-4 h-4 mr-2" />
              Ver Historial
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
          <Table>
            <TableHeader className="bg-white/5 border-b border-white/10">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Fecha Inicio</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Fecha Fin</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Nombre de Caja</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Responsable</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Total Inicial</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4">Cerrada</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-space-grotesk py-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs font-bold text-slate-500 uppercase tracking-widest italic">Cargando cuadres...</TableCell>
                </TableRow>
              ) : turns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-xs font-bold text-slate-500 uppercase tracking-widest italic">No se encontraron cuadres registrados</TableCell>
                </TableRow>
              ) : (
                turns.map((turn) => (
                  <TableRow key={turn.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-xs font-bold font-space-grotesk">{format(new Date(turn.opened_at), "dd/MM/yyyy hh:mm a")}</TableCell>
                    <TableCell className="text-xs font-bold font-space-grotesk">
                      {turn.closed_at ? format(new Date(turn.closed_at), "dd/MM/yyyy hh:mm a") : <span className="text-emerald-500 font-black italic uppercase text-[10px] tracking-wider animate-pulse">ACTIVO</span>}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-300">{turn.store?.name || "Caja Principal"}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-300">{turn.profile?.name || "Desconocido"}</TableCell>
                    <TableCell className="text-xs font-black font-space-grotesk text-primary">${Number(turn.opening_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-bold">
                      {turn.status === "closed" ? (
                        <span className="text-rose-500 uppercase text-[10px] font-black italic tracking-widest">Sí</span>
                      ) : (
                        <span className="text-emerald-500 uppercase text-[10px] font-black italic tracking-widest">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {turn.status !== "closed" ? (
                        <Button onClick={() => handleCloseTurnClick(turn.id)} className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl px-4 py-1.5 h-8">
                          Ver/Cerrar
                        </Button>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-slate-500 mr-2 italic">Finalizado</span>
                      )}

                      <Button variant="outline" onClick={() => navigate(`/invoices?turn=${turn.id}`)} className="border-rose-500/20 hover:bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-wider rounded-xl px-4 py-1.5 h-8 bg-transparent">
                        Ver facturas
                      </Button>

                      <Button variant="ghost" onClick={() => printTurnReport(turn)} className="h-8 w-8 hover:bg-white/10 rounded-full p-0">
                        <Printer className="w-4 h-4 text-slate-400 hover:text-white" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider font-space-grotesk">Mostrar:</span>
              <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="w-20 bg-white/5 border-white/10 rounded-xl h-8 text-[10px] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-pro">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="text-[9px] font-black uppercase tracking-widest rounded-lg">Primero</Button>
              <Button size="sm" variant="ghost" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-[9px] font-black uppercase tracking-widest rounded-lg">Anterior</Button>

              <div className="bg-primary text-white text-xs font-black uppercase h-7 w-7 flex items-center justify-center rounded-lg italic font-space-grotesk shadow-glow-pro">
                {currentPage}
              </div>

              <Button size="sm" variant="ghost" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="text-[9px] font-black uppercase tracking-widest rounded-lg">Siguiente</Button>
              <Button size="sm" variant="ghost" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="text-[9px] font-black uppercase tracking-widest rounded-lg">Último</Button>
            </div>
          </div>
        </div>

      </div>

      {/* Opening Shift Dialog */}
      <Dialog open={isOpeningDialog} onOpenChange={setIsOpeningDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-md border border-white/10 text-foreground max-w-sm rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-space-grotesk font-black uppercase italic tracking-wider text-primary text-glow text-lg">Apertura de Turno</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wide">
              Monto inicial en caja para arrancar operaciones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.2em] font-space-grotesk">Base Inicial ($)</Label>
              <Input
                type="number"
                placeholder="Ej: 50000"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl h-12 text-sm font-bold font-space-grotesk"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsOpeningDialog(false)} className="rounded-xl text-xs font-bold uppercase tracking-wider font-space-grotesk">
              Cancelar
            </Button>
            <Button onClick={executeOpenTurn} className="bg-primary hover:bg-primary/95 text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-xl px-5 h-10 border border-primary/20">
              Iniciar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Closing Shift Dialog */}
      <Dialog open={isClosingDialog} onOpenChange={setIsClosingDialog}>
        <DialogContent className="bg-background/95 backdrop-blur-md border border-white/10 text-foreground max-w-sm rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-space-grotesk font-black uppercase italic tracking-wider text-rose-500 text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Cierre de Turno
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wide">
              Monto final en caja y notas finales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.2em] font-space-grotesk">Monto Entregado ($)</Label>
              <Input
                type="number"
                placeholder="Ej: 120000"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl h-12 text-sm font-bold font-space-grotesk"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.2em] font-space-grotesk">Notas / Observaciones</Label>
              <Input
                placeholder="Ej: Todo cuadrado sin novedades"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl h-12 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsClosingDialog(false)} className="rounded-xl text-xs font-bold uppercase tracking-wider font-space-grotesk">
              Cancelar
            </Button>
            <Button onClick={executeCloseTurn} className="bg-rose-600 hover:bg-rose-500 text-white font-space-grotesk font-black uppercase tracking-widest italic rounded-xl px-5 h-10">
              Cerrar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
