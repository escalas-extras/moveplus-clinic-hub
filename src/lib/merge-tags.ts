// Merge-tag engine: substitui {{tag}} no conteúdo de um template
import { fmtDate, calcAge } from "./format";
import { computeScale } from "./clinical-scales";

export type MergeContext = {
  patient?: any;
  assessment?: any;
  professional?: any;
  clinic?: any;
  scales?: any[]; // assessment_scales rows
  extra?: Record<string, string>;
};

function fmtScale(scales: any[] | undefined, code: string): string {
  const s = scales?.find((x) => x.scale_code === code);
  if (!s) return "—";
  if (s.classification) return `${s.total_score} (${s.classification})`;
  return String(s.total_score ?? "—");
}

export function buildMergeData(ctx: MergeContext): Record<string, string> {
  const p = ctx.patient || {};
  const a = ctx.assessment || {};
  const pr = ctx.professional || {};
  const c = ctx.clinic || {};
  const today = new Date();

  const data: Record<string, string> = {
    paciente_nome: p.nome_completo || "—",
    paciente_idade: p.data_nascimento ? `${calcAge(p.data_nascimento)} anos` : "—",
    paciente_sexo: p.sexo || "—",
    paciente_cpf: p.cpf || "—",
    paciente_data_nascimento: p.data_nascimento ? fmtDate(p.data_nascimento) : "—",
    paciente_endereco: [p.endereco, p.bairro, p.cidade, p.estado].filter(Boolean).join(", ") || "—",

    diagnostico: a.diagnostico_clinico || "—",
    diagnostico_fisio: a.diagnostico_fisio || "—",
    queixa_principal: a.queixa_principal || "—",
    hma: a.hma || "—",

    profissional_nome: pr.nome || "—",
    profissional_crefito: [pr.conselho, pr.registro].filter(Boolean).join(" ") || "—",

    data_atual: fmtDate(today),
    data_avaliacao: a.data ? fmtDate(a.data) : "—",

    escala_barthel: fmtScale(ctx.scales, "barthel"),
    escala_katz: fmtScale(ctx.scales, "katz"),
    escala_berg: fmtScale(ctx.scales, "berg"),
    escala_tinetti: fmtScale(ctx.scales, "tinetti"),
    escala_braden: fmtScale(ctx.scales, "braden"),

    objetivos: a.objetivos || "—",
    condutas: a.condutas || "—",
    proxima_reavaliacao: a.next_reassessment_date ? fmtDate(a.next_reassessment_date) : "—",

    clinica_nome: c.nome_fantasia || "FisioOS",
    clinica_endereco: [c.endereco, c.cidade, c.estado].filter(Boolean).join(", ") || "—",
    clinica_telefone: Array.isArray(c.telefones) ? c.telefones.join(" · ") : (c.telefones || "—"),
  };

  if (ctx.extra) Object.assign(data, ctx.extra);
  return data;
}

export function renderMergeText(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, tag) => {
    return data[tag] ?? `{{${tag}}}`;
  });
}

export type TemplateSection = { order: number; title: string; content: string };

export function renderTemplateSections(
  sections: TemplateSection[],
  data: Record<string, string>,
): Array<{ title: string; body: string }> {
  return [...sections]
    .sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
    .map((s) => ({ title: s.title, body: renderMergeText(s.content || "", data) }));
}

// Lista de tags não substituídas (debug/validação)
export function findMissingTags(template: string, data: Record<string, string>): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(template))) {
    if (!(m[1] in data)) out.push(m[1]);
  }
  return out;
}

// Re-export para reuso
export { computeScale };
