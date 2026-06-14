import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "./format";

type ClinicSettings = {
  nome_fantasia: string | null;
  razao_social: string | null;
  cnpj: string | null;
  telefones: string[] | null;
  emails: string[] | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  rodape_institucional: string | null;
};

type Professional = {
  nome: string;
  profissao: string;
  conselho: string | null;
  registro: string | null;
};

export type PdfSection = { title: string; body: string };

export async function generatePdf(opts: {
  title: string;
  patientName?: string;
  sections: PdfSection[];
  professional?: Professional | null;
}) {
  const { data: clinic } = await supabase
    .from("clinic_settings")
    .select("nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional")
    .limit(1)
    .maybeSingle();

  const c = (clinic ?? {}) as ClinicSettings;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;

  // Header
  doc.setFillColor(244, 247, 244);
  doc.rect(0, 0, W, 78, "F");
  doc.setTextColor(60, 80, 60);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(c.nome_fantasia || "Move 60+", M, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const headerLines = [
    c.razao_social,
    c.cnpj ? `CNPJ: ${c.cnpj}` : null,
    c.endereco,
    [c.cidade, c.estado].filter(Boolean).join(" - "),
    [c.telefones?.join(" · "), c.emails?.join(" · ")].filter(Boolean).join("  ·  "),
  ].filter(Boolean) as string[];
  doc.text(headerLines, M, 52);

  // Title
  let y = 110;
  doc.setTextColor(40, 50, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.title, M, y);
  y += 8;
  doc.setDrawColor(169, 182, 162);
  doc.line(M, y, W - M, y);
  y += 18;

  if (opts.patientName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Paciente:", M, y);
    doc.setFont("helvetica", "normal");
    doc.text(opts.patientName, M + 58, y);
    y += 18;
  }

  doc.setFontSize(10);
  for (const s of opts.sections) {
    if (y > H - 110) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 80, 60);
    doc.text(s.title, M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(s.body || "—", W - 2 * M);
    for (const line of lines) {
      if (y > H - 110) { doc.addPage(); y = M; }
      doc.text(line, M, y);
      y += 13;
    }
    y += 10;
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const fy = H - 60;
    doc.setDrawColor(169, 182, 162);
    doc.line(M, fy, W - M, fy);
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    const prof = opts.professional;
    const profLine = prof
      ? `${prof.nome} — ${prof.profissao}${prof.conselho ? ` · ${prof.conselho}` : ""}${prof.registro ? ` ${prof.registro}` : ""}`
      : "";
    doc.text(profLine, M, fy + 14);
    doc.text(`Emitido em ${fmtDateTime(new Date())}`, M, fy + 26);
    doc.text(c.rodape_institucional || "Londrina - PR", M, fy + 38);
    doc.text(`Página ${i} de ${pageCount}`, W - M, fy + 38, { align: "right" });
  }

  doc.save(`${opts.title.replace(/\s+/g, "_")}.pdf`);
}
