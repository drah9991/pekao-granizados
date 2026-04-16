import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAlertStore } from "@/store/useAlertStore";
import { AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";

export const BlockingModal = () => {
  const { isVisible, title, description, data } = useAlertStore((state) => state.modal);
  const hideModal = useAlertStore((state) => state.hideModal);

  return (
    <Dialog open={isVisible} onOpenChange={(open) => !open && hideModal()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar bg-slate-950 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader className="flex flex-col items-center justify-center pt-6">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
          </div>
          <DialogTitle className="text-2xl font-black text-center text-white tracking-tight uppercase leading-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-center font-medium mt-2 max-w-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        {data && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-4">
             <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Resumen de Diferencias</span>
                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[10px] font-black rounded uppercase">Crítico</span>
             </div>
             
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">Diferencial Esperado:</span>
                  <span className="text-sm font-bold text-white">{data.expected || "$0"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">Diferencial Real:</span>
                  <span className="text-sm font-bold text-rose-500">{data.actual || "$0"}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-sm font-black text-white uppercase tracking-wider">Brecha:</span>
                  <span className="text-lg font-black text-rose-500">{data.diff || "$0"}</span>
                </div>
             </div>
          </div>
        )}

        <DialogFooter className="sm:justify-center flex-col gap-2 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={hideModal}
            className="w-full bg-slate-900 border border-white/10 text-white hover:bg-slate-800 font-bold h-12 rounded-xl uppercase tracking-widest text-xs"
          >
            Entiendo y Deseo Continuar
          </Button>
          <p className="text-[10px] text-slate-500 text-center font-medium opacity-50 px-8">
            Esta acción quedará registrada en el log de auditoría para revisión administrativa posterior.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
