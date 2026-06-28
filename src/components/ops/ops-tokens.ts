/** Tokens visuais — Design System Operacional FisioOS (PREMIUM-01). */

export const OPS_STACK = "ops-module-stack min-w-0 w-full max-w-full space-y-5 sm:space-y-6";

export const OPS_FILTER_GRID = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

export const OPS_OPS_GRID =
  "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-[repeat(7,minmax(0,1fr))]";

export const opsAccent = {
  primary: "var(--fos-primary)",
  secondary: "var(--fos-secondary)",
  info: "var(--fos-accent)",
  success: "#059669",
  warning: "var(--fos-warning)",
  danger: "#e11d48",
  neutral: "#64748b",
} as const;

export type OpsAccentKey = keyof typeof opsAccent;

export function opsAccentOf(key: OpsAccentKey): string {
  return opsAccent[key];
}

/** Presets de colunas KPI por módulo. */
export const opsKpiColumns = {
  dashboard: 6 as const,
  module: 4 as const,
};
