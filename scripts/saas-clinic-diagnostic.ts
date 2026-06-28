/**
 * Diagnóstico SaaS — clínicas, volumes e candidatos a teste.
 * Uso: npx tsx scripts/saas-clinic-diagnostic.ts
 * Requer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no .env
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const TEST_NAMES = [
  "FISIOLIANI",
  "ORTHOFISIO",
  "Orthoclean",
  "GRASIELA OLIVEIRA CRUZ DA SILVA",
];

function loadEnv() {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* noop */
  }
}

function isMovePlus(name: string, slug: string | null, fantasia: string | null) {
  const blob = [name, slug, fantasia].filter(Boolean).join(" ").toLowerCase();
  const compact = blob.replace(/[\s+_-]/g, "");
  return (
    compact.includes("move60") ||
    compact.includes("moveplus") ||
    /move\+/.test(blob) ||
    (blob.includes("move") && blob.includes("60"))
  );
}

function matchesTestName(name: string) {
  const n = name.toLowerCase();
  return TEST_NAMES.some((t) => n.includes(t.toLowerCase()) || t.toLowerCase().includes(n));
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sb = createClient(url, key);

  const { data: clinics, error } = await sb
    .from("clinics")
    .select("id, nome, slug, status, plan, active, created_at, updated_at, settings_id")
    .neq("status", "deleted")
    .order("nome");
  if (error) throw error;

  const settingsIds = (clinics ?? []).map((c) => c.settings_id).filter(Boolean) as string[];
  const settingsById: Record<string, { nome_fantasia: string | null }> = {};
  if (settingsIds.length) {
    const { data: settings } = await sb
      .from("clinic_settings")
      .select("id, nome_fantasia")
      .in("id", settingsIds);
    for (const s of settings ?? []) settingsById[s.id] = { nome_fantasia: s.nome_fantasia };
  }

  const ids = (clinics ?? []).map((c) => c.id);

  async function countByClinic(table: string, clinicCol = "clinic_id") {
    const out: Record<string, number> = {};
    for (const id of ids) {
      const { count } = await sb.from(table).select("id", { count: "exact", head: true }).eq(clinicCol, id);
      out[id] = count ?? 0;
    }
    return out;
  }

  const [patients, docs, appts, members, entries, receipts] = await Promise.all([
    countByClinic("patients"),
    countByClinic("clinical_documents"),
    countByClinic("appointments"),
    countByClinic("clinic_members"),
    countByClinic("financial_entries"),
    countByClinic("receipts"),
  ]);

  const { data: plans } = await sb
    .from("clinic_plans")
    .select("clinic_id, status, trial_ends_at, plans(code,name)")
    .in("clinic_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const planByClinic: Record<string, any> = {};
  for (const p of plans ?? []) {
    if (!planByClinic[p.clinic_id]) planByClinic[p.clinic_id] = p;
  }

  const rows = (clinics ?? []).map((c) => {
    const fantasia = c.settings_id ? settingsById[c.settings_id]?.nome_fantasia : null;
    const protectedMove = isMovePlus(c.nome, c.slug, fantasia);
    const testCandidate = matchesTestName(c.nome) || (fantasia ? matchesTestName(fantasia) : false);
    return {
      id: c.id,
      nome: c.nome,
      nome_fantasia: fantasia,
      slug: c.slug,
      status: c.status,
      plan: c.plan,
      plan_contract: planByClinic[c.id]?.status ?? null,
      plan_code: (planByClinic[c.id] as any)?.plans?.code ?? null,
      created_at: c.created_at,
      updated_at: c.updated_at,
      counts: {
        patients: patients[c.id] ?? 0,
        documents: docs[c.id] ?? 0,
        appointments: appts[c.id] ?? 0,
        members: members[c.id] ?? 0,
        financial_entries: entries[c.id] ?? 0,
        receipts: receipts[c.id] ?? 0,
      },
      flags: {
        protected_move_plus: protectedMove,
        test_name_match: testCandidate,
      },
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    total_clinics: rows.length,
    protected: rows.filter((r) => r.flags.protected_move_plus),
    test_candidates: rows.filter((r) => r.flags.test_name_match && !r.flags.protected_move_plus),
    active_production: rows.filter(
      (r) => r.status === "active" && !r.flags.test_name_match && !r.flags.protected_move_plus,
    ),
    all: rows,
    recommended_actions: rows
      .filter((r) => r.flags.test_name_match && !r.flags.protected_move_plus && r.status === "active")
      .map((r) => ({
        id: r.id,
        nome: r.nome,
        action: "mark_test_and_inactivate",
        note: "Requer confirmação explícita — não executado automaticamente",
      })),
  };

  const outDir = join("docs", "auditorias");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "saas-clinic-diagnostic.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWritten: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
