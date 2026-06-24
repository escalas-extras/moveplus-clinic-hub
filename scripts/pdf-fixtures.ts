// scripts/pdf-fixtures.ts
// Gera 6 PDFs mock para QA visual do redesign V2.
// Execução: bun scripts/pdf-fixtures.ts
// Saída: /mnt/documents/pdf-fixtures/*.pdf

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderPdf, type BuildPdfOpts, type ClinicData, type Professional, type PdfBlock } from "../src/lib/pdf-engine";

const OUT = "/mnt/documents/pdf-fixtures";
mkdirSync(OUT, { recursive: true });

// --- Fixtures de domínio ---
const CLINIC: ClinicData = {
  nome_fantasia: "Clínica FisioOS",
  razao_social: "FisioOS Saúde Integrada LTDA",
  cnpj: "12.345.678/0001-90",
  telefones: ["(11) 3333-4444", "(11) 99999-8888"],
  emails: ["contato@fisioos.app"],
  endereco: "Av. Paulista, 1500, sala 1207",
  cidade: "São Paulo",
  estado: "SP",
  rodape_institucional: null,
};

const PROFESSIONAL: Professional = {
  nome: "Dra. Renata Oliveira Campos",
  profissao: "Fisioterapeuta",
  conselho: "CREFITO-3",
  registro: "123456-F",
};

const HASH = "a1b2c3d4e5f6a1b2c3d4e5f67890abcdef0123456789abcdef01";

// Bloco utilitário
const para = (text: string, label?: string) =>
  ({ kind: "paragraph" as const, ...(label ? { label } : {}), text });

const grid = (rows: Array<[string, string]>, columns: 1 | 2 = 2) =>
  ({ kind: "grid" as const, rows, columns });

const highlight = (label: string, text: string) =>
  ({ kind: "highlight" as const, label, text });

// ---------- 1. Contrato (paciente como contratante) ----------

