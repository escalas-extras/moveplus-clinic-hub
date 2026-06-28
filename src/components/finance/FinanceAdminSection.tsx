import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  FolderTree,
  Landmark,
  Receipt,
  ScrollText,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FinanceModuleTabId =
  | "categorias"
  | "centros-custo"
  | "receber"
  | "pagar"
  | "fluxo"
  | "pacotes"
  | "convenios"
  | "inadimplencia"
  | "receita-profissional"
  | "lancamentos"
  | "recibos";

/** Visão analítica (hub) — não é módulo de menu. */
export type FinanceViewId = FinanceModuleTabId | "hub";

export const FINANCE_ADMIN_TAB_IDS: FinanceModuleTabId[] = [
  "categorias",
  "centros-custo",
  "lancamentos",
  "recibos",
];

type AdminItem = {
  id: FinanceModuleTabId;
  label: string;
  icon: LucideIcon;
};

const ADMIN_ITEMS: AdminItem[] = [
  { id: "categorias", label: "Categorias", icon: FolderTree },
  { id: "centros-custo", label: "Centros de Custo", icon: Landmark },
  { id: "lancamentos", label: "Lançamentos v1", icon: ScrollText },
  { id: "recibos", label: "Recibos", icon: Receipt },
];

type FinanceAdminSectionProps = {
  activeView: FinanceViewId;
  onNavigate: (view: FinanceModuleTabId) => void;
};

export function FinanceAdminSection({ activeView, onNavigate }: FinanceAdminSectionProps) {
  const isAdminView = FINANCE_ADMIN_TAB_IDS.includes(activeView as FinanceModuleTabId);
  const [open, setOpen] = useState(isAdminView);

  useEffect(() => {
    if (isAdminView) setOpen(true);
  }, [isAdminView]);

  return (
    <section
      aria-label="Administração financeira"
      className="min-w-0 w-full max-w-full border-t border-border/40 pt-6"
    >
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "flex min-w-0 w-full items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-2.5 text-left transition-colors",
            "hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            (open || isAdminView) && "border-primary/20 bg-muted/15",
          )}
        >
          <Settings2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
            Administração Financeira
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>

        {open && (
          <div className="flex min-w-0 flex-wrap gap-2 pt-1">
            {ADMIN_ITEMS.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                    active && "border-primary/30 bg-primary/[0.05] text-foreground",
                  )}
                >
                  <item.icon className="h-3 w-3 opacity-60" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
