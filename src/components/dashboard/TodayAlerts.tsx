import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  RefreshCw,
  UserX,
  Wallet,
} from "lucide-react";
import { PageSection } from "@/components/layout";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { cn } from "@/lib/utils";

type AlertRow = {
  id: string;
  label: string;
  count: number;
  to: string;
  icon: typeof RefreshCw;
  tone: "default" | "warning" | "danger";
  emptyHint: string;
};

type TodayAlertsProps = {
  reevaluations: number;
  patientsWithoutReturn: number;
  pendingDocuments: number;
  overdueReceivables: number;
};

function AlertItem({ row }: { row: AlertRow }) {
  if (row.count <= 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/60 px-4 py-3">
        <row.icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-700">{row.label}</p>
          <p className="text-xs text-slate-500">{row.emptyHint}</p>
        </div>
        <StatusBadge variant="success">OK</StatusBadge>
      </div>
    );
  }

  return (
    <Link
      to={row.to}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 hover:-translate-y-px hover:shadow-sm",
        row.tone === "danger" && "border-rose-200/80 bg-rose-50/40 hover:bg-rose-50/70",
        row.tone === "warning" && "border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70",
        row.tone === "default" && "border-[rgba(15,76,92,0.1)] bg-white hover:border-primary/20",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          row.tone === "danger" && "bg-rose-100 text-rose-700",
          row.tone === "warning" && "bg-amber-100 text-amber-700",
          row.tone === "default" && "bg-primary/10 text-primary",
        )}
      >
        <row.icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{row.label}</p>
        <p className="text-xs text-slate-600">{row.count} pendência(s)</p>
      </div>
      <StatusBadge variant={row.tone === "danger" ? "danger" : row.tone === "warning" ? "warning" : "neutral"}>
        {row.count}
      </StatusBadge>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </Link>
  );
}

export function TodayAlerts({
  reevaluations,
  patientsWithoutReturn,
  pendingDocuments,
  overdueReceivables,
}: TodayAlertsProps) {
  const rows: AlertRow[] = [
    {
      id: "reeval",
      label: "Reavaliações",
      count: reevaluations,
      to: "/app/reavaliacoes",
      icon: RefreshCw,
      tone: "warning",
      emptyHint: "Nenhuma reavaliação vencida no momento.",
    },
    {
      id: "return",
      label: "Pacientes sem retorno",
      count: patientsWithoutReturn,
      to: "/app/pacientes",
      icon: UserX,
      tone: "warning",
      emptyHint: "Todos os pacientes estão com retorno em dia.",
    },
    {
      id: "docs",
      label: "Documentos pendentes",
      count: pendingDocuments,
      to: "/app/documentos",
      icon: FileText,
      tone: "warning",
      emptyHint: "Nenhum documento aguardando finalização.",
    },
    {
      id: "finance",
      label: "Recebimentos vencidos",
      count: overdueReceivables,
      to: "/app/financeiro/inadimplencia",
      icon: Wallet,
      tone: "danger",
      emptyHint: "Nenhum recebimento em atraso.",
    },
  ];

  const hasAny = rows.some((r) => r.count > 0);

  return (
    <PageSection
      icon={AlertTriangle}
      title="Alertas"
      description={hasAny ? "Revise estes pontos para manter a clínica organizada." : "Sua clínica está em dia — sem alertas urgentes."}
      contentClassName="space-y-2"
      className="fos-animate-in"
    >
      {rows.map((row) => (
        <AlertItem key={row.id} row={row} />
      ))}
    </PageSection>
  );
}