const contractClauses: PdfBlock[] = [
  {
    title: "Qualificação das Partes",
    children: [
      para(
        "CONTRATANTE: Maria Aparecida da Silva, brasileira, portadora do CPF nº 123.456.789-00 e do RG nº 12.345.678-9, residente e domiciliada em Rua das Acácias, 220, Vila Mariana, São Paulo/SP, telefone (11) 98765-4321, doravante denominada simplesmente CONTRATANTE (vínculo com o paciente: Próprio paciente).\n\n" +
        "CONTRATADA: FisioOS Saúde Integrada LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 12.345.678/0001-90, com sede em Av. Paulista, 1500, sala 1207, São Paulo/SP, neste ato representada por sua responsável técnica Dra. Renata Oliveira Campos, inscrita no CREFITO-3 123456-F, doravante denominada simplesmente CONTRATADA.\n\n" +
        "PACIENTE BENEFICIÁRIO DOS SERVIÇOS: Maria Aparecida da Silva, CPF 123.456.789-00, diagnóstico/atendimento conforme avaliação fisioterapêutica registrada em prontuário pela CONTRATADA.\n\n" +
        "As partes acima identificadas têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços Fisioterapêuticos, que se regerá pelas cláusulas seguintes.",
      ),
    ],
  },
  {
    title: "Cláusula Primeira – Do Objeto",
    children: [
      para(
        "O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços fisioterapêuticos especializados ao PACIENTE BENEFICIÁRIO, compreendendo avaliação, reavaliação, elaboração de plano terapêutico, execução de condutas e emissão de documentação clínica, em conformidade com o Código de Ética e Deontologia da Fisioterapia (Resolução COFFITO nº 424/2013) e demais normativas aplicáveis.\n\nDiagnóstico clínico de referência: M54.5 — Dor lombar baixa.\nDiagnóstico fisioterapêutico: Disfunção musculoesquelética em região lombar com déficit funcional moderado.\nObjetivos terapêuticos: redução da dor (EVA), restauração de amplitude de movimento e retorno seguro às atividades de vida diária.\nCondutas previstas: terapia manual, cinesioterapia segmentar, exercícios de estabilização e educação em dor.",
      ),
    ],
  },
  {
    title: "Cláusula Segunda – Da Vigência e Sessões",
    children: [
      para(
        "O presente contrato vigorará a partir desta data, por prazo indeterminado, podendo ser denunciado por qualquer das partes mediante comunicação escrita com antecedência mínima de 7 (sete) dias, sem ônus, ressalvadas as sessões já realizadas.\n\nAs sessões serão agendadas previamente, conforme disponibilidade da CONTRATADA e necessidade clínica do PACIENTE, com duração e frequência definidas no plano terapêutico. Sessões desmarcadas com antecedência inferior a 12 (doze) horas poderão ser cobradas integralmente, a critério da CONTRATADA.",
      ),
    ],
  },
  {
    title: "Cláusula Terceira – Dos Valores e Forma de Pagamento",
    children: [
      para(
        "O valor de cada sessão e os pacotes terapêuticos serão informados em tabela vigente da CONTRATADA, devendo o pagamento ser realizado preferencialmente de forma antecipada ou imediatamente após cada atendimento, por meio de dinheiro, cartão de débito/crédito, PIX ou transferência bancária.\n\nNo caso de pacotes pré-pagos, eventual interrupção do tratamento por iniciativa do CONTRATANTE ensejará reembolso proporcional às sessões não realizadas, descontadas eventuais taxas administrativas. A inadimplência superior a 30 (trinta) dias autoriza a suspensão dos atendimentos até regularização, sem prejuízo da cobrança extrajudicial ou judicial dos valores devidos, acrescidos de correção monetária pelo IPCA, juros de mora de 1% ao mês e multa de 2%.",
      ),
    ],
  },
  {
    title: "Cláusula Quarta – Das Obrigações da CONTRATADA",
    children: [
      para(
        "Constituem obrigações da CONTRATADA: (i) prestar atendimento técnico, ético e seguro, conforme as melhores evidências científicas e as normativas do COFFITO; (ii) manter sigilo profissional sobre todas as informações do PACIENTE, observada a Lei Geral de Proteção de Dados (Lei nº 13.709/2018); (iii) registrar adequadamente todas as condutas em prontuário; (iv) emitir recibos, declarações e relatórios sempre que solicitado; (v) zelar pela higiene, segurança e adequação dos equipamentos e ambiente terapêutico; (vi) comunicar tempestivamente quaisquer eventos adversos ou intercorrências.",
      ),
    ],
  },
  {
    title: "Cláusula Quinta – Das Obrigações do CONTRATANTE",
    children: [
      para(
        "Constituem obrigações do CONTRATANTE: (i) comparecer pontualmente às sessões agendadas; (ii) seguir as orientações terapêuticas e exercícios domiciliares; (iii) fornecer informações completas e verdadeiras sobre estado de saúde, medicações e histórico clínico; (iv) comunicar imediatamente qualquer alteração clínica, agravamento de sintomas ou reação adversa; (v) efetuar os pagamentos nas condições pactuadas; (vi) respeitar os profissionais e demais usuários da CONTRATADA.",
      ),
    ],
  },
  {
    title: "Cláusula Sexta – Da Proteção de Dados (LGPD)",
    children: [
      para(
        "A CONTRATADA, na qualidade de Controladora dos dados pessoais e sensíveis do PACIENTE, tratará tais dados exclusivamente para finalidades de assistência à saúde, faturamento, comunicação clínica e cumprimento de obrigações legais, com base nos artigos 7º e 11 da LGPD.\n\nO titular poderá exercer, a qualquer tempo, os direitos previstos no art. 18 da LGPD, mediante solicitação por escrito. Os dados serão mantidos pelo prazo mínimo de 20 (vinte) anos, conforme exigência do COFFITO para guarda de prontuários.",
      ),
    ],
  },
  {
    title: "Cláusula Sétima – Da Rescisão",
    children: [
      para(
        "O presente contrato poderá ser rescindido: (i) por mútuo acordo entre as partes; (ii) por denúncia unilateral, mediante aviso prévio de 7 (sete) dias; (iii) por descumprimento de qualquer cláusula contratual; (iv) por alta fisioterapêutica formal; (v) por motivo de força maior devidamente comprovado.\n\nA rescisão não exime as partes do cumprimento das obrigações pendentes até a data efetiva do encerramento.",
      ),
    ],
  },
  {
    title: "Cláusula Oitava – Do Foro",
    children: [
      para(
        "As partes elegem o foro da Comarca de São Paulo/SP como competente para dirimir quaisquer controvérsias decorrentes do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.\n\nE, por estarem assim justas e contratadas, firmam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo, para que produza seus jurídicos e legais efeitos.",
      ),
    ],
  },
];

