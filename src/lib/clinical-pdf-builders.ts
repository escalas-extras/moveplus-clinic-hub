/**
 * Sprint 8B.1 — Builders premium para PDFs clínicos.
 * Usa layout `clinical-premium` + drawDocumentHeader/Footer.
 */

import {
  buildEvolutionSummary,
  buildMetricCompares,
  parseRomScore,
  parseScales,
  parseStrengthScore,
  pickComparisonTriplet,
  type AssessmentRow,
} from "@/components/reassessment-premium/compare-utils";
import {
  computeTreatmentStats,
  pickDischargeComparison,
} from "@/components/discharge-premium/discharge-utils";
import type { BuildPdfOpts, PdfBlock, PdfContent } from "@/lib/pdf-engine";
import { calcAge, fmtDate } from "./format";
import { fmtYesNo, buildGeriatricChildren } from "./pdf-builders-shared";

const PREMIUM = {
  layout: "clinical-premium" as const,
  documentVersion: "8B.1",
};

// ---------- Shared helpers ----------

function indicatorBadge(ind: string | null | undefined): PdfContent | null {
  if (!ind) return null;
  const map: Record<string, { text: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
    melhorou: { text: "Melhorou", variant: "success" },
    estavel: { text: "Estável", variant: "warning" },
    piorou: { text: "Piorou", variant: "danger" },
  };
  const hit = map[ind];
  if (!hit) return null;
  return { kind: "badge", label: "Indicador clínico da sessão", text: hit.text, variant: hit.variant };
}

function splitProcedimentos(raw: string | null | undefined) {
  const text = raw?.trim() ?? "";
  if (!text) return { conduta: "—", exercicios: "—" };
  const parts = text.split(/\n\nExercícios:\n/);
  if (parts.length > 1) {
    return { conduta: parts[0].trim() || "—", exercicios: parts[1].trim() || "—" };
  }
  return { conduta: text, exercicios: "—" };
}

function splitConduta(raw: string | null | undefined) {
  const text = raw?.trim() ?? "";
  if (!text) return { plano: "—", recursos: "—" };
  const parts = text.split(/\n\nRecursos terapêuticos:\n/);
  if (parts.length > 1) {
    return { plano: parts[0].trim() || "—", recursos: parts[1].trim() || "—" };
  }
  return { plano: text, recursos: "—" };
}

function scalesBlock(a: any): PdfContent[] {
  const items: PdfContent[] = [];
  const scales = parseScales(a.scales_results);
  const rom = parseRomScore(a.rom_goniometry);
  const strength = parseStrengthScore(a.strength_mrc);
  if (scales.summary !== "—") {
    items.push({ kind: "paragraph", label: "Escalas clínicas", text: scales.summary });
  }
  if (rom.summary !== "—") {
    items.push({ kind: "paragraph", label: "ADM / Goniometria", text: rom.summary });
  }
  if (strength.summary !== "—") {
    items.push({ kind: "paragraph", label: "Força muscular (MRC)", text: strength.summary });
  }
  return items;
}

function identificationGrid(p: any, a: any, extra: Array<[string, string]> = []): PdfBlock {
  return {
    title: "Identificação",
    children: [
      {
        kind: "grid",
        columns: 2,
        rows: [
          ["Nome", p?.nome_completo ?? "—"],
          ["Data de nascimento", `${fmtDate(p?.data_nascimento)}${calcAge(p?.data_nascimento) != null ? ` (${calcAge(p?.data_nascimento)} anos)` : ""}`],
          ["Sexo", p?.sexo ?? "—"],
          ["Telefone", p?.telefone ?? "—"],
          ["Profissional", a.professionals?.nome ?? "—"],
          ["Registro", [a.professionals?.conselho, a.professionals?.registro].filter(Boolean).join(" ") || "—"],
          ...extra,
        ],
      },
    ],
  };
}

// ---------- Avaliação ----------

