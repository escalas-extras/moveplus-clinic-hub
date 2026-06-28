/** Layout tokens for Finance module — keeps panels within AppShell width. */

export const FINANCE_PANEL_ROOT = "min-w-0 w-full max-w-full space-y-7";

export const FINANCE_PANEL_ROOT_LOOSE = "min-w-0 w-full max-w-full space-y-9";

/** Filter grids wrap instead of forcing horizontal page scroll. */
export const FINANCE_FILTER_GRID =
  "grid min-w-0 w-full max-w-full gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6";

export const FINANCE_TABLE_CARD = "min-w-0 max-w-full overflow-hidden";

export const FINANCE_TABLE_SCROLL = "max-w-full overflow-x-auto";

export const FINANCE_TABLE = "w-full min-w-[720px] text-sm";

export const FINANCE_TAB_CONTENT = "mt-0 min-w-0 w-full max-w-full focus-visible:outline-none";

/** Cards operacionais — centro de operações. */
export const FINANCE_OPS_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** Atalhos operacionais — chips compactos. */
export const FINANCE_SHORTCUT_OPERATION_GRID =
  "flex min-w-0 w-full max-w-full flex-wrap gap-2 overflow-hidden";

/** Atalhos de análise — discretos. */
export const FINANCE_SHORTCUT_ANALYSIS_GRID =
  "flex min-w-0 w-full max-w-full flex-wrap gap-2 overflow-hidden";

/** Operação — legacy nav cards (não usado em UX-02). */
export const FINANCE_NAV_OPERATION_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-3";

/** Análises — cards secundários. */
export const FINANCE_NAV_ANALYSIS_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-1 gap-2.5 overflow-hidden sm:grid-cols-2";

/** Administração — sub-itens expandidos. */
export const FINANCE_NAV_ADMIN_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-1 gap-2.5 overflow-hidden sm:grid-cols-2 lg:grid-cols-4";