const contractBase: BuildPdfOpts = {
  title: "Contrato de Prestação de Serviços Fisioterapêuticos",
  subtitle: `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
  patientName: "Maria Aparecida da Silva",
  professional: PROFESSIONAL,
  blocks: contractClauses,
  validationHash: HASH,
  validationUrlBase: "https://fisioos.app",
};

const contractPaciente: BuildPdfOpts = {
  ...contractBase,
  contratante: {
    nome: "Maria Aparecida da Silva",
    cpf: "123.456.789-00",
    vinculo: "Próprio paciente",
  },
  patientSnapshot: { nome: "Maria Aparecida da Silva", cpf: "123.456.789-00" },
};

const contractResponsavel: BuildPdfOpts = {
  ...contractBase,
  title: "Contrato de Prestação de Serviços Fisioterapêuticos",
  contratante: {
    nome: "João Carlos da Silva",
    cpf: "987.654.321-00",
    vinculo: "Filho — responsável financeiro",
  },
  patientSnapshot: { nome: "Maria Aparecida da Silva", cpf: "123.456.789-00" },
};

// ---------- 2. Relatório Funcional ----------

const relatorioFuncional: BuildPdfOpts = {
  title: "Relatório Funcional Fisioterapêutico",
  subtitle: `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
  patientName: "Maria Aparecida da Silva",
  professional: PROFESSIONAL,
  validationHash: HASH,
  blocks: [
    {
      title: "Identificação",
      children: [
        grid([
          ["Paciente", "Maria Aparecida da Silva"],
          ["Idade", "62 anos"],
          ["CPF", "123.456.789-00"],
          ["Data de nascimento", "12/03/1963"],
          ["CID Principal", "M54.5 — Dor lombar baixa"],
          ["CID Secundário", ""],
        ]),
      ],
    },
    {
      title: "Quadro Clínico",
      children: [
        para(
          "Paciente refere dor lombar crônica há aproximadamente 6 meses, com irradiação ocasional para membro inferior direito. EVA inicial 7/10, com piora ao final do dia e após permanência prolongada em ortostatismo. Histórico de hipertensão controlada e cirurgia abdominal prévia (2018).",
          "História clínica",
        ),
        highlight("Diagnóstico fisioterapêutico", "Disfunção musculoesquelética em região lombar com déficit funcional moderado, padrão crônico de dor, com comprometimento de flexibilidade e estabilidade segmentar."),
      ],
    },
    {
      title: "Avaliação Funcional",
      children: [
        { kind: "eva", value: 7 },
        grid([
          ["Barthel", "85 (independência moderada)"],
          ["Tinetti", "22 (risco moderado de queda)"],
          ["TUG", "14 segundos"],
          ["Berg", "48"],
        ]),
      ],
    },
    {
      title: "Objetivos e Condutas",
      children: [
        para(
          "Reduzir dor (EVA ≤ 3), restaurar amplitude de movimento lombar, ganhar estabilidade segmentar profunda e devolver autonomia para AVDs e atividades laborais leves em 8-10 semanas.",
          "Objetivos terapêuticos",
        ),
        para(
          "Terapia manual articular e miofascial; cinesioterapia de estabilização (controle motor) progredindo para fortalecimento global; educação em neurociência da dor; programa domiciliar de auto-manejo.",
          "Condutas",
        ),
      ],
    },
    {
      title: "Conclusão e Prognóstico",
      children: [
        para(
          "Paciente apresenta evolução favorável às condutas propostas e bom engajamento. Prognóstico funcional bom em médio prazo. Recomenda-se manutenção do programa terapêutico por mais 10 sessões e reavaliação ao término.",
        ),
      ],
    },
  ],
};

// ---------- 3. Alta ----------

