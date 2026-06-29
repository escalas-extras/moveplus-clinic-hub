import type { LucideIcon } from "lucide-react";
import { Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, StatusBadge } from "@/components/layout";
import type { ExecutiveAttentionItem, ExecutiveAuditGroup, ExecutiveSoonMonitor } from "@/lib/saas/executive-dashboard";

type AttentionCardProps = ExecutiveAttentionItem & {
  icon?: LucideIcon;
};

function AttentionCard({ title, description, tone, meta, icon: Icon = ShieldAlert }: AttentionCardProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-3.5 shadow-sm",
        tone === "warning" && "border-amber-200/80 bg-amber-50/40",
        tone === "danger" && "border-rose-200/80 bg-rose-50/40",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          tone === "warning" && "bg-amber-100 text-amber-800",
          tone === "danger" && "bg-rose-100 text-rose-800",
          tone === "default" && "bg-slate-100 text-slate-700",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {meta && (
            <StatusBadge variant={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "neutral"}>
              {meta}
            </StatusBadge>
          )}
        </div>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>}
      </div>
    </div>
  );
}

type SaasAttentionPanelProps = {
  items: ExecutiveAttentionItem[];
  soonMonitors: ExecutiveSoonMonitor[];
};

export function SaasAttentionPanel({ items, soonMonitors }: SaasAttentionPanelProps) {
  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {items.map((item) => (
            <AttentionCard key={item.id} {...item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="Operação estável"
          description="Nenhum alerta crítico com os dados atuais do painel."
          className="py-8"
        />
      )}
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Monitores avançados
        </p>
        <div className="flex flex-wrap gap-2">
          {soonMonitors.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600"
            >
              {m.label}
              <StatusBadge variant="neutral" className="text-[10px]">
                Em breve
              </StatusBadge>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type MetricRowProps = {
  label: string;
  value: string;
  hint?: string;
  soon?: boolean;
};

export function SaasMetricRow({ label, value, hint, soon }: MetricRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {soon ? (
        <StatusBadge variant="neutral">Em breve</StatusBadge>
      ) : (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{value}</span>
      )}
    </div>
  );
}

type SaasAuditPanelProps = {
  groups: ExecutiveAuditGroup[];
};

export function SaasAuditPanel({ groups }: SaasAuditPanelProps) {
  const hasAny = groups.some((g) => g.items.length > 0);

  if (!hasAny) {
    return (
      <EmptyState
        icon={Clock}
        title="Sem eventos recentes"
        description="O audit log ainda não registrou ações na janela atual."
        className="py-8"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((group) => (
        <div key={group.id} className="min-w-0 rounded-xl border bg-card/80 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</p>
          {group.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum evento recente.</p>
          ) : (
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.id} className="rounded-lg bg-muted/30 px-2.5 py-2">
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-slate-400">{item.meta}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
