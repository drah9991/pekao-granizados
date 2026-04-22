import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-muted/40 rounded-xl", className)} />
);

export const DashboardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <Card className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl h-32">
      <Skeleton className="h-3 w-20 mb-4 opacity-50" />
      <Skeleton className="h-8 w-32 opacity-30" />
    </Card>
    <Card className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl h-32">
      <Skeleton className="h-3 w-20 mb-4 opacity-50" />
      <Skeleton className="h-8 w-32 opacity-30" />
    </Card>
    <Card className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl h-32">
      <Skeleton className="h-3 w-20 mb-4 opacity-50" />
      <Skeleton className="h-8 w-32 opacity-30" />
    </Card>
    <Card className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl h-32">
      <Skeleton className="h-3 w-20 mb-4 opacity-50" />
      <Skeleton className="h-8 w-32 opacity-30" />
    </Card>
  </div>
);

export const WidgetSkeleton = ({ height = "h-[400px]" }: { height?: string }) => (
  <div className={cn("w-full bg-white/[0.02] border border-white/5 rounded-3xl p-6", height)}>
    <Skeleton className="h-6 w-48 mb-6 opacity-40" />
    <Skeleton className="h-[calc(100%-48px)] w-full rounded-2xl opacity-20" />
  </div>
);
