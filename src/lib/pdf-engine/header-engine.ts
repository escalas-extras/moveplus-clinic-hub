import type jsPDF from "jspdf";
import type { BuildPdfOpts, ClinicData, PreparedLogo, Professional } from "./types";
import { PDF_COLORS as C, PDF_LOGO, PDF_SPACING as S, PDF_TYPOGRAPHY as T } from "./tokens";
import { cleanText, truncateLine, wrapText } from "./text";
import { drawLogoOrFallback } from "./images";
import { drawHeaderMeta, drawMiniIcon, type IconKind } from "./icons";

export type HeaderEngineOptions = {
  logo?: string | PreparedLogo | null;
  professional?: Professional | null;
  includeDocumentCard?: boolean;
  includeBottomRule?: boolean;
  isContract?: boolean;
};

function buildRegistry(prof?: Professional | null): string | null {
  if (!prof) return null;
  const num = cleanText(prof.registro ?? "");
  const council = cleanText(prof.conselho ?? "") || "CREFITO";
  if (!num) return null;
  if (/\d/.test(council) && !prof.registro) return council;
  return `${council} nº ${num}`;
}

/**
 * Cabeçalho reutilizável completo — pronto para Sprint 8B.
 */
export function drawDocumentHeader(
  doc: jsPDF,
  clinic: ClinicData,
  pageW: number,
  opts: BuildPdfOpts,
  engineOpts: HeaderEngineOptions = {},
) {
  drawClinicBrandingBlock(doc, clinic, pageW, engineOpts.logo ?? null, {
    showProfessional: true,
    professional: engineOpts.professional ?? opts.professional ?? null,
  });

  if (engineOpts.includeDocumentCard) {
    drawDocumentMetaCard(doc, pageW, S.M, opts, engineOpts.isContract ?? false);
  }

  if (engineOpts.includeBottomRule) {
    drawHeaderBottomRule(doc, pageW, S.M);
  }
}

/** Branding da clínica — layout idêntico ao fluxo atual de renderPdf. */
export function drawLegacyClinicHeader(
  doc: jsPDF,
  clinic: ClinicData,
  logo: string | PreparedLogo | null,
  pageW: number,
) {
  drawClinicBrandingBlock(doc, clinic, pageW, logo, { showProfessional: false });
}

type BrandingOpts = {
  showProfessional: boolean;
  professional?: Professional | null;
};

function drawClinicBrandingBlock(
  doc: jsPDF,
  clinic: ClinicData,
  pageW: number,
  logo: string | PreparedLogo | null,
  branding: BrandingOpts,
) {
  const M = S.M;
  const cardX = M;
  const cardY = 20;
  const cardW = pageW - 2 * M;
  const cardH = S.HEADER_H - 32;
  const logoBoxW = PDF_LOGO.boxW;
  const logoBoxH = PDF_LOGO.boxH;
  const logoX = cardX + PDF_LOGO.padding;
  const logoY = cardY + 18;

  doc.setFillColor(...C.paper);
  doc.rect(0, 0, pageW, S.HEADER_H, "F");

  drawLogoOrFallback(doc, clinic, logo, logoX, logoY, logoBoxW, logoBoxH);

  const dividerX = logoX + logoBoxW + 12;
  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.6);
  doc.line(dividerX, cardY + 12, dividerX, cardY + cardH - 12);

  const clinicName = cleanText(clinic.nome_fantasia) || cleanText(clinic.razao_social) || "FisioOS";
  const specialty = cleanText(clinic.razao_social) || "Fisioterapia";
  const cnpj = cleanText(clinic.cnpj);
  const tels = Array.isArray(clinic.telefones) ? clinic.telefones.filter(Boolean).join(" · ") : "";
  const emails = Array.isArray(clinic.emails) ? clinic.emails.filter(Boolean).join(" · ") : "";
  const cityState = [cleanText(clinic.cidade), cleanText(clinic.estado)].filter(Boolean).join("/");
  const addr = [cleanText(clinic.endereco), cityState].filter(Boolean).join(" · ");
  const legal = cleanText(clinic.rodape_institucional);

  const docX = pageW - M - 205;
  const clinicX = dividerX + 16;
  const clinicTextW = Math.max(150, docX - clinicX - 24);
  let cy = cardY + 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.headerName);
  doc.setTextColor(...C.brand);
  doc.text(truncateLine(doc, clinicName, clinicTextW), clinicX, cy);
  cy += 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.headerMeta);
  doc.setTextColor(...C.ink);
  doc.text(truncateLine(doc, specialty, clinicTextW), clinicX, cy);
  cy += 13;

  if (branding.showProfessional) {
    const profNome = cleanText(branding.professional?.nome ?? "");
    const profRegistry = buildRegistry(branding.professional);
    if (profNome) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(T.headerMeta);
      doc.setTextColor(...C.ink);
      doc.text(truncateLine(doc, profNome, clinicTextW), clinicX, cy);
      cy += 11;
    }
    if (profRegistry) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(...C.brand);
      doc.text(profRegistry, clinicX, cy);
      cy += 11;
    }
  }

  if (cnpj) {
    doc.setFillColor(...C.brandSoft);
    doc.roundedRect(clinicX, cy - 8, Math.min(128, clinicTextW), 13, 4, 4, "F");
    doc.setFontSize(6.8);
    doc.setTextColor(...C.brand);
    doc.text(`CNPJ ${cnpj}`, clinicX + 6, cy + 1);
    cy += 15;
  }

  const contactLines = [
    tels && { icon: "phone" as const, text: tels },
    emails && { icon: "mail" as const, text: emails },
    addr && { icon: "pin" as const, text: addr },
  ].filter(Boolean) as Array<{ icon: IconKind; text: string }>;

  for (const line of contactLines.slice(0, 3)) {
    drawMiniIcon(doc, line.icon, clinicX, cy - 7, 7, C.brand);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.meta);
    doc.text(truncateLine(doc, line.text, clinicTextW - 12), clinicX + 12, cy);
    cy += 11;
  }

  if (legal) {
    const legalY = cardY + cardH - 16;
    doc.setDrawColor(...C.hairlineSoft);
    doc.setLineWidth(0.3);
    doc.line(clinicX, legalY - 10, docX - 20, legalY - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.brand);
    doc.text(truncateLine(doc, legal, clinicTextW), clinicX, legalY);
  }
}

