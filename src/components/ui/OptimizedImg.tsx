import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  priority?: boolean;
  fallback?: string;
}

export default function OptimizedImg({
  src,
  alt,
  priority = false,
  fallback,
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImgProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(e);
  }, [onLoad]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgError(true);
    onError?.(e);
  }, [onError]);

  return (
    <img
      src={imgError && fallback ? fallback : src}
      alt={alt}
      loading={priority ? undefined : "lazy"}
      fetchpriority={priority ? "high" : undefined}
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        "transition-opacity duration-300",
        isLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      {...props}
    />
  );
}
