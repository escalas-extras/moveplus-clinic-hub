import {
  CalendarPlus,
  ClipboardList,
  FileText,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { QuickActionItem } from "@/components/dashboard/QuickActionCard";

const TODAY_QUICK_ACTIONS: QuickActionItem[] = [
  { label: "Novo paciente", icon: UserPlus, to: "/app/pacientes" },
  { label: "Agendar", icon: CalendarPlus, to: "/app/agenda" },
  { label: "Nova evolução", icon: ClipboardList, to: "/app/evolucoes" },
  { label: "Emitir documento", icon: FileText, to: "/app/documentos" },
  { label: "Receber pagamento", icon: Wallet, to: "/app/financeiro/receber" },
];

type TodayQuickActionsProps = {
  className?: string;
};

export function TodayQuickActions({ className }: TodayQuickActionsProps) {
  return (
    <section
      aria-label="Ações rápidas"
      className={cn(
        "today-quick-actions fos-animate-in rounded-3xl border border-[rgba(15,76,92,0.1)] bg-white/90 p-4 shadow-[var(--fos-card-shadow)] sm:p-5",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">Ações rápidas</h2>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Atalhos para o que você faz todos os dias</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TODAY_QUICK_ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-[rgba(15,76,92,0.08)] bg-slate-50/50 px-3 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <span className="text-xs font-semibold leading-tight text-slate-800 sm:text-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
