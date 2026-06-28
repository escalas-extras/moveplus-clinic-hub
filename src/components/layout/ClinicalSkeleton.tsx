import { memo } from "react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type ClinicalSkeletonVariant = "dashboard" | "split" | "list" | "wizard";

type ClinicalSkeletonProps = {
  variant?: ClinicalSkeletonVariant;
  kpiCount?: number;
  className?: string;
};

function Shimmer({ className }: { className?: string }) {
  return <div className={cn(clinical.skeleton, className)} aria-hidden />;
}

export const ClinicalSkeleton = memo(function ClinicalSkeleton({
  variant = "dashboard",
  kpiCount = 4,
  className,
}: ClinicalSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} role="status" aria-label="Carregando conteúdo">
      {(variant === "dashboard" || variant === "list" || variant === "split") && (
        <div
          className={cn(
            clinical.kpiGrid,
            kpiCount === 3 && "sm:grid-cols-3",
            kpiCount === 6 && "md:grid-cols-3 xl:grid-cols-3",
          )}
        >
          {Array.from({ length: kpiCount }).map((_, i) => (
            <Shimmer key={i} className="h-[148px] rounded-2xl" />
          ))}
        </div>
      )}
      {(variant === "dashboard" || variant === "list" || variant === "split") && (
        <div className="space-y-3 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/60 p-5">
          <Shimmer className="h-4 w-32 rounded-full" />
          <Shimmer className="h-7 w-2/3 max-w-md rounded-full" />
          <Shimmer className="h-4 w-full max-w-lg rounded-full" />
        </div>
      )}
      {variant === "split" && (
        <div className={clinical.splitLayout}>
          <Shimmer className="h-[480px] rounded-2xl" />
          <Shimmer className="hidden h-[480px] rounded-2xl xl:block" />
        </div>
      )}
      {variant === "list" && (
        <div className="space-y-2 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/60 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      )}
      {variant === "wizard" && (
        <>
          <Shimmer className="h-28 rounded-2xl" />
          <Shimmer className="h-14 rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <Shimmer className="hidden h-96 rounded-2xl lg:block" />
            <Shimmer className="h-96 rounded-2xl" />
          </div>
        </>
      )}
      <span className="sr-only">Carregando…</span>
    </div>
  );
});