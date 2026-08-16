import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminTab = "config" | "products";

interface AdminTabsProps {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
}

export function AdminTabs({ activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="flex gap-2 border-b border-white/5 pb-4">
      <Button
        variant={activeTab === "config" ? "default" : "ghost"}
        onClick={() => onChange("config")}
        className={cn(
          "font-space-grotesk text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl",
          activeTab === "config" ? "bg-primary text-white shadow-glow-pro" : "text-muted-foreground hover:text-white"
        )}
      >
        Configuración
      </Button>
      <Button
        variant={activeTab === "products" ? "default" : "ghost"}
        onClick={() => onChange("products")}
        className={cn(
          "font-space-grotesk text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl",
          activeTab === "products" ? "bg-primary text-white shadow-glow-pro" : "text-muted-foreground hover:text-white"
        )}
      >
        Productos
      </Button>
    </div>
  );
}
