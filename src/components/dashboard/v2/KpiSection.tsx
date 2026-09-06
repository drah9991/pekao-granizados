import React from "react";
import { KpiRibbonData, KpiMetricItem } from "@/types/dashboard";
import { safeFormatCOP } from "@/adapters/dashboardAdapter";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiSectionProps {
  data?: KpiRibbonData;
}

// Circular SVG Progress Ring Component
function GaugeRing({ 
  value, 
  target = 100, 
  strokeColor = "#39FF14" 
}: { 
  value: number; 
  target?: number; 
  strokeColor?: string 
}) {
  const percentage = Math.min(Math.max(target > 0 ? (value / target) * 100 : 0, 0), 100);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg className="w-12 h-12 transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          className="stroke-slate-800"
          strokeWidth="3.5"
          fill="transparent"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          stroke={strokeColor}
          strokeWidth="3.5"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[9px] font-black text-slate-200">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

function KpiCard({ 
  metric, 
  icon: Icon,
  fallbackTitle,
  fallbackTheme = "green"
}: { 
  metric?: KpiMetricItem; 
  icon: React.ElementType;
  fallbackTitle: string;
  fallbackTheme?: 'green' | 'magenta' | 'cyan' | 'amber';
}) {
  const title = metric?.title || fallbackTitle;
  const val = metric?.value || 0;
  const pct = metric?.percentageChange ?? 0;
  const target = metric?.target || 100;
  const periodLabel = metric?.periodLabel || "vs anterior";
  const theme = metric?.colorTheme || fallbackTheme;

  const themeMap = {
    green: {
      accentColor: "#39FF14",
      textClass: "text-[#39FF14]",
      glowClass: "shadow-[0_0_20px_rgba(57,255,20,0.15)] border-[#39FF14]/30",
      bgBadge: "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20"
    },
    magenta: {
      accentColor: "#FF007F",
      textClass: "text-[#FF007F]",
      glowClass: "shadow-[0_0_20px_rgba(255,0,127,0.15)] border-[#FF007F]/30",
      bgBadge: "bg-[#FF007F]/10 text-[#FF007F] border-[#FF007F]/20"
    },
    cyan: {
      accentColor: "#00E5FF",
      textClass: "text-[#00E5FF]",
      glowClass: "shadow-[0_0_20px_rgba(0,229,255,0.15)] border-[#00E5FF]/30",
      bgBadge: "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20"
    },
    amber: {
      accentColor: "#FFB800",
      textClass: "text-[#FFB800]",
      glowClass: "shadow-[0_0_20px_rgba(255,184,0,0.15)] border-[#FFB800]/30",
      bgBadge: "bg-[#FFB800]/10 text-[#FFB800] border-[#FFB800]/20"
    }
  };

  const currentStyle = themeMap[theme];
  const isPositive = pct >= 0;

  return (
    <div className={cn(
      "p-5 rounded-2xl bg-slate-900/70 border backdrop-blur-md transition-all duration-300 hover:translate-y-[-2px] flex flex-col justify-between group",
      currentStyle.glowClass
    )}>
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("p-2 rounded-xl border", currentStyle.bgBadge)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 font-space-grotesk italic">
            {title}
          </span>
        </div>

        <GaugeRing 
          value={val} 
          target={target} 
          strokeColor={currentStyle.accentColor} 
        />
      </div>

      {/* Main Value Display */}
      <div className="my-3 space-y-1">
        <div className="text-2xl xl:text-3xl font-black font-space-grotesk italic text-slate-100 tracking-tight">
          {safeFormatCOP(val)}
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider",
            isPositive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          )}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{isPositive ? `+${pct}%` : `${pct}%`}</span>
          </div>
          <span className="text-[10px] font-medium text-slate-400">
            {periodLabel}
          </span>
        </div>
      </div>

      {/* Target Subtext */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
        <span>Meta: {safeFormatCOP(target)}</span>
        <span className={cn("font-bold", currentStyle.textClass)}>
          {val >= target ? "✓ Cumplida" : "En progreso"}
        </span>
      </div>
    </div>
  );
}

export function KpiSection({ data }: KpiSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <KpiCard 
        metric={data?.todayRevenue} 
        icon={Clock} 
        fallbackTitle="Facturado Hoy" 
        fallbackTheme="green" 
      />
      <KpiCard 
        metric={data?.last7DaysRevenue} 
        icon={Calendar} 
        fallbackTitle="Últimos 7 Días" 
        fallbackTheme="magenta" 
      />
      <KpiCard 
        metric={data?.last30DaysRevenue} 
        icon={BarChart2} 
        fallbackTitle="Últimos 30 Días" 
        fallbackTheme="cyan" 
      />
      <KpiCard 
        metric={data?.yearToDateRevenue} 
        icon={DollarSign} 
        fallbackTitle="Año Actual" 
        fallbackTheme="amber" 
      />
    </div>
  );
}
