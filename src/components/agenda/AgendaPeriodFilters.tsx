import { cn } from "@/lib/utils";

type Props = {
  view: "dia" | "semana" | "mes";
  onViewChange: (view: "dia" | "semana" | "mes") => void;
  onToday: () => void;
  primaryColor?: string;
};

const PERIODS: Array<{ value: "dia" | "semana" | "mes"; label: string }> = [
  { value: "dia", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
];

export function AgendaPeriodFilters({ view, onViewChange, onToday, primaryColor = "var(--fos-primary)" }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white/90 p-2.5 shadow-[var(--fos-card-shadow)]">
      <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Período</span>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => {
            if (p.value === "dia") onToday();
            onViewChange(p.value);
          }}
          className={cn(
            "rounded-full border px-4 py-2 text-xs font-semibold transition hover:-translate-y-px",
            view === p.value
              ? "border-transparent text-white shadow-soft"
              : "border-[rgba(15,76,92,0.12)] bg-white text-slate-600 hover:border-primary/30",
          )}
          style={view === p.value ? { background: primaryColor } : undefined}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
