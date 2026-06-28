import { BarChart3, LineChart, Activity } from "lucide-react";
import { InfoCard } from "@/components/layout";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import type { AssessmentRow } from "./compare-utils";

type ChartPoint = {
  label: string;
  eva: number | null;
  adm: number | null;
  forca: number | null;
  escalas: number | null;
};

function extractScores(a: AssessmentRow | null): Omit<ChartPoint, "label"> {
  if (!a) return { eva: null, adm: null, forca: null, escalas: null };
  const rom = a.rom_goniometry;
  let adm: number | null = null;
  if (Array.isArray(rom)) {
    const vals = rom.map((r) => Number(r?.valor)).filter((n) => !Number.isNaN(n));
    adm = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
  }
  let forca: number | null = null;
  const mrc = a.strength_mrc;
  if (Array.isArray(mrc)) {
    const vals = mrc.map((r) => Number(r?.grade ?? r?.valor)).filter((n) => !Number.isNaN(n));
    forca = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
  }
  let escalas: number | null = null;
  const sc = a.scales_results;
  if (Array.isArray(sc)) {
    const vals = sc.map((s) => Number(s?.total_score ?? s?.score)).filter((n) => !Number.isNaN(n));
    escalas = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
  }
  return { eva: a.eva, adm, forca, escalas };
}

type ReassessmentChartsProps = {
  inicial: AssessmentRow | null;
  ultima: AssessmentRow | null;
  atual: AssessmentRow | null;
};

export function ReassessmentCharts({ inicial, ultima, atual }: ReassessmentChartsProps) {
  const points: ChartPoint[] = [
    { label: inicial ? `Inicial · ${fmtDate(inicial.data)}` : "Inicial", ...extractScores(inicial) },
    { label: ultima ? `Última · ${fmtDate(ultima.data)}` : "Última reav.", ...extractScores(ultima) },
    { label: atual ? `Atual · ${fmtDate(atual.data)}` : "Atual", ...extractScores(atual) },
  ];

  const hasEva = points.some((p) => p.eva != null);
  const hasAdm = points.some((p) => p.adm != null);
  const hasForca = points.some((p) => p.forca != null);
  const hasEscalas = points.some((p) => p.escalas != null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartPlaceholder
        icon={Activity}
        title="EVA (dor)"
        subtitle="Evolução da escala visual analógica"
        hasData={hasEva}
        points={points.map((p) => ({ label: p.label, value: p.eva, max: 10 }))}
        unit="/10"
        lowerIsBetter
      />
      <ChartPlaceholder
        icon={LineChart}
        title="ADM (goniometria)"
        subtitle="Amplitude média de movimento (°)"
        hasData={hasAdm}
        points={points.map((p) => ({ label: p.label, value: p.adm, max: 180 }))}
        unit="°"
      />
      <ChartPlaceholder
        icon={BarChart3}
        title="Força muscular (MRC)"
        subtitle="Média MRC por grupos registrados"
        hasData={hasForca}
        points={points.map((p) => ({ label: p.label, value: p.forca, max: 5 }))}
        unit=" MRC"
      />
      <ChartPlaceholder
        icon={BarChart3}
        title="Escalas clínicas"
        subtitle="Média dos escores registrados"
        hasData={hasEscalas}
        points={points.map((p) => ({ label: p.label, value: p.escalas, max: 100 }))}
      />
    </div>
  );
}

function ChartPlaceholder({
  icon: Icon,
  title,
  subtitle,
  hasData,
  points,
  unit = "",
  lowerIsBetter,
}: {
  icon: typeof Activity;
  title: string;
  subtitle: string;
  hasData: boolean;
  points: { label: string; value: number | null; max: number }[];
  unit?: string;
  lowerIsBetter?: boolean;
}) {
  return (
    <InfoCard icon={Icon} title={title} description={subtitle}>
      {!hasData ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
          <Icon className="mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium text-muted-foreground">Gráfico em preparação</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Preencha os dados clínicos na reavaliação para visualizar a evolução.
          </p>
        </div>
      ) : (
        <div className="space-y-3" role="img" aria-label={`Gráfico de ${title}`}>
          {points.map((p) => {
            const pct = p.value != null && p.max > 0 ? Math.min(100, (p.value / p.max) * 100) : 0;
            const barColor = lowerIsBetter
              ? p.value != null && p.value <= 3
                ? "bg-emerald-500"
                : "bg-amber-500"
              : "bg-primary";
            return (
              <div key={p.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="truncate font-medium text-slate-700">{p.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {p.value != null ? `${p.value}${unit}` : "—"}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full rounded-full transition-all", barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </InfoCard>
  );
}
