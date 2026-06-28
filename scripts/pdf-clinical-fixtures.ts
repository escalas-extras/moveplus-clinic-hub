// scripts/pdf-clinical-fixtures.ts — QA Sprint 8B.1
// Execução: npx tsx scripts/pdf-clinical-fixtures.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildAssessmentPdfOpts,
  buildDischargePdfOpts,
  buildEvolutionPdfOpts,
  buildReassessmentPdfOpts,
} from "../src/lib/clinical-pdf-builders";
import { renderPdf, type ClinicData, type Professional } from "../src/lib/pdf-engine";
import { prepareLogoInputNode } from "./lib/logo-node";

const OUT = resolve(process.cwd(), "pdf-clinical-fixtures");
mkdirSync(OUT, { recursive: true });

const CLINIC: ClinicData = {
  nome_fantasia: "Clínica FisioOS Premium",
  razao_social: "FisioOS Saúde Integrada LTDA",
  cnpj: "12.345.678/0001-90",
  telefones: ["(11) 3333-4444"],
  emails: ["contato@fisioos.app"],
  endereco: "Av. Paulista, 1500",
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

const PATIENT = {
  nome_completo: "Maria Aparecida Silva",
  data_nascimento: "1978-03-15",
  sexo: "Feminino",
  telefone: "(11) 98765-4321",
  profissao: "Professora",
  naturalidade: "Campinas/SP",
  clinic_id: "clinic-1",
};

const HASH = "a1b2c3d4e5f6a1b2c3d4e5f67890abcdef0123456789abcdef01";

const LOGO_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const longText = (base: string) => `${base} `.repeat(40) + "Palavraextremamentegrandedetestequeprecisaserquebrada.";

const assessmentBase = {
  id: "a1",
  clinic_id: "clinic-1",
  tipo: "avaliacao",
  data: "2026-01-10",
  validation_hash: HASH,
  professionals: PROFESSIONAL,
  diagnostico_clinico: "M54.5 — Dor lombar",
  diagnostico_fisio: longText("Disfunção musculoesquelética lombar"),
  queixa_principal: longText("Dor lombar há 3 meses"),
  hma: longText("Início após esforço repetitivo"),
  hmp: "—",
  historia_clinica: "—",
  habitos_vida: "Sedentária",
  antecedentes_pessoais: "HAS controlada",
  antecedentes_familiares: "—",
  tratamentos_realizados: "Analgésicos",
  apresentacao: ["Deambulando"],
  inspecao_flags: ["Edema"],
  tem_exames: true,
  exames_complementares: "RM lombar",
  usa_medicamentos: true,
  medicamentos: "Losartana",
  teve_cirurgias: false,
  palpacao: "Contratura paravertebral",
  testes_especificos: "SLR positivo à esquerda",
  eva: 7,
  objetivos: longText("Reduzir dor e restaurar ADM"),
  condutas: longText("Terapia manual e estabilização"),
  recursos_terapeuticos: "TENS, exercícios",
  rom_goniometry: [{ articulacao: "Quadril", movimento: "Flexão", valor: 90 }],
  strength_mrc: [{ musculo: "Quadríceps", grade: 4 }],
  scales_results: [{ scale_code: "Berg", total_score: 42, classification: "Risco moderado" }],
};

const reavaliacao = {
  ...assessmentBase,
  id: "a2",
  tipo: "reavaliacao",
  data: "2026-06-20",
  eva: 3,
  queixa_principal: "Dor residual leve",
  testes_especificos: "SLR negativo",
};

const evolution = {
  id: "e1",
  clinic_id: "clinic-1",
  data: "2026-03-01",
  hora: "10:30",
  sessao_numero: 12,
  validation_hash: HASH,
  professionals: PROFESSIONAL,
  eva: 4,
  procedimentos: "Liberação miofascial\n\nExercícios:\nPonte glútea 3x12",
  conduta: "Manter frequência 2x/semana\n\nRecursos terapêuticos:\nTENS 15min",
  resposta_paciente: longText("Relata melhora parcial"),
  evolucao_observada: longText("ADM em flexão melhorou"),
  intercorrencias: "Nenhuma",
  proximos_objetivos: "Fortalecimento de core",
  observacoes_gerais: longText("Orientada sobre ergonomia"),
  sinais_vitais: {
    pa: "120/80",
    fc: "72",
    indicador_evolucao: "melhorou",
    soap: {
      s: "Paciente relata dor 4/10",
      o: "ADM flexão 80°",
      a: "Evolução favorável",
      p: "Progressão de carga",
    },
  },
};

const discharge = {
  id: "d1",
  data_alta: "2026-06-25",
  motivo: "Objetivos terapêuticos alcançados",
  validation_hash: HASH,
  professionals: PROFESSIONAL,
  objetivos_alcancados: longText("EVA reduzida, retorno às AVDs"),
  objetivos_pendentes: "Manutenção domiciliar",
  recomendacoes: longText("Evitar sobrecarga lombar"),
  plano_domiciliar: longText("Exercícios de estabilização 3x/semana"),
  observacoes: longText("12 sessões em 168 dias. EVA 7→3."),
};

async function write(name: string, opts: Parameters<typeof renderPdf>[0], logo: string | null = null) {
  const prepared = logo != null ? await prepareLogoInputNode(logo) : null;
  const doc = await renderPdf(opts, { clinic: CLINIC, logo: prepared });
  const file = resolve(OUT, `${name}.pdf`);
  writeFileSync(file, Buffer.from(doc.output("arraybuffer") as ArrayBuffer));
  console.log(`✓ ${file}`);
}

async function main() {
  const allAssessments = [assessmentBase, reavaliacao];

  await write("01-avaliacao-longa", buildAssessmentPdfOpts(assessmentBase, PATIENT, [], allAssessments));
  await write("02-evolucao-longa", buildEvolutionPdfOpts(evolution, PATIENT));
  await write("03-reavaliacao-comparativo", buildReassessmentPdfOpts(reavaliacao, PATIENT, allAssessments));
  await write("04-alta-completa", buildDischargePdfOpts(discharge, PATIENT, allAssessments, 12));
  await write("05-sem-logo", buildAssessmentPdfOpts(assessmentBase, PATIENT), null);
  await write(
    "06-logo-png-transparente",
    buildAssessmentPdfOpts(assessmentBase, PATIENT),
    LOGO_PNG,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
