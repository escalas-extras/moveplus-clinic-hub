/**
 * Sprint D3.2 + D4 — chrome editorial: capa, cabeçalho, rodapé, conclusão.
 */

import QRCode from "qrcode";
import type { jsPDF } from "jspdf";
import type { BuildPdfOpts, ClinicData, Professional } from "../types";
import { PDF_COLORS as C } from "../tokens";
import { cleanText, truncateLine, wrapText } from "../text";
import { drawLogoBox } from "../images";
import { prepareLogoInput } from "../logo";
import { drawLeftBand } from "../header-engine";
import { PUB_TYPE, PUB_LAYOUT } from "./typography";
import { parsePeriodDates } from "./dossier-visuals";

export const PUBLISHING_HEADER_H = 46;
export const PUBLISHING_FOOTER_H = 22;
export const PUBLISHING_FRONT_PAGES = 2;

export function drawPublishingPageHeader(
  doc: jsPDF,
  opts: BuildPdfOpts,
  logoDraw: Awaited<ReturnType<typeof prepareLogoInput>>,
  c: ClinicData,
  W: number,
  M: number,
  sectionTitle?: string,
) {
  const meta = opts.dossier;
  const y0 = M;
  const logoW = 34;
  const logoH = 30;
  const textX = M + logoW + 8;
  const rightX = W - M;

  if (logoDraw) {
    drawLogoBox(doc, c, logoDraw, { x: M, y: y0, w: logoW, h: logoH });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.headerPatient);
  doc.setTextColor(...C.ink);
  doc.text(truncateLine(doc, meta?.patientName ?? opts.patientName ?? "Paciente", W * 0.38), textX, y0 + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.headerDoc);
  doc.setTextColor(...C.brand);
  doc.text(
    truncateLine(doc, meta?.documentTitle ?? "Histórico Clínico Integrado", W * 0.38),
    textX,
    y0 + 20,
  );

  if (meta?.generatedAt) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.headerMeta);
    doc.setTextColor(...C.meta);
    doc.text(meta.generatedAt, rightX, y0 + 10, { align: "right" });
  }

  if (sectionTitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.headerMeta);
    doc.setTextColor(...C.muted);
    doc.text(truncateLine(doc, sectionTitle, W * 0.35), rightX, y0 + 20, { align: "right" });
  }

  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.5);
  doc.line(M, y0 + logoH + 3, W - M, y0 + logoH + 3);
}

export function drawPublishingFooter(
  doc: jsPDF,
  c: ClinicData,
  opts: BuildPdfOpts,
  W: number,
  H: number,
  M: number,
  page: number,
  pageCount: number,
) {
  const fy = H - PUBLISHING_FOOTER_H;
  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.2);
  doc.line(M, fy, W - M, fy);

  const clinicName = cleanText(c.nome_fantasia ?? "") || cleanText(c.razao_social ?? "") || "Clínica";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.muted);
  doc.text(truncateLine(doc, clinicName, W * 0.32), M, fy + 9);
  doc.text(`${page} / ${pageCount}`, W / 2, fy + 9, { align: "center" });

  const right = opts.documentVersion ? `v${opts.documentVersion}` : "";
  if (right) doc.text(right, W - M, fy + 9, { align: "right" });
}

