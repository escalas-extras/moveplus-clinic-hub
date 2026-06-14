import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "./format";
import logoAsset from "@/assets/logo.jpg.asset.json";

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

let cachedLogo: string | null | undefined;
async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const res = await fetch(logoAsset.url);
    const blob = await res.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
}

export async function buildPdf(opts: {
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
  doc.rect(0, 0, W, 88, "F");

  const logo = await loadLogoDataUrl();
  if (logo) {
    try { doc.addImage(logo, "JPEG", M, 18, 52, 52); } catch { /* ignore */ }
  }

  const textX = logo ? M + 64 : M;
  doc.setTextColor(60, 80, 60);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(c.nome_fantasia || "Move 60+", textX, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const headerLines = [
    c.razao_social,
    c.cnpj ? `CNPJ: ${c.cnpj}` : null,
    c.endereco,
    [c.cidade, c.estado].filter(Boolean).join(" - "),
    [c.telefones?.join(" · "), c.emails?.join(" · ")].filter(Boolean).join("  ·  "),
  ].filter(Boolean) as string[];
  doc.text(headerLines, textX, 52);

  // Title
  let y = 118;
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
    const isFisio = prof?.profissao?.toLowerCase().includes("fisio");
    const profLine = prof
      ? isFisio
        ? `Fisioterapeuta: ${prof.nome}${prof.registro || prof.conselho ? `  ·  CREFITO: ${prof.registro || prof.conselho}` : ""}`
        : `${prof.profissao}: ${prof.nome}${prof.conselho ? `  ·  ${prof.conselho}` : ""}${prof.registro ? ` ${prof.registro}` : ""}`
      : "";
    doc.text(profLine, M, fy + 14);
    doc.text(`Emitido em ${fmtDateTime(new Date())}`, M, fy + 26);
    doc.text(c.rodape_institucional || "Londrina - PR", M, fy + 38);
    doc.text(`Página ${i} de ${pageCount}`, W - M, fy + 38, { align: "right" });
  }

  return doc;
}

export async function downloadPdf(opts: Parameters<typeof buildPdf>[0]) {
  const doc = await buildPdf(opts);
  doc.save(`${opts.title.replace(/\s+/g, "_")}.pdf`);
}

export async function previewPdf(opts: Parameters<typeof buildPdf>[0]) {
  const doc = await buildPdf(opts);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
}

export async function printPdf(opts: Parameters<typeof buildPdf>[0]) {
  const doc = await buildPdf(opts);
  const url = URL.createObjectURL(doc.output("blob"));
  const w = window.open(url, "_blank");
  if (w) {
    w.addEventListener("load", () => { try { w.print(); } catch { /* noop */ } });
  }
}

// Legacy alias
export const generatePdf = downloadPdf;

type DocFolder = "avaliacoes" | "reavaliacoes" | "evolucoes" | "relatorios" | "recibos" | "declaracoes" | "encaminhamentos" | "termos";
type DocumentType = "avaliacao" | "reavaliacao" | "evolucao" | "relatorio" | "recibo" | "declaracao" | "encaminhamento" | "termo" | "laudo";

export async function uploadAndRegisterPdf(opts: {
  pdfOpts: Parameters<typeof buildPdf>[0];
  folder: DocFolder;
  tipo: DocumentType;
  patientId: string;
  professionalId: string;
  referenciaId: string;
}) {
  const doc = await buildPdf(opts.pdfOpts);
  const blob = doc.output("blob");
  const path = `${opts.folder}/${opts.referenciaId}-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from("documents").upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) throw upErr;
  const { error: insErr } = await supabase.from("documents").insert({
    patient_id: opts.patientId,
    professional_id: opts.professionalId,
    tipo: opts.tipo,
    referencia_id: opts.referenciaId,
    pdf_path: path,
    emitido_em: new Date().toISOString(),
  });
  if (insErr) throw insErr;
  return path;
}
