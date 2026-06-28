/**
 * Sprint D3.2 + D4 — primitivos visuais editoriais (jsPDF, sem libs externas).
 */

import type { jsPDF } from "jspdf";
import type { ClinicalTrend } from "../types";
import { PDF_COLORS as C } from "../tokens";
import { wrapText } from "../text";
import { drawMiniIcon } from "../icons";
import { PUB_SPACE, PUB_TYPE, PUB_LAYOUT } from "./typography";
import { dashboardIconFor, evaPainZone } from "./dossier-visuals";

export function drawPublishingTitle(doc: jsPDF, label: string, x: number, y: number, w: number): number {
  const title = label.replace(/^\s*\d+[\.\s-]*/, "").replace(/\s*\(continuação\)\s*$/i, "");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.sectionTitle);
  doc.setTextColor(...C.ink);
  doc.text(title.toUpperCase(), x, y + 9);
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.6);
  doc.line(x, y + 12, x + w, y + 12);
  return y + 12 + PUB_SPACE.titleBottom + 4;
}

export function drawHorizontalBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fillRatio: number,
  color: [number, number, number],
) {
  doc.setFillColor(...C.surface);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  const fw = Math.max(h, w * Math.min(1, Math.max(0, fillRatio)));
  doc.setFillColor(...color);
  doc.roundedRect(x, y, fw, h, h / 2, h / 2, "F");
}

function drawEvaGradientBar(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const segments = 50;
  const anchors = [
    { at: 0, color: C.evaBlue },
    { at: 0.3, color: C.evaGreen },
    { at: 0.55, color: [104, 173, 71] as [number, number, number] },
    { at: 0.75, color: C.evaOrange },
    { at: 1, color: C.evaRed },
  ];
  const segW = w / segments;
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    let c: [number, number, number] = anchors[0].color;
    for (let a = 1; a < anchors.length; a++) {
      if (t <= anchors[a].at) {
        c = anchors[a].color;
        break;
      }
    }
    doc.setFillColor(...c);
    doc.rect(x + i * segW, y, segW + 0.5, h, "F");
  }
  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "S");
}

export function drawPublishingEva(doc: jsPDF, value: number | null, x: number, y: number, w: number): number {
  const safe = value == null ? null : Math.max(0, Math.min(10, Math.round(value)));
  const zone = evaPainZone(safe);
  const h = PUB_LAYOUT.evaH;

  doc.setFillColor(...C.surface);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, PUB_LAYOUT.panelRadius, PUB_LAYOUT.panelRadius, "FD");
  doc.setFillColor(...zone.color);
  doc.roundedRect(x, y, 3, h, PUB_LAYOUT.panelRadius, PUB_LAYOUT.panelRadius, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.label);
  doc.setTextColor(...C.meta);
  doc.text("ESCALA VISUAL ANALÓGICA (EVA)", x + 10, y + 11);

  const barX = x + 10;
  const barY = y + 20;
  const barW = w - 20;
  const barH = 6;

  drawEvaGradientBar(doc, barX, barY, barW, barH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.muted);
  doc.text("0", barX, barY + barH + 9);
  doc.text("10", barX + barW, barY + barH + 9, { align: "right" });

  const legends = ["Sem dor", "Leve", "Moderada", "Intensa", "Extrema"];
  const legW = barW / legends.length;
  legends.forEach((leg, i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text(leg, barX + i * legW + legW / 2, barY + barH + 16, { align: "center" });
  });

  if (safe != null) {
    const mx = barX + (safe / 10) * barW;
    doc.setFillColor(255, 255, 255);
    doc.circle(mx, barY + barH / 2, 6, "F");
    doc.setFillColor(...zone.color);
    doc.circle(mx, barY + barH / 2, 4.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.subtitle);
    doc.setTextColor(...zone.color);
    doc.text(zone.label, mx, barY - 4, { align: "center" });
  }

  return y + h;
}

export function drawCompareBarsRow(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  inicial: number,
  atual: number,
  max: number,
  trend?: ClinicalTrend,
): number {
  const rowH = PUB_LAYOUT.compareRowH;
  const labelW = 78;
  const barW = w - labelW - 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.body);
  doc.setTextColor(...C.ink);
  doc.text(wrapText(doc, label, labelW - 4)[0] ?? label, x, y + 9);

  const inRatio = max > 0 ? inicial / max : 0;
  const atRatio = max > 0 ? atual / max : 0;
  const trendColor: [number, number, number] =
    trend === "melhorou" ? [5, 122, 85] : trend === "piorou" ? [185, 28, 28] : C.brand;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.muted);
  doc.text("Inicial", x + labelW, y + 7);
  drawHorizontalBar(doc, x + labelW, y + 9, barW, 7, inRatio, C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.body);
  doc.setTextColor(...C.meta);
  doc.text(String(inicial), x + labelW + barW + 6, y + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.caption);
  doc.text("Atual", x + labelW, y + 22);
  drawHorizontalBar(doc, x + labelW, y + 24, barW, 7, atRatio, trendColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.body);
  doc.setTextColor(...trendColor);
  doc.text(String(atual), x + labelW + barW + 6, y + 30);

  return y + rowH;
}

