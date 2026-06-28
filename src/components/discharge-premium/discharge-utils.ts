import type { AssessmentRow } from "@/components/reassessment-premium";

export const DISCHARGE_MOTIVOS = [
  "Objetivos terapêuticos alcançados",
  "Alta por melhora clínica",
  "Encaminhamento para outro profissional",
  "Pedido do paciente",
  "Abandono / faltas reiteradas",
  "Óbito",
  "Outros",
] as const;

export type DischargeChecklist = {
  objetivosConcluidos: boolean;
  orientacoesEntregues: boolean;
  exerciciosDomiciliares: boolean;
  encaminhamento: boolean;
  documentacaoCompleta: boolean;
};

export type DischargeWizardForm = {
  data_alta: string;
  motivo: string;
  resumo_clinico: string;
  objetivos_alcancados: string;
  objetivos_pendentes: string;
  ganhos_funcionais: string;
  limitacoes_remanescentes: string;
  orientacoes_finais: string;
  plano_domiciliar: string;
  encaminhamentos: string;
  conclusao: string;
  checklist: DischargeChecklist;
  wizardStep: number;
};

export type TreatmentStats = {
  sessoes: number;
  diasTratamento: number;
  evaInicial: number | null;
  evaAtual: number | null;
  reavaliacoes: number;
  evolucoes: number;
  evolucaoFuncional: string;
};

const ASSESSMENT_FIELDS = `
  id, data, tipo, eva, rom_goniometry, strength_mrc, scales_results,
  testes_especificos, objetivos, therapeutic_goals, queixa_principal,
  orto_limitacoes, locked_at, status, professional_id,
  diagnostico_clinico, diagnostico_fisio,
  professionals(nome)
`;

export { ASSESSMENT_FIELDS };

export function defaultDischargeForm(): DischargeWizardForm {
  return {
    data_alta: new Date().toISOString().slice(0, 10),
    motivo: DISCHARGE_MOTIVOS[0],
    resumo_clinico: "",
    objetivos_alcancados: "",
    objetivos_pendentes: "",
    ganhos_funcionais: "",
    limitacoes_remanescentes: "",
    orientacoes_finais: "",
    plano_domiciliar: "",
    encaminhamentos: "",
    conclusao: "",
    checklist: {
      objetivosConcluidos: false,
      orientacoesEntregues: false,
      exerciciosDomiciliares: false,
      encaminhamento: false,
      documentacaoCompleta: false,
    },
    wizardStep: 0,
  };
}

export function draftStorageKey(clinicId: string, patientId: string) {
  return `moveplus-discharge-draft-${clinicId}-${patientId}`;
}

export function mergeFormForDb(form: DischargeWizardForm) {
  const objetivosAlcancados = [form.ganhos_funcionais, form.objetivos_alcancados]
    .filter((s) => s.trim())
    .join("\n\n");
  const recomendacoes = [form.orientacoes_finais, form.encaminhamentos].filter((s) => s.trim()).join("\n\n");
  const observacoes = [form.resumo_clinico, form.limitacoes_remanescentes, form.conclusao]
    .filter((s) => s.trim())
    .join("\n\n");

  return {
    data_alta: form.data_alta,
    motivo: form.motivo,
    objetivos_alcancados: objetivosAlcancados || null,
    objetivos_pendentes: form.objetivos_pendentes || null,
    recomendacoes: recomendacoes || null,
    plano_domiciliar: form.plano_domiciliar || null,
    observacoes: observacoes || null,
  };
}

export function pickDischargeComparison(assessments: AssessmentRow[]) {
  const sorted = [...assessments].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
  const inicial = sorted.find((a) => a.tipo === "avaliacao") ?? sorted[0] ?? null;
  const reavs = sorted.filter((a) => a.tipo === "reavaliacao" && a.locked_at);
  const ultimaReav = reavs.length ? reavs[reavs.length - 1] : null;
  const latest = sorted.filter((a) => a.locked_at).pop() ?? sorted[sorted.length - 1] ?? null;
  const altaClinical = latest;
  return { inicial, ultimaReav, altaClinical };
}

export function computeTreatmentStats(
  assessments: AssessmentRow[],
  evolutionCount: number,
  altaDate: string,
): TreatmentStats {
  const sorted = [...assessments].sort((a, b) => a.data.localeCompare(b.data));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const start = first?.data ? new Date(first.data) : new Date();
  const end = new Date(altaDate);
  const diasTratamento = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const evaInicial = first?.eva ?? null;
  const evaAtual = latest?.eva ?? null;
  let evolucaoFuncional = "Sem dados funcionais registrados";
  if (evaInicial != null && evaAtual != null) {
    const delta = evaAtual - evaInicial;
    if (delta < 0) evolucaoFuncional = `Redução de ${Math.abs(delta).toFixed(0)} ponto(s) na EVA`;
    else if (delta > 0) evolucaoFuncional = `Aumento de ${delta.toFixed(0)} ponto(s) na EVA — revisar`;
    else evolucaoFuncional = "EVA estável ao longo do tratamento";
  } else if (latest?.testes_especificos) {
    evolucaoFuncional = "Testes funcionais registrados na última avaliação";
  }

  return {
    sessoes: evolutionCount,
    diasTratamento,
    evaInicial,
    evaAtual,
    reavaliacoes: sorted.filter((a) => a.tipo === "reavaliacao").length,
    evolucoes: evolutionCount,
    evolucaoFuncional,
  };
}

export function computeClinicKpis(
  discharges: { data_alta: string; motivo: string; patient_id: string }[],
  statsByPatient: Map<string, { dias: number; sessoes: number }>,
) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const altasMes = discharges.filter((d) => d.data_alta >= monthStart).length;
  const recuperados = discharges.filter(
    (d) =>
      d.motivo.includes("Objetivos") ||
      d.motivo.includes("melhora") ||
      d.motivo.includes("Melhora"),
  ).length;

  const stats = [...statsByPatient.values()];
  const tempoMedio =
    stats.length > 0 ? Math.round(stats.reduce((s, x) => s + x.dias, 0) / stats.length) : 0;
  const mediaSessoes =
    stats.length > 0 ? Math.round(stats.reduce((s, x) => s + x.sessoes, 0) / stats.length) : 0;

  return { altasMes, recuperados, tempoMedio, mediaSessoes };
}

export function prefillFromClinical(
  form: DischargeWizardForm,
  assessments: AssessmentRow[],
  stats: TreatmentStats,
): DischargeWizardForm {
  const { inicial, ultimaReav, altaClinical } = pickDischargeComparison(assessments);
  const src = altaClinical ?? ultimaReav ?? inicial;
  if (!src) return form;

  const resumoParts = [
    stats.sessoes > 0 ? `${stats.sessoes} sessão(ões) realizadas em ${stats.diasTratamento} dias.` : null,
    stats.evaInicial != null && stats.evaAtual != null
      ? `EVA: ${stats.evaInicial} → ${stats.evaAtual}. ${stats.evolucaoFuncional}.`
      : stats.evolucaoFuncional,
    stats.reavaliacoes > 0 ? `${stats.reavaliacoes} reavaliação(ões) registrada(s).` : null,
  ].filter(Boolean);

  return {
    ...form,
    resumo_clinico: form.resumo_clinico || resumoParts.join(" "),
    objetivos_alcancados: form.objetivos_alcancados || src.objetivos || "",
    objetivos_pendentes: form.objetivos_pendentes || "",
    limitacoes_remanescentes:
      form.limitacoes_remanescentes || src.orto_limitacoes || "",
  };
}
