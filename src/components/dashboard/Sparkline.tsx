import { cn } from "@/lib/utils";

type SparklineProps = {
  data: number[];
  color?: string;
  className?: string;
  height?: number;
  /** Ocupa largura total do card KPI. */
  integrated?: boolean;
};

export function Sparkline({
  data,
  color = "var(--fos-primary)",
  className,
  height = 28,
  integrated = false,
}: SparklineProps) {
  if (data.length < 2) return null;

  const w = integrated ? 240 : 88;
  const pad = integrated ? 4 : 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const last = data[data.length - 1]!;
  const lastX = w - pad;
  const lastY = pad + (1 - (last - min) / range) * (height - pad * 2);

  const fillPoints = integrated
    ? `${pad},${height - pad} ${points} ${w - pad},${height - pad}`
    : null;

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className={cn(integrated ? "h-8 w-full" : "w-[88px] shrink-0 opacity-80", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      {fillPoints && (
        <polygon
          points={fillPoints}
          fill={`color-mix(in oklab, ${color} 12%, transparent)`}
          stroke="none"
        />
      )}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={integrated ? 2 : 1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={integrated ? 0.75 : 0.55}
      />
      <circle cx={lastX} cy={lastY} r={integrated ? 3 : 2.5} fill={color} opacity={0.95} />
    </svg>
  );
}

export function sparkFromTrend(previous: number, current: number, steps = 6): number[] {
  if (steps < 2) return [current];
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return Math.max(0, Math.round(previous + (current - previous) * t));
  });
}
