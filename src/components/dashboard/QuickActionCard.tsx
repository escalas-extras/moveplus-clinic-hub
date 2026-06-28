import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type QuickActionItem = {
  label: string;
  icon: LucideIcon;
  to: string;
};

type QuickActionCardProps = {
  items: QuickActionItem[];
  className?: string;
};

/** Acesso rápido discreto — chips compactos, não menu grande. */
export function QuickActionCard({ items, className }: QuickActionCardProps) {
  return (
    <section
      aria-label="Acesso rápido"
      className={cn(
        "rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white/75 px-4 py-3.5 shadow-[var(--fos-card-shadow)]",
        className,
      )}
    >
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        Acesso rápido
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="quick-action-chip inline-flex items-center gap-1.5 rounded-full border border-[rgba(15,76,92,0.12)] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:border-[rgba(15,76,92,0.22)] hover:bg-[rgba(15,76,92,0.04)] hover:text-[var(--fos-primary)]"
            >
              <Icon className="h-3.5 w-3.5 opacity-70" strokeWidth={2} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
