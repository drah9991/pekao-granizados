import { Building2, FileText, Settings, Coins, DollarSign, Zap, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsSubTab } from "@/hooks/useBusinessSettings";

interface BusinessSettingsTabsProps {
  activeSubTab: SettingsSubTab;
  setActiveSubTab: (tab: SettingsSubTab) => void;
}

// Target icon custom SVG definition
function TargetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

/**
 * Barra de sub-pestañas horizontales de BusinessSettings.tsx, extraída
 * sin cambios de comportamiento.
 */
export function BusinessSettingsTabs({ activeSubTab, setActiveSubTab }: BusinessSettingsTabsProps) {
  return (
    <div className="flex gap-1.5 border-b border-white/5 pb-4 overflow-x-auto no-scrollbar">
      {[
        { value: "business", label: "Negocio", icon: Building2 },
        { value: "document", label: "Documento", icon: FileText },
        { value: "resolutions", label: "Resoluciones", icon: Settings },
        { value: "payments", label: "Medios de pago", icon: Coins },
        { value: "objectives", label: "Objetivos", icon: TargetIcon },
        { value: "advanced", label: "Avanzado", icon: Settings },
        { value: "currency", label: "Moneda", icon: DollarSign },
        { value: "integrations", label: "Integraciones", icon: Zap },
        { value: "cajas", label: "Cajas", icon: LayoutGrid },
      ].map((tab) => {
        const isActive = activeSubTab === tab.value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            onClick={() => setActiveSubTab(tab.value as SettingsSubTab)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-space-grotesk text-[10px] uppercase font-black tracking-widest italic transition-all shrink-0 cursor-pointer",
              isActive
                ? "bg-primary text-white shadow-glow-pro"
                : "text-muted-foreground hover:text-white bg-white/5 border border-white/5 hover:border-white/10"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