export function buildAssessmentPdfOpts(a: any, p: any, allEvolutions: any[] = [], allAssessments: any[] = []) {
  if (a.tipo === "reavaliacao") {
    return buildReassessmentPdfOpts(a, p, allAssessments.length ? allAssessments : [a]);
  }

  const APRESENTACAO_OPTS = ["Deambulando", "Deambulando com apoio/auxílio", "Cadeira de rodas", "Internado", "Orientado"];
  const INSPECAO_OPTS = ["Normal", "Edema", "Cicatrização incompleta", "Eritemas", "Outros"];
  const aArr: string[] = Array.isArray(a.apresentacao) ? a.apresentacao : [];
  const iArr: string[] = Array.isArray(a.inspecao_flags) ? a.inspecao_flags : [];

  const linked = allEvolutions
    .filter((e) => e.assessment_id === a.id)
    .slice()
    .sort((x, y) => (x.data < y.data ? -1 : 1));

  const scaleItems = scalesBlock(a);

  return {
    ...PREMIUM,
    title: "Avaliação Fisioterapêutica",
    subtitle: `Emitida em ${fmtDate(a.data)}`,
    referenceLabel: "Data da avaliação",
    referenceValue: fmtDate(a.data),
    patientName: p?.nome_completo,
    professional: a.professionals,
    validationHash: a.validation_hash ?? null,
    clinicId: (a?.clinic_id ?? p?.clinic_id ?? null) as string | null,
    blocks: [
      identificationGrid(p, a, [
        ["Data da avaliação", fmtDate(a.data)],
        ["Profissão", p?.profissao ?? "—"],
        ["Naturalidade", p?.naturalidade ?? "—"],
      ]),
      {
        title: "Diagnóstico",
        children: [
          { kind: "highlight", label: "Diagnóstico clínico", text: a.diagnostico_clinico || "—" },
          { kind: "highlight", label: "Diagnóstico fisioterapêutico", text: a.diagnostico_fisio || "—" },
        ],
      },
      {
        title: "Anamnese",
        children: [
          { kind: "highlight", label: "Queixa principal", text: a.queixa_principal || "—" },
          { kind: "paragraph", label: "História da Moléstia Atual (HMA)", text: a.hma || "—" },
          { kind: "paragraph", label: "História da Moléstia Pregressa (HMP)", text: a.hmp || "—" },
          { kind: "paragraph", label: "História clínica", text: a.historia_clinica || "—" },
          { kind: "paragraph", label: "Hábitos de vida", text: a.habitos_vida || "—" },
          { kind: "paragraph", label: "Antecedentes pessoais", text: a.antecedentes_pessoais || "—" },
          { kind: "paragraph", label: "Antecedentes familiares", text: a.antecedentes_familiares || "—" },
          { kind: "paragraph", label: "Tratamentos realizados", text: a.tratamentos_realizados || "—" },
        ],
      },
      {
        title: "Exame físico",
        children: [
          {
            kind: "checks",
            label: "Apresentação do paciente",
            items: APRESENTACAO_OPTS.map((o) => ({ label: o, checked: aArr.includes(o) })),
          },
          {
            kind: "grid",
            rows: [
              ["Exames complementares", fmtYesNo(a.tem_exames) + (a.exames_complementares ? `\n${a.exames_complementares}` : "")],
              ["Medicamentos", fmtYesNo(a.usa_medicamentos) + (a.medicamentos ? `\n${a.medicamentos}` : "")],
              ["Cirurgias prévias", fmtYesNo(a.teve_cirurgias) + (a.cirurgias ? `\n${a.cirurgias}` : "")],
            ],
          },
          {
            kind: "checks",
            label: "Inspeção",
            items: INSPECAO_OPTS.map((o) => ({ label: o, checked: iArr.includes(o) })),
          },
          { kind: "paragraph", label: "Palpação / observações", text: a.palpacao || a.inspecao || "—" },
          { kind: "paragraph", label: "Testes específicos", text: a.testes_especificos || "—" },
        ],
      },
      ...(() => {
        const geri = buildGeriatricChildren(a);
        return geri.length ? [{ title: "Ficha geriátrica", children: geri }] : [];
      })(),
      {
        title: "Avaliação da dor (EVA)",
        children: [{ kind: "eva", value: a.eva ?? null }],
      },
      ...(scaleItems.length
        ? [{ title: "Escalas e medidas funcionais", children: scaleItems }]
        : []),
      {
        title: "Objetivos e plano terapêutico",
        children: [
          { kind: "highlight", label: "Objetivos terapêuticos", text: a.objetivos || "—" },
          { kind: "highlight", label: "Plano de tratamento", text: a.condutas || "—" },
          { kind: "paragraph", label: "Recursos terapêuticos", text: a.recursos_terapeuticos || "—" },
        ],
      },
      ...(linked.length
        ? [{
            title: "Evoluções vinculadas",
            children: [{
              kind: "evolutions" as const,
              items: linked.map((e, idx) => ({
                data: fmtDate(e.data),
                hora: e.hora,
                index: idx + 1,
                conduta: e.procedimentos,
                resultado: e.evolucao_observada,
                intercorrencias: e.intercorrencias,
                proximos: e.conduta,
              })),
            }],
          }]
        : []),
    ],
  } satisfies BuildPdfOpts;
}

