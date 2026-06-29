/**
 * Sprint R1 — Recibo Premium Oficial (layout congelado).
 * Renderer dedicado — não reutilizar lógica do Publishing Engine do dossiê.
 */

import type jsPDF from "jspdf";
import type { ClinicData, Professional } from "@/lib/pdf-engine";
import { computeLogoBoxRect, drawLogoBox } from "@/lib/pdf-engine";
import { drawMiniIcon, type IconKind } from "@/lib/pdf-engine/icons";
import type { ReceiptPdfData, ReceiptPrintMode } from "./types";
import { valorPorExtenso } from "./extenso";

import { PAYMENT_METHOD_LABELS } from "@/lib/finance/constants";

const PAYMENT_LABEL: Record<string, string> = PAYMENT_METHOD_LABELS;

type Rgb = [number, number, number];

type ReceiptTheme = {
  primary: Rgb;
  accent: Rgb;
  ink: Rgb;
  meta: Rgb;
  hairline: Rgb;
  surface: Rgb;
  paper: Rgb;
};

type SlotLayout = {
  originX: number;
  originY: number;
  width: number;
  height: number;
  M: number;
  compact: boolean;
};

function hexToRgb(hex?: string | null): Rgb | null {
  const raw = (hex ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function fmtLongDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function themeFromClinic(c: ClinicData): ReceiptTheme {
  return {
    primary: hexToRgb(c.primary_color) ?? [22, 101, 52],
    accent: hexToRgb(c.secondary_color) ?? [234, 88, 12],
    ink: [30, 41, 59],
    meta: [100, 116, 139],
    hairline: [226, 232, 240],
    surface: [248, 250, 252],
    paper: [255, 255, 255],
  };
}

function fs(compact: boolean, a4: number, eco: number) {
  return compact ? eco : a4;
}

/** Zona exclusiva do selo — nenhum texto da clínica invade esta área. */
function drawReceiptSeal(
  doc: jsPDF,
  theme: ReceiptTheme,
  x: number,
  y: number,
  w: number,
  h: number,
  numero: number,
  compact: boolean,
) {
  doc.setFillColor(...theme.primary);
  doc.roundedRect(x, y, w, h, compact ? 5 : 7, compact ? 5 : 7, "F");
  doc.setFillColor(...theme.accent);
  doc.roundedRect(x, y + h - (compact ? 4 : 5), w, compact ? 4 : 5, 0, 0, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs(compact, 9, 7.5));
  doc.text("RECIBO Nº", x + w / 2, y + (compact ? 14 : 18), { align: "center" });
  doc.setFontSize(fs(compact, 26, 20));
  doc.text(String(numero).padStart(3, "0"), x + w / 2, y + (compact ? 36 : 46), { align: "center" });
}

function drawReceiptHeader(
  doc: jsPDF,
  c: ClinicData,
  logo: Awaited<ReturnType<typeof import("@/lib/pdf-logo-loader").loadClinicLogoForPdf>>,
  theme: ReceiptTheme,
  slot: SlotLayout,
  numero: number,
) {
  const { originX: ox, originY: oy, width: W, M, compact } = slot;
  const top = oy + (compact ? 10 : 14);

  doc.setFillColor(...theme.primary);
  doc.rect(ox, oy, W, compact ? 3 : 4, "F");
  doc.setFillColor(...theme.accent);
  doc.rect(ox, oy + (compact ? 3 : 4), W, compact ? 1 : 2, "F");

  const sealW = compact ? 88 : 108;
  const sealH = compact ? 58 : 72;
  const sealX = ox + W - M - sealW;
  const sealY = top;
  const infoMaxX = sealX - 14;

  const logoBoxW = compact ? 72 : 96;
  const logoBoxH = compact ? 66 : 88;
  const logoRect = computeLogoBoxRect(ox + M, top, logoBoxH + 8, logoBoxW, logoBoxH, 0);
  drawLogoBox(doc, c, logo, logoRect);

  const tx = logoRect.x + logoRect.w + (compact ? 10 : 14);
  let ty = top + (compact ? 10 : 14);
  const infoW = infoMaxX - tx;

  doc.setTextColor(...theme.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs(compact, 17, 13));
  const nomeLines = doc.splitTextToSize((c.nome_fantasia || "Clínica").trim(), infoW);
  doc.text(nomeLines[0] ?? "", tx, ty);
  ty += compact ? 13 : 16;

  const slogan = (c.rodape_institucional ?? "").trim();
  if (slogan) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...theme.meta);
    doc.setFontSize(fs(compact, 7, 6));
    const sloganLines = doc.splitTextToSize(slogan, infoW);
    doc.text(sloganLines[0] ?? "", tx, ty);
    ty += compact ? 8 : 9;
  }

  if (c.razao_social) {
    doc.setTextColor(...theme.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs(compact, 7.5, 6.5));
    const rs = doc.splitTextToSize(c.razao_social.toUpperCase(), infoW);
    doc.text(rs[0] ?? "", tx, ty);
    ty += compact ? 9 : 10;
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...theme.meta);
  doc.setFontSize(fs(compact, 7.5, 6.5));
  if (c.cnpj) {
    doc.text(`CNPJ ${c.cnpj}`, tx, ty);
    ty += compact ? 9 : 10;
  }

  const tels = Array.isArray(c.telefones) ? c.telefones.filter(Boolean) : [];
  const emails = Array.isArray(c.emails) ? c.emails.filter(Boolean) : [];
  const endereco = c.endereco || "";
  const cityState = [c.cidade, c.estado].filter(Boolean).join("/");
  const addr = [endereco, cityState].filter(Boolean).join(" – ");
  const contactParts: string[] = [];
  if (addr) contactParts.push(addr);
  if (tels.length) contactParts.push(tels.join(" · "));
  if (emails.length) contactParts.push(emails[0]);

  for (const part of contactParts.slice(0, compact ? 2 : 3)) {
    const lines = doc.splitTextToSize(part, infoW);
    doc.text(lines[0] ?? "", tx, ty);
    ty += compact ? 8 : 9;
  }

  drawReceiptSeal(doc, theme, sealX, sealY, sealW, sealH, numero, compact);

  return top + (compact ? 78 : 98);
}

