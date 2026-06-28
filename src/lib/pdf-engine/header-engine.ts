import type jsPDF from "jspdf";
import type { BuildPdfOpts, ClinicData, PreparedLogo, Professional } from "./types";
import { PDF_COLORS as C, PDF_LOGO, PDF_SPACING as S, PDF_TYPOGRAPHY as T } from "./tokens";
import { cleanText, truncateLine, wrapText } from "./text";
import { drawLogoBox, computeLogoBoxRect, type LogoBoxRect } from "./images";
import { drawHeaderMeta, drawMiniIcon, type IconKind } from "./icons";

export type HeaderEngineOptions = {
  logo?: PreparedLogo | null;
  professional?: Professional | null;
  includeDocumentCard?: boolean;
  includeBottomRule?: boolean;
  isContract?: boolean;
};

export type HeaderLayout = {
  headerH: number;
  cardY: number;
  cardH: number;
  logoRect: LogoBoxRect;
};

type BrandingOpts = {
  showProfessional: boolean;
  professional?: Professional | null;
};

function buildRegistry(prof?: Professional | null): string | null {
  if (!prof) return null;
  const num = cleanText(prof.registro ?? "");
  const council = cleanText(prof.conselho ?? "") || "CREFITO";
  if (!num) return null;
  if (/\d/.test(council) && !prof.registro) return council;
  return `${council} nº ${num}`;
}

/** Mede altura necessária do cabeçalho antes do layout de conteúdo. */
export function measureDocumentHeaderHeight(
  doc: jsPDF,
  clinic: ClinicData,
  pageW: number,
  branding: BrandingOpts,
  includeDocumentCard = false,
): number {
  const layout = computeHeaderLayout(doc, clinic, pageW, branding, includeDocumentCard);
  return layout.headerH;
}

function computeHeaderLayout(
  doc: jsPDF,
  clinic: ClinicData,
  pageW: number,
  branding: BrandingOpts,
  includeDocumentCard: boolean,
): HeaderLayout {
  const M = S.M;
  const cardY = 20;
  const logoBoxW = PDF_LOGO.boxW;
  const logoBoxH = PDF_LOGO.boxH;
  const minHeaderH = S.HEADER_H;

  const clinicName = cleanText(clinic.nome_fantasia) || cleanText(clinic.razao_social) || "FisioOS";
  const cnpj = cleanText(clinic.cnpj);
  const tels = Array.isArray(clinic.telefones) ? clinic.telefones.filter(Boolean).join(" · ") : "";
  const emails = Array.isArray(clinic.emails) ? clinic.emails.filter(Boolean).join(" · ") : "";
  const cityState = [cleanText(clinic.cidade), cleanText(clinic.estado)].filter(Boolean).join("/");
  const addr = [cleanText(clinic.endereco), cityState].filter(Boolean).join(" · ");
  const legal = cleanText(clinic.rodape_institucional);

  const docX = pageW - M - 205;
  const dividerX = M + PDF_LOGO.padding + logoBoxW + 12;
  const clinicX = dividerX + 16;
  const clinicTextW = Math.max(150, docX - clinicX - 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.headerName);
  const nameLines = wrapText(doc, clinicName, clinicTextW).slice(0, 2);

  let textH = 14 + nameLines.length * 13 + 13; // specialty line

  if (branding.showProfessional) {
    const profNome = cleanText(branding.professional?.nome ?? "");
    const profRegistry = buildRegistry(branding.professional);
    if (profNome) textH += 11;
    if (profRegistry) textH += 11;
  }

  if (cnpj) textH += 15;

  const contactLines = [
    tels && { icon: "phone" as const, text: tels },
    emails && { icon: "mail" as const, text: emails },
    addr && { icon: "pin" as const, text: addr },
  ].filter(Boolean) as Array<{ icon: IconKind; text: string }>;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  for (const line of contactLines.slice(0, 3)) {
    const wrapped = wrapText(doc, line.text, clinicTextW - 12);
    textH += Math.max(1, wrapped.length) * 11;
  }

  if (legal) {
    const legalWrapped = wrapText(doc, legal, clinicTextW);
    textH += 18 + Math.max(1, legalWrapped.length) * 9;
  }

  textH += 16; // top/bottom breathing room inside text block

  const provisionalCardH = Math.max(logoBoxH + 8, textH);
  const logoRect = computeLogoBoxRect(M, cardY, provisionalCardH, logoBoxW, logoBoxH);
  const cardH = Math.max(provisionalCardH, logoRect.h + 12);

  const docCardH = includeDocumentCard ? Math.max(96, cardH - 8) : 0;
  const contentBottom = cardY + cardH + 12;
  const docCardBottom = includeDocumentCard ? cardY + 30 + docCardH + 12 : 0;

  const headerH = Math.max(minHeaderH, contentBottom, docCardBottom, logoRect.y + logoRect.h + 20);

  return {
    headerH,
    cardY,
    cardH,
    logoRect: computeLogoBoxRect(M, cardY, cardH, logoBoxW, logoBoxH),
  };
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
  const layout = drawClinicBrandingBlock(doc, clinic, pageW, engineOpts.logo ?? null, {
    showProfessional: true,
    professional: engineOpts.professional ?? opts.professional ?? null,
  }, true);

  if (engineOpts.includeDocumentCard) {
    drawDocumentMetaCard(doc, pageW, S.M, opts, engineOpts.isContract ?? false, layout.headerH);
  }

  if (engineOpts.includeBottomRule) {
    drawHeaderBottomRule(doc, pageW, S.M, layout.headerH);
  }

  return layout.headerH;
}