// ---------- Reavaliação ----------

export function buildReassessmentPdfOpts(a: any, p: any, allAssessments: any[]) {
  const rows = allAssessments as AssessmentRow[];
  const { inicial, ultima, atual } = pickComparisonTriplet(rows);
  const metrics = buildMetricCompares(inicial, ultima, atual ?? (a as AssessmentRow));
  const summary = buildEvolutionSummary(inicial, ultima, atual ?? (a as AssessmentRow), metrics);

  const compareRows = metrics
    .filter((m) => m.atual !== "—" || m.inicial !== "—")
    .map((m) => ({
      label: m.label,
      inicial: m.inicial,
      anterior: m.ultima,
      atual: m.atual,
      trend: m.trend,
    }));

  const summaryChildren: PdfContent[] = [];
  if (summary.melhoras.length) {
    summaryChildren.push({ kind: "paragraph", label: "Evoluções favoráveis", text: summary.melhoras.join("\n") });
  }
  if (summary.semEvolucao.length) {
    summaryChildren.push({ kind: "paragraph", label: "Sem variação significativa", text: summary.semEvolucao.join("\n") });
  }
  if (summary.novasLimitacoes.length) {
    summaryChildren.push({ kind: "paragraph", label: "Pontos de atenção", text: summary.novasLimitacoes.join("\n") });
  }
  if (summary.objetivosAlcancados.length) {
    summaryChildren.push({ kind: "highlight", label: "Objetivos alcançados", text: summary.objetivosAlcancados.join("\n") });
  }
  if (summary.objetivosPendentes.length) {
    summaryChildren.push({ kind: "highlight", label: "Objetivos pendentes", text: summary.objetivosPendentes.join("\n") });
  }

  const current = (atual ?? a) as any;
  const scaleItems = scalesBlock(current);

  return {
    ...PREMIUM,
    title: "Reavaliação Fisioterapêutica",
    subtitle: `Emitida em ${fmtDate(a.data)}`,
    referenceLabel: "Data da reavaliação",
    referenceValue: fmtDate(a.data),
    patientName: p?.nome_completo,
    professional: a.professionals,
    validationHash: a.validation_hash ?? null,
    clinicId: (a?.clinic_id ?? p?.clinic_id ?? null) as string | null,
    blocks: [
      identificationGrid(p, a, [["Data da reavaliação", fmtDate(a.data)]]),
      ...(compareRows.length
        ? [{
            title: "Comparativo clínico",
            children: [{ kind: "compare-table" as const, rows: compareRows }],
          }]
        : []),
      ...(summaryChildren.length
        ? [{ title: "Resumo evolutivo", children: summaryChildren }]
        : []),
      {
        title: "Situação atual",
        children: [
          { kind: "highlight", label: "Queixa principal", text: current.queixa_principal || a.queixa_principal || "—" },
          { kind: "highlight", label: "Diagnóstico fisioterapêutico", text: current.diagnostico_fisio || a.diagnostico_fisio || "—" },
          { kind: "paragraph", label: "Testes funcionais", text: current.testes_especificos || a.testes_especificos || "—" },
        ],
      },
      {
        title: "Avaliação da dor (EVA)",
        children: [{ kind: "eva", value: current.eva ?? a.eva ?? null }],
      },
      ...(scaleItems.length
        ? [{ title: "Escalas, ADM e força", children: scaleItems }]
        : []),
      {
        title: "Objetivos e conduta",
        children: [
          { kind: "highlight", label: "Objetivos terapêuticos", text: current.objetivos || a.objetivos || "—" },
          { kind: "highlight", label: "Plano / conduta", text: current.condutas || a.condutas || "—" },
        ],
      },
    ],
  } satisfies BuildPdfOpts;
}

