import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";

export function ReassessmentComparator({ patientId }: { patientId: string }) {
  const { clinicId } = useActiveClinic();
  const q = useQuery({
    queryKey: ["reaval-compare", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, data, tipo, eva, queixa_principal, objetivos, condutas")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .order("data", { ascending: false })
        .limit(2);
      return data ?? [];
    },
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Carregando comparativo…</div>;
  const list = q.data ?? [];
  if (list.length < 2) {
    return <Card className="p-4 text-sm text-muted-foreground">É necessário pelo menos uma avaliação inicial e uma reavaliação para gerar o comparativo.</Card>;
  }
  const [atual, anterior] = list;

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-semibold">Comparativo: anterior → atual</h3>
        <p className="text-xs text-muted-foreground">{fmtDate(anterior.data)} versus {fmtDate(atual.data)}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <ScoreCompare label="EVA (dor)" before={anterior.eva} after={atual.eva} lowerIsBetter />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <CompareBlock label="Queixa principal" before={anterior.queixa_principal} after={atual.queixa_principal} />
        <CompareBlock label="Objetivos" before={anterior.objetivos} after={atual.objetivos} />
        <CompareBlock label="Plano / condutas" before={anterior.condutas} after={atual.condutas} className="sm:col-span-2" />
      </div>
    </Card>
  );
}

function CompareBlock({ label, before, after, className }: { label: string; before: any; after: any; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
        <div className="p-2 rounded bg-muted/40 text-xs whitespace-pre-wrap">{before || "—"}</div>
        <ArrowRight className="h-4 w-4 text-muted-foreground self-center" />
        <div className="p-2 rounded bg-primary/10 text-xs whitespace-pre-wrap">{after || "—"}</div>
      </div>
    </div>
  );
}

function ScoreCompare({ label, before, after, lowerIsBetter }: { label: string; before: any; after: any; lowerIsBetter?: boolean }) {
  const b = before == null ? null : Number(before);
  const a = after == null ? null : Number(after);
  let icon = <Minus className="h-4 w-4 text-muted-foreground" />;
  let color = "text-muted-foreground";
  if (b != null && a != null && !isNaN(b) && !isNaN(a)) {
    const improved = lowerIsBetter ? a < b : a > b;
    const worsened = lowerIsBetter ? a > b : a < b;
    if (improved) { icon = <TrendingDown className="h-4 w-4 text-emerald-600" />; color = "text-emerald-700"; }
    else if (worsened) { icon = <TrendingUp className="h-4 w-4 text-red-600" />; color = "text-red-700"; }
  }
  return (
    <div className="p-3 rounded-lg border">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-semibold tabular-nums">{a ?? "—"}</span>
        <span className="text-xs text-muted-foreground">de {b ?? "—"}</span>
        {icon}
      </div>
      <div className={`text-xs ${color}`}>
        {b != null && a != null && !isNaN(b) && !isNaN(a) ? (a === b ? "Sem variação" : `Δ ${(a - b).toFixed(1)}`) : "—"}
      </div>
    </div>
  );
}
