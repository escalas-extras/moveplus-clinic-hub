import { buildPdf } from "./src/lib/pdf";

async function main() {
  const doc = await buildPdf({
    title: "Teste de Assinatura",
    subtitle: "Documento de teste",
    patientName: "Paciente Teste",
    professional: {
      nome: "Veronice Antunes das Neves",
      profissao: "Fisioterapeuta",
      conselho: "CREFITO-8",
      registro: "423894-F",
    },
    validationHash: "abc123def456",
    validationUrlBase: "https://example.com",
    sections: [
      { title: "Seção 1", body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(20) },
    ],
  });
  const buf = doc.output("arraybuffer");
  await Bun.write("/tmp/test-signature.pdf", new Uint8Array(buf));
  console.log("PDF gerado em /tmp/test-signature.pdf");
}

main().catch(console.error);
