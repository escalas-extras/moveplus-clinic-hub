/** Formata conselho + registro no padrão CREFITO nº 123456-F. */
export function formatProfessionalRegistry(prof?: {
  conselho?: string | null;
  registro?: string | null;
} | null): string {
  if (!prof) return "—";
  const num = String(prof.registro ?? "").trim();
  const council = String(prof.conselho ?? "").trim() || "CREFITO";
  if (!num) return "—";
  if (/\d/.test(council) && !prof.registro) return council;
  return `${council} nº ${num}`;
}

export function fmtYesNo(v: any) {
  if (v === true) return "Sim";
  if (v === false) return "Não";
  return "—";
}

const PDF_HABITOS: { id: string; label: string }[] = [
  { id: "atividade_fisica", label: "Realiza atividade física?" },
  { id: "qualidade_sono", label: "Boa qualidade do sono?" },
  { id: "alimentacao", label: "Alimentação saudável?" },
  { id: "internacoes", label: "Internações recentes?" },
  { id: "quedas", label: "Quedas nos últimos 12 meses?" },
  { id: "cirurgia_previa", label: "Cirurgia prévia?" },
  { id: "fadiga_dispneia", label: "Fadiga / dispneia?" },
  { id: "angina", label: "Angina / aperto / queimação?" },
  { id: "formigamento_mmii", label: "Formigamento em MMII?" },
  { id: "sincope", label: "Quadro de síncope?" },
  { id: "sequela_motora", label: "Sequela motora?" },
  { id: "fumante", label: "Fumante?" },
  { id: "alcool", label: "Bebida alcoólica / substâncias?" },
  { id: "multidisciplinar", label: "Equipe multidisciplinar?" },
  { id: "atividade_social", label: "Atividade social / lazer?" },
  { id: "deambula", label: "Deambula?" },
  { id: "auxiliar_marcha", label: "Auxiliar de marcha?" },
  { id: "cadeirante_acamado", label: "Cadeirante / acamado?" },
  { id: "esfincter", label: "Controle de esfíncter?" },
  { id: "vertigem", label: "Vertigem?" },
  { id: "visao", label: "Distúrbio de visão?" },
  { id: "audicao", label: "Distúrbio de audição?" },
  { id: "outros_tratamentos", label: "Outros tratamentos?" },
];
const PDF_SEGMENTOS = ["MSD", "MSE", "MID", "MIE", "Tronco", "Face"] as const;
const PDF_POSTURA = [
  { id: "cabeca", label: "Cabeça" },
  { id: "ombros", label: "Ombros" },
  { id: "mmss", label: "MMSS" },
  { id: "coluna", label: "Coluna" },
  { id: "pelve", label: "Pelve" },
  { id: "mmii", label: "MMII" },
  { id: "joelhos", label: "Joelhos" },
  { id: "tornozelos", label: "Tornozelos" },
  { id: "pes", label: "Pés" },
];

export function buildGeriatricChildren(a: any): any[] {
  const children: any[] = [];

  const doencas: any[] = Array.isArray(a.doencas_previas) ? a.doencas_previas : [];
  const doencasRows = doencas
    .filter((d) => d && (d.patologia || d.medicamento || d.observacao))
    .map((d) => [d.patologia || "—", [d.medicamento && `Med.: ${d.medicamento}`, d.observacao && `Obs.: ${d.observacao}`].filter(Boolean).join(" · ") || "—"] as [string, string]);
  if (doencasRows.length) {
    children.push({ kind: "paragraph" as const, label: "Doenças preexistentes", text: "" });
    children.push({ kind: "grid" as const, rows: doencasRows, columns: 2 as const });
  }

  const sv = a.sinais_vitais || {};
  const svRows: Array<[string, string]> = [];
  const push = (k: string, v: any) => { if (v != null && String(v).trim() !== "") svRows.push([k, String(v)]); };
  push("PA", sv.pa); push("FC", sv.fc); push("FR", sv.fr); push("PR", sv.pr); push("SpO₂", sv.spo2);
  push("Ausculta", sv.ausculta); push("Tosse", sv.tosse); push("Secreção", sv.secrecao);
  push("Tônus", sv.tonus); push("Trofismo", sv.trofismo); push("Clônus", sv.clonus);
  push("Cintura (cm)", a.med_cintura); push("Quadril (cm)", a.med_quadril); push("ICQ", a.icq);
  push("Nível de consciência", a.nivel_consciencia);
  if (svRows.length) {
    children.push({ kind: "paragraph" as const, label: "Sinais vitais e medidas", text: "" });
    children.push({ kind: "grid" as const, rows: svRows, columns: 2 as const });
  }

  const habitos = a.habitos_anamnese || {};
  const habitosRows: Array<[string, string]> = [];
  for (const h of PDF_HABITOS) {
    const v = habitos[h.id];
    if (!v) continue;
    const resp = v.resposta ? (v.resposta === "sim" ? "Sim" : v.resposta === "nao" ? "Não" : v.resposta) : "";
    const obs = v.obs ? ` — ${v.obs}` : "";
    const det = v.detalhe ? ` (${v.detalhe})` : "";
    if (resp || obs || det) habitosRows.push([h.label, `${resp}${obs}${det}`]);
  }
  if (habitosRows.length) {
    children.push({ kind: "paragraph" as const, label: "Hábitos e anamnese geriátrica", text: "" });
    children.push({ kind: "grid" as const, rows: habitosRows, columns: 1 as const });
  }

  const ef = a.exame_fisico || {};
  const efRows: Array<[string, string]> = [];
  for (const seg of PDF_SEGMENTOS) {
    const v = ef[seg];
    if (!v) continue;
    const parts = [
      v.fm && `FM: ${v.fm}`,
      v.sens && `Sens.: ${v.sens}`,
      v.edema && `Edema: ${v.edema}`,
      v.adm && `ADM: ${v.adm}`,
    ].filter(Boolean).join(" · ");
    if (parts) efRows.push([seg, parts]);
  }
  if (efRows.length) {
    children.push({ kind: "paragraph" as const, label: "Exame físico por segmento", text: "" });
    children.push({ kind: "grid" as const, rows: efRows, columns: 1 as const });
  }

  const post = a.postura_alinhamento || {};
  const postRows: Array<[string, string]> = [];
  for (const it of PDF_POSTURA) {
    const v = post[it.id];
    if (!v) continue;
    const status = v.status ? (v.status === "normal" ? "Normal" : v.status === "alterado" ? "Alterado" : v.status) : "";
    const obs = v.obs ? ` — ${v.obs}` : "";
    if (status || obs) postRows.push([it.label, `${status}${obs}`]);
  }
  if (postRows.length) {
    children.push({ kind: "paragraph" as const, label: "Avaliação postural", text: "" });
    children.push({ kind: "grid" as const, rows: postRows, columns: 2 as const });
  }

  const dor: any[] = Array.isArray(a.avaliacao_algica) ? a.avaliacao_algica : [];
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
  if (dorRows.length) {
    children.push({ kind: "paragraph" as const, label: "Avaliação álgica (locais de dor)", text: "" });
    children.push({ kind: "grid" as const, rows: dorRows, columns: 1 as const });
  }

  if (a.observacoes_gerais) {
    children.push({ kind: "paragraph" as const, label: "Observações gerais", text: a.observacoes_gerais });
  }

  return children;
}