// ---------- Evolução ----------

export function buildEvolutionPdfOpts(e: any, p: any) {
  const sv = e.sinais_vitais || {};
  const soap = sv.soap || {};
  const soapActive = !!(soap.s || soap.o || soap.a || soap.p);
  const { conduta: condutaProc, exercicios } = splitProcedimentos(e.procedimentos);
  const { plano, recursos } = splitConduta(e.conduta);

  const svRows: Array<[string, string]> = [];
  const pushSv = (k: string, v: any) => { if (v != null && String(v).trim() !== "") svRows.push([k, String(v)]); };
  pushSv("PA", sv.pa ?? e.pa);
  pushSv("FC", sv.fc ?? e.fc);
  pushSv("FR", sv.fr ?? e.fr);
  pushSv("SpO₂", sv.spo2 ?? e.spo2);
  pushSv("Nível de consciência", e.nivel_consciencia ?? sv.nivel_consciencia);

  const indicator = indicatorBadge(sv.indicador_evolucao);

  const dor: any[] = Array.isArray(e.avaliacao_algica) ? e.avaliacao_algica : [];
  const dorRows = dor
    .filter((r) => r && (r.local || r.repouso || r.movimento || r.fatores || r.impacto))
    .map((r, i) => [
      `${i + 1}. ${r.local || "—"}`,
      [
        (r.repouso || r.movimento) && `Repouso ${r.repouso || "—"} / Movim. ${r.movimento || "—"}`,
        r.fatores && `Fatores: ${r.fatores}`,
        r.impacto && `Impacto AVDs: ${r.impacto}`,
      ].filter(Boolean).join(" · ") || "—",
    ] as [string, string]);

  const sessionLabel = `${fmtDate(e.data)}${e.hora ? ` às ${String(e.hora).slice(0, 5)}` : ""}`;

  return {
    ...PREMIUM,
    title: "Evolução Clínica",
    subtitle: sessionLabel,
    referenceLabel: "Data / hora da sessão",
    referenceValue: sessionLabel,
    patientName: p?.nome_completo,
    professional: e.professionals,
    validationHash: e.validation_hash ?? null,
    clinicId: (e?.clinic_id ?? p?.clinic_id ?? null) as string | null,
    blocks: [
      {
        title: "Dados da sessão",
        children: [
          {
            kind: "grid",
            columns: 2,
            rows: [
              ["Paciente", p?.nome_completo ?? "—"],
              ["Data / Hora", sessionLabel],
              ["Sessão nº", e.sessao_numero != null && e.sessao_numero !== "" ? String(e.sessao_numero) : "—"],
              ["Profissional", e.professionals?.nome ?? "—"],
            ],
          },
          ...(indicator ? [indicator] : []),
        ],
      },
      ...(svRows.length
        ? [{ title: "Sinais vitais", children: [{ kind: "grid" as const, rows: svRows, columns: 2 as const }] }]
        : []),
      ...(soapActive
        ? [{
            title: "Registro SOAP",
            children: [
              { kind: "paragraph", label: "S — Subjetivo", text: soap.s || e.resposta_paciente || "—" },
              { kind: "paragraph", label: "O — Objetivo", text: soap.o || e.inspecao || "—" },
              { kind: "paragraph", label: "A — Avaliação", text: soap.a || e.evolucao_observada || "—" },
              { kind: "paragraph", label: "P — Plano", text: soap.p || plano || "—" },
            ],
          }]
        : []),
      {
        title: "Condutas e recursos",
        children: [
          { kind: "highlight", label: "Conduta aplicada", text: condutaProc },
          { kind: "paragraph", label: "Exercícios prescritos", text: exercicios },
          { kind: "paragraph", label: "Recursos terapêuticos", text: recursos !== "—" ? recursos : "—" },
        ],
      },
      {
        title: "Resposta e orientações",
        children: [
          { kind: "paragraph", label: "Resposta do paciente", text: e.resposta_paciente || soap.s || "—" },
          { kind: "paragraph", label: "Orientações", text: e.observacoes_gerais || "—" },
          { kind: "paragraph", label: "Intercorrências", text: e.intercorrencias || "—" },
          { kind: "paragraph", label: "Próximos objetivos", text: e.proximos_objetivos || "—" },
        ],
      },
      ...(dorRows.length || e.eva != null
        ? [{
            title: "Avaliação álgica",
            children: [
              { kind: "eva" as const, value: e.eva ?? null },
              ...(dorRows.length ? [
                { kind: "paragraph" as const, label: "Locais de dor", text: "" },
                { kind: "grid" as const, rows: dorRows, columns: 1 as const },
              ] : []),
            ],
          }]
        : []),
    ],
  } satisfies BuildPdfOpts;
}

