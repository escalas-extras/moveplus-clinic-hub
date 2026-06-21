import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ClipboardList, Activity, RefreshCw, LogOut, FileText } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { useActiveClinic } from "@/lib/active-clinic";

type TimelineItem = {
  id: string;
  date: string;
  hora?: string | null;
  kind: "assessment" | "reassessment" | "evolution" | "discharge" | "document";
  title: string;
  subtitle?: string;
};

const KIND_META: Record<TimelineItem["kind"], { label: string; icon: any; color: string }> = {
  assessment:   { label: "Avaliação",   icon: ClipboardList, color: "#0F4C5C" },
  reassessment: { label: "Reavaliação", icon: RefreshCw,     color: "#4F9CF9" },
  evolution:    { label: "Evolução",    icon: Activity,      color: "#2BB673" },
  discharge:    { label: "Alta",        icon: LogOut,        color: "#E07A5F" },
  document:     { label: "Documento",   icon: FileText,      color: "#64748B" },
};

export function PatientTimeline({ patientId }: { patientId: string }) {
  const { clinicId } = useActiveClinic();
  const q = useQuery({
    queryKey: ["timeline", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async (): Promise<TimelineItem[]> => {
      const [assess, evol, disc, docs] = await Promise.all([
        supabase.from("assessments").select("id, data, tipo, queixa_principal, professionals(nome)").eq("clinic_id", clinicId!).eq("patient_id", patientId),
        supabase.from("evolutions").select("id, data, hora, procedimentos, professionals(nome)").eq("clinic_id", clinicId!).eq("patient_id", patientId),
        supabase.from("patient_discharges").select("id, data_alta, motivo, professionals(nome)").eq("patient_id", patientId),
        supabase.from("documents").select("id, tipo, emitido_em").eq("patient_id", patientId).limit(50),
      ]);
      const items: TimelineItem[] = [];
      (assess.data ?? []).forEach((a: any) => items.push({
        id: `a-${a.id}`,
        date: a.data,
        kind: a.tipo === "reavaliacao" ? "reassessment" : "assessment",
        title: a.tipo === "reavaliacao" ? "Reavaliação fisioterapêutica" : "Avaliação inicial",
        subtitle: [a.professionals?.nome, a.queixa_principal?.slice(0, 80)].filter(Boolean).join(" · "),
      }));
      (evol.data ?? []).forEach((e: any) => items.push({
        id: `e-${e.id}`,
        date: e.data,
        hora: e.hora,
        kind: "evolution",
        title: "Sessão / Evolução",
        subtitle: [e.professionals?.nome, e.procedimentos?.slice(0, 80)].filter(Boolean).join(" · "),
      }));
      (disc.data ?? []).forEach((d: any) => items.push({
        id: `d-${d.id}`,
        date: d.data_alta,
        kind: "discharge",
        title: "Alta fisioterapêutica",
        subtitle: [d.professionals?.nome, d.motivo].filter(Boolean).join(" · "),
      }));
      (docs.data ?? []).forEach((d: any) => items.push({
        id: `doc-${d.id}`,
        date: (d.emitido_em ?? "").slice(0, 10),
        kind: "document",
        title: `Documento emitido (${d.tipo})`,
      }));
      return items.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : (b.hora ?? "").localeCompare(a.hora ?? "")));
    },
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Carregando timeline…</div>;
  const items = q.data ?? [];

  if (!items.length) {
    return <Card className="p-6 text-sm text-muted-foreground">Nenhum evento clínico registrado ainda. Comece criando uma avaliação.</Card>;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-semibold">Linha do tempo clínica</h3>
        <p className="text-xs text-muted-foreground">{items.length} eventos · do mais recente ao mais antigo</p>
      </div>
      <ol className="relative ml-3 space-y-5 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-primary/30 before:via-border before:to-transparent">
        {items.map((it) => {
          const meta = KIND_META[it.kind];
          const Icon = meta.icon;
          return (
            <li key={it.id} className="ml-6 lift hover:translate-x-0.5">
              <span
                className="absolute -left-[14px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background shadow-soft"
                style={{ background: `linear-gradient(135deg, ${meta.color}, color-mix(in oklab, ${meta.color} 70%, white))` }}
              >
                <Icon className="h-3.5 w-3.5 text-white" />
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{fmtDate(it.date)}{it.hora ? ` · ${String(it.hora).slice(0, 5)}` : ""}</span>
              </div>
              <div className="text-sm font-medium mt-0.5">{it.title}</div>
              {it.subtitle && <div className="text-xs text-muted-foreground mt-0.5">{it.subtitle}</div>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
