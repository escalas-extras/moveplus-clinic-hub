import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type ClinicalSkeletonVariant = "dashboard" | "split" | "list" | "wizard";

type ClinicalSkeletonProps = {
  variant?: ClinicalSkeletonVariant;
  kpiCount?: number;
  className?: string;
};

export function ClinicalSkeleton({
  variant = "dashboard",
  kpiCount = 4,
  className,
}: ClinicalSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-label="Carregando conteúdo">
      {(variant === "dashboard" || variant === "list" || variant === "split") && (
        <div className={cn(clinical.kpiGrid, kpiCount === 3 && "sm:grid-cols-3", kpiCount === 6 && "md:grid-cols-3 xl:grid-cols-6")}>
          {Array.from({ length: kpiCount }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}
      {(variant === "dashboard" || variant === "list" || variant === "split") && (
        <Skeleton className="h-16 rounded-2xl" />
      )}
      {variant === "split" && (
        <div className={clinical.splitLayout}>
          <Skeleton className="h-[480px] rounded-2xl" />
          <Skeleton className="hidden h-[480px] rounded-2xl xl:block" />
        </div>
      )}
      {variant === "list" && <Skeleton className="h-80 rounded-2xl" />}
      {variant === "wizard" && (
        <>
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <Skeleton className="hidden h-96 rounded-2xl lg:block" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </>
      )}
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
