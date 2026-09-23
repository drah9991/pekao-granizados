import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Staging Banner Component
 * Muestra un banner prominente en entornos de staging
 */
export function StagingBanner() {
  const [isVisible, setIsVisible] = React.useState(true);

  const isStaging = import.meta.env.VITE_ENV === 'staging';
  const showBanner = import.meta.env.VITE_SHOW_STAGING_BANNER === 'true';
  const message = import.meta.env.VITE_STAGING_MESSAGE || 'Entorno de Pruebas';

  if (!isStaging || !showBanner || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 py-2 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span className="font-bold text-sm uppercase tracking-wider">
            {message}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6 text-amber-950 hover:bg-amber-600"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
