import type jsPDF from "jspdf";
import type { BuildPdfOpts, ClinicData, PreparedLogo } from "../../types";
import { cleanText, truncateLine, wrapText } from "../../text";
import { computeLogoBoxRect, drawLogoBox } from "../../images";
import type { DocumentTheme } from "../types";

function contactLines(clinic: ClinicData) {
  const tels = Array.isArray(clinic.telefones) ? clinic.telefones.filter(Boolean).join(" · ") : "";
  const emails = Array.isArray(clinic.emails) ? clinic.emails.filter(Boolean).join(" · ") : "";
  const cityState = [cleanText(clinic.cidade), cleanText(clinic.estado)].filter(Boolean).join("/");
  const addr = [cleanText(clinic.endereco), cityState].filter(Boolean).join(" · ");
  return { tels, emails, addr, cnpj: cleanText(clinic.cnpj) };
}

function buildRegistry(prof?: BuildPdfOpts["professional"]): string | null {
  if (!prof) return null;
  const num = cleanText(prof.registro ?? "");
  const council = cleanText(prof.conselho ?? "") || "CREFITO";
  if (!num) return null;
  return `${council} nº ${num}`;
}

function metaField(
  doc: jsPDF,
  theme: DocumentTheme,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
) {
  const { colors: C, type: T } = theme;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.caption);
  doc.setTextColor(...C.muted);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.label);
  doc.setTextColor(...C.ink);
  doc.text(truncateLine(doc, value, w), x, y + 11);
}

export function measureDsHeaderHeight(
  doc: jsPDF,
  theme: DocumentTheme,
  clinic: ClinicData,
  pageW: number,
): number {
  const M = theme.space.margin;
  const cardY = 22;
  const { logo: L } = theme;
  const brandH = Math.max(L.boxH + 16, 112);
  const logoRect = computeLogoBoxRect(M + 8, cardY, brandH, L.boxW, L.boxH, 0);
  const clinicX = logoRect.x + logoRect.w + 16;
  const cardX = pageW - M - 210;
  const clinicW = Math.max(160, cardX - clinicX - 20);
  const { tels, emails, addr, cnpj } = contactLines(clinic);
  const clinicName = cleanText(clinic.nome_fantasia) || cleanText(clinic.razao_social) || "FisioOS";
  const specialty = cleanText(clinic.rodape_institucional)?.split("·")[0]?.trim() || "Fisioterapia integrada";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(theme.type.docTitle + 6);
  const nameLines = wrapText(doc, clinicName, clinicW).slice(0, 2);

  let textH = 22 + nameLines.length * 14 + 13;
  if (cnpj) textH += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(theme.type.caption);
  for (const line of [addr, tels, emails].filter(Boolean).slice(0, 3)) {
    textH += Math.max(1, wrapText(doc, line, clinicW).length) * 11;
  }

  const cardH = Math.max(brandH, textH + 12);
  const docCardBottom = cardY + 4 + Math.max(96, cardH - 8) + 12;
  const contentBottom = cardY + cardH + 16;
  return Math.max(theme.space.headerH, contentBottom, docCardBottom, logoRect.y + logoRect.h + 20);
}

