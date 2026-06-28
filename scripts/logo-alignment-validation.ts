/**
 * Valida alinhamento/dimensionamento da logo em PDFs (formatos variados).
 * Execução: npx tsx scripts/logo-alignment-validation.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { buildAssessmentPdfOpts } from "../src/lib/clinical-pdf-builders";
import { renderPdf, type BuildPdfOpts, type ClinicData, type Professional } from "../src/lib/pdf-engine";
import { prepareLogoInputNode } from "./lib/logo-node";

const OUT = resolve(process.cwd(), "pdf-logo-alignment");
mkdirSync(OUT, { recursive: true });

const CLINIC: ClinicData = {
  nome_fantasia: "Clínica Alinhamento QA",
  razao_social: "Alinhamento QA LTDA",
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
  nome: "Dra. QA",
  profissao: "Fisioterapeuta",
  conselho: "CREFITO-3",
  registro: "999999-F",
};

function makeLogo(w: number, h: number, fill: string): string {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#239668";
  const mw = Math.round(w * 0.5);
  const mh = Math.round(h * 0.4);
  ctx.fillRect(Math.round((w - mw) / 2), Math.round((h - mh) / 2), mw, mh);
  return c.toDataURL("image/png");
}

const LOGOS = {
  square: makeLogo(80, 80, "#111"),
  horizontal: makeLogo(160, 48, "#111"),
  vertical: makeLogo(48, 160, "#111"),
  pngTransparent:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  jpg: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAD8AV/QP/9k=",
};

const contractOpts: BuildPdfOpts = {
  layout: "clinical-premium",
  title: "Contrato de Prestação de Serviços",
  subtitle: "Emitido em 27/06/2026",
  patientName: "Maria Silva",
  professional: PROFESSIONAL,
  blocks: [{ title: "Objeto", children: [{ kind: "paragraph", text: "Teste de alinhamento da logo no cabeçalho legacy." }] }],
};

const assessmentOpts = buildAssessmentPdfOpts(
  {
    id: "qa",
    clinic_id: "qa",
    tipo: "avaliacao",
    data: "2026-06-27",
    professionals: PROFESSIONAL,
    queixa_principal: "Dor lombar",
  },
  { nome_completo: "Maria Silva", data_nascimento: "1985-01-01", sexo: "F", telefone: "", clinic_id: "qa" },
);

async function writePdf(name: string, opts: BuildPdfOpts, logoData: string) {
  const logo = await prepareLogoInputNode(logoData);
  const doc = await renderPdf(opts, { clinic: CLINIC, logo });
  writeFileSync(resolve(OUT, name), Buffer.from(doc.output("arraybuffer") as ArrayBuffer));
  console.log(`✓ ${name} (logo: ${logo ? "ok" : "monograma"})`);
}

async function main() {
  console.log("=== Logo alignment PDF validation ===\n");
  for (const [shape, data] of Object.entries(LOGOS)) {
    await writePdf(`contrato-${shape}.pdf`, contractOpts, data);
    await writePdf(`avaliacao-${shape}.pdf`, { ...assessmentOpts, layout: "clinical-premium" }, data);
  }
  console.log("\nConcluído:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
