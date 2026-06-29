import { memo } from "react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type ClinicalSkeletonVariant = "dashboard" | "split" | "list" | "wizard" | "panel" | "record";

type ClinicalSkeletonProps = {
  variant?: ClinicalSkeletonVariant;
  kpiCount?: number;
  className?: string;
};

function Shimmer({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={cn(clinical.skeleton, className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      aria-hidden
    />
  );
}

export const ClinicalSkeleton = memo(function ClinicalSkeleton({
  variant = "dashboard",
  kpiCount = 4,
  className,
}: ClinicalSkeletonProps) {
  const showKpis =
    (variant === "dashboard" || variant === "list" || variant === "split") && kpiCount > 0;
  const showHero = variant === "dashboard" || variant === "record";
  const showHeader =
    variant === "dashboard" || variant === "list" || variant === "split" || variant === "panel";

  return (
    <div className={cn("space-y-4 sm:space-y-5", className)} role="status" aria-label="Carregando conteúdo">
      {showHero && (
        <div className="overflow-hidden rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/70 p-5 sm:p-6">
          <Shimmer className="h-3 w-24 rounded-full" />
          <Shimmer className="mt-4 h-8 w-2/3 max-w-sm rounded-xl" delay={60} />
          <div className="mt-5 flex flex-wrap gap-2">
            <Shimmer className="h-9 w-28 rounded-xl" delay={120} />
            <Shimmer className="h-9 w-24 rounded-xl" delay={160} />
            <Shimmer className="h-9 w-24 rounded-xl" delay={200} />
          </div>
        </div>
      )}

      {showKpis && (
        <div
          className={cn(
            clinical.kpiGrid,
            kpiCount === 3 && "sm:grid-cols-3",
            kpiCount === 5 && "sm:grid-cols-2 lg:grid-cols-5",
            kpiCount === 6 && "md:grid-cols-3 xl:grid-cols-3",
          )}
        >
          {Array.from({ length: kpiCount }).map((_, i) => (
            <Shimmer key={i} className="h-[132px] rounded-2xl sm:h-[148px]" delay={i * 70} />
          ))}
        </div>
      )}

      {showHeader && variant !== "panel" && (
        <div className="space-y-3 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/60 p-4 sm:p-5">
          <Shimmer className="h-3.5 w-28 rounded-full" />
          <Shimmer className="h-7 w-2/3 max-w-md rounded-xl" delay={80} />
          <Shimmer className="h-4 w-full max-w-lg rounded-full" delay={140} />
        </div>
      )}

      {variant === "split" && (
        <div className={clinical.splitLayout}>
          <Shimmer className="h-[420px] rounded-2xl sm:h-[480px]" delay={100} />
          <Shimmer className="hidden h-[420px] rounded-2xl xl:block sm:h-[480px]" delay={180} />
        </div>
      )}

      {variant === "list" && (
        <div className="space-y-2 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/60 p-3 sm:p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-12 w-full rounded-xl" delay={i * 60} />
          ))}
        </div>
      )}

      {variant === "panel" && (
        <div className="space-y-2 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/60 p-3 sm:p-4">
          <Shimmer className="mb-2 h-9 w-full max-w-xs rounded-xl" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Shimmer key={i} className="h-11 w-full rounded-xl" delay={i * 55} />
          ))}
        </div>
      )}

      {variant === "wizard" && (
        <>
          <Shimmer className="h-24 rounded-2xl sm:h-28" />
          <Shimmer className="h-12 rounded-2xl sm:h-14" delay={80} />
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <Shimmer className="hidden h-80 rounded-2xl lg:block sm:h-96" delay={120} />
            <Shimmer className="h-80 rounded-2xl sm:h-96" delay={160} />
          </div>
        </>
      )}

      {variant === "record" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Shimmer className="h-64 rounded-2xl sm:h-72" delay={100} />
          <Shimmer className="h-64 rounded-2xl sm:h-72" delay={160} />
        </div>
      )}

      <span className="sr-only">Carregando…</span>
    </div>
  );
});
