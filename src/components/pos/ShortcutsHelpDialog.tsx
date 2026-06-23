import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard, HelpCircle } from "lucide-react";

interface ShortcutsHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsHelpDialog({ isOpen, onClose }: ShortcutsHelpDialogProps) {
  const shortcutList = [
    { keys: ["F1"], description: "Focalizar el buscador de productos" },
    { keys: ["F2"], description: "Abrir la ventana de procesamiento de pago" },
    { keys: ["Esc"], description: "Cerrar diálogos emergentes o limpiar el foco de búsqueda" },
    { keys: ["?", "H"], description: "Abrir / Cerrar esta guía visual de atajos" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card/90 border border-white/10 backdrop-blur-2xl p-6 rounded-2xl shadow-glow-pro animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5 text-primary">
            <Keyboard className="w-5 h-5" />
            <DialogTitle className="text-xl font-space-grotesk tracking-wide">Atajos de Teclado POS</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-xs">
            Optimiza la velocidad de operación con estos accesos rápidos del sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {shortcutList.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <span className="text-xs text-foreground/80 font-medium leading-relaxed">
                {item.description}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 ml-4">
                {item.keys.map((key, keyIdx) => (
                  <span key={keyIdx} className="flex items-center gap-1.5">
                    <kbd className="px-2.5 py-1 bg-black/40 border border-white/10 text-[10px] font-black rounded-lg text-primary shadow-inner font-space-grotesk">
                      {key}
                    </kbd>
                    {keyIdx < item.keys.length - 1 && <span className="text-[10px] text-muted-foreground font-black">o</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          Presiona la tecla correspondiente en cualquier momento
        </div>
      </DialogContent>
    </Dialog>
  );
}
