import React, { useState } from 'react';
import { Paintbrush, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Design Inspector - Herramienta temporal para validar diseño
 * Muestra bordes de colores en todos los elementos para validar espaciado y alineación
 */
export function DesignInspector() {
  const [enabled, setEnabled] = useState(false);

  React.useEffect(() => {
    if (enabled) {
      // Agregar estilos globales para visualizar diseño
      const style = document.createElement('style');
      style.id = 'design-inspector';
      style.innerHTML = `
        /* Highlight all elements */
        * {
          outline: 1px solid rgba(255, 0, 0, 0.3) !important;
        }

        /* Highlight containers */
        div {
          outline: 1px solid rgba(0, 255, 0, 0.3) !important;
        }

        /* Highlight sections */
        section, header, footer, nav, aside, main {
          outline: 2px solid rgba(0, 0, 255, 0.5) !important;
        }

        /* Highlight text elements */
        p, span, h1, h2, h3, h4, h5, h6, label {
          outline: 1px solid rgba(255, 255, 0, 0.3) !important;
        }

        /* Highlight buttons and inputs */
        button, input, select, textarea {
          outline: 2px solid rgba(255, 0, 255, 0.5) !important;
        }

        /* Show spacing */
        * {
          background-clip: content-box !important;
        }
      `;
      document.head.appendChild(style);
    } else {
      // Remover estilos
      const style = document.getElementById('design-inspector');
      if (style) {
        style.remove();
      }
    }

    return () => {
      const style = document.getElementById('design-inspector');
      if (style) {
        style.remove();
      }
    };
  }, [enabled]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setEnabled(!enabled)}
      className={cn(
        'relative',
        enabled && 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
      )}
      title={enabled ? 'Desactivar modo inspector' : 'Activar modo inspector'}
    >
      {enabled ? <EyeOff className="w-5 h-5" /> : <Paintbrush className="w-5 h-5" />}
      {enabled && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
        </span>
      )}
    </Button>
  );
}

/**
 * Color Palette Display - Muestra la paleta de colores usada
 */
export function ColorPaletteInspector() {
  const [show, setShow] = useState(false);

  const colors = [
    { name: 'Background', light: 'bg-white', dark: 'dark:bg-slate-950' },
    { name: 'Foreground', light: 'bg-slate-900', dark: 'dark:bg-slate-100' },
    { name: 'Primary', light: 'bg-blue-600', dark: 'dark:bg-blue-400' },
    { name: 'Secondary', light: 'bg-slate-200', dark: 'dark:bg-slate-800' },
    { name: 'Accent', light: 'bg-blue-50', dark: 'dark:bg-blue-950' },
    { name: 'Muted', light: 'bg-slate-100', dark: 'dark:bg-slate-900' },
    { name: 'Border', light: 'bg-slate-200', dark: 'dark:bg-slate-800' },
    { name: 'Error', light: 'bg-red-600', dark: 'dark:bg-red-400' },
    { name: 'Warning', light: 'bg-yellow-600', dark: 'dark:bg-yellow-400' },
    { name: 'Success', light: 'bg-green-600', dark: 'dark:bg-green-400' },
    { name: 'Info', light: 'bg-blue-600', dark: 'dark:bg-blue-400' },
  ];

  if (!show) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShow(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Eye className="w-4 h-4 mr-2" />
        Ver Paleta
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
          Paleta de Colores
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShow(false)}
          className="h-6 w-6 p-0"
        >
          <EyeOff className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {colors.map((color) => (
          <div key={color.name} className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded border border-slate-300 dark:border-slate-700', color.light, color.dark)} />
            <span className="text-xs text-slate-700 dark:text-slate-300">
              {color.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