/** Branding da clínica — layout idêntico ao fluxo atual de renderPdf. */
export function drawLegacyClinicHeader(
  doc: jsPDF,
  clinic: ClinicData,
  logo: PreparedLogo | null,
  pageW: number,
): number {
  const layout = drawClinicBrandingBlock(doc, clinic, pageW, logo, { showProfessional: false }, false);
  return layout.headerH;
}

function drawClinicBrandingBlock(
  doc: jsPDF,
  clinic: ClinicData,
  pageW: number,
  logo: PreparedLogo | null,
  branding: BrandingOpts,
  includeDocumentCard: boolean,
): HeaderLayout {
  const M = S.M;
  const layout = computeHeaderLayout(doc, clinic, pageW, branding, includeDocumentCard);
  const { headerH, cardY, cardH, logoRect } = layout;
  const cardX = M;
  const cardW = pageW - 2 * M;

  doc.setFillColor(...C.paper);
  doc.rect(0, 0, pageW, headerH, "F");

  drawLogoBox(doc, clinic, logo, logoRect);

  const dividerX = logoRect.x + logoRect.w + 12;
  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.6);
  doc.line(dividerX, cardY + 8, dividerX, cardY + cardH - 8);

  const clinicName = cleanText(clinic.nome_fantasia) || cleanText(clinic.razao_social) || "FisioOS";
  const specialty = "Fisioterapia";
  const cnpj = cleanText(clinic.cnpj);
  const tels = Array.isArray(clinic.telefones) ? clinic.telefones.filter(Boolean).join(" · ") : "";
  const emails = Array.isArray(clinic.emails) ? clinic.emails.filter(Boolean).join(" · ") : "";
  const cityState = [cleanText(clinic.cidade), cleanText(clinic.estado)].filter(Boolean).join("/");
  const addr = [cleanText(clinic.endereco), cityState].filter(Boolean).join(" · ");
  const legal = cleanText(clinic.rodape_institucional);

  const docX = pageW - M - 205;
  const clinicX = dividerX + 16;
  const clinicTextW = Math.max(150, docX - clinicX - 24);

  let cy = cardY + 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.headerName);
  doc.setTextColor(...C.brand);
  const nameLines = wrapText(doc, clinicName, clinicTextW).slice(0, 2);
  doc.text(nameLines, clinicX, cy);
  cy += nameLines.length * 13 + 2;

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
    const wrapped = wrapText(doc, line.text, clinicTextW - 12);
    drawMiniIcon(doc, line.icon, clinicX, cy - 7, 7, C.brand);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.meta);
    doc.text(wrapped, clinicX + 12, cy);
    cy += Math.max(1, wrapped.length) * 11;
  }

  if (legal) {
    const legalY = Math.max(cy + 6, cardY + cardH - 8);
    doc.setDrawColor(...C.hairlineSoft);
    doc.setLineWidth(0.3);
    doc.line(clinicX, legalY - 10, docX - 20, legalY - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.brand);
    doc.text(wrapText(doc, legal, clinicTextW), clinicX, legalY);
  }

  return layout;
}

function drawDocumentMetaCard(
  doc: jsPDF,
  pageW: number,
  M: number,
  opts: BuildPdfOpts,
  isContract: boolean,
  headerH: number,
) {
  const cardX = pageW - M - 205;
  const cardY = 30;
  const docW = 205;
  const docH = Math.max(96, headerH - 50);

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

  const issued =
    cleanText(opts.referenceValue) ||
    (subtitle && !subtitleIsEmission ? subtitle : "") ||
    new Date().toLocaleDateString("pt-BR");
  const metaY = cardY + 24 + titleLines.length * 14 + (subtitle && !subtitleIsEmission ? 18 : 8);
  drawHeaderMeta(doc, "calendar", "Data de emissão", issued, cardX + 16, metaY, 80);
  drawHeaderMeta(doc, "user", "Paciente", opts.patientName || "—", cardX + 16, metaY + 24, 75);
  if (isContract) {
    drawHeaderMeta(doc, "file", "Documento", "Contrato", cardX + 108, metaY + 24, 68);
  } else {
    const refLabel = cleanText(opts.referenceLabel) || "Referência clínica";
    const refValue =
      cleanText(opts.referenceValue) ||
      subtitle.replace(/^Emitid[ao] em\s+/i, "").replace(/^Emitida em\s+/i, "") ||
      "—";
    drawHeaderMeta(doc, "calendar", refLabel, refValue, cardX + 108, metaY + 24, 68);
  }
}

export function drawHeaderBottomRule(doc: jsPDF, pageW: number, M: number, headerH = S.HEADER_H) {
  const y = headerH - 6;
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.8);
  doc.line(M, y, pageW - M, y);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.3);
  doc.line(M, y + 2.5, pageW - M, y + 2.5);
}

/** Cabeçalho compacto para páginas 2+ em documentos clínicos premium. */
export function drawCompactRunningHeader(
  doc: jsPDF,
  clinic: ClinicData,
  opts: BuildPdfOpts,
  pageW: number,
  M: number,
) {
  const bandH = 40;
  doc.setFillColor(...C.paper);
  doc.rect(0, 0, pageW, bandH, "F");
  doc.setFillColor(...C.brand);
  doc.rect(0, 0, 5, bandH, "F");

  const name = cleanText(clinic.nome_fantasia) || cleanText(clinic.razao_social) || "FisioOS";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.brand);
  doc.text(truncateLine(doc, name, pageW - 2 * M - 80), M + 10, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.meta);
  const ctx = [opts.title, opts.patientName].filter(Boolean).join(" · ");
  doc.text(truncateLine(doc, ctx, pageW - 2 * M - 80), M + 10, 24);

  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.4);
  doc.line(M, bandH - 4, pageW - M, bandH - 4);
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
