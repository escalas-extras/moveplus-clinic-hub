import type { KeyboardEvent, MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  DollarSign,
  Eye,
  Package,
  Phone,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PatientCrmData = {
  id: string;
  nome_completo: string;
  telefone: string | null;
  whatsapp: string | null;
  convenio_nome: string | null;
  situacao: "ativo" | "inativo";
  data_alta: string | null;
};

export type ApptSummary = {
  last: { data: string; horario: string } | null;
  next: { data: string; horario: string } | null;
};

export function contactOf(p: PatientCrmData) {
  return p.telefone ?? p.whatsapp ?? "—";
}

function planLabel(p: PatientCrmData) {
  return (p.convenio_nome ?? "").trim() || "Particular";
}

export function patientStatusLabel(p: PatientCrmData) {
  if (p.situacao === "inativo" || p.data_alta) return "Alta";
  return "Em tratamento";
}

export function patientStatusVariant(p: PatientCrmData): "success" | "neutral" | "info" {
  if (p.situacao === "inativo" || p.data_alta) return "neutral";
  return "success";
}

export function PatientAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const cls =
    size === "lg" ? "h-12 w-12 text-base" : size === "sm" ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-[rgba(15,76,92,0.08)] font-bold text-[var(--fos-primary)] ring-1 ring-[rgba(15,76,92,0.1)]",
        cls,
      )}
    >
      {initials || "?"}
    </div>
  );
}

function CrmMetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--fos-primary)]/70" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
        <p className="truncate text-xs font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function QuickActions({
  patientId,
  onActionClick,
}: {
  patientId: string;
  onActionClick?: (e: MouseEvent) => void;
}) {
  const actions = [
    { label: "Prontuário", icon: Eye, to: "/app/pacientes/$id", params: { id: patientId } },
    { label: "Agenda", icon: CalendarDays, to: "/app/agenda" },
    { label: "Avaliação", icon: ClipboardList, to: "/app/pacientes/$id", params: { id: patientId } },
    { label: "Financeiro", icon: DollarSign, to: "/app/financeiro" },
  ] as const;

  return (
    <div className="flex flex-wrap gap-1.5" onClick={onActionClick}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            to={action.to as "/app/pacientes/$id" | "/app/agenda" | "/app/financeiro"}
            params={"params" in action ? action.params : undefined}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-lg border border-[rgba(15,76,92,0.1)] bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-600 transition-all hover:border-[var(--fos-primary)]/30 hover:bg-[rgba(15,76,92,0.04)] hover:text-[var(--fos-primary)]"
          >
            <Icon className="h-3 w-3 opacity-70" aria-hidden />
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}

type PatientCrmCardProps = {
  patient: PatientCrmData;
  summary?: ApptSummary;
  selected?: boolean;
  isAdmin?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDelete?: () => void;
  layout?: "card" | "row";
};

/** Card CRM premium — clicável, com metadados clínicos e ações rápidas. */
export function PatientCrmCard({
  patient: p,
  summary,
  selected,
  isAdmin,
  onSelect,
  onOpen,
  onDelete,
  layout = "card",
}: PatientCrmCardProps) {
  const lastLabel = summary?.last
    ? `${fmtDate(summary.last.data)} · ${String(summary.last.horario).slice(0, 5)}`
    : "Sem registro";
  const nextLabel = summary?.next
    ? `${fmtDate(summary.next.data)} · ${String(summary.next.horario).slice(0, 5)}`
    : "Não agendado";

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  const shellClass = cn(
    "patient-crm-card group relative overflow-hidden rounded-2xl border bg-white/90 text-left transition-all duration-200",
    "hover:-translate-y-0.5 hover:border-[rgba(15,76,92,0.18)] hover:shadow-[0_8px_28px_-12px_rgba(15,76,92,0.22)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fos-primary)]/40",
    selected
      ? "border-[var(--fos-primary)]/40 ring-2 ring-[var(--fos-primary)]/15 shadow-[0_4px_20px_-10px_rgba(15,76,92,0.25)]"
      : "border-[rgba(15,76,92,0.1)] shadow-[var(--fos-card-shadow)]",
    layout === "row" ? "flex w-full items-stretch gap-4 p-3.5 sm:p-4" : "p-4 sm:p-5",
  );

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={handleKeyDown}
      className={shellClass}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--fos-primary)] to-[var(--fos-secondary)] opacity-0 transition-opacity group-hover:opacity-80"
      />

      <div className={cn("flex min-w-0 flex-1 gap-3", layout === "row" && "items-center")}>
        <PatientAvatar name={p.nome_completo} size={layout === "row" ? "md" : "lg"} />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold tracking-tight text-slate-950 sm:text-[1.05rem]">
                {p.nome_completo}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--fos-primary)]/70" aria-hidden />
                <span className="truncate">{contactOf(p)}</span>
              </p>
            </div>
            <StatusBadge variant={patientStatusVariant(p)} className="shrink-0">
              {patientStatusLabel(p)}
            </StatusBadge>
          </div>

          <div
            className={cn(
              "grid gap-2.5",
              layout === "card" ? "grid-cols-2 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
            )}
          >
            <CrmMetaRow icon={Clock} label="Última sessão" value={lastLabel} />
            <CrmMetaRow icon={CalendarDays} label="Próxima sessão" value={nextLabel} />
            <CrmMetaRow icon={Package} label="Plano / Pacote" value={planLabel(p)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(15,76,92,0.06)] pt-3">
            <QuickActions patientId={p.id} />
            {isAdmin && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Excluir ${p.nome_completo}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {p.nome_completo}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se o paciente possuir histórico clínico, financeiro ou de agenda, ele será{" "}
                      <strong>inativado</strong> (dados preservados). Caso contrário, será excluído
                      definitivamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
