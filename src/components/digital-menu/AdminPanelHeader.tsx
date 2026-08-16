import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminPanelHeaderProps {
  businessUrl: string;
}

export function AdminPanelHeader({ businessUrl }: AdminPanelHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-6 pb-6 border-b border-white/5 relative">
      <div className="animate-pro-in">
        <h1 className="text-2xl sm:text-4xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground mb-2">
          Gestión de <span className="text-primary italic">Menú Digital</span>
        </h1>
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-muted-foreground/40 font-space-grotesk italic">
          Configura tu carta pública y la toma de pedidos en línea
        </p>
      </div>
      <Button
        onClick={() => window.open(businessUrl, "_blank")}
        className="flex items-center gap-2 font-space-grotesk text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl border border-primary/20 hover:border-primary/50 shadow-glow-pro"
      >
        <Eye className="w-4 h-4" />
        Vista Previa
      </Button>
    </div>
  );
}
