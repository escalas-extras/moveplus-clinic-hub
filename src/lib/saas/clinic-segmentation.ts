/** Utilitários Admin SaaS — proteção Move+ e nomes de teste conhecidos. */

export const KNOWN_TEST_CLINIC_NAMES = [
  "FISIOLIANI",
  "ORTHOFISIO",
  "Orthoclean",
  "GRASIELA OLIVEIRA CRUZ DA SILVA",
] as const;

export type ClinicNameFields = {
  nome?: string | null;
  slug?: string | null;
  nome_fantasia?: string | null;
};

export function isProtectedMovePlusClinic(c: ClinicNameFields): boolean {
  const blob = [c.nome, c.slug, c.nome_fantasia].filter(Boolean).join(" ").toLowerCase();
  const compact = blob.replace(/[\s+_\-]/g, "");
  return (
    compact.includes("move60") ||
    compact.includes("moveplus") ||
    blob.includes("move+") ||
    blob.includes("move +") ||
    (blob.includes("move") && blob.includes("60"))
  );
}

export function matchesKnownTestClinicName(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  const n = name.trim().toLowerCase();
  return KNOWN_TEST_CLINIC_NAMES.some(
    (t) => n.includes(t.toLowerCase()) || t.toLowerCase().includes(n),
  );
}

export function isKnownTestClinicCandidate(c: ClinicNameFields): boolean {
  if (isProtectedMovePlusClinic(c)) return false;
  return matchesKnownTestClinicName(c.nome) || matchesKnownTestClinicName(c.nome_fantasia);
}

export type ClinicListSegment = "production" | "test" | "inactive" | "all";

export function segmentClinic(row: {
  status: string;
  is_test?: boolean | null;
  nome?: string | null;
  slug?: string | null;
  nome_fantasia?: string | null;
}): ClinicListSegment {
  if (row.is_test || isKnownTestClinicCandidate(row)) return "test";
  if (["inactive", "suspended", "canceled"].includes(row.status)) return "inactive";
  return "production";
}

export function isProductionActiveClinic(row: {
  status: string;
  is_test?: boolean | null;
  plan_status?: string | null;
}): boolean {
  if (row.is_test) return false;
  if (!["active"].includes(row.status)) return false;
  return row.plan_status === "active" || row.plan_status === "trial" || !row.plan_status;
}
