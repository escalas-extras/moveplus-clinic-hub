import { buildPdf } from "./src/lib/pdf";

async function main() {
  const sections = [];
  for (let i = 1; i <= 8; i++) {
    sections.push({
      title: `Seção ${i}`,
      body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. ".repeat(3),
    });
  }
  const doc = await buildPdf({
    title: "Teste de Assinatura Longo",
    subtitle: "Documento de teste com muito conteúdo",
    patientName: "Paciente Teste",
    professional: {
      nome: "Veronice Antunes das Neves",
      profissao: "Fisioterapeuta",
      conselho: "CREFITO-8",
      registro: "423894-F",
    },
    validationHash: "abc123def456",
    validationUrlBase: "https://example.com",
    sections,
  });
  const buf = doc.output("arraybuffer");
  await Bun.write("/tmp/test-signature-long.pdf", new Uint8Array(buf));
  console.log("PDF gerado em /tmp/test-signature-long.pdf");
}

main().catch(console.error);
