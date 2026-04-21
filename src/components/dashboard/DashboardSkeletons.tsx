import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-muted/40 rounded-xl", className)} />
);

export const DashboardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <Card className="p-6 glass-pro border-none h-32">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32" />
    </Card>
    <Card className="p-6 glass-pro border-none h-32">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32" />
    </Card>
    <Card className="p-6 glass-pro border-none h-32">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32" />
    </Card>
    <Card className="p-6 glass-pro border-none h-32">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="h-8 w-32" />
    </Card>
  </div>
);

export const WidgetSkeleton = ({ height = "h-[400px]" }: { height?: string }) => (
  <div className={cn("w-full glass-pro rounded-[2.5rem] p-6", height)}>
    <Skeleton className="h-6 w-48 mb-6" />
    <Skeleton className="h-[calc(100%-48px)] w-full rounded-2xl" />
  </div>
);
