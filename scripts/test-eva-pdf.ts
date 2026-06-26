import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderPdf, type BuildPdfOpts, type ClinicData, type Professional } from "../src/lib/pdf-engine";

const outDir = resolve(process.cwd(), "test-output");
mkdirSync(outDir, { recursive: true });

const clinic: ClinicData = {
  nome_fantasia: "Clinica FisioOS",
  razao_social: "FisioOS Saude Integrada LTDA",
  cnpj: "12.345.678/0001-90",
  telefones: ["(11) 3333-4444"],
  emails: ["contato@fisioos.app"],
  endereco: "Av. Paulista, 1500",
  cidade: "Sao Paulo",
  estado: "SP",
  rodape_institucional: null,
};

const professional: Professional = {
  nome: "Dra. Renata Oliveira",
  profissao: "Fisioterapeuta",
  conselho: "CREFITO-3",
  registro: "123456-F",
};

const opts: BuildPdfOpts = {
  title: "Avaliacao Fisioterapeutica",
  subtitle: "Teste EVA PDF",
  patientName: "Paciente Teste",
  professional,
  hideSignature: true,
  blocks: [
    {
      title: "6. Avaliacao da Dor (EVA)",
      children: [{ kind: "eva", value: 6 }],
    },
  ],
};

try {
  const doc = await renderPdf(opts, { clinic, logo: null });
  const outPath = resolve(outDir, "eva-test.pdf");
  writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
  console.log(`PDF gerado com sucesso: ${outPath}`);
  process.exit(0);
} catch (error) {
  console.error("Erro ao gerar PDF de teste:", error);
  process.exit(1);
}
