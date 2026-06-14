import jsPDF from "jspdf";

async function main() {
  const logoUrl = "https://id-preview--941ee4bc-65e5-4706-bddc-a1d1ba9c9ce2.lovable.app/__l5e/assets-v1/ab15923d-1b1b-423e-8565-c4755c0e1a11/logo.jpg";
  const res = await fetch(logoUrl);
  if (!res.ok) throw new Error(`Failed to fetch logo: ${res.status}`);
  const blob = await res.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const logoDataUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const HEADER_H = 165;
  const LOGO_SIZE = 135;

  doc.setFillColor(244, 247, 244);
  doc.rect(0, 0, W, HEADER_H, "F");
  doc.addImage(logoDataUrl, "JPEG", M, 15, LOGO_SIZE, LOGO_SIZE);

  const tx = M + LOGO_SIZE + 14;
  const lines = [
    "FISIOLON E VERONICE ANTUNES LTDA",
    "CNPJ: 2.269.094/0001-56",
    "43988734576  \u00b7  movemais.londrina@gmail.com",
  ];

  const logoCenterY = 15 + LOGO_SIZE / 2;
  const titleH = 18;
  const lineH = 10;
  const titleLineGap = 6;
  const totalH = titleH + titleLineGap + lines.length * lineH;
  const textTopY = logoCenterY - totalH / 2;

  doc.setTextColor(60, 80, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Move 60+", tx, textTopY + titleH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(lines, tx, textTopY + titleH + titleLineGap + lineH);

  // Visual QA guide: red line at vertical center of logo
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(M, logoCenterY, W - M, logoCenterY);

  doc.save("/tmp/test-header.pdf");
  console.log("Saved /tmp/test-header.pdf");
}

main().catch((e) => { console.error(e); process.exit(1); });
