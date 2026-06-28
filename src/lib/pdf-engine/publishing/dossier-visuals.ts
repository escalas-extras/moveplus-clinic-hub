import type { IconKind } from "../icons";

/** Ícones discretos para cards do panorama (D4). */
export function dashboardIconFor(label: string): IconKind {
  const l = label.toLowerCase();
  if (l.includes("sess")) return "calendar";
  if (l.includes("avalia")) return "stethoscope";
  if (l.includes("reavalia")) return "target";
  if (l.includes("evolu")) return "heart";
  if (l.includes("document")) return "file";
  if (l.includes("objet")) return "target";
  if (l.includes("alta")) return "shield";
  if (l.includes("paciente")) return "user";
  if (l.includes("tempo") || l.includes("período") || l.includes("periodo")) return "calendar";
  if (l.includes("escala")) return "heart";
  return "file";
}

export function documentCardColumns(count: number): 2 | 3 {
  return count >= 5 ? 3 : 2;
}

export function parsePeriodDates(periodLabel: string): { start: string; end: string } | null {
  const m = periodLabel.match(/^(.+?)\s+a\s+(.+?)(?:\s*\(|$)/i);
  if (!m) return null;
  return { start: m[1].trim(), end: m[2].trim() };
}

export type EvaPainZone = {
  label: string;
  short: string;
  color: [number, number, number];
};

export function evaPainZone(value: number | null): EvaPainZone {
  if (value == null) return { label: "Não informado", short: "—", color: [107, 114, 128] };
  const v = Math.max(0, Math.min(10, Math.round(value)));
  if (v === 0) return { label: "Sem dor", short: "Sem dor", color: [29, 93, 169] };
  if (v <= 3) return { label: "Dor leve", short: "Leve", color: [12, 166, 107] };
  if (v <= 6) return { label: "Dor moderada", short: "Moderada", color: [104, 173, 71] };
  if (v <= 8) return { label: "Dor intensa", short: "Intensa", color: [249, 115, 22] };
  return { label: "Dor extrema", short: "Extrema", color: [220, 38, 38] };
}