const alta: BuildPdfOpts = {
  title: "Relatório de Alta Fisioterapêutica",
  subtitle: `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
  patientName: "Carlos Eduardo Mendes",
  professional: PROFESSIONAL,
  validationHash: HASH,
  blocks: [
    {
      title: "Identificação do Paciente",
      children: [
        grid([
          ["Paciente", "Carlos Eduardo Mendes"],
          ["Idade", "48 anos"],
          ["CPF", "111.222.333-44"],
          ["Data de início", "10/02/2026"],
          ["Data de alta", "21/06/2026"],
          ["Total de sessões", "32"],
        ]),
      ],
    },
    {
      title: "Motivo da Alta",
      children: [
        para("Alta por objetivos terapêuticos plenamente alcançados, com restauração completa da função e ausência de queixa álgica nos últimos 30 dias."),
      ],
    },
    {
      title: "Objetivos Alcançados",
      children: [
        para("Restauração de amplitude de movimento de ombro direito (>170° flexão); ausência de dor (EVA 0/10); retorno seguro às atividades laborais e esportivas."),
      ],
    },
    {
      title: "Recomendações Pós-Alta",
      children: [
        para(
          "Manutenção de programa domiciliar de fortalecimento e mobilidade (3x/semana, 30 min); reavaliação em 90 dias; retorno imediato à clínica em caso de recidiva ou nova queixa funcional.",
        ),
      ],
    },
  ],
};

// ---------- 4. Parecer Pericial ----------

const parecer: BuildPdfOpts = {
  title: "Parecer Técnico Pericial",
  subtitle: `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
  patientName: "Ana Lúcia Ferreira",
  professional: PROFESSIONAL,
  validationHash: HASH,
  blocks: [
    {
      title: "Qualificação",
      children: [
        grid([
          ["Periciado", "Ana Lúcia Ferreira"],
          ["Idade", "54 anos"],
          ["Processo nº", "0001234-56.2026.8.26.0100"],
          ["Vara", "3ª Vara Cível de São Paulo/SP"],
        ]),
      ],
    },
    {
      title: "Quesitos e Análise",
      children: [
        para(
          "1) A periciada apresenta limitação funcional decorrente do evento descrito nos autos?\n\nResposta: Sim. A avaliação fisioterapêutica detalhada evidencia restrição funcional de membro superior direito, com perda de força muscular grau 3 (MRC), restrição de amplitude de movimento de ombro e padrão álgico crônico (EVA 6/10).\n\n2) A limitação é compatível com o nexo causal alegado?\n\nResposta: Sim, há compatibilidade clínica entre o quadro funcional e o mecanismo de lesão relatado, conforme exames complementares e evolução documentada em prontuário.",
        ),
      ],
    },
    {
      title: "Conclusão Técnica",
      children: [
        highlight(
          "Parecer",
          "Diante do exposto, conclui-se pela existência de comprometimento funcional permanente parcial, com repercussão direta sobre as atividades laborais habituais, sendo recomendável reabilitação fisioterapêutica continuada e adaptações ergonômicas no ambiente de trabalho.",
        ),
      ],
    },
  ],
};

// ---------- 5. Relatório INSS ----------

