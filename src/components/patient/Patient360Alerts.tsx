import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageSection, StatusBadge } from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { useActiveClinic } from "@/lib/active-clinic";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
  draftAssessments: number;
  unsignedEvolutions: number;
};

export function Patient360Alerts({ patientId, draftAssessments, unsignedEvolutions }: Props) {
  const { clinicId } = useActiveClinic();
  const today = new Date().toISOString().slice(0, 10);

  const reeval = useQuery({
    queryKey: ["patient-360-reeval", clinicId, patientId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("reassessment_schedule")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .lte("scheduled_for", today)
        .is("completed_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const finance = useQuery({
    queryKey: ["patient-360-finance", clinicId, patientId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("financial_entries")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .eq("entry_type", "receivable")
        .eq("status", "pendente");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const rows = [
    {
      id: "reeval",
      label: "Reavaliação vencida",
      count: reeval.data ?? 0,
      to: "/app/reavaliacoes",
      icon: RefreshCw,
      tone: "warning" as const,
      hint: "Reavaliação em dia",
    },
    {
      id: "draft",
      label: "Avaliação em rascunho",
      count: draftAssessments,
      to: "#avaliacoes",
      icon: ClipboardList,
      tone: "warning" as const,
      hint: "Sem rascunhos",
    },
    {
      id: "sign",
      label: "Evolução sem assinatura",
      count: unsignedEvolutions,
      to: "#evolucoes",
      icon: ClipboardList,
      tone: "warning" as const,
      hint: "Evoluções assinadas",
    },
    {
      id: "fin",
      label: "Recebimento pendente",
      count: finance.data ?? 0,
      to: "/app/financeiro/receber",
      icon: Wallet,
      tone: "danger" as const,
      hint: "Financeiro em dia",
    },
  ];

  const activeCount = rows.filter((r) => r.count > 0).length;

  return (
    <PageSection
      icon={AlertTriangle}
      title="Alertas do paciente"
      description={
        activeCount > 0
          ? `${activeCount} ponto(s) que merecem atenção`
          : "Nenhum alerta clínico ou financeiro no momento"
      }
      contentClassName="space-y-2"
      className="fos-animate-in"
    >
      {rows.map((row) => (
        <AlertRow key={row.id} row={row} />
      ))}
    </PageSection>
  );
}

function AlertRow({
  row,
}: {
  row: {
    label: string;
    count: number;
    to: string;
    icon: typeof RefreshCw;
    tone: "warning" | "danger";
    hint: string;
  };
}) {
  if (row.count <= 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-4 py-2.5">
        <row.icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span className="flex-1 text-sm text-slate-600">{row.label}</span>
        <StatusBadge variant="success">{row.hint}</StatusBadge>
      </div>
    );
  }

  const isHash = row.to.startsWith("#");
  const className = cn(
    "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all hover:-translate-y-px hover:shadow-sm",
    row.tone === "danger" ? "border-rose-200/80 bg-rose-50/50" : "border-amber-200/80 bg-amber-50/50",
  );
  const inner = (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          row.tone === "danger" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700",
        )}
      >
        <row.icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{row.label}</p>
        <p className="text-xs text-slate-600">{row.count} pendência(s)</p>
      </div>
      <StatusBadge variant={row.tone === "danger" ? "danger" : "warning"}>{row.count}</StatusBadge>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </>
  );

  if (isHash) {
    return (
      <a href={row.to} className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={row.to} className={className}>
      {inner}
    </Link>
  );
}

export function usePatient360Counts(patientId: string) {
  const { clinicId } = useActiveClinic();

  return useQuery({
    queryKey: ["patient-360-counts", clinicId, patientId],
    enabled: !!clinicId,
    queryFn: async () => {
      const [docs, finance] = await Promise.all([
        supabase
          .from("clinical_documents")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", clinicId!)
          .eq("patient_id", patientId),
        supabase
          .from("financial_entries")
          .select("id", { count: "exact", head: true })
          .eq("clinic_id", clinicId!)
          .eq("patient_id", patientId)
          .eq("entry_type", "receivable")
          .eq("status", "pendente"),
      ]);
      return {
        documentsCount: docs.count ?? 0,
        financialPendingCount: finance.count ?? 0,
      };
    },
    staleTime: 30_000,
  });
}

export function usePatient360NextSession(patientId: string) {
  const { clinicId } = useActiveClinic();

  return useQuery({
    queryKey: ["patient-360-next-appt", clinicId, patientId],
    enabled: !!clinicId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("appointments")
        .select("data, horario")
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .gte("data", today)
        .order("data")
        .order("horario")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return "Nenhuma sessão agendada";
      return `${fmtDate(data.data)} · ${String(data.horario).slice(0, 5)}`;
    },
    staleTime: 30_000,
  });
}
