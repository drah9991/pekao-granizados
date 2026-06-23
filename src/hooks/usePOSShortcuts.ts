import { useEffect } from "react";

interface POSShortcutsProps {
  onSearchFocus: () => void;
  onCategoryChange: (index: number) => void;
  onProcessPayment: () => void;
  onClearCart: () => void;
  onToggleHelp?: () => void;
}

export const usePOSShortcuts = ({
  onSearchFocus,
  onCategoryChange,
  onProcessPayment,
  onClearCart,
  onToggleHelp,
}: POSShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // / for search focus
      if (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        onSearchFocus();
      }

      // F1-F4 for categories
      if (e.key === "F1") { e.preventDefault(); onCategoryChange(0); }
      if (e.key === "F2") { e.preventDefault(); onCategoryChange(1); }
      if (e.key === "F3") { e.preventDefault(); onCategoryChange(2); }
      if (e.key === "F4") { e.preventDefault(); onCategoryChange(3); }

      // Enter for payment (only if not in an input or if it's explicitly allowed)
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        onProcessPayment();
      }

      // ? or h/H to toggle help
      if ((e.key === "?" || e.key.toLowerCase() === "h") && 
          (e.target as HTMLElement).tagName !== "INPUT" && 
          (e.target as HTMLElement).tagName !== "TEXTAREA") {
        e.preventDefault();
        onToggleHelp?.();
      }

      // Escape to clear/close
      if (e.key === "Escape") {
        // Potentially clear something?
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchFocus, onCategoryChange, onProcessPayment, onClearCart, onToggleHelp]);
};