function drawInfoCard(
  doc: jsPDF,
  theme: ReceiptTheme,
  slot: SlotLayout,
  y: number,
  rows: Array<{ label: string; value: string; icon: IconKind }>,
): number {
  const { originX: ox, width: W, M, compact } = slot;
  const cardX = ox + M;
  const cardW = W - 2 * M;
  const rowH = compact ? 26 : 32;
  const cardH = rowH * rows.length + (compact ? 8 : 12);
  const pad = compact ? 8 : 10;

  doc.setFillColor(...theme.surface);
  doc.setDrawColor(...theme.hairline);
  doc.setLineWidth(0.4);
  doc.roundedRect(cardX, y, cardW, cardH, compact ? 6 : 8, compact ? 6 : 8, "FD");

  rows.forEach((row, i) => {
    const ry = y + pad + i * rowH;
    if (i > 0) {
      doc.setDrawColor(...theme.hairline);
      doc.setLineWidth(0.25);
      doc.line(cardX + pad, ry, cardX + cardW - pad, ry);
    }

    drawMiniIcon(doc, row.icon, cardX + pad, ry + (compact ? 4 : 6), compact ? 7 : 8, theme.primary);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs(compact, 6.5, 5.5));
    doc.setTextColor(...theme.meta);
    doc.text(row.label.toUpperCase(), cardX + pad + 14, ry + (compact ? 8 : 10));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs(compact, 10, 8.5));
    doc.setTextColor(...theme.ink);
    const valLines = doc.splitTextToSize(row.value, cardW - pad * 2 - 14);
    doc.text(valLines[0] ?? row.value, cardX + pad + 14, ry + (compact ? 18 : 22));
  });

  return y + cardH + (compact ? 10 : 14);
}

