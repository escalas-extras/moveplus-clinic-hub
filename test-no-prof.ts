import { buildPdf } from "./src/lib/pdf";

async function main() {
  const doc = await buildPdf({
    title: "Teste Sem Registro",
    subtitle: "Documento de teste sem registro do profissional",
    patientName: "Paciente Teste",
    professional: null,
    validationHash: "abc123def456",
    validationUrlBase: "https://example.com",
    sections: [
      { title: "Seção 1", body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(20) },
    ],
  });
  const buf = doc.output("arraybuffer");
  await Bun.write("/tmp/test-no-prof.pdf", new Uint8Array(buf));
  console.log("PDF gerado em /tmp/test-no-prof.pdf");
}

main().catch(console.error);
