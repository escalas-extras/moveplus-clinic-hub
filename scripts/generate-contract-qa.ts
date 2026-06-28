/**
 * Gera contrato QA com Document Design System FisioOS (fisioos-ds).
 * Execução: npx tsx scripts/generate-contract-qa.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderPdf, type BuildPdfOpts, type ClinicData, type Professional } from "../src/lib/pdf-engine";
import { DS_LAYOUT_ID } from "../src/lib/pdf-engine/design-system";
import { prepareLogoInputNode } from "./lib/logo-node";

const OUT = resolve(process.cwd(), "pdf-qa");
mkdirSync(OUT, { recursive: true });

const CLINIC: ClinicData = {
  nome_fantasia: "MOVE+ Fisioterapia",
  razao_social: "MOVE+ Saúde Integrada LTDA",
  cnpj: "12.345.678/0001-90",
  telefones: ["(11) 3333-4444"],
  emails: ["contato@moveplus.app"],
  endereco: "Av. Paulista, 1000",
  cidade: "São Paulo",
  estado: "SP",
  rodape_institucional: null,
  primary_color: "#0F4C5C",
  secondary_color: "#2BB673",
};

const PROFESSIONAL: Professional = {
  nome: "Dra. Ana Paula Mendes",
  profissao: "Fisioterapeuta",
  conselho: "CREFITO-3",
  registro: "123456-F",
};

const LOGO_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QzwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const contractOpts: BuildPdfOpts = {
  layout: DS_LAYOUT_ID,
  title: "Contrato de Prestação de Serviços Fisioterapêuticos",
  subtitle: "Emitido em 27/06/2026",
  patientName: "Maria Silva",
  professional: PROFESSIONAL,
  validationHash: "a1b2c3d4e5f6789012345678abcdef01",
  validationUrlBase: "https://fisioos.app",
  contratante: {
    nome: "Maria Silva",
    cpf: "123.456.789-00",
    vinculo: "Próprio paciente",
  },
  patientSnapshot: { nome: "Maria Silva", cpf: "123.456.789-00" },
  sections: [
    {
      title: "1. Qualificação das Partes",
      body:
        "CONTRATANTE e CONTRATADA qualificadas conforme dados cadastrais do paciente e da clínica, para fins de prestação de serviços fisioterapêuticos.",
    },
    {
      title: "2. Do Objeto",
      body:
        "O presente contrato tem por objeto a prestação de serviços fisioterapêuticos especializados, compreendendo avaliação, plano terapêutico e sessões conforme indicação clínica.",
    },
    {
      title: "3. Das Obrigações",
      body:
        "A CONTRATADA compromete-se a prestar os serviços com observância das normas éticas e técnicas aplicáveis. O CONTRATANTE compromete-se a fornecer informações verídicas e cumprir orientações terapêuticas.",
    },
  ],
};

async function main() {
  const logo = await prepareLogoInputNode(LOGO_PNG);
  const doc = await renderPdf(contractOpts, { clinic: CLINIC, logo });
  const file = resolve(OUT, "contrato-fisioos-ds-qa.pdf");
  writeFileSync(file, Buffer.from(doc.output("arraybuffer") as ArrayBuffer));
  console.log(`✓ ${file}`);
  console.log(`Layout: ${DS_LAYOUT_ID} | Motor: renderFisioosDsDocument | Logo: drawLogoBox`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
