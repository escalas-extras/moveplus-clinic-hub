import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type EvaScaleProps = {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  description?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
};

type Zone = {
  key: "leve" | "moderada" | "intensa";
  label: string;
  range: [number, number];
  /** Semantic clinical color (HSL via CSS var-friendly hex fallback) */
  color: string;
  text: string;
  description: string;
};

const ZONES: Zone[] = [
  {
    key: "leve",
    label: "Leve",
    range: [0, 2],
    color: "hsl(210 65% 55%)",
    text: "Dor leve — não interfere nas atividades diárias.",
    description: "Sem prejuízo funcional significativo.",
  },
  {
    key: "moderada",
    label: "Moderada",
    range: [3, 7],
    color: "hsl(142 55% 42%)",
    text: "Dor moderada — interfere parcialmente nas atividades.",
    description: "Limitação funcional perceptível.",
  },
  {
    key: "intensa",
    label: "Intensa",
    range: [8, 10],
    color: "hsl(0 72% 52%)",
    text: "Dor intensa — incapacitante para atividades habituais.",
    description: "Prejuízo funcional importante.",
  },
];

function zoneFor(v: number): Zone {
  return ZONES.find((z) => v >= z.range[0] && v <= z.range[1]) ?? ZONES[0];
}

const STEPS = Array.from({ length: 11 }, (_, i) => i);

export function EvaScale({
  value,
  onChange,
  label = "Escala Visual Analógica — EVA",
  description = true,
  className,
  disabled,
  id,
}: EvaScaleProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const safeValue = Math.min(10, Math.max(0, Math.round(value || 0)));
  const zone = zoneFor(safeValue);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const next = Math.round(ratio * 10);
      if (next !== safeValue) onChange(next);
    },
    [onChange, safeValue],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, setFromClientX]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setFromClientX(e.clientX);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    let next = safeValue;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(10, safeValue + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(0, safeValue - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 10;
    else if (/^[0-9]$/.test(e.key)) next = parseInt(e.key, 10);
    else return;
    e.preventDefault();
    onChange(next);
  };

  const percent = (safeValue / 10) * 100;

  return (
    <div className={cn("w-full select-none", className)}>
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {description && (
            <div className="text-xs text-muted-foreground/80 mt-0.5 truncate">
              {zone.text}
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span
            className="text-3xl font-semibold tabular-nums leading-none"
            style={{ color: zone.color }}
          >
            {safeValue}
          </span>
          <span className="text-xs text-muted-foreground">/ 10</span>
        </div>
      </div>

      {/* Zone labels */}
      <div className="grid grid-cols-[3fr_5fr_3fr] text-[10px] font-semibold uppercase tracking-wider mb-1.5">
        {ZONES.map((z) => (
          <span
            key={z.key}
            className={cn(
              "transition-opacity",
              zone.key === z.key ? "opacity-100" : "opacity-40",
            )}
            style={{ color: z.color }}
          >
            {z.label}
          </span>
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className={cn(
          "relative h-10 rounded-md border border-border bg-muted/40 cursor-pointer touch-none",
          disabled && "opacity-50 pointer-events-none",
        )}
        onPointerDown={handlePointerDown}
        role="slider"
        id={id}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue} de 10 — ${zone.label}`}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKey}
      >
        {/* zone bands */}
        <div className="absolute inset-0 flex overflow-hidden rounded-md">
          <div className="h-full" style={{ width: "27.27%", background: "hsl(210 65% 55% / 0.12)" }} />
          <div className="h-full" style={{ width: "45.46%", background: "hsl(142 55% 42% / 0.12)" }} />
          <div className="h-full" style={{ width: "27.27%", background: "hsl(0 72% 52% / 0.12)" }} />
        </div>

        {/* tick numbers */}
        <div className="absolute inset-0 flex items-center justify-between px-[calc(0.625rem-1px)] pointer-events-none">
          {STEPS.map((n) => {
            const active = n === safeValue;
            const z = zoneFor(n);
            return (
              <button
                key={n}
                type="button"
                tabIndex={-1}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (!disabled) onChange(n);
                }}
                className={cn(
                  "pointer-events-auto w-6 h-6 grid place-items-center rounded-full text-[11px] font-semibold tabular-nums transition-all",
                  active
                    ? "text-white shadow-sm scale-110"
                    : "text-foreground/70 hover:text-foreground",
                )}
                style={active ? { background: z.color } : undefined}
                aria-label={`Valor ${n}`}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* progress indicator line */}
        <div
          className="absolute top-0 bottom-0 w-px transition-all duration-150 ease-out"
          style={{
            left: `${percent}%`,
            background: zone.color,
            transform: "translateX(-0.5px)",
          }}
        />
      </div>

      {/* Footer description */}
      {description && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-medium" style={{ color: zone.color }}>
            {zone.label}:
          </span>{" "}
          {zone.description}
        </div>
      )}
    </div>
  );
}

export default EvaScale;
