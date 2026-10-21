import { Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";

export function DatabaseIndicator() {
  const { userRole } = useAuth();

  // Solo visible para admins
  if (userRole !== "admin" && userRole !== "owner") {
    return null;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const environment = import.meta.env.VITE_ENV || "production";

  // Extraer el project ID de la URL de Supabase
  const projectId = supabaseUrl.split("//")[1]?.split(".")[0] || "unknown";

  // Determinar color según ambiente
  const isStaging = environment === "staging";
  const badgeVariant = isStaging ? "secondary" : "default";
  const environmentLabel = isStaging ? "STAGING" : "PRODUCCIÓN";
  const bgColor = isStaging ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30";
  const textColor = isStaging ? "text-amber-400" : "text-emerald-400";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={badgeVariant}
          className={`
            ${bgColor} ${textColor}
            flex items-center gap-1.5 px-2.5 py-1.5
            font-mono font-bold text-[10px] tracking-tight
            border shadow-sm cursor-help
            hover:scale-105 transition-transform
          `}
        >
          <Database className="w-3 h-3 shrink-0" />
          <div className="flex flex-col items-start leading-none gap-0.5">
            <span className="text-[7px] uppercase opacity-70 tracking-wider font-space-grotesk">
              {environmentLabel}
            </span>
            {/* Solo en pantallas anchas: el tooltip ya muestra el project id. */}
            <span className="hidden xl:inline text-[10px] font-bold">
              {projectId}
            </span>
          </div>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-mono text-xs">
        <div className="space-y-1.5">
          <div className="font-bold text-sm">{environmentLabel}</div>
          <div className="text-slate-300 dark:text-slate-400">
            <span className="text-slate-400 dark:text-slate-500">Project ID:</span>
            <span className="ml-1 font-bold">{projectId}</span>
          </div>
          <div className="text-slate-300 dark:text-slate-400 text-[10px] break-all">
            {supabaseUrl}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