function drawInstitutionalSignature(
  doc: jsPDF,
  theme: ReceiptTheme,
  slot: SlotLayout,
  y: number,
  prof: Professional | null,
  localStr: string,
  issuedAt: string,
): number {
  const { originX: ox, width: W, M, compact } = slot;
  const cx = ox + W / 2;
  const boxW = Math.min(compact ? 220 : 280, W - 2 * M);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs(compact, 9, 7.5));
  doc.setTextColor(...theme.meta);
  doc.text(`${localStr}, ${fmtLongDate(issuedAt)}`, cx, y, { align: "center" });
  y += compact ? 14 : 18;

  const boxX = cx - boxW / 2;
  const profNome = (prof?.nome ?? "").trim() || "Profissional responsável";
  const profRole = (prof?.profissao ?? "Fisioterapeuta").trim();
  const conselho = (prof?.conselho ?? "CREFITO").trim();
  const registro = (prof?.registro ?? "").trim();
  const hasRegistro = !!registro;

  const padTop = compact ? 22 : 26;
  const gapAfterLine = compact ? 11 : 12;
  const gapRole = compact ? 10 : 11;
  const gapRegistro = compact ? 10 : 11;
  const bottomPad = compact ? 12 : 14;
  const boxH =
    padTop +
    gapAfterLine +
    gapRole +
    (hasRegistro ? gapRegistro : 0) +
    bottomPad;

  doc.setFillColor(...theme.paper);
  doc.setDrawColor(...theme.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, y, boxW, boxH, 6, 6, "FD");

  const lineY = y + padTop;
  doc.setDrawColor(...theme.ink);
  doc.setLineWidth(0.45);
  doc.line(boxX + 24, lineY, boxX + boxW - 24, lineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs(compact, 10, 8.5));
  doc.setTextColor(...theme.ink);
  doc.text(profNome, cx, lineY + gapAfterLine, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs(compact, 8.5, 7));
  doc.setTextColor(...theme.meta);
  doc.text(profRole, cx, lineY + gapAfterLine + gapRole, { align: "center" });

  if (hasRegistro) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs(compact, 8, 7));
    doc.setTextColor(...theme.primary);
    doc.text(
      `${conselho} ${registro}`,
      cx,
      lineY + gapAfterLine + gapRole + gapRegistro,
      { align: "center" },
    );
  }

  return y + boxH + (compact ? 8 : 10);
}

function drawReceiptFooter(
  doc: jsPDF,
  c: ClinicData,
  logo: Awaited<ReturnType<typeof import("@/lib/pdf-logo-loader").loadClinicLogoForPdf>>,
  theme: ReceiptTheme,
  slot: SlotLayout,
) {
  const { originX: ox, originY: oy, width: W, height: H, M, compact } = slot;
  const fy = oy + H - (compact ? 28 : 34);

  doc.setDrawColor(...theme.hairline);
  doc.setLineWidth(0.25);
  doc.line(ox + M, fy, ox + W - M, fy);

  const miniLogoW = compact ? 22 : 28;
  const miniLogoH = compact ? 20 : 26;
  drawLogoBox(doc, c, logo, { x: ox + M, y: fy + 4, w: miniLogoW, h: miniLogoH });

  const clinicName = (c.nome_fantasia || c.razao_social || "Clínica").trim();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs(compact, 6.5, 5.5));
  doc.setTextColor(...theme.meta);
  doc.text(clinicName, ox + M + miniLogoW + 6, fy + (compact ? 12 : 14));
  if (c.cnpj) {
    doc.text(`CNPJ ${c.cnpj}`, ox + W - M, fy + (compact ? 12 : 14), { align: "right" });
  }

  doc.setFontSize(fs(compact, 5.5, 5));
  doc.text(`Recibo Premium · v${"R1"}`, ox + W / 2, fy + (compact ? 22 : 26), { align: "center" });
}

function drawCancelledStamp(doc: jsPDF, theme: ReceiptTheme, slot: SlotLayout, reason?: string | null) {
  const { originX: ox, originY: oy, width: W, height: H } = slot;
  doc.saveGraphicsState();
  const anyDoc = doc as unknown as { GState?: new (p: { opacity: number }) => unknown; setGState?: (s: unknown) => void };
  if (anyDoc.GState && anyDoc.setGState) {
    anyDoc.setGState(new anyDoc.GState({ opacity: 0.15 }));
  }
  doc.setTextColor(200, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(slot.compact ? 52 : 72);
  doc.text("CANCELADO", ox + W / 2, oy + H / 2, { align: "center", angle: -18 });
  doc.restoreGraphicsState();
  if (reason) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(200, 30, 30);
    doc.text(`Motivo: ${reason}`, ox + slot.M, oy + H - 8);
  }
}

