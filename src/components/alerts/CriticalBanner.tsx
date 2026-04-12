import { useAlertStore } from '@/store/useAlertStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CriticalBanner = () => {
  const { isVisible, message, ctaText, onCtaClick } = useAlertStore((state) => state.banner);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-destructive text-destructive-foreground py-2 px-6 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300 shadow-lg sticky top-0 z-[100] border-b border-rose-500/30">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center animate-pulse">
           <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 leading-tight mb-0.5">ESTADO CRÍTICO</span>
          <span className="text-sm font-bold tracking-tight text-white">{message}</span>
        </div>
      </div>
      
      {ctaText && onCtaClick && (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={onCtaClick}
          className="bg-white text-destructive hover:bg-white/90 border-none shadow-glow font-black uppercase tracking-wider text-[10px] h-8 px-4 rounded-xl group transition-all"
        >
          {ctaText}
          <ChevronRight className="ml-1 w-3 h-3 transition-transform group-hover:translate-x-1" />
        </Button>
      )}
    </div>
  );
};