/** Header Premium — clínica (esq.) + card documento (dir.). */
export function drawDsHeader(
  doc: jsPDF,
  theme: DocumentTheme,
  clinic: ClinicData,
  opts: BuildPdfOpts,
  logo: PreparedLogo | null,
  pageW: number,
): number {
  const M = theme.space.margin;
  const { colors: C, type: T, logo: L } = theme;
  const headerH = measureDsHeaderHeight(doc, theme, clinic, pageW);
  const cardY = 22;
  const brandH = Math.max(L.boxH + 16, headerH - 36);

  doc.setFillColor(...C.paper);
  doc.rect(0, 0, pageW, headerH, "F");

  doc.setFillColor(...C.primary);
  doc.rect(0, 0, 5, headerH, "F");

  const logoRect = computeLogoBoxRect(M + 8, cardY, brandH, L.boxW, L.boxH, 0);
  drawLogoBox(doc, clinic, logo, logoRect);

  const clinicX = logoRect.x + logoRect.w + 16;
  const cardX = pageW - M - 210;
  const clinicW = Math.max(160, cardX - clinicX - 20);
  const { tels, emails, addr, cnpj } = contactLines(clinic);
  const clinicName = cleanText(clinic.nome_fantasia) || cleanText(clinic.razao_social) || "FisioOS";
  const specialty = cleanText(clinic.rodape_institucional)?.split("·")[0]?.trim() || "Fisioterapia integrada";

  let cy = cardY + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.docTitle + 6);
  doc.setTextColor(...C.primary);
  const nameLines = wrapText(doc, clinicName, clinicW).slice(0, 2);
  doc.text(nameLines, clinicX, cy);
  cy += nameLines.length * 14 + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.body);
  doc.setTextColor(...C.muted);
  doc.text(truncateLine(doc, specialty, clinicW), clinicX, cy);
  cy += 13;

  if (cnpj) {
    doc.setFillColor(...C.surfaceAlt);
    doc.roundedRect(clinicX, cy - 7, Math.min(130, clinicW), 14, 4, 4, "F");
    doc.setFontSize(T.caption);
    doc.setTextColor(...C.primary);
    doc.text(`CNPJ ${cnpj}`, clinicX + 6, cy + 2);
    cy += 16;
  }

  const lines = [addr, tels, emails].filter(Boolean) as string[];
  doc.setFontSize(T.caption);
  doc.setTextColor(...C.muted);
  for (const line of lines.slice(0, 3)) {
    const wrapped = wrapText(doc, line, clinicW);
    doc.text(wrapped, clinicX, cy);
    cy += Math.max(1, wrapped.length) * 11;
  }

  const cardW = 210;
  const cardH = Math.max(96, headerH - 36);
  doc.setFillColor(...C.surface);
  doc.setDrawColor(...C.borderSoft);
  doc.setLineWidth(0.6);
  doc.roundedRect(cardX, cardY + 4, cardW, cardH, 12, 12, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.docTitle + 2);
  doc.setTextColor(...C.ink);
  const titleLines = wrapText(doc, opts.title, cardW - 28).slice(0, 2);
  doc.text(titleLines, cardX + 14, cardY + 24);

  const profNome = cleanText(opts.professional?.nome ?? "") || "—";
  const profReg = buildRegistry(opts.professional) ?? "—";
  const issued =
    cleanText(opts.subtitle)?.replace(/^Emitid[ao] em\s+/i, "") ||
    new Date().toLocaleDateString("pt-BR");
  const docNum = opts.validationHash ? `#${opts.validationHash.slice(0, 8).toUpperCase()}` : "—";
  const metaY = cardY + 28 + titleLines.length * 13;

  metaField(doc, theme, "Paciente", opts.patientName || "—", cardX + 14, metaY, 88);
  metaField(doc, theme, "Emissão", issued, cardX + 108, metaY, 88);
  metaField(doc, theme, "Profissional", profNome, cardX + 14, metaY + 28, 88);
  metaField(doc, theme, "Registro", profReg, cardX + 108, metaY + 28, 88);
  metaField(doc, theme, "Documento", "Contrato", cardX + 14, metaY + 56, 88);
  metaField(doc, theme, "Número", docNum, cardX + 108, metaY + 56, 88);

  doc.setFillColor(...C.primary);
  doc.roundedRect(cardX + cardW - 72, cardY + cardH - 22, 58, 16, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.caption);
  doc.setTextColor(255, 255, 255);
  doc.text("VIGENTE", cardX + cardW - 43, cardY + cardH - 11, { align: "center" });

  const ruleY = headerH - 8;
  doc.setDrawColor(...C.primary);
  doc.setLineWidth(1);
  doc.line(M, ruleY, pageW - M, ruleY);
  doc.setDrawColor(...C.borderSoft);
  doc.setLineWidth(0.4);
  doc.line(M, ruleY + 2, pageW - M, ruleY + 2);

  return headerH;
}

/** Cabeçalho compacto páginas 2+. */
export function drawDsRunningHeader(
  doc: jsPDF,
  theme: DocumentTheme,
  clinic: ClinicData,
  opts: BuildPdfOpts,
  pageW: number,
) {
  const M = theme.space.margin;
  const { colors: C, type: T } = theme;
  const bandH = 38;
  doc.setFillColor(...C.paper);
  doc.rect(0, 0, pageW, bandH, "F");
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, 4, bandH, "F");

  const name = cleanText(clinic.nome_fantasia) || "FisioOS";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.label);
  doc.setTextColor(...C.primary);
  doc.text(truncateLine(doc, name, pageW - 2 * M - 60), M + 8, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.caption);
  doc.setTextColor(...C.muted);
  doc.text(truncateLine(doc, `${opts.title} · ${opts.patientName || ""}`, pageW - 2 * M - 60), M + 8, 26);

  doc.setDrawColor(...C.borderSoft);
  doc.line(M, bandH - 3, pageW - M, bandH - 3);
  return bandH;
}