const inss: BuildPdfOpts = {
  title: "Relatório Fisioterapêutico para o INSS",
  subtitle: `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
  patientName: "Roberto Almeida Souza",
  professional: PROFESSIONAL,
  validationHash: HASH,
  blocks: [
    {
      title: "Identificação do Segurado",
      children: [
        grid([
          ["Nome", "Roberto Almeida Souza"],
          ["CPF", "222.333.444-55"],
          ["NIT/PIS", "120.45678.90-1"],
          ["Idade", "57 anos"],
          ["Profissão", "Motorista de caminhão"],
          ["CID", "M51.1 — Transtorno de disco lombar com radiculopatia"],
        ]),
      ],
    },
    {
      title: "Quadro Clínico-Funcional",
      children: [
        para(
          "Segurado apresenta lombociatalgia crônica à direita, com déficit motor em flexão dorsal de tornozelo (MRC grau 4-), parestesia em dermátomo L5 e restrição importante para flexão de tronco. Quadro refratário ao tratamento conservador, com 18 sessões realizadas. EVA mantida em 6-7/10 mesmo com terapêutica.",
        ),
        { kind: "eva", value: 7 },
      ],
    },
    {
      title: "Repercussão Laboral",
      children: [
        para(
          "A função habitual de motorista de caminhão envolve permanência prolongada em postura sentada, vibração corporal total e manuseio eventual de cargas. O quadro atual é incompatível com tais demandas, justificando afastamento previdenciário para continuidade do tratamento.",
        ),
      ],
    },
    {
      title: "Conclusão",
      children: [
        highlight(
          "Recomendação técnica",
          "Recomenda-se manutenção do afastamento laboral por mais 90 dias, com reavaliação fisioterapêutica ao final do período e reorientação ocupacional caso persistam as limitações funcionais.",
        ),
      ],
    },
  ],
};

// ---------- 6. TCLE / LGPD ----------

const tcleLgpd: BuildPdfOpts = {
  title: "Termo de Consentimento Livre e Esclarecido (LGPD)",
  subtitle: `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
  patientName: "Beatriz Carvalho Lima",
  professional: PROFESSIONAL,
  validationHash: HASH,
  blocks: [
    {
      title: "Identificação",
      children: [
        grid([
          ["Titular dos dados", "Beatriz Carvalho Lima"],
          ["CPF", "333.444.555-66"],
          ["Controlador", "FisioOS Saúde Integrada LTDA"],
          ["CNPJ", "12.345.678/0001-90"],
        ]),
      ],
    },
    {
      title: "Finalidade do Tratamento",
      children: [
        para(
          "Os dados pessoais e sensíveis (incluindo dados de saúde) serão tratados para: prestação de serviços fisioterapêuticos; emissão de relatórios e documentos clínicos; cobrança e gestão financeira; cumprimento de obrigações legais e regulatórias; comunicação direta com o titular.",
        ),
      ],
    },
    {
      title: "Compartilhamento",
      children: [
        para(
          "Os dados poderão ser compartilhados com: (i) profissionais da equipe assistencial; (ii) operadoras de plano de saúde, quando aplicável; (iii) órgãos públicos e médicos assistentes mediante autorização expressa; (iv) prestadores de serviço sob obrigação de confidencialidade.",
        ),
      ],
    },
    {
      title: "Direitos do Titular",
      children: [
        para(
          "O titular tem ciência dos direitos previstos no art. 18 da LGPD, incluindo acesso, correção, anonimização, portabilidade e eliminação dos dados, e da possibilidade de revogar este consentimento a qualquer momento, mediante solicitação por escrito.",
        ),
      ],
    },
    {
      title: "Consentimento",
      children: [
        highlight(
          "Declaração",
          "Declaro estar ciente e consinto livremente com o tratamento e compartilhamento dos meus dados conforme acima descrito.",
        ),
      ],
    },
  ],
};

// Clínica sem dados — fixture extra para testar white-label fallback (monograma).
const CLINIC_EMPTY: ClinicData = {
  nome_fantasia: null,
  razao_social: null,
  cnpj: null,
  telefones: null,
  emails: null,
  endereco: null,
  cidade: null,
  estado: null,
  rodape_institucional: null,
};

const fixtures: Array<{ name: string; opts: BuildPdfOpts; clinic: ClinicData }> = [
  { name: "01-contrato-paciente",       opts: contractPaciente,    clinic: CLINIC },
  { name: "02-contrato-responsavel",    opts: contractResponsavel, clinic: CLINIC },
  { name: "03-relatorio-funcional",     opts: relatorioFuncional,  clinic: CLINIC },
  { name: "04-alta-fisioterapeutica",   opts: alta,                clinic: CLINIC },
  { name: "05-parecer-pericial",        opts: parecer,             clinic: CLINIC },
  { name: "06-relatorio-inss",          opts: inss,                clinic: CLINIC },
  { name: "07-tcle-lgpd",               opts: tcleLgpd,            clinic: CLINIC },
  { name: "08-whitelabel-clinic-vazia", opts: relatorioFuncional,  clinic: CLINIC_EMPTY },
];

async function main() {
  for (const f of fixtures) {
    const doc = await renderPdf(f.opts, { clinic: f.clinic, logo: null });
    const ab = doc.output("arraybuffer") as ArrayBuffer;
    const file = resolve(OUT, `${f.name}.pdf`);
    writeFileSync(file, Buffer.from(ab));
    // eslint-disable-next-line no-console
    console.log(`[ok] ${file}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
