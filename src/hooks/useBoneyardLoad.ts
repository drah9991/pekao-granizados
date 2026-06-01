import { useState, useEffect } from 'react';

export function useBoneyardLoad(isQueryLoading: boolean, minLoadTimeMs = 400) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (!isQueryLoading) {
      // Retrasar el retiro del skeleton si la respuesta fue demasiado rápida
      timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, minLoadTimeMs);
    } else {
      setIsLoading(true);
    }

    return () => clearTimeout(timeoutId);
  }, [isQueryLoading, minLoadTimeMs]);

  return isLoading;
}
