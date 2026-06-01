import React, { useId, useRef } from "react";
import { Info } from "lucide-react";

interface SettingsHelpTooltipProps {
  content: string;
  className?: string;
}

export default function SettingsHelpTooltip({ content, className }: SettingsHelpTooltipProps) {
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popover || !trigger) return;

    try {
      // Toggle popover visibility natively using Popover API
      if (popover.matches(":popover-open")) {
        popover.hidePopover();
      } else {
        popover.showPopover();
        
        // Dynamically position the popover above/below the trigger element
        const triggerRect = trigger.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        
        const spaceBelow = window.innerHeight - triggerRect.bottom;
        const top = spaceBelow > popoverRect.height + 20
          ? triggerRect.bottom + window.scrollY + 6
          : triggerRect.top + window.scrollY - popoverRect.height - 6;
          
        const left = Math.max(
          10,
          Math.min(
            window.innerWidth - popoverRect.width - 10,
            triggerRect.left + window.scrollX - popoverRect.width / 2 + triggerRect.width / 2
          )
        );

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
      }
    } catch (err) {
      console.warn("Popover API not fully supported, falling back to absolute class toggles", err);
    }
  };

  return (
    <span className="inline-flex items-center ml-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="w-4 h-4 text-white/40 hover:text-white transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-primary rounded-full flex items-center justify-center shrink-0"
        title="Ver Ayuda"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        // @ts-expect-error - popover="auto" is an experimental HTML attribute for the Popover API, not yet in TS types
        popover="auto"
        className="glass-pro border border-white/10 rounded-2xl p-4 text-[10px] text-white/90 max-w-[240px] font-bold uppercase italic tracking-wider leading-relaxed shadow-glow-pro backdrop-blur-md outline-none popover-native-tooltip"
        style={{
          position: "absolute",
          margin: 0,
          borderWidth: "1px",
        }}
      >
        {content}
      </div>
    </span>
  );
}
