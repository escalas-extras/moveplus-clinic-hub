/** Tokens visuais unificados — Design System FisioOS. */

export const FOS_RADIUS = "rounded-2xl";
export const FOS_RADIUS_SM = "rounded-xl";

export const FOS_STACK = "fos-module-stack min-w-0 w-full max-w-full space-y-5 sm:space-y-6";

export const FOS_CARD =
  "rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white/80 shadow-[var(--fos-card-shadow)]";

export const FOS_CARD_HOVER =
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,76,92,0.18)] hover:shadow-[0_8px_28px_-12px_rgba(15,76,92,0.18)]";

export const FOS_FILTER_GRID = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

export const FOS_TITLE_PAGE = "text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]";
export const FOS_TITLE_SECTION = "text-sm font-semibold tracking-tight text-slate-900";
export const FOS_EYEBROW = "text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--fos-primary)]";

export const fosAccent = {
  primary: "var(--fos-primary)",
  secondary: "var(--fos-secondary)",
  success: "#059669",
  warning: "var(--fos-warning)",
  danger: "#e11d48",
  neutral: "#64748b",
} as const;

export type FosAccentKey = keyof typeof fosAccent;
