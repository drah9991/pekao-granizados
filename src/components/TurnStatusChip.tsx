import React, { useState } from 'react';
import { useTurn } from '@/hooks/useTurn';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Play, CircleOff, AlertCircle, PauseCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlerts } from '@/hooks/useAlerts';

export function TurnStatusChip() {
  const { activeTurn, isLoading, openTurn, closeTurn, pauseTurn, resumeTurn } = useTurn();
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const { showBlockingModal } = useAlerts();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-2">
        <Skeleton className="h-4 w-24 bg-muted/30" />
        <Skeleton className="h-3 w-32 bg-muted/30" />
      </div>
    );
  }

  const handleOpenTurn = async () => {
    try {
      await openTurn(parseFloat(amount) || 0);
      setIsOpening(false);
      setAmount("");
    } catch (e) {}
  };

  const handleCloseTurn = async () => {
    try {
      const closingAmount = parseFloat(amount) || 0;
      
      // Mocked expected amount logic for demonstration
      // In a real scenario, this would come from a query to the 'orders' table
      const expectedAmount = (activeTurn?.opening_amount || 0) + 150000; // Mock sales: 150k
      const difference = Math.abs(closingAmount - expectedAmount);
      const THRESHOLD = 5000; 

      if (difference > THRESHOLD) {
        showBlockingModal(
          "Diferencia de Caja Detectada",
          "Se ha detectado una discrepancia significativa entre el monto contado y el esperado por el sistema.",
          {
            expected: `$${expectedAmount.toLocaleString()}`,
            actual: `$${closingAmount.toLocaleString()}`,
            diff: `$${difference.toLocaleString()}`
          }
        );
        // We don't return here because the user can "Understand and Continue" from the modal,
        // but we show the modal to ensure they are aware.
      }

      await closeTurn(closingAmount, notes);
      setIsClosing(false);
      setAmount("");
      setNotes("");
      navigate('/cash-register');
    } catch (e) {}
  };

  return (
    <div className="px-2 py-4">
      {activeTurn ? (
        activeTurn.status === 'paused' ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 transition-all duration-300 hover:bg-amber-500/15 group">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Turno Pausado</span>
            </div>
            <div className="space-y-1 mb-4">
              <p className="text-xs font-bold text-foreground truncate">
                Abierto: {format(new Date(activeTurn.opened_at), 'HH:mm', { locale: es })}
              </p>
              <p className="text-[10px] text-amber-200/60 font-medium truncate uppercase">
                Ventas Bloqueadas Temporalmente
              </p>
            </div>
            <Button onClick={() => resumeTurn()} size="sm" variant="ghost" className="w-full h-8 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-amber-300 text-[10px] font-black uppercase tracking-tighter rounded-lg border border-amber-500/20">
              <PlayCircle className="w-3 h-3 mr-1.5" />
              Reanudar Turno
            </Button>
          </div>
        ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 transition-all duration-300 hover:bg-emerald-500/15 group">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Turno Activo</span>
          </div>
          <div className="space-y-1 mb-4">
            <p className="text-xs font-bold text-foreground truncate">
              Abierto: {format(new Date(activeTurn.opened_at), 'HH:mm', { locale: es })}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium truncate uppercase">
              Cajero: {activeTurn.cashier_name || 'Desconocido'}
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={() => pauseTurn()} size="sm" variant="ghost" className="w-full h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 text-[10px] font-black uppercase tracking-tighter rounded-lg border border-amber-500/20">
              <PauseCircle className="w-3 h-3 mr-1.5" />
              Pausar Turno
            </Button>
            <Dialog open={isClosing} onOpenChange={setIsClosing}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="w-full h-8 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-[10px] font-black uppercase tracking-tighter rounded-lg border border-emerald-500/20">
                  <CircleOff className="w-3 h-3 mr-1.5" />
                  Finalizar Turno
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-background border-border text-foreground max-w-sm">
              <DialogHeader>
                <DialogTitle>Cierre de Caja</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Ingresa el monto contado físicamente en la caja para finalizar el turno.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Monto en Caja ($)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas (Opcional)</Label>
                  <Input 
                    placeholder="..." 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseTurn} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-none">
                  Confirmar Cierre de Turno
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
        )
      ) : (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 transition-all duration-300 hover:bg-rose-500/15">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Ventas Bloqueadas</span>
          </div>
          <p className="text-[10px] text-rose-200/60 font-medium mb-4 leading-tight italic">
            Debes iniciar un nuevo turno para poder operar el POS.
          </p>
          
          <Dialog open={isOpening} onOpenChange={setIsOpening}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="w-full h-8 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase tracking-tighter rounded-lg border border-rose-500/20">
                <Play className="w-3 h-3 mr-1.5" />
                Iniciar Turno
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background border-border text-foreground max-w-sm">
              <DialogHeader>
                <DialogTitle>Apertura de Turno</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Especifica con cuánto dinero inicias la base de caja hoy.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Base Inicial ($)</Label>
                  <Input 
                    type="number" 
                    placeholder="Eje: 50000" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-slate-950 border-white/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleOpenTurn} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-none">
                  Abrir Turno Ahora
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
