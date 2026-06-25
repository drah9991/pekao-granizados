import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Panel – componente UI reutilizable que se posiciona de forma absoluta dentro
 * de su contenedor padre (normalmente un canvas o layout). Utiliza un estilo
 * "píldora" con fondo semitransparente, blur y bordes redondeados.
 *
 * Props
 *  - `position`: uno de los cuatro cuadrantes del contenedor. Por defecto
 *    `top-left`. Cada opción asigna clases Tailwind para top/bottom y left/right.
 *  - `className`: permite extender o sobrescribir estilos.
 *  - `children`: contenido interno del panel (botones, texto, etc.).
 */
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Posición del panel dentro del contenedor padre.
   * Utiliza clases absolutas de Tailwind.
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const Panel = ({
  position = 'top-left',
  className,
  children,
  ...rest
}: PanelProps) => {
  const positionClasses: Record<NonNullable<PanelProps['position']>, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      className={cn(
        'absolute',
        positionClasses[position],
        // estilo "píldora" de fondo semitransparente y blur
        'bg-white/70 dark:bg-black/70 backdrop-blur-md rounded-full p-2 flex space-x-2',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Panel;
