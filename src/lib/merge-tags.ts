// Merge-tag engine: substitui {{tag}} no conteúdo de um template
import { fmtDate, calcAge } from "./format";
import { computeScale } from "./clinical-scales";

const HUMANIZE_MAP: Record<string, string> = {
  cid_principal: "CID não informado.",
  cid_secundario: "CID secundário não informado.",
  objetivos: "Objetivos terapêuticos a definir após avaliação.",
  condutas: "Condutas serão estabelecidas após avaliação inicial.",
  diagnostico_fisio: "Diagnóstico fisioterapêutico em elaboração.",
  diagnostico: "Hipótese diagnóstica a ser confirmada.",
  queixa_principal: "Queixa principal a documentar.",
  hma: "História da moléstia atual a documentar.",
  prognostico: "Prognóstico a definir após evolução.",
};

export function humanizeField(value: string | null | undefined, field: string): string {
  const v = (value ?? "").toString().trim();
  if (v && v !== "—") return v;
  return HUMANIZE_MAP[field] ?? "";
}

export type MergeContext = {
  patient?: any;
  assessment?: any;
  professional?: any;
  clinic?: any;
  scales?: any[]; // assessment_scales rows
  discharge?: any;
  contratante?: ContratanteData | null;
  extra?: Record<string, string>;
};

export type ContratanteData = {
  nome?: string | null;
  cpf?: string | null;
  rg?: string | null;
  vinculo?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  email?: string | null;
};

function fmtScale(scales: any[] | undefined, code: string): string {
  const s = scales?.find((x) => x.scale_code === code);
  if (!s) return "—";
  if (s.classification) return `${s.total_score} (${s.classification})`;
  return String(s.total_score ?? "—");
}

function fmtGoniometry(rom: any): string {
  if (!rom) return "—";
  if (typeof rom === "string") return rom;
  if (Array.isArray(rom)) {
    return rom
      .filter((r) => r && (r.articulacao || r.movimento))
      .map((r) => `${r.articulacao || ""} ${r.movimento || ""}: ${r.valor ?? "—"}°`.trim())
      .join("; ") || "—";
  }
  if (typeof rom === "object") {
    return Object.entries(rom)
      .filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => `${k}: ${v}°`)
      .join("; ") || "—";
  }
  return "—";
}