// ---------- Alta ----------

export function buildDischargePdfOpts(
  d: any,
  p: any,
  assessments: any[] = [],
  evolutionCount = 0,
) {
  const rows = assessments as AssessmentRow[];
  const stats = computeTreatmentStats(rows, evolutionCount, d.data_alta ?? new Date().toISOString().slice(0, 10));
  const { inicial, ultimaReav, altaClinical } = pickDischargeComparison(rows);

  const compareRows = buildMetricCompares(
    inicial,
    ultimaReav,
    altaClinical,
  )
    .filter((m) => m.inicial !== "—" || m.atual !== "—")
    .map((m) => ({
      label: m.label,
      inicial: m.inicial,
      anterior: m.ultima,
      atual: m.atual,
      trend: m.trend,
    }));

  return {
    ...PREMIUM,
    title: "Alta Fisioterapêutica",
    subtitle: `Emitida em ${fmtDate(d.data_alta)}`,
    referenceLabel: "Data da alta",
    referenceValue: fmtDate(d.data_alta),
    patientName: p?.nome_completo,
    professional: d.professionals,
    validationHash: d.validation_hash ?? null,
    clinicId: (d?.clinic_id ?? p?.clinic_id ?? null) as string | null,
    blocks: [
      {
        title: "Identificação",
        children: [{
          kind: "grid",
          columns: 2,
          rows: [
            ["Paciente", p?.nome_completo ?? "—"],
            ["Data da alta", fmtDate(d.data_alta)],
            ["Profissional", d.professionals?.nome ?? "—"],
            ["Motivo", d.motivo ?? "—"],
          ],
        }],
      },
      {
        title: "Resumo clínico",
        children: [
          {
            kind: "grid",
            columns: 2,
            rows: [
              ["Sessões realizadas", String(stats.sessoes)],
              ["Tempo de tratamento", `${stats.diasTratamento} dias`],
              ["Reavaliações", String(stats.reavaliacoes)],
              ["EVA inicial → atual", stats.evaInicial != null && stats.evaAtual != null ? `${stats.evaInicial} → ${stats.evaAtual}` : "—"],
            ],
          },
          { kind: "highlight", label: "Resumo", text: d.observacoes || stats.evolucaoFuncional || "—" },
        ],
      },
      ...(compareRows.length
        ? [{ title: "Comparativo final", children: [{ kind: "compare-table" as const, rows: compareRows }] }]
        : []),
      {
        title: "Objetivos",
        children: [
          { kind: "highlight", label: "Objetivos alcançados", text: d.objetivos_alcancados || "—" },
          { kind: "highlight", label: "Objetivos pendentes", text: d.objetivos_pendentes || "—" },
        ],
      },
      {
        title: "Orientações finais",
        children: [
          { kind: "paragraph", label: "Recomendações", text: d.recomendacoes || "—" },
          { kind: "paragraph", label: "Plano domiciliar", text: d.plano_domiciliar || "—" },
        ],
      },
      {
        title: "Conclusão",
        children: [
          { kind: "highlight", label: "Encerramento do tratamento", text: d.motivo || "Alta fisioterapêutica registrada." },
        ],
      },
    ],
  } satisfies BuildPdfOpts;
}
