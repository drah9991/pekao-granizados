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
      const isInput = 
        (e.target as HTMLElement).tagName === "INPUT" || 
        (e.target as HTMLElement).tagName === "TEXTAREA" ||
        (e.target as HTMLElement).isContentEditable;

      // F1 or / for search focus
      if (e.key === "F1" || (e.key === "/" && !isInput)) {
        e.preventDefault();
        onSearchFocus();
      }

      // F2 or Ctrl+Enter for payment processing
      if (e.key === "F2" || (e.key === "Enter" && e.ctrlKey)) {
        e.preventDefault();
        onProcessPayment();
      }

      // ? or h/H to toggle help (when not typing in an input)
      if ((e.key === "?" || e.key.toLowerCase() === "h") && !isInput) {
        e.preventDefault();
        onToggleHelp?.();
      }

      // Escape to clear or close dialogs
      if (e.key === "Escape") {
        onClearCart?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchFocus, onCategoryChange, onProcessPayment, onClearCart, onToggleHelp]);
};
