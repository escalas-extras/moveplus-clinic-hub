import type { LucideIcon } from "lucide-react";

export type AgendaVisualStatus =
  | "confirmado"
  | "aguardando"
  | "em_atendimento"
  | "concluido"
  | "atrasado"
  | "faltou"
  | "cancelado";

export type ApptLike = {
  id: string;
  data: string;
  horario: string;
  duracao_min?: number;
  status: string;
};

export const AGENDA_VISUAL_META: Record<
  AgendaVisualStatus,
  { label: string; dot: string; badge: "success" | "warning" | "danger" | "info" | "neutral"; border: string }
> = {
  confirmado: {
    label: "Confirmado",
    dot: "bg-emerald-500",
    badge: "success",
    border: "border-l-emerald-500",
  },
  aguardando: {
    label: "Aguardando",
    dot: "bg-amber-500",
    badge: "warning",
    border: "border-l-amber-500",
  },
  em_atendimento: {
    label: "Em atendimento",
    dot: "bg-sky-500 animate-pulse",
    badge: "info",
    border: "border-l-sky-500",
  },
  concluido: {
    label: "Concluído",
    dot: "bg-slate-400",
    badge: "neutral",
    border: "border-l-slate-400",
  },
  atrasado: {
    label: "Atrasado",
    dot: "bg-rose-500",
    badge: "danger",
    border: "border-l-rose-500",
  },
  faltou: {
    label: "Faltou",
    dot: "bg-rose-300",
    badge: "danger",
    border: "border-l-rose-300",
  },
  cancelado: {
    label: "Cancelado",
    dot: "bg-slate-300",
    badge: "neutral",
    border: "border-l-slate-300",
  },
};

function minutesFromMidnight(horario: string) {
  const [h, m] = String(horario).slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Status visual derivado — sem alterar regras de negócio no banco. */
export function getAgendaVisualStatus(appt: ApptLike, now = new Date(), dayIso?: string): AgendaVisualStatus {
  const raw = appt.status?.toLowerCase() ?? "agendado";
  if (raw === "cancelado") return "cancelado";
  if (raw === "realizado" || raw === "concluido") return "concluido";
  if (raw === "faltou") return "faltou";

  const todayIso = dayIso ?? now.toISOString().slice(0, 10);
  if (appt.data !== todayIso) {
    return raw === "confirmado" ? "confirmado" : "aguardando";
  }

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = minutesFromMidnight(appt.horario);
  const end = start + (appt.duracao_min ?? 30);

  if (raw === "confirmado" && nowMin >= start && nowMin < end) return "em_atendimento";
  if (raw === "confirmado") return "confirmado";
  if (nowMin > start && raw === "agendado") return "atrasado";
  return "aguardando";
}

export function AgendaStatusLegend({ className }: { className?: string }) {
  const items: AgendaVisualStatus[] = [
    "confirmado",
    "aguardando",
    "em_atendimento",
    "concluido",
    "atrasado",
    "faltou",
    "cancelado",
  ];
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1.5 ${className ?? ""}`}>
      {items.map((key) => {
        const meta = AGENDA_VISUAL_META[key];
        return (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

export type AgendaVisualStatusIcon = LucideIcon;