export function drawPremiumReceipt(
  doc: jsPDF,
  data: ReceiptPdfData,
  c: ClinicData,
  logo: Awaited<ReturnType<typeof import("@/lib/pdf-logo-loader").loadClinicLogoForPdf>>,
  slot: SlotLayout,
) {
  const theme = themeFromClinic(c);
  const compact = slot.compact;

  let y = drawReceiptHeader(doc, c, logo, theme, slot, data.numero);

  y += compact ? 6 : 10;
  doc.setDrawColor(...theme.primary);
  doc.setLineWidth(0.6);
  doc.line(slot.originX + slot.M, y, slot.originX + slot.width - slot.M, y);
  y += compact ? 12 : 16;

  const responsavel = (data.responsavelFinanceiro || data.patientName || "—").trim();
  const paciente = (data.patientName || "—").trim();
  const servico = (data.serviceLabel || data.description || "atendimento fisioterapêutico").trim();
  const extenso = valorPorExtenso(data.amount);

  doc.setTextColor(...theme.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs(compact, 10, 8.5));
  const corpo =
    `Recebi de ${responsavel} a quantia de ${brl(data.amount)} (${extenso}), ` +
    `referente à ${servico} realizada para ${paciente === responsavel ? "o(a) paciente acima" : `a paciente ${paciente}`}.`;
  const corpoLines = doc.splitTextToSize(corpo, slot.width - 2 * slot.M);
  const lineStep = compact ? 13 : 15;
  corpoLines.forEach((ln: string, i: number) => {
    doc.text(ln, slot.originX + slot.M, y + i * lineStep);
  });
  y += corpoLines.length * lineStep + (compact ? 10 : 14);

  y = drawInfoCard(doc, theme, slot, y, [
    { label: "Paciente", value: paciente, icon: "user" },
    { label: "Responsável financeiro", value: responsavel, icon: "user" },
    { label: "Forma de pagamento", value: PAYMENT_LABEL[data.payment_method] ?? data.payment_method, icon: "shield" },
    { label: "Data do pagamento", value: fmtDate(data.payment_date), icon: "calendar" },
    { label: "Valor recebido", value: brl(data.amount), icon: "target" },
  ]);

  const localStr = [c.cidade, c.estado].filter(Boolean).join("/") || "—";
  drawInstitutionalSignature(doc, theme, slot, y, data.professional ?? null, localStr, data.issued_at);

  drawReceiptFooter(doc, c, logo, theme, slot);

  if (data.cancelled) drawCancelledStamp(doc, theme, slot, data.cancellation_reason);
}

function drawCutGuide(doc: jsPDF, y: number, pageW: number, M: number) {
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2, 3], 0);
  doc.line(M, y, pageW - M, y);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(160, 160, 160);
  doc.text("— linha de corte —", pageW / 2, y - 3, { align: "center" });
}

export function slotLayoutForMode(
  pageW: number,
  pageH: number,
  mode: ReceiptPrintMode,
  slotIndex: 0 | 1 = 0,
): SlotLayout {
  const M = 32;
  if (mode === "a4") {
    return { originX: 0, originY: 0, width: pageW, height: pageH, M, compact: false };
  }
  const halfH = pageH / 2;
  return {
    originX: 0,
    originY: slotIndex === 0 ? 0 : halfH,
    width: pageW,
    height: halfH - 2,
    M: 28,
    compact: true,
  };
}

export function renderPremiumReceiptPage(
  doc: jsPDF,
  data: ReceiptPdfData,
  c: ClinicData,
  logo: Awaited<ReturnType<typeof import("@/lib/pdf-logo-loader").loadClinicLogoForPdf>>,
  mode: ReceiptPrintMode,
  slotOnPage: 0 | 1 = 0,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const slot = slotLayoutForMode(pageW, pageH, mode, slotOnPage);
  drawPremiumReceipt(doc, data, c, logo, slot);
  if (mode === "economico" && slotOnPage === 0) {
    drawCutGuide(doc, pageH / 2, pageW, slot.M);
  }
}
