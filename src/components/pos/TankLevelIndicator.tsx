import React from "react";
import { useTankStatus, useInitializeTanks } from "@/hooks/useTankStatus";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Thermometer, Plus, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TankLevelIndicatorProps {
  name: string;
  current: number;
  max: number;
  percentage: number;
}

export function TankLevelIndicator({ name, current, max, percentage }: TankLevelIndicatorProps) {
  const isCritical = percentage < 15;
  const isWarning = percentage >= 15 && percentage <= 40;

  // Formatting helper for volumes (convert to Liters for cleaner display)
  const currentL = (current / 1000).toFixed(1);
  const maxL = (max / 1000).toFixed(0);

  // Gradient background for liquid depending on percentage
  const liquidGradient = cn(
    "w-full transition-all duration-700 ease-out relative rounded-b-[18px]",
    isCritical 
      ? "bg-gradient-to-t from-red-600 via-rose-500 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)]" 
      : isWarning
        ? "bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
        : "bg-gradient-to-t from-cyan-600 via-emerald-500 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-2 group cursor-help">
            {/* Cylinder Container */}
            <div 
              className={cn(
                "w-12 h-28 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-md shadow-inner flex flex-col justify-end p-0.5 relative overflow-hidden transition-all duration-300",
                isCritical && "border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse"
              )}
            >
              {/* Glossy Glass Highlight overlay */}
              <div className="absolute inset-y-0 left-2 w-1 bg-gradient-to-r from-white/20 via-white/5 to-transparent rounded-full pointer-events-none z-20" />
              
              {/* Glass Rim Top ring for 3D depth */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full border border-white/15 bg-white/5 z-10 pointer-events-none" />

              {/* Liquid Level */}
              <div 
                className={liquidGradient}
                style={{ height: `${Math.max(4, Math.min(100, percentage))}%` }}
              >
                {/* Internal liquid bubble effect */}
                <span className="absolute inset-x-0 top-0 h-1 bg-white/30 rounded-full blur-[1px] animate-pulse" />
              </div>

              {/* Floating Percentage overlay */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <span className="text-[10px] font-black text-white font-dm-sans tracking-tighter drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.9)] select-none">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>

            {/* Cylinder metadata label */}
            <div className="text-center w-full max-w-[56px] truncate">
              <span className="text-[10px] font-bold text-foreground/80 font-dm-sans tracking-tight block truncate uppercase">
                {name}
              </span>
              <span className={cn(
                "text-[9px] font-semibold tracking-tighter block",
                isCritical ? "text-rose-400 font-bold" : isWarning ? "text-amber-400" : "text-muted-foreground/50"
              )}>
                {currentL}L / {maxL}L
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-950/95 border-white/10 text-white p-3 rounded-xl shadow-2xl backdrop-blur-md max-w-xs">
          <div className="space-y-1.5 text-xs">
            <div className="font-bold flex items-center gap-1.5 text-primary border-b border-white/5 pb-1">
              <Thermometer className="w-3.5 h-3.5 animate-pulse text-primary" />
              Tanque: {name}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
              <span className="text-muted-foreground">Volumen:</span>
              <span className="font-semibold text-right">{current.toLocaleString()} ml</span>
              <span className="text-muted-foreground">Capacidad:</span>
              <span className="font-semibold text-right">{max.toLocaleString()} ml</span>
              <span className="text-muted-foreground">Porcentaje:</span>
              <span className={cn(
                "font-bold text-right",
                isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400"
              )}>{percentage.toFixed(1)}%</span>
            </div>
            <div className="text-[9px] text-muted-foreground border-t border-white/5 pt-1 mt-1 text-right italic">
              Act. en tiempo real
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TankLevelsList() {
  const { storeId: authStoreId, userRole } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = React.useState<string | null>(null);

  const isGlobalAdmin = userRole === 'admin' || userRole === 'manager' || userRole === 'owner';
  const canInitialize = isGlobalAdmin || userRole === 'store_manager';

  // Load stores list for global admins/managers/owners
  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ['stores-list-tanks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: isGlobalAdmin && !authStoreId,
  });

  // Set default selected store for global admins
  React.useEffect(() => {
    if (!authStoreId && stores && stores.length > 0 && !selectedStoreId) {
      const savedStoreId = localStorage.getItem('monitoring_store_id');
      if (savedStoreId && stores.some(s => s.id === savedStoreId)) {
        setSelectedStoreId(savedStoreId);
      } else {
        setSelectedStoreId(stores[0].id);
      }
    }
  }, [authStoreId, stores, selectedStoreId]);

  const activeStoreId = authStoreId || selectedStoreId;

  // Fetch tanks status for the active store
  const { data: tanks, isLoading: isLoadingTanks } = useTankStatus(activeStoreId);
  const initMutation = useInitializeTanks(activeStoreId);

  const handleStoreChange = (val: string) => {
    setSelectedStoreId(val);
    localStorage.setItem('monitoring_store_id', val);
  };

  const isLoading = isLoadingTanks || (isGlobalAdmin && !authStoreId && isLoadingStores);

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-3 bg-[#0d1220]/40 border border-white/5 rounded-2xl animate-pulse">
        <div className="h-3 w-28 bg-white/10 rounded" />
        <div className="flex justify-around gap-2 pt-1">
          {[1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-12 h-28 rounded-3xl bg-white/10" />
              <div className="h-2 w-10 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If there's no active store ID (e.g. no stores exist or not selected yet)
  if (!activeStoreId) {
    return (
      <div className="px-4 py-4 bg-[#070b13]/60 border border-white/5 rounded-2xl space-y-3 shadow-xl">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/80 font-dm-sans">
          <Thermometer className="w-3.5 h-3.5 text-primary animate-pulse" />
          Monitoreo de Tanques
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-normal font-medium font-dm-sans">
          No se ha seleccionado una sucursal para monitorear.
        </p>
      </div>
    );
  }

  const renderStoreSelector = () => {
    if (!isGlobalAdmin || authStoreId || !stores || stores.length <= 1) return null;

    return (
      <div className="mb-3">
        <Select value={activeStoreId} onValueChange={handleStoreChange}>
          <SelectTrigger className="h-8 bg-[#090d16]/80 border-white/5 text-[9px] font-bold text-muted-foreground hover:text-white rounded-lg uppercase tracking-wider font-dm-sans">
            <SelectValue placeholder="SELECCIONAR SUCURSAL" />
          </SelectTrigger>
          <SelectContent className="bg-slate-950 border-white/10 text-white text-[9px]">
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id} className="uppercase text-[9px] font-bold font-dm-sans">
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  if (!tanks || tanks.length === 0) {
    return (
      <div className="px-4 py-4 bg-[#070b13]/60 border border-white/5 rounded-2xl space-y-3 shadow-xl">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/80 font-dm-sans">
          <Thermometer className="w-3.5 h-3.5 text-primary animate-pulse" />
          Monitoreo de Tanques
        </div>

        {renderStoreSelector()}

        <p className="text-[10px] text-muted-foreground/60 leading-normal font-medium font-dm-sans">
          No hay tanques configurados para esta sucursal.
        </p>
        {canInitialize && (
          <Button
            size="sm"
            onClick={() => initMutation.mutate()}
            disabled={initMutation.isPending}
            className="w-full h-7 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 font-dm-sans"
          >
            {initMutation.isPending ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            Inicializar Tanques
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-4 bg-[#070b13]/60 border border-white/5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 font-dm-sans flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-primary animate-pulse" />
          Monitoreo de Tanques
        </span>
      </div>

      {renderStoreSelector()}

      <div className="flex flex-wrap justify-around gap-y-4 gap-x-2 pt-1">
        {tanks.map((tank) => (
          <TankLevelIndicator
            key={tank.id}
            name={tank.name}
            current={Number(tank.current_volume_ml)}
            max={Number(tank.max_capacity_ml)}
            percentage={Number(tank.percentage)}
          />
        ))}
      </div>
    </div>
  );
}

