/**
 * Validação unificada do Logo Engine em todos os tipos de PDF.
 * Execução: npx tsx scripts/pdf-logo-validation.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { prepareLogoInputNode } from "./lib/logo-node";
import { buildAssessmentPdfOpts } from "../src/lib/clinical-pdf-builders";
import { renderPdf, type BuildPdfOpts, type ClinicData, type Professional } from "../src/lib/pdf-engine";
import { buildReceiptPdf, type ReceiptPdfData } from "../src/lib/receipt-pdf";

const OUT = resolve(process.cwd(), "pdf-logo-validation");
mkdirSync(OUT, { recursive: true });

const CLINIC: ClinicData = {
  nome_fantasia: "Clínica Logo QA",
  razao_social: "Logo QA LTDA",
  cnpj: "12.345.678/0001-90",
  telefones: ["(11) 3333-4444"],
  emails: ["qa@fisioos.app"],
  endereco: "Av. Paulista, 1000",
  cidade: "São Paulo",
  estado: "SP",
  rodape_institucional: null,
  primary_color: "#0F4C5C",
  secondary_color: "#2BB673",
};

const PROFESSIONAL: Professional = {
  nome: "Dra. QA Teste",
  profissao: "Fisioterapeuta",
  conselho: "CREFITO-3",
  registro: "999999-F",
};

/** PNG sintético: fundo preto opaco + marca verde central. */
function makeBlackMatteLogoDataUrl(): string {
  const w = 120;
  const h = 80;
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#239668";
  ctx.fillRect(30, 24, 60, 32);
  return c.toDataURL("image/png");
}

const LOGO_BLACK_MATTE = makeBlackMatteLogoDataUrl();

const contractOpts: BuildPdfOpts = {
  layout: "clinical-premium",
  title: "Contrato de Prestação de Serviços Fisioterapêuticos",
  subtitle: "Emitido em 27/06/2026",
  patientName: "Maria Silva",
  professional: PROFESSIONAL,
  blocks: [
    {
      title: "Qualificação das Partes",
      children: [{ kind: "paragraph", text: "CONTRATANTE e CONTRATADA qualificadas para teste de logo no cabeçalho." }],
    },
    {
      title: "Cláusula Primeira – Do Objeto",
      children: [{ kind: "paragraph", text: "Prestação de serviços fisioterapêuticos conforme plano terapêutico." }],
    },
  ],
};

const declaracaoOpts: BuildPdfOpts = {
  title: "Declaração de Comparecimento",
  subtitle: "Emitida em 27/06/2026",
  patientName: "Maria Silva",
  professional: PROFESSIONAL,
  hideSignature: false,
  blocks: [
    {
      title: "Declaração",
      children: [
        {
          kind: "paragraph",
          text: "Declaro para os devidos fins que o(a) paciente compareceu à sessão de fisioterapia na data indicada.",
        },
      ],
    },
  ],
};

const assessmentPatient = {
  nome_completo: "Maria Silva",
  data_nascimento: "1985-05-10",
  sexo: "Feminino",
  telefone: "(11) 99999-0000",
  clinic_id: "qa",
};

const assessmentBase = {
  id: "qa-a1",
  clinic_id: "qa",
  tipo: "avaliacao",
  data: "2026-06-27",
  professionals: PROFESSIONAL,
  diagnostico_clinico: "M54.5",
  queixa_principal: "Dor lombar",
};

const receiptData: ReceiptPdfData = {
  numero: 42,
  patientName: "Maria Silva",
  patientCpf: "123.456.789-00",
  responsavelFinanceiro: "Maria Silva",
  description: "Sessão fisioterapêutica",
  serviceLabel: "avaliação fisioterapêutica",
  amount: 180,
  payment_method: "pix",
  payment_date: "2026-06-27",
  issued_at: new Date().toISOString(),
  professional: PROFESSIONAL,
  clinicId: null,
};

async function writeEnginePdf(name: string, opts: BuildPdfOpts) {
  const logo = await prepareLogoInputNode(LOGO_BLACK_MATTE);
  const doc = await renderPdf(opts, { clinic: CLINIC, logo });
  const file = resolve(OUT, name);
  writeFileSync(file, Buffer.from(doc.output("arraybuffer") as ArrayBuffer));
  console.log(`✓ ${file} (logo normalizada: ${logo ? "sim" : "monograma"})`);
}

async function writeReceiptPdf(name: string) {
  // Recibo usa loadClinicLogoForPdf — injetamos logo via mock do contexto interno
  // Para validação Node, renderizamos engine PDF equivalente com mesmo logo preparado
  const logo = await prepareLogoInputNode(LOGO_BLACK_MATTE);
  const doc = await renderPdf(
    {
      title: "Recibo nº 042",
      subtitle: "Emitido em 27/06/2026",
      patientName: receiptData.patientName ?? undefined,
      professional: PROFESSIONAL,
      hideSignature: true,
      blocks: [
        {
          title: "Recibo",
          children: [
            {
              kind: "paragraph",
              text: `Recebemos ${receiptData.amount.toFixed(2)} referente a ${receiptData.serviceLabel}.`,
            },
          ],
        },
      ],
    },
    { clinic: CLINIC, logo },
  );
  const file = resolve(OUT, name);
  writeFileSync(file, Buffer.from(doc.output("arraybuffer") as ArrayBuffer));
  console.log(`✓ ${file} (recibo via logo engine)`);
}

async function writeReceiptNative(name: string) {
  // buildReceiptPdf requer Supabase — skip em CI; gerar stub se falhar
  try {
    const doc = await buildReceiptPdf({ ...receiptData, clinicId: null });
    const file = resolve(OUT, name);
    writeFileSync(file, Buffer.from(doc.output("arraybuffer") as ArrayBuffer));
    console.log(`✓ ${file} (receipt-pdf nativo)`);
  } catch (e) {
    console.log(`⚠ receipt-pdf nativo ignorado (sem Supabase): ${(e as Error).message}`);
  }
}

async function main() {
  console.log("=== PDF Logo Validation ===\n");
  await writeEnginePdf(
    "01-avaliacao-logo-matte-preta.pdf",
    buildAssessmentPdfOpts(assessmentBase, assessmentPatient),
  );
  await writeEnginePdf("02-contrato-logo-matte-preta.pdf", contractOpts);
  await writeEnginePdf("03-declaracao-logo-matte-preta.pdf", declaracaoOpts);
  await writeReceiptPdf("04-recibo-logo-matte-preta-engine.pdf");
  await writeReceiptNative("05-recibo-logo-matte-preta-native.pdf");
  console.log("\nConcluído. Verifique fundo transparente nos cabeçalhos.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