async function drawCoverQr(
  doc: jsPDF,
  hash: string,
  x: number,
  y: number,
  size: number,
  validationUrlBase?: string,
) {
  try {
    const origin =
      validationUrlBase ||
      (typeof window !== "undefined" ? window.location.origin : "https://fisioos.app");
    const url = `${origin.replace(/\/$/, "")}/validar/${hash}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 0, width: 160 });
    doc.addImage(dataUrl, "PNG", x, y, size, size);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text("Validação", x + size / 2, y - 3, { align: "center" });
  } catch {
    /* QR opcional na capa */
  }
}

export async function drawPublishingCover(
  doc: jsPDF,
  opts: BuildPdfOpts,
  c: ClinicData,
  logoDraw: Awaited<ReturnType<typeof prepareLogoInput>>,
  W: number,
  H: number,
  M: number,
  validationUrlBase?: string,
) {
  drawLeftBand(doc, H);
  const clinicName =
    cleanText(c.nome_fantasia ?? "") || cleanText(c.razao_social ?? "") || "Clínica";
  const meta = opts.dossier;
  const cover = meta?.cover;
  const docTitle = meta?.documentTitle ?? "HISTÓRICO CLÍNICO INTEGRADO";
  const patient = meta?.patientName ?? opts.patientName ?? "Paciente";
  const profName =
    cover?.professionalName ??
    cleanText(meta?.conclusion?.professional?.nome ?? opts.professional?.nome ?? "") ??
    "—";
  const period = cover?.periodLabel ?? meta?.conclusion?.periodLabel ?? "—";
  const periodDates = parsePeriodDates(period);

  const logoW = 108;
  const logoH = 100;
  drawLogoBox(doc, c, logoDraw, { x: W / 2 - logoW / 2, y: H * 0.11, w: logoW, h: logoH });

  doc.setDrawColor(...C.brand);
  doc.setLineWidth(1);
  doc.line(M + 56, H * 0.32, W - M - 56, H * 0.32);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.coverMeta);
  doc.setTextColor(...C.brand);
  doc.text(clinicName.toUpperCase(), W / 2, H * 0.35, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.coverTitle);
  doc.setTextColor(...C.ink);
  let ty = H * 0.41;
  for (const ln of wrapText(doc, docTitle, W - 2 * M - 64)) {
    doc.text(ln, W / 2, ty, { align: "center" });
    ty += 26;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.label);
  doc.setTextColor(...C.meta);
  doc.text("PACIENTE", W / 2, ty + 6, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.coverPatient);
  doc.setTextColor(...C.ink);
  doc.text(patient, W / 2, ty + 24, { align: "center" });

  const panelY = ty + 44;
  const panelW = W - 2 * M - 80;
  const panelX = M + 40;
  const colW = panelW / 2 - 8;

  doc.setFillColor(...C.surface);
  doc.roundedRect(panelX, panelY, panelW, 72, 8, 8, "F");
  doc.setFillColor(...C.brand);
  doc.roundedRect(panelX, panelY, 3, 72, 8, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.meta);
  doc.text("PROFISSIONAL RESPONSÁVEL", panelX + 14, panelY + 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.subtitle);
  doc.setTextColor(...C.ink);
  doc.text(truncateLine(doc, profName, colW), panelX + 14, panelY + 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.meta);
  doc.text("PERÍODO DO TRATAMENTO", panelX + colW + 22, panelY + 16);

  if (periodDates) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.subtitle);
    doc.setTextColor(...C.ink);
    doc.text(periodDates.start, panelX + colW + 22, panelY + 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.meta);
    doc.setTextColor(...C.muted);
    doc.text("↓", panelX + colW + 22, panelY + 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.subtitle);
    doc.setTextColor(...C.ink);
    doc.text(periodDates.end, panelX + colW + 22, panelY + 52);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.body);
    doc.setTextColor(...C.ink);
    doc.text(truncateLine(doc, period, colW), panelX + colW + 22, panelY + 30);
  }

  const badgeW = 140;
  const badgeX = W / 2 - badgeW / 2;
  const badgeY = panelY + 88;
  doc.setFillColor(...C.brand);
  doc.roundedRect(badgeX, badgeY, badgeW, 22, 11, 11, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(255, 255, 255);
  doc.text("DOCUMENTO OFICIAL", W / 2, badgeY + 14, { align: "center" });

  if (opts.validationHash) {
    await drawCoverQr(doc, opts.validationHash, W - M - 52, H - M - 72, 44, validationUrlBase);
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.muted);
  doc.text("Documento confidencial — uso exclusivo clínico", W / 2, H - M - 18, { align: "center" });
}

export function drawPublishingToc(
  doc: jsPDF,
  opts: BuildPdfOpts,
  blockPages: Map<number, number>,
  contentOffset: number,
  conclusionPage: number,
  W: number,
  M: number,
) {
  drawLeftBand(doc, doc.internal.pageSize.getHeight());
  let y = M + 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.subtitle);
  doc.setTextColor(...C.ink);
  doc.text("Índice", M, y);
  y += 6;
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.body);
  const lineH = 14;
  const rightX = W - M;
  const linkW = W - 2 * M;

  for (const entry of opts.dossier?.indexEntries ?? []) {
    const logicalPage = blockPages.get(entry.blockId) ?? 0;
    const pdfPage = contentOffset + logicalPage + 1;
    const pageLabel = String(pdfPage);
    doc.setTextColor(...C.ink);
    const titleW = doc.getTextWidth(entry.label);
    const pageW = doc.getTextWidth(pageLabel);
    const dotsW = Math.max(8, linkW - titleW - pageW - 10);
    const dots = ".".repeat(Math.min(50, Math.floor(dotsW / doc.getTextWidth("."))));
    doc.textWithLink(entry.label, M, y, { pageNumber: pdfPage });
    doc.setTextColor(...C.muted);
    doc.text(dots, M + titleW + 4, y);
    doc.setTextColor(...C.brand);
    doc.textWithLink(pageLabel, rightX - pageW, y, { pageNumber: pdfPage });
    y += lineH;
    if (y > doc.internal.pageSize.getHeight() - PUBLISHING_FOOTER_H - 36) break;
  }

  doc.setTextColor(...C.ink);
  doc.textWithLink("Conclusão do tratamento", M, y, { pageNumber: conclusionPage });
  doc.setTextColor(...C.brand);
  doc.textWithLink(String(conclusionPage), rightX - doc.getTextWidth(String(conclusionPage)), y, {
    pageNumber: conclusionPage,
  });
}

export async function drawPublishingConclusionPage(
  doc: jsPDF,
  opts: BuildPdfOpts,
  c: ClinicData,
  logoDraw: Awaited<ReturnType<typeof prepareLogoInput>>,
  W: number,
  H: number,
  M: number,
  validationUrlBase?: string,
) {
  const meta = opts.dossier;
  const conclusion = meta?.conclusion;
  let y = M + PUBLISHING_HEADER_H + 2;
  const contentW = W - 2 * M;

  drawPublishingPageHeader(doc, opts, logoDraw, c, W, M, "Conclusão do tratamento");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.subtitle);
  doc.setTextColor(...C.ink);
  doc.text("Encerramento", M, y);
  y += 8;
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.6);
  doc.line(M, y, M + contentW, y);
  y += 12;

  y = drawSummaryPanel(doc, M, y, contentW, conclusion);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.body);
  doc.setTextColor(...C.ink);
  const summaryText = conclusion?.treatmentSummary ?? meta?.summary?.treatmentSummary ?? "";
  for (const ln of wrapText(doc, summaryText, contentW - 16)) {
    doc.text(ln, M + 8, y);
    y += 12;
  }
  y += 8;

  if (conclusion?.objectivesAchieved?.length) {
    y = drawObjectiveList(doc, M, y, contentW, "Objetivos alcançados", conclusion.objectivesAchieved, true);
  }
  if (conclusion?.objectivesPending?.length) {
    y = drawObjectiveList(doc, M, y, contentW, "Objetivos pendentes", conclusion.objectivesPending, false);
  }
  if (conclusion?.professionalNotes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.label);
    doc.setTextColor(...C.brand);
    doc.text("CONSIDERAÇÕES DO PROFISSIONAL", M, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.body);
    for (const ln of wrapText(doc, conclusion.professionalNotes, contentW)) {
      doc.text(ln, M, y);
      y += 12;
    }
    y += 6;
  }

  y = drawInstitutionalSignature(doc, conclusion?.professional ?? opts.professional ?? null, W, M, y, contentW);

  if (opts.validationHash) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.label);
    doc.setTextColor(...C.brand);
    doc.text("VALIDAÇÃO DO DOCUMENTO", M, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.caption);
    doc.setTextColor(...C.meta);
    doc.text(`Hash: ${opts.validationHash}`, M, y + 20, { maxWidth: contentW - 58 });
    if (meta?.generatedAt) doc.text(`Emissão: ${meta.generatedAt}`, M, y + 32);
    await drawCoverQr(doc, opts.validationHash, W - M - 48, y, 44, validationUrlBase);
  }

  const institutional =
    meta?.institutionalMessage ||
    cleanText(c.rodape_institucional ?? "") ||
    "Este documento consolida o histórico clínico registrado durante o acompanhamento fisioterapêutico.";
  doc.setFont("helvetica", "italic");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.muted);
  const footY = H - PUBLISHING_FOOTER_H - 16;
  wrapText(doc, institutional, contentW).forEach((ln, i) => {
    doc.text(ln, W / 2, footY + i * 7, { align: "center" });
  });
}

function drawSummaryPanel(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  conclusion: NonNullable<NonNullable<BuildPdfOpts["dossier"]>["conclusion"]> | undefined,
): number {
  const panelH = 88;
  doc.setFillColor(...C.surface);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, panelH, PUB_LAYOUT.panelRadius, PUB_LAYOUT.panelRadius, "FD");
  doc.setFillColor(...C.brand);
  doc.roundedRect(x, y, 3, panelH, PUB_LAYOUT.panelRadius, PUB_LAYOUT.panelRadius, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.label);
  doc.setTextColor(...C.brand);
  doc.text("QUADRO RESUMO DO TRATAMENTO", x + 12, y + 12);

  const rows: Array<[string, string]> = [
    ["Período", conclusion?.periodLabel ?? "—"],
    ["Sessões", String(conclusion?.sessionCount ?? 0)],
    ["Avaliações", String(conclusion?.assessmentCount ?? 0)],
    ["Evoluções", String(conclusion?.evolutionCount ?? 0)],
    ["Reavaliações", String(conclusion?.reassessmentCount ?? 0)],
    [
      "Objetivos",
      `${conclusion?.objectivesAchieved?.length ?? 0} ✓ / ${conclusion?.objectivesPending?.length ?? 0} •`,
    ],
    ["Situação da alta", conclusion?.hasDischarge ? "Registrada" : "Não registrada"],
  ];

  const colW = (w - 24) / 4;
  rows.forEach(([label, value], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = x + 12 + col * colW;
    const cy = y + 22 + row * 28;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.caption);
    doc.setTextColor(...C.meta);
    doc.text(label.toUpperCase(), cx, cy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.body);
    doc.setTextColor(...C.ink);
    doc.text(truncateLine(doc, value, colW - 4), cx, cy + 11);
  });

  return y + panelH + 10;
}

function drawObjectiveList(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  title: string,
  items: string[],
  achieved: boolean,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.label);
  doc.setTextColor(...(achieved ? ([5, 122, 85] as [number, number, number]) : ([180, 83, 9] as [number, number, number])));
  doc.text(title.toUpperCase(), x, y);
  y += 9;
  for (const item of items) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.body);
    doc.setTextColor(...C.ink);
    doc.text(`${achieved ? "✓" : "•"} ${item}`, x + 4, y);
    y += 12;
  }
  return y + 4;
}

function drawInstitutionalSignature(
  doc: jsPDF,
  prof: Professional | null,
  W: number,
  M: number,
  y: number,
  contentW: number,
): number {
  const sigX = W / 2;
  const boxW = Math.min(260, contentW);
  const boxX = sigX - boxW / 2;

  const sigBoxH = PUB_LAYOUT.signatureMinH;
  doc.setFillColor(...C.paper);
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, y, boxW, sigBoxH, PUB_LAYOUT.panelRadius, PUB_LAYOUT.panelRadius, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.brand);
  doc.text("RESPONSÁVEL TÉCNICO", sigX, y + 12, { align: "center" });

  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.45);
  doc.line(sigX - 70, y + 36, sigX + 70, y + 36);

  const profNome = cleanText(prof?.nome ?? "");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.body);
  doc.setTextColor(...C.ink);
  doc.text(profNome || "Profissional responsável", sigX, y + 48, { align: "center" });

  if (prof?.registro) {
    const council = cleanText(prof.conselho ?? "") || "CREFITO";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.caption);
    doc.setTextColor(...C.meta);
    doc.text(`${council} nº ${prof.registro}`, sigX, y + 58, { align: "center" });
  }

  return y + sigBoxH + 10;
}