export function buildMergeData(ctx: MergeContext): Record<string, string> {
  const p = ctx.patient || {};
  const a = ctx.assessment || {};
  const pr = ctx.professional || {};
  const c = ctx.clinic || {};
  const d = ctx.discharge || {};
  const today = new Date();

  const data: Record<string, string> = {
    // ---- Paciente ----
    paciente_nome: p.nome_completo || "—",
    paciente_idade: p.data_nascimento ? `${calcAge(p.data_nascimento)} anos` : "—",
    paciente_sexo: p.sexo || "—",
    paciente_cpf: p.cpf || "—",
    paciente_rg: p.rg || "—",
    paciente_telefone: p.telefone || p.whatsapp || "—",
    paciente_data_nascimento: p.data_nascimento ? fmtDate(p.data_nascimento) : "—",
    paciente_endereco: [p.endereco, p.bairro, p.cidade, p.estado].filter(Boolean).join(", ") || "—",
    paciente_responsavel: p.responsavel || "—",
    paciente_acompanhante: p.acompanhante_nome || "—",
    paciente_acompanhante_parentesco: p.acompanhante_parentesco || "—",

    // ---- Convênio ----
    convenio_nome: p.convenio_nome || "—",
    convenio_carteirinha: p.convenio_carteirinha || "—",

    // ---- Clínico (humanizado: vazio vira frase institucional) ----
    diagnostico: humanizeField(a.diagnostico_clinico, "diagnostico"),
    diagnostico_fisio: humanizeField(a.diagnostico_fisio, "diagnostico_fisio"),
    queixa_principal: humanizeField(a.queixa_principal, "queixa_principal"),
    hma: humanizeField(a.hma, "hma"),
    cid_principal: humanizeField(p.cid_principal || a.diagnosis_codes?.[0], "cid_principal"),
    cid_secundario: humanizeField(p.cid_secundario || a.cid_secundario || a.diagnosis_codes?.[1], "cid_secundario"),
    prognostico: humanizeField(a.prognostico, "prognostico"),
    goniometria: fmtGoniometry(a.rom_goniometry),

    // ---- Plano ----
    objetivos: humanizeField(a.objetivos, "objetivos"),
    condutas: humanizeField(a.condutas, "condutas"),
    proxima_reavaliacao: a.next_reassessment_date ? fmtDate(a.next_reassessment_date) : "",

    // ---- Profissional ----
    profissional_nome: pr.nome || "—",
    profissional_crefito: [pr.conselho, pr.registro].filter(Boolean).join(" ") || c.crefito_default || "—",
    profissional_especialidade: pr.especialidade || "—",
    profissional_assinatura: pr.assinatura_url ? "[Assinatura digital]" : "—",

    // ---- Sistema ----
    data_atual: fmtDate(today),
    data_avaliacao: a.data ? fmtDate(a.data) : "—",

    // ---- Escalas ----
    escala_eva: a.eva != null ? `${a.eva}/10` : fmtScale(ctx.scales, "eva"),
    escala_barthel: fmtScale(ctx.scales, "barthel"),
    escala_katz: fmtScale(ctx.scales, "katz"),
    escala_berg: fmtScale(ctx.scales, "berg"),
    escala_tinetti: fmtScale(ctx.scales, "tinetti"),
    escala_braden: fmtScale(ctx.scales, "braden"),
    escala_mrc: fmtScale(ctx.scales, "mrc"),
    escala_mif: fmtScale(ctx.scales, "mif"),
    escala_tug: fmtScale(ctx.scales, "tug"),
    escala_meem: fmtScale(ctx.scales, "meem"),
    escala_moca: fmtScale(ctx.scales, "moca"),
    escala_ashworth: fmtScale(ctx.scales, "ashworth"),
    escala_borg: fmtScale(ctx.scales, "borg"),

    // ---- Alta ----
    data_alta: d.data_alta ? fmtDate(d.data_alta) : (p.data_alta ? fmtDate(p.data_alta) : "—"),
    motivo_alta: d.motivo || "—",
    objetivos_alcancados: d.objetivos_alcancados || "—",
    objetivos_pendentes: d.objetivos_pendentes || "—",
    recomendacoes_alta: d.recomendacoes || "—",
    plano_domiciliar: d.plano_domiciliar || "—",
    encaminhamento_pos_alta: d.observacoes || "—",

    // ---- Clínica ----
    clinica_nome: c.nome_fantasia || "FisioOS",
    clinica_razao_social: c.razao_social || c.nome_fantasia || "—",
    clinica_cnpj: c.cnpj || "—",
    clinica_endereco: [c.endereco, c.cidade, c.estado].filter(Boolean).join(", ") || "—",
    clinica_cidade_estado: [c.cidade, c.estado].filter(Boolean).join("/") || "—",
    clinica_telefone: Array.isArray(c.telefones) ? c.telefones.join(" · ") : (c.telefones || "—"),
    clinica_email: Array.isArray(c.emails) ? c.emails.join(" · ") : (c.emails || "—"),
  };

  // ---- Contratante (responsável financeiro ou próprio paciente) ----
  // Quando nenhum contratante explícito é informado, faz fallback para o
  // próprio paciente — assim contratos sem responsável continuam válidos.
  const ct = ctx.contratante || {};
  const ctNome = (ct.nome && ct.nome.trim()) || p.nome_completo || "—";
  const ctCpf = (ct.cpf && ct.cpf.trim()) || p.cpf || "—";
  const ctRg = (ct.rg && ct.rg.trim()) || p.rg || "—";
  const ctEnd = (ct.endereco && ct.endereco.trim())
    || [p.endereco, p.bairro, p.cidade, p.estado].filter(Boolean).join(", ") || "—";
  const ctTel = (ct.telefone && ct.telefone.trim()) || p.telefone || p.whatsapp || "—";
  const ctMail = (ct.email && ct.email.trim()) || p.email || "—";
  const ctVin = (ct.vinculo && ct.vinculo.trim()) || "Próprio paciente";
  Object.assign(data, {
    contratante_nome: ctNome,
    contratante_cpf: ctCpf,
    contratante_rg: ctRg,
    contratante_endereco: ctEnd,
    contratante_telefone: ctTel,
    contratante_email: ctMail,
    contratante_vinculo: ctVin,
  });

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

export function findMissingTags(template: string, data: Record<string, string>): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(template))) {
    if (!(m[1] in data)) out.push(m[1]);
  }
  return out;
}

export { computeScale };
