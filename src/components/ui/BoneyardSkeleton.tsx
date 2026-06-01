import React from 'react';
import { Skeleton } from 'boneyard-js/react';
import { cn } from '@/lib/utils';

interface BoneyardSkeletonProps {
  name: string;
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  animate?: 'pulse' | 'wave' | 'none';
}

export function BoneyardSkeleton({ 
  name, 
  isLoading, 
  children, 
  className,
  animate = 'wave' 
}: BoneyardSkeletonProps) {
  return (
    <Skeleton 
      name={name} 
      loading={isLoading} 
      className={cn("transition-all duration-500", className)}
      animation={animate}
    >
      {!isLoading && children}
    </Skeleton>
  );
}
