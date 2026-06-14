import { fmtDate, calcAge } from "./format";

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

function buildGeriatricChildren(a: any): any[] {
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
    if (resp || obs) habitosRows.push([h.label, `${resp}${obs}`]);
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

export function buildAssessmentPdfOpts(a: any, p: any, allEvolutions: any[] = []) {
  const isReaval = a.tipo === "reavaliacao";
  const linked = allEvolutions
    .filter((e) => e.assessment_id === a.id)
    .slice()
    .sort((x, y) => (x.data < y.data ? -1 : 1));

  const apresentacaoOpts = [
    { key: "deambulando", label: "Deambulando" },
    { key: "apoio", label: "Com apoio" },
    { key: "cadeirante", label: "Cadeirante" },
    { key: "hospitalizado", label: "Hospitalizado" },
    { key: "orientado", label: "Orientado" },
  ];
  const inspecaoOpts = [
    { key: "edema", label: "Edema" },
    { key: "hematoma", label: "Hematoma" },
    { key: "atrofia", label: "Atrofia muscular" },
    { key: "cicatriz", label: "Cicatriz" },
    { key: "deformidade", label: "Deformidade" },
    { key: "alteracao_cor", label: "Alteração de cor" },
  ];
  const aSet: Set<string> = new Set(a.apresentacao || []);
  const iSet: Set<string> = new Set(a.inspecao_flags || []);

  return {
    title: `${isReaval ? "Reavaliação" : "Avaliação"} Fisioterapêutica`,
    subtitle: `Conforme Resolução COFFITO 414/2012 · Emitida em ${fmtDate(a.data)}`,
    patientName: p?.nome_completo,
    professional: a.professionals,
    blocks: [
      {
        title: "1. Identificação",
        children: [
          {
            kind: "grid" as const,
            rows: [
              ["Nome", p?.nome_completo ?? "—"],
              ["Data de avaliação", fmtDate(a.data)],
              ["Data de nascimento", `${fmtDate(p?.data_nascimento)}${calcAge(p?.data_nascimento) != null ? `  (${calcAge(p?.data_nascimento)} anos)` : ""}`],
              ["Sexo", p?.sexo ?? "—"],
              ["Estado civil", p?.estado_civil ?? "—"],
              ["Profissão", p?.profissao ?? "—"],
              ["Naturalidade", p?.naturalidade ?? "—"],
              ["Telefone", p?.telefone ?? "—"],
              ["Cidade / Estado", [p?.cidade, p?.estado].filter(Boolean).join(" - ") || "—"],
              ["Bairro", p?.bairro ?? "—"],
              ["Endereço residencial", p?.endereco ?? "—"],
              ["Endereço comercial", p?.endereco_comercial ?? "—"],
              ["Profissional", a.professionals?.nome ?? "—"],
            ],
          },
        ],
      },
      {
        title: "2. Diagnósticos",
        children: [
          { kind: "highlight" as const, label: "Diagnóstico clínico", text: a.diagnostico_clinico || "—" },
          { kind: "highlight" as const, label: "Diagnóstico fisioterapêutico", text: a.diagnostico_fisio || "—" },
        ],
      },
      {
        title: "3. Avaliação Clínica (Anamnese)",
        children: [
          { kind: "highlight" as const, label: "Queixa principal", text: a.queixa_principal || "—" },
          { kind: "paragraph" as const, label: "História da Moléstia Atual (HMA)", text: a.hma || "—" },
          { kind: "paragraph" as const, label: "História da Moléstia Pregressa (HMP)", text: a.hmp || "—" },
          { kind: "paragraph" as const, label: "História clínica", text: a.historia_clinica || "—" },
          { kind: "paragraph" as const, label: "Hábitos de vida", text: a.habitos_vida || "—" },
          { kind: "paragraph" as const, label: "Antecedentes pessoais", text: a.antecedentes_pessoais || "—" },
          { kind: "paragraph" as const, label: "Antecedentes familiares", text: a.antecedentes_familiares || "—" },
          { kind: "paragraph" as const, label: "Tratamentos realizados", text: a.tratamentos_realizados || "—" },
        ],
      },
      {
        title: "4. Exame Clínico / Físico",
        children: [
          {
            kind: "checks" as const,
            label: "Apresentação do paciente",
            items: apresentacaoOpts.map((o) => ({ label: o.label, checked: aSet.has(o.key) })),
          },
          {
            kind: "grid" as const,
            rows: [
              ["Exames complementares", fmtYesNo(a.tem_exames) + (a.exames_complementares ? `\n${a.exames_complementares}` : "")],
              ["Uso de medicamentos", fmtYesNo(a.usa_medicamentos) + (a.medicamentos ? `\n${a.medicamentos}` : "")],
              ["Cirurgias prévias", fmtYesNo(a.teve_cirurgias) + (a.cirurgias ? `\n${a.cirurgias}` : "")],
            ],
          },
          {
            kind: "checks" as const,
            label: "Inspeção",
            items: inspecaoOpts.map((o) => ({ label: o.label, checked: iSet.has(o.key) })),
          },
          { kind: "paragraph" as const, label: "Palpação / observações", text: a.palpacao || a.inspecao || "—" },
          { kind: "paragraph" as const, label: "Semiologia", text: a.semiologia || "—" },
          { kind: "paragraph" as const, label: "Testes específicos", text: a.testes_especificos || "—" },
        ],
      },
      ...((() => {
        const geri = buildGeriatricChildren(a);
        return geri.length ? [{ title: "5. Ficha geriátrica", children: geri }] : [];
      })()),
      {
        title: "6. Avaliação da Dor (EVA)",
        children: [{ kind: "eva" as const, value: a.eva ?? null }],
      },
      {
        title: "7. Plano Terapêutico",
        children: [
          { kind: "highlight" as const, label: "Objetivos terapêuticos", text: a.objetivos || "—" },
          { kind: "highlight" as const, label: "Plano de tratamento", text: a.condutas || "—" },
          { kind: "paragraph" as const, label: "Recursos terapêuticos", text: a.recursos_terapeuticos || "—" },
        ],
      },
      ...(linked.length
        ? [{
            title: "8. Evoluções Clínicas",
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
  };
}

export function buildEvolutionPdfOpts(e: any, p: any) {
  const svObj = e.sinais_vitais || {};
  const svRows: Array<[string, string]> = [];
  const pushSv = (k: string, v: any) => { if (v != null && String(v).trim() !== "") svRows.push([k, String(v)]); };
  pushSv("PA", svObj.pa ?? e.pa);
  pushSv("FC", svObj.fc ?? e.fc);
  pushSv("FR", svObj.fr ?? e.fr);
  pushSv("PR", svObj.pr);
  pushSv("SpO₂", svObj.spo2 ?? e.spo2);
  pushSv("Ausculta", svObj.ausculta);
  pushSv("Tosse", svObj.tosse);
  pushSv("Secreção", svObj.secrecao);
  pushSv("Tônus", svObj.tonus);
  pushSv("Trofismo", svObj.trofismo);
  pushSv("Clônus", svObj.clonus);
  pushSv("Nível de consciência", e.nivel_consciencia ?? svObj.nivel_consciencia);

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

  return {
    title: `Evolução Clínica`,
    subtitle: `${fmtDate(e.data)}${e.hora ? ` às ${String(e.hora).slice(0, 5)}` : ""}`,
    patientName: p.nome_completo,
    professional: e.professionals,
    blocks: [
      {
        title: "Identificação",
        children: [
          {
            kind: "grid" as const,
            rows: [
              ["Paciente", p?.nome_completo ?? "—"],
              ["Data / Hora", `${fmtDate(e.data)}${e.hora ? ` ${String(e.hora).slice(0, 5)}` : ""}`],
              ["Profissional", e.professionals?.nome ?? "—"],
              ["Registro", e.professionals?.registro ?? e.professionals?.conselho ?? "—"],
            ],
          },
        ],
      },
      ...(svRows.length
        ? [{
            title: "Sinais vitais",
            children: [{ kind: "grid" as const, rows: svRows, columns: 2 as const }],
          }]
        : []),
      ...(e.inspecao || e.palpacao
        ? [{
            title: "Inspeção / Palpação",
            children: [
              ...(e.inspecao ? [{ kind: "paragraph" as const, label: "Inspeção", text: e.inspecao }] : []),
              ...(e.palpacao ? [{ kind: "paragraph" as const, label: "Palpação", text: e.palpacao }] : []),
            ],
          }]
        : []),
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
      {
        title: "Sessão",
        children: [
          { kind: "highlight" as const, label: "Conduta aplicada", text: e.procedimentos || "—" },
          { kind: "paragraph" as const, label: "Estado de saúde do paciente", text: e.resposta_paciente || "—" },
          { kind: "paragraph" as const, label: "Resultados observados", text: e.evolucao_observada || "—" },
          { kind: "paragraph" as const, label: "Intercorrências", text: e.intercorrencias || "—" },
          { kind: "paragraph" as const, label: "Próximos passos", text: e.conduta || "—" },
          { kind: "paragraph" as const, label: "Próximos objetivos", text: e.proximos_objetivos || "—" },
          ...(e.observacoes_gerais ? [{ kind: "paragraph" as const, label: "Observações gerais", text: e.observacoes_gerais }] : []),
        ],
      },
    ],
  };
}
