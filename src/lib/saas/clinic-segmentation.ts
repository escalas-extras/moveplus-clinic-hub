/** Utilitários Admin SaaS — proteção Move+ e nomes de teste conhecidos. */

export const KNOWN_TEST_CLINIC_NAMES = [
  "FISIOLIANI",
  "ORTHOFISIO",
  "Orthoclean",
  "GRASIELA OLIVEIRA CRUZ DA SILVA",
] as const;

/** Slugs históricos da clínica piloto Move 60+ (single-tenant original). */
const MOVE_PLUS_SLUG_HINTS = ["move-60-", "move-60", "move60", "move60plus", "move-plus", "moveplus"] as const;

export type ClinicNameFields = {
  nome?: string | null;
  slug?: string | null;
  nome_fantasia?: string | null;
  razao_social?: string | null;
};

export type ClinicSettingsNameLookup = {
  fantasiaBySettingsId: Record<string, string | null>;
  byClinicId: Record<string, { nome_fantasia: string | null; razao_social: string | null }>;
};

export function resolveClinicNameFields(
  clinic: { id: string; nome?: string | null; slug?: string | null; settings_id?: string | null },
  lookup?: ClinicSettingsNameLookup,
): ClinicNameFields {
  const bySettings =
    clinic.settings_id && lookup?.fantasiaBySettingsId
      ? lookup.fantasiaBySettingsId[clinic.settings_id] ?? null
      : null;
  const byClinic = lookup?.byClinicId?.[clinic.id];
  return {
    nome: clinic.nome,
    slug: clinic.slug,
    nome_fantasia: bySettings ?? byClinic?.nome_fantasia ?? null,
    razao_social: byClinic?.razao_social ?? null,
  };
}

function normalizeClinicNameBlob(c: ClinicNameFields): { blob: string; compact: string } {
  const raw = [c.nome, c.slug, c.nome_fantasia, c.razao_social].filter(Boolean).join(" ");
  const blob = raw.normalize("NFKC").toLowerCase();
  const compact = blob.replace(/[\s+_\-./·]/g, "").replace(/＋/g, "");
  return { blob, compact };
}

export function isProtectedMovePlusClinic(c: ClinicNameFields): boolean {
  const { blob, compact } = normalizeClinicNameBlob(c);

  const slug = c.slug?.normalize("NFKC").toLowerCase() ?? "";
  if (MOVE_PLUS_SLUG_HINTS.some((hint) => slug.includes(hint))) return true;

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
  return (
    matchesKnownTestClinicName(c.nome) ||
    matchesKnownTestClinicName(c.nome_fantasia) ||
    matchesKnownTestClinicName(c.razao_social)
  );
}

export type ClinicListSegment = "production" | "test" | "inactive" | "all";

export function segmentClinic(row: {
  status: string;
  is_test?: boolean | null;
  nome?: string | null;
  slug?: string | null;
  nome_fantasia?: string | null;
  razao_social?: string | null;
}): ClinicListSegment {
  if (isProtectedMovePlusClinic(row)) return "production";
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
