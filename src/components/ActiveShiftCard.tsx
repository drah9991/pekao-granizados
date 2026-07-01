import React, { useState } from 'react';
import { useTurn } from '@/hooks/useTurn';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Play, CircleOff, PauseCircle, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlerts } from '@/hooks/useAlerts';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveShiftCardProps {
  className?: string;
}

export function ActiveShiftCard({ className }: ActiveShiftCardProps) {
  const { activeTurn, isLoading, openTurn, closeTurn, pauseTurn, resumeTurn } = useTurn();
  const { user } = useAuth();
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const { showBlockingModal } = useAlerts();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className={cn("p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 backdrop-blur-md", className)}>
        <Skeleton className="h-4 w-24 bg-white/10" />
        <Skeleton className="h-3 w-32 bg-white/10" />
      </div>
    );
  }

  const handleOpenTurn = async () => {
    try {
      await openTurn(parseFloat(amount) || 0);
      setIsOpening(false);
      setAmount("");
    } catch (e) {
      console.error('Error al abrir turno:', e);
    }
  };

  const handleCloseTurn = async () => {
    try {
      if (!activeTurn) return;
      const closingAmount = parseFloat(amount) || 0;
      
      let cashSales = 0;
      let cashExpenses = 0;

      // Calcular ventas en efectivo durante el turno
      const { data: orders } = await supabase
        .from("orders")
        .select("total, payment")
        .eq("store_id", activeTurn.store_id)
        .eq("status", "completed")
        .gte("created_at", activeTurn.opened_at);

      if (orders) {
        orders.forEach((order: any) => {
          const totalAmount = Number(order.total) || 0;
          const payment = order.payment && typeof order.payment === 'object' ? order.payment : { method: 'cash' };
          const method = payment.method;
          
          if (method === 'cash') cashSales += totalAmount;
          else if (method === 'split' && payment.details) {
            cashSales += (Number(payment.details.cash) || 0);
          }
        });
      }

      // Calcular gastos registrados durante el turno
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("store_id", activeTurn.store_id)
        .gte("expense_date", activeTurn.opened_at);
        
      if (expenses) {
        cashExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
      }

      const expectedAmount = (activeTurn.opening_amount || 0) + cashSales - cashExpenses;
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
      }

      await closeTurn(closingAmount, notes);
      setIsClosing(false);
      setAmount("");
      setNotes("");
      navigate('/cash-register');
    } catch (e) {
      console.error('Error al cerrar turno:', e);
    }
  };

  return (
    <div className={cn("w-full px-2 py-4", className)}>
      {activeTurn ? (
        activeTurn.status === 'paused' ? (
          /* PAUSED SHIFT CARD */
          <div className="bg-muted/40 border border-amber-500/20 rounded-2xl p-4 transition-all duration-300 hover:bg-slate-900/40 relative overflow-hidden backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(245,158,11,0.05)]">
            <div className="flex items-center gap-3 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 font-space-grotesk italic">Turno Pausado</span>
            </div>
            
            <div className="space-y-1 mb-4">
              <p className="text-xs font-bold text-foreground truncate font-space-grotesk">
                Abierto: {format(new Date(activeTurn.opened_at), 'HH:mm', { locale: es })}
              </p>
              <p className="text-[10px] text-amber-200/50 font-bold uppercase tracking-wider font-space-grotesk italic">
                Ventas Bloqueadas
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => resumeTurn()} 
                size="sm" 
                variant="ghost" 
                className="w-full h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-[10px] font-black uppercase tracking-wider rounded-xl border border-amber-500/10 font-space-grotesk italic"
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                Reanudar Turno
              </Button>
              
              <Button 
                onClick={() => setIsClosing(true)} 
                size="sm" 
                variant="ghost" 
                className="w-full h-8 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase tracking-wider rounded-xl border border-rose-500/10 font-space-grotesk italic"
              >
                <CircleOff className="w-3.5 h-3.5 mr-1.5" />
                Finalizar Turno
              </Button>
            </div>
          </div>
        ) : (
          /* ACTIVE SHIFT CARD (OPEN) */
          <div className="bg-muted/40 border border-emerald-500/20 rounded-2xl p-4 transition-all duration-300 hover:bg-slate-900/40 relative overflow-hidden backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(16,185,129,0.05)]">
            <div className="flex items-center gap-3 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-space-grotesk italic">Turno Activo</span>
            </div>

            <div className="space-y-1 mb-4">
              <p className="text-xs font-bold text-foreground truncate font-space-grotesk">
                Abierto: {format(new Date(activeTurn.opened_at), 'HH:mm', { locale: es })}
              </p>
              <p className="text-[10px] text-muted-foreground font-bold truncate uppercase tracking-wider font-space-grotesk italic">
                Cajero: {activeTurn.cashier_name || user?.email?.split('@')[0] || 'Desconocido'}
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => pauseTurn()} 
                size="sm" 
                variant="ghost" 
                className="w-full h-8 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-xl border border-amber-500/10 font-space-grotesk italic"
              >
                <PauseCircle className="w-3.5 h-3.5 mr-1.5" />
                Pausar Turno
              </Button>
              <Button 
                onClick={() => setIsClosing(true)} 
                size="sm" 
                variant="ghost" 
                className="w-full h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-xl border border-emerald-500/10 font-space-grotesk italic"
              >
                <CircleOff className="w-3.5 h-3.5 mr-1.5" />
                Finalizar Turno
              </Button>
            </div>
          </div>
        )
      ) : (
        /* NO ACTIVE SHIFT CARD (LOCKED) */
        <div className="bg-muted/40 border border-rose-500/20 rounded-2xl p-4 transition-all duration-300 hover:bg-slate-900/40 relative overflow-hidden backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(239,68,68,0.05)]">
          <div className="flex items-center gap-3 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400/30 animate-pulse" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500/50" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 font-space-grotesk italic">Ventas Bloqueadas</span>
          </div>
          <p className="text-[10px] text-rose-200/40 font-bold mb-4 leading-tight italic uppercase tracking-wider font-space-grotesk">
            Apertura de turno obligatoria.
          </p>
          
          <Button 
            onClick={() => setIsOpening(true)} 
            size="sm" 
            className="w-full h-8 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary-foreground text-[10px] font-black uppercase tracking-wider rounded-xl border border-primary/20 font-space-grotesk italic"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Iniciar Turno
          </Button>
        </div>
      )}

      {/* Opening Dialog */}
      <Dialog open={isOpening} onOpenChange={setIsOpening}>
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
                placeholder="Eje: 50000" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background border-input text-foreground h-12 rounded-xl text-sm font-semibold tracking-wider font-space-grotesk text-center"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleOpenTurn} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs italic rounded-xl border-none shadow-glow">
              Abrir Turno Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Closing Dialog */}
      <Dialog open={isClosing} onOpenChange={setIsClosing}>
        <DialogContent className="bg-background/95 backdrop-blur-md border border-white/10 text-foreground max-w-sm rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="font-space-grotesk font-black uppercase italic tracking-wider text-rose-500 text-glow text-lg">Cierre de Caja</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wide">
              Ingresa el conteo físico de billetes y monedas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.2em] font-space-grotesk">Monto Final en Caja ($)</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background border-input text-foreground h-12 rounded-xl text-sm font-semibold tracking-wider font-space-grotesk text-center"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.2em] font-space-grotesk">Notas de Cierre</Label>
              <Input 
                placeholder="..." 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-input text-foreground h-12 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseTurn} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs italic rounded-xl border-none">
              Confirmar Cierre de Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