export function drawPublishingTimeline(
  doc: jsPDF,
  x: number,
  y: number,
  _w: number,
  items: Array<{ date: string; title: string }>,
): number {
  const lineX = x + 5;
  let cy = y + 4;
  const itemH = PUB_LAYOUT.timelineItemH;

  if (items.length > 1) {
    doc.setDrawColor(...C.brand);
    doc.setLineWidth(0.9);
    doc.line(lineX, cy + 5, lineX, cy + (items.length - 1) * itemH + 5);
  }

  for (const item of items) {
    doc.setFillColor(...C.brand);
    doc.circle(lineX, cy + 5, 3.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.body);
    doc.setTextColor(...C.ink);
    doc.text(item.title, x + 16, cy + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.meta);
    doc.setTextColor(...C.meta);
    doc.text(item.date, x + 16, cy + 13);

    cy += itemH;
  }

  return y + items.length * itemH + 2;
}

export function drawObjectiveBadge(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string | undefined,
  text: string,
  status: "achieved" | "pending" | "progress",
): number {
  const isAchieved = status === "achieved";
  const bg: [number, number, number] = isAchieved ? [236, 253, 245] : [255, 251, 235];
  const fg: [number, number, number] = isAchieved ? [5, 122, 85] : [180, 83, 9];
  const icon = isAchieved ? "✓" : "•";
  const statusLabel = isAchieved ? "Alcançado" : status === "progress" ? "Em andamento" : "Pendente";

  const lines = wrapText(doc, text, w - 48);
  const h = Math.max(34, 12 + lines.length * 12 + 8);

  doc.setFillColor(...bg);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, PUB_LAYOUT.cardRadius, PUB_LAYOUT.cardRadius, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.value);
  doc.setTextColor(...fg);
  doc.text(icon, x + 8, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...fg);
  doc.text(statusLabel.toUpperCase(), x + 20, y + 11);

  if (label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.caption);
    doc.setTextColor(...C.meta);
    doc.text(label.toUpperCase(), x + 20, y + 20);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.body);
  doc.setTextColor(...C.ink);
  lines.forEach((ln, i) => {
    doc.text(ln, x + 20, y + (label ? 30 : 22) + i * 12);
  });

  return y + h + PUB_SPACE.cardGap;
}

export function drawDocumentCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  docType: string,
  quantity: number,
  lastIssued: string,
  hash: string,
): number {
  const h = PUB_LAYOUT.documentCardH;
  doc.setFillColor(...C.paper);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, PUB_LAYOUT.cardRadius, PUB_LAYOUT.cardRadius, "FD");
  doc.setFillColor(...C.brand);
  doc.roundedRect(x, y, w, 2.5, PUB_LAYOUT.cardRadius, PUB_LAYOUT.cardRadius, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.brand);
  doc.text(docType.toUpperCase(), x + PUB_SPACE.cardPad, y + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.valueLg);
  doc.setTextColor(...C.ink);
  doc.text(String(quantity), x + PUB_SPACE.cardPad, y + 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.meta);
  doc.text(quantity === 1 ? "versão" : "versões", x + PUB_SPACE.cardPad + 22, y + 32);

  doc.setFontSize(PUB_TYPE.caption);
  doc.text(`Última emissão: ${lastIssued}`, x + PUB_SPACE.cardPad, y + 42);
  doc.text(`Hash: ${hash}`, x + PUB_SPACE.cardPad, y + 50);

  return y + h;
}

export function drawAdaptiveBadge(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string | undefined,
  text: string,
  variant: "success" | "warning" | "danger" | "neutral" | "info",
): number {
  const colors = badgeColors(variant);
  const lines = wrapText(doc, text, w - 16);
  const h = (label ? 10 : 0) + Math.max(lines.length, 1) * 12 + 10;

  doc.setFillColor(...colors.bg);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, PUB_LAYOUT.badgeRadius, PUB_LAYOUT.badgeRadius, "FD");
  let textY = y + 10;
  if (label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.label);
    doc.setTextColor(...C.meta);
    doc.text(label.toUpperCase(), x + 8, textY);
    textY += 11;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(PUB_TYPE.body);
  doc.setTextColor(...colors.fg);
  lines.forEach((ln, i) => {
    doc.text(ln, x + 8, textY + i * 12);
  });
  return y + h + PUB_SPACE.cardGap;
}

function drawStatDashboardCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  displayValue: string,
  iconLabel: string,
  accent: [number, number, number],
) {
  doc.setFillColor(...C.paper);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, PUB_LAYOUT.cardRadius, PUB_LAYOUT.cardRadius, "FD");

  drawMiniIcon(doc, dashboardIconFor(iconLabel), x + 7, y + 5, 7, accent);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.meta);
  doc.text(label.toUpperCase(), x + 18, y + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.valueLg);
  doc.setTextColor(...C.ink);
  const numMatch = displayValue.match(/^(\d+)/);
  if (numMatch) {
    doc.text(numMatch[1], x + 8, y + 28);
    const rest = displayValue.slice(numMatch[1].length).trim();
    if (rest) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(PUB_TYPE.caption);
      doc.setTextColor(...C.meta);
      doc.text(rest, x + 8 + doc.getTextWidth(numMatch[1]) + 3, y + 28);
    }
  } else {
    doc.setFontSize(PUB_TYPE.value);
    doc.text(wrapText(doc, displayValue, w - 12)[0] ?? displayValue, x + 8, y + 28);
  }

  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.4);
  doc.line(x + 8, y + h - 8, x + w - 8, y + h - 8);
}

export function drawPublishingDashboard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  columns: 2 | 3,
  items: Array<{
    label: string;
    value: string;
    variant?: "success" | "warning" | "info" | "neutral" | "danger";
    barValue?: number;
    barMax?: number;
  }>,
): number {
  const gap = PUB_SPACE.cardGap;
  const cellW = (w - gap * (columns - 1)) / columns;
  const cellH = PUB_LAYOUT.dashboardCellH;
  let maxY = y;

  const kpiLabels = ["sessões", "avaliações", "reavaliações", "evoluções", "documentos", "objetivos"];
  const useStatCards = items.some((i) => kpiLabels.some((k) => i.label.toLowerCase().includes(k)));

  items.forEach((item, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const cx = x + col * (cellW + gap);
    const cy = y + row * (cellH + gap);
    const colors = badgeColors(item.variant === "danger" ? "warning" : (item.variant ?? "neutral"));

    if (useStatCards && item.barValue != null) {
      drawStatDashboardCard(doc, cx, cy, cellW, cellH, item.label, String(item.barValue), item.label, colors.fg);
    } else if (useStatCards && /^\d+$/.test(item.value.trim())) {
      drawStatDashboardCard(doc, cx, cy, cellW, cellH, item.label, item.value, item.label, colors.fg);
    } else {
      doc.setFillColor(...colors.bg);
      doc.setDrawColor(...C.hairline);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, cy, cellW, cellH, PUB_LAYOUT.cardRadius, PUB_LAYOUT.cardRadius, "FD");
      drawMiniIcon(doc, dashboardIconFor(item.label), cx + 7, cy + 5, 7, colors.fg);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(PUB_TYPE.caption);
      doc.setTextColor(...C.meta);
      doc.text(item.label.toUpperCase(), cx + 18, cy + 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(PUB_TYPE.value);
      doc.setTextColor(...colors.fg);
      doc.text(wrapText(doc, item.value, cellW - 16)[0] ?? item.value, cx + 8, cy + 28);
    }

    maxY = Math.max(maxY, cy + cellH + gap);
  });

  return maxY;
}

function badgeColors(variant: "success" | "warning" | "danger" | "neutral" | "info"): {
  bg: [number, number, number];
  fg: [number, number, number];
} {
  if (variant === "success") return { bg: [236, 253, 245], fg: [5, 122, 85] };
  if (variant === "warning") return { bg: [255, 251, 235], fg: [180, 83, 9] };
  if (variant === "danger") return { bg: [254, 242, 242], fg: [185, 28, 28] };
  if (variant === "info") return { bg: [239, 246, 255], fg: [37, 99, 235] };
  return { bg: [248, 250, 252], fg: [71, 85, 105] };
}

export function drawGridAsCards(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  cells: Array<[string, string]>,
): number {
  const cols = 2;
  const gap = PUB_SPACE.cardGap;
  const cellW = (w - gap) / cols;
  const cellH = PUB_LAYOUT.gridCellH;
  let maxY = y;

  cells.forEach(([label, value], i) => {
    if (!value) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + col * (cellW + gap);
    const cy = y + row * (cellH + gap);

    doc.setFillColor(...C.surface);
    doc.setDrawColor(...C.hairline);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx, cy, cellW, cellH, PUB_LAYOUT.badgeRadius, PUB_LAYOUT.badgeRadius, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(PUB_TYPE.caption);
    doc.setTextColor(...C.meta);
    doc.text(label.toUpperCase(), cx + 7, cy + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PUB_TYPE.body);
    doc.setTextColor(...C.ink);
    doc.text(wrapText(doc, value, cellW - 12)[0] ?? value, cx + 7, cy + 22);
    maxY = Math.max(maxY, cy + cellH + gap);
  });

  return maxY;
}

export function drawMiniBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  label: string,
  value: number,
  max: number,
  color: [number, number, number],
): number {
  drawStatDashboardCard(doc, x, y, w, PUB_LAYOUT.dashboardCellH, label, String(value), label, color);
  return y + PUB_LAYOUT.dashboardCellH + PUB_SPACE.cardGap;
}