function drawDocumentMetaCard(
  doc: jsPDF,
  pageW: number,
  M: number,
  opts: BuildPdfOpts,
  isContract: boolean,
) {
  const cardX = pageW - M - 205;
  const cardY = 30;
  const docW = 205;
  const docH = S.HEADER_H - 50;

  doc.setFillColor(...C.surface);
  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, cardY, docW, docH, 8, 8, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.docTitle);
  doc.setTextColor(...C.ink);
  const titleLines = wrapText(doc, opts.title, docW - 32).slice(0, 2);
  doc.text(titleLines, cardX + 16, cardY + 22);

  const subtitle = cleanText(opts.subtitle);
  const subtitleIsEmission = /^Emitid[ao] em\s+/i.test(subtitle);
  if (subtitle && !subtitleIsEmission) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.docSubtitle);
    doc.setTextColor(...C.meta);
    doc.text(wrapText(doc, subtitle, docW - 32).slice(0, 1), cardX + 16, cardY + 45);
  }

  const issued = new Date().toLocaleDateString("pt-BR");
  const metaY = cardY + 24 + titleLines.length * 14 + (subtitle && !subtitleIsEmission ? 18 : 8);
  drawHeaderMeta(doc, "calendar", "Data de emissão", issued, cardX + 16, metaY, 80);
  drawHeaderMeta(doc, "user", "Paciente", opts.patientName || "—", cardX + 16, metaY + 24, 75);
  if (isContract) {
    drawHeaderMeta(doc, "file", "Documento", "Contrato", cardX + 108, metaY + 24, 68);
  } else {
    const assessmentDate = subtitle.replace(/^Emitida em\s+/i, "") || "—";
    drawHeaderMeta(doc, "calendar", "Data da avaliação", assessmentDate, cardX + 108, metaY + 24, 68);
  }
}

export function drawHeaderBottomRule(doc: jsPDF, pageW: number, M: number) {
  const y = S.HEADER_H - 6;
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.8);
  doc.line(M, y, pageW - M, y);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.3);
  doc.line(M, y + 2.5, pageW - M, y + 2.5);
}

export function drawPageChrome(doc: jsPDF, pageH: number, isContract: boolean) {
  if (!isContract) return;
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, 7, pageH, "F");
  doc.setFillColor(...C.brandSoft);
  doc.rect(7, 0, 1.2, pageH, "F");
}

export function drawLeftBand(doc: jsPDF, pageH: number) {
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, 6, pageH, "F");
}
