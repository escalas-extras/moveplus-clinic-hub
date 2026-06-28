import { fmtDate } from "@/lib/format";

export type ClinicalTrend = "melhorou" | "estavel" | "piorou" | "indeterminado";

export type AssessmentRow = {
  id: string;
  data: string;
  tipo: string;
  eva: number | null;
  rom_goniometry: unknown;
  strength_mrc: unknown;
  scales_results: unknown;
  testes_especificos: string | null;
  objetivos: string | null;
  therapeutic_goals: unknown;
  queixa_principal: string | null;
  orto_limitacoes?: string | null;
  locked_at: string | null;
  status?: string;
  professional_id?: string;
  professionals?: { nome: string } | null;
  diagnostico_clinico?: string | null;
  diagnostico_fisio?: string | null;
  wizard_step?: number;
};

export type MetricCompare = {
  key: string;
  label: string;
  inicial: string;
  ultima: string;
  atual: string;
  trend: ClinicalTrend;
  lowerIsBetter?: boolean;
};

export type EvolutionSummary = {
  melhoras: string[];
  semEvolucao: string[];
  novasLimitacoes: string[];
  objetivosAlcancados: string[];
  objetivosPendentes: string[];
};

function parseRomScore(rom: unknown): { summary: string; score: number | null } {
  if (!rom) return { summary: "—", score: null };
  if (typeof rom === "string") return { summary: rom || "—", score: null };
  const values: number[] = [];
  if (Array.isArray(rom)) {
    const parts = rom
      .filter((r) => r && (r.articulacao || r.movimento))
      .map((r) => {
        const v = Number(r.valor);
        if (!Number.isNaN(v)) values.push(v);
        return `${r.articulacao || ""} ${r.movimento || ""}: ${r.valor ?? "—"}°`.trim();
      });
    return {
      summary: parts.join("; ") || "—",
      score: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  }
  if (typeof rom === "object") {
    const parts = Object.entries(rom as Record<string, unknown>)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => {
        const n = Number(v);
        if (!Number.isNaN(n)) values.push(n);
        return `${k}: ${v}°`;
      });
    return {
      summary: parts.join("; ") || "—",
      score: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  }
  return { summary: "—", score: null };
}

function parseStrengthScore(mrc: unknown): { summary: string; score: number | null } {
  if (!mrc) return { summary: "—", score: null };
  if (typeof mrc === "string") return { summary: mrc || "—", score: null };
  const values: number[] = [];
  if (Array.isArray(mrc)) {
    const parts = mrc.map((r) => {
      const v = Number(r?.grade ?? r?.valor ?? r?.mrc);
      if (!Number.isNaN(v)) values.push(v);
      const label = r?.musculo ?? r?.grupo ?? r?.label ?? "Grupo";
      return `${label}: MRC ${r?.grade ?? r?.valor ?? r?.mrc ?? "—"}`;
    });
    return {
      summary: parts.join("; ") || "—",
      score: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  }
  if (typeof mrc === "object") {
    const parts = Object.entries(mrc as Record<string, unknown>).map(([k, v]) => {
      const n = Number(v);
      if (!Number.isNaN(n)) values.push(n);
      return `${k}: MRC ${v}`;
    });
    return {
      summary: parts.join("; ") || "—",
      score: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  }
  return { summary: "—", score: null };
}

function parseScales(scales: unknown): { summary: string; score: number | null } {
  if (!scales) return { summary: "—", score: null };
  if (typeof scales === "string") return { summary: scales || "—", score: null };
  const values: number[] = [];
  if (Array.isArray(scales)) {
    const parts = scales.map((s) => {
      const score = Number(s?.total_score ?? s?.score ?? s?.valor);
      if (!Number.isNaN(score)) values.push(score);
      const name = s?.scale_code ?? s?.nome ?? s?.name ?? "Escala";
      const cls = s?.classification ? ` (${s.classification})` : "";
      return `${name}: ${s?.total_score ?? s?.score ?? "—"}${cls}`;
    });
    return {
      summary: parts.join("; ") || "—",
      score: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  }
  if (typeof scales === "object") {
    const parts = Object.entries(scales as Record<string, unknown>).map(([k, v]) => {
      if (typeof v === "object" && v && "total_score" in (v as object)) {
        const score = Number((v as { total_score?: number }).total_score);
        if (!Number.isNaN(score)) values.push(score);
        return `${k}: ${(v as { total_score?: number }).total_score ?? "—"}`;
      }
      const n = Number(v);
      if (!Number.isNaN(n)) values.push(n);
      return `${k}: ${String(v)}`;
    });
    return {
      summary: parts.join("; ") || "—",
      score: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  }
  return { summary: "—", score: null };
}

function parseGoals(goals: unknown, objetivosText: string | null): string[] {
  const items: string[] = [];
  if (Array.isArray(goals)) {
    goals.forEach((g) => {
      const t = g?.text ?? g?.descricao ?? g?.objetivo ?? g?.title;
      if (t) items.push(String(t));
    });
  } else if (goals && typeof goals === "object") {
    Object.values(goals as Record<string, unknown>).forEach((v) => {
      if (typeof v === "string" && v.trim()) items.push(v.trim());
    });
  }
  if (!items.length && objetivosText?.trim()) {
    objetivosText
      .split(/\n|;|•/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => items.push(s));
  }
  return items;
}

export function pickComparisonTriplet(all: AssessmentRow[]) {
  const sorted = [...all].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
  const inicial = sorted.find((a) => a.tipo === "avaliacao") ?? sorted[0] ?? null;
  const reavs = sorted.filter((a) => a.tipo === "reavaliacao");
  const draft = reavs.find((r) => !r.locked_at) ?? null;
  const completedReavs = reavs.filter((r) => r.locked_at);

  let atual: AssessmentRow | null = draft;
  let ultima: AssessmentRow | null = null;

  if (draft) {
    ultima = completedReavs[completedReavs.length - 1] ?? null;
  } else if (completedReavs.length > 0) {
    atual = completedReavs[completedReavs.length - 1];
    ultima = completedReavs.length > 1 ? completedReavs[completedReavs.length - 2] : null;
  }

  const reavNumber = draft
    ? completedReavs.length + 1
    : atual && atual.tipo === "reavaliacao"
      ? completedReavs.findIndex((r) => r.id === atual!.id) + 1 || completedReavs.length
      : completedReavs.length;

  return { inicial, ultima, atual, draft, reavNumber, allSorted: sorted };
}

export function compareTrend(
  before: number | null,
  after: number | null,
  lowerIsBetter = false,
): ClinicalTrend {
  if (before == null || after == null || Number.isNaN(before) || Number.isNaN(after)) {
    return "indeterminado";
  }
  if (before === after) return "estavel";
  const improved = lowerIsBetter ? after < before : after > before;
  return improved ? "melhorou" : "piorou";
}

function displayVal(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  return String(v);
}

export function buildMetricCompares(
  inicial: AssessmentRow | null,
  ultima: AssessmentRow | null,
  atual: AssessmentRow | null,
): MetricCompare[] {
  const romI = parseRomScore(inicial?.rom_goniometry);
  const romU = parseRomScore(ultima?.rom_goniometry);
  const romA = parseRomScore(atual?.rom_goniometry);

  const strI = parseStrengthScore(inicial?.strength_mrc);
  const strU = parseStrengthScore(ultima?.strength_mrc);
  const strA = parseStrengthScore(atual?.strength_mrc);

  const scI = parseScales(inicial?.scales_results);
  const scU = parseScales(ultima?.scales_results);
  const scA = parseScales(atual?.scales_results);

  const metrics: MetricCompare[] = [
    {
      key: "eva",
      label: "EVA (dor)",
      inicial: displayVal(inicial?.eva),
      ultima: displayVal(ultima?.eva),
      atual: displayVal(atual?.eva),
      trend: compareTrend(inicial?.eva ?? null, atual?.eva ?? null, true),
      lowerIsBetter: true,
    },
    {
      key: "adm",
      label: "ADM (goniometria)",
      inicial: romI.summary,
      ultima: romU.summary,
      atual: romA.summary,
      trend: compareTrend(romI.score, romA.score, false),
    },
    {
      key: "forca",
      label: "Força muscular (MRC)",
      inicial: strI.summary,
      ultima: strU.summary,
      atual: strA.summary,
      trend: compareTrend(strI.score, strA.score, false),
    },
    {
      key: "escalas",
      label: "Escalas clínicas",
      inicial: scI.summary,
      ultima: scU.summary,
      atual: scA.summary,
      trend: compareTrend(scI.score, scA.score, false),
    },
    {
      key: "testes",
      label: "Testes funcionais",
      inicial: displayVal(inicial?.testes_especificos),
      ultima: displayVal(ultima?.testes_especificos),
      atual: displayVal(atual?.testes_especificos),
      trend:
        inicial?.testes_especificos && atual?.testes_especificos
          ? inicial.testes_especificos === atual.testes_especificos
            ? "estavel"
            : "indeterminado"
          : "indeterminado",
    },
    {
      key: "objetivos",
      label: "Objetivos terapêuticos",
      inicial: parseGoals(inicial?.therapeutic_goals, inicial?.objetivos ?? null).join("; ") || "—",
      ultima: parseGoals(ultima?.therapeutic_goals, ultima?.objetivos ?? null).join("; ") || "—",
      atual: parseGoals(atual?.therapeutic_goals, atual?.objetivos ?? null).join("; ") || "—",
      trend: "indeterminado",
    },
  ];

  return metrics;
}

export function buildEvolutionSummary(
  inicial: AssessmentRow | null,
  ultima: AssessmentRow | null,
  atual: AssessmentRow | null,
  metrics: MetricCompare[],
): EvolutionSummary {
  const melhoras: string[] = [];
  const semEvolucao: string[] = [];
  const novasLimitacoes: string[] = [];

  metrics.forEach((m) => {
    if (m.trend === "melhorou") melhoras.push(`${m.label}: evolução favorável (${m.inicial} → ${m.atual})`);
    else if (m.trend === "estavel") semEvolucao.push(`${m.label}: sem variação significativa`);
    else if (m.trend === "piorou") novasLimitacoes.push(`${m.label}: atenção — possível piora (${m.inicial} → ${m.atual})`);
  });

  if (atual?.queixa_principal && inicial?.queixa_principal && atual.queixa_principal !== inicial.queixa_principal) {
    melhoras.push(`Queixa atualizada: "${atual.queixa_principal.slice(0, 80)}…"`);
  }

  const goalsInicial = parseGoals(inicial?.therapeutic_goals, inicial?.objetivos ?? null);
  const goalsAtual = parseGoals(atual?.therapeutic_goals, atual?.objetivos ?? null);
  const goalsUltima = parseGoals(ultima?.therapeutic_goals, ultima?.objetivos ?? null);

  const objetivosAlcancados: string[] = [];
  const objetivosPendentes: string[] = goalsAtual.length ? [...goalsAtual] : goalsUltima.length ? [...goalsUltima] : [...goalsInicial];

  goalsInicial.forEach((g) => {
    if (!goalsAtual.some((a) => a.toLowerCase().includes(g.toLowerCase().slice(0, 20)))) {
      objetivosAlcancados.push(g);
    }
  });

  if (!melhoras.length && metrics.some((m) => m.atual !== "—" && m.inicial !== m.atual)) {
    melhoras.push("Dados clínicos atualizados na reavaliação em curso.");
  }
  if (!semEvolucao.length && !melhoras.length && !novasLimitacoes.length) {
    semEvolucao.push("Aguardando preenchimento da reavaliação para análise comparativa.");
  }

  return {
    melhoras,
    semEvolucao,
    novasLimitacoes,
    objetivosAlcancados: objetivosAlcancados.slice(0, 6),
    objetivosPendentes: objetivosPendentes.slice(0, 8),
  };
}

export function assessmentLabel(a: AssessmentRow | null, fallback: string) {
  if (!a) return fallback;
  return a.tipo === "avaliacao" ? `Avaliação inicial · ${fmtDate(a.data)}` : `Reavaliação · ${fmtDate(a.data)}`;
}
