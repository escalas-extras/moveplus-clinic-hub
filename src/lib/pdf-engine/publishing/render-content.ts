/**
 * Sprint D3.2 + D5 — renderização editorial do dossiê (tokens unificados).
 */

import type { jsPDF } from "jspdf";
import type { ClinicalTrend } from "../types";
import { PDF_COLORS as C } from "../tokens";
import { wrapText } from "../text";
import { drawMiniIcon, fieldIconFor } from "../icons";
import type { PublishingAtom, PublishingPage } from "./compose";
import { documentCardColumns } from "./dossier-visuals";
import { PUB_LAYOUT, PUB_SPACE, PUB_TYPE } from "./typography";
import {
  drawAdaptiveBadge,
  drawCompareBarsRow,
  drawDocumentCard,
  drawGridAsCards,
  drawObjectiveBadge,
  drawPublishingDashboard,
  drawPublishingEva,
  drawPublishingTimeline,
  drawPublishingTitle,
} from "./primitives";

const PAD = PUB_SPACE.contentPadX;

export function renderPublishingPageContent(
  doc: jsPDF,
  page: PublishingPage,
  topY: number,
  contentW: number,
  M: number,
) {
  let y = topY;

  for (const a of page.atoms) {
    if (a.kind === "title") {
      y = drawPublishingTitle(doc, String(a.label), M, y, contentW);
      continue;
    }

    if (a.kind === "label") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(PUB_TYPE.label);
      doc.setTextColor(...C.brand);
      doc.text(String(a.text).toUpperCase(), M + PAD, y + 8);
      y += PUB_LAYOUT.labelH;
      continue;
    }

    if (a.kind === "para-line") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(PUB_TYPE.body);
      doc.setTextColor(...C.ink);
      doc.text(String(a.line), M + PAD, y + 9);
      y += a.h;
      continue;
    }

    if (a.kind === "grid-cards") {
      y = drawGridAsCards(doc, M + PAD, y, contentW - 2 * PAD, a.cells as Array<[string, string]>);
      continue;
    }

    if (a.kind === "grid-row") {
      const innerW = contentW - 2 * PAD;
      const colW = innerW / (a.cols as number);
      const cells = a.cells as Array<[string, string]>;
      cells.forEach(([label, value], ci) => {
        const x = M + PAD + ci * colW;
        drawMiniIcon(doc, fieldIconFor(label), x, y + 1, 8, C.brand);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(PUB_TYPE.label);
        doc.setTextColor(...C.meta);
        doc.text(label.toUpperCase(), x + 12, y + 7);
        if (value) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(PUB_TYPE.body);
          doc.setTextColor(...C.ink);
          const lines = wrapText(doc, value, colW - 12);
          lines.forEach((ln, li) => {
            doc.text(ln, x, y + 18 + li * PUB_LAYOUT.lineH);
          });
        }
      });
      y += a.h;
      continue;
    }

    if (a.kind === "highlight") {
      const boxX = M + PAD;
      const boxW = contentW - 2 * PAD;
      const lines = a.lines as string[];
      const labelH = a.label ? 14 : 0;
      const textLineH = PUB_LAYOUT.lineH;
      const boxH = a.h as number;

      doc.setFillColor(...C.highlightBg);
      doc.setDrawColor(...C.hairline);
      doc.setLineWidth(0.25);
      doc.roundedRect(boxX, y, boxW, boxH, PUB_LAYOUT.cardRadius, PUB_LAYOUT.cardRadius, "FD");

      let textY = y + 11;
      if (a.label) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(PUB_TYPE.label);
        doc.setTextColor(...C.brand);
        doc.text(String(a.label).toUpperCase(), boxX + PUB_SPACE.cardPad, textY);
        textY += labelH;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(PUB_TYPE.body);
      doc.setTextColor(...C.ink);
      lines.forEach((ln, i) => {
        doc.text(ln, boxX + PUB_SPACE.cardPad, textY + i * textLineH);
      });

      y += boxH;
      continue;
    }

    if (a.kind === "eva") {
      y = drawPublishingEva(doc, a.value as number | null, M + PAD, y, contentW - 2 * PAD);
      continue;
    }

    if (a.kind === "objective") {
      y = drawObjectiveBadge(
        doc,
        M + PAD,
        y,
        contentW - 2 * PAD,
        a.label as string | undefined,
        String(a.text),
        a.status as "achieved" | "pending" | "progress",
      );
      continue;
    }

    if (a.kind === "document-cards") {
      const items = a.items as Array<{
        docType: string;
        quantity: number;
        lastIssued: string;
        hash: string;
      }>;
      const cols = documentCardColumns(items.length);
      const gap = PUB_SPACE.cardGap;
      const cardW = (contentW - 2 * PAD - gap * (cols - 1)) / cols;
      const cardH = PUB_LAYOUT.documentCardH;
      items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = M + PAD + col * (cardW + gap);
        const cy = y + row * (cardH + gap);
        drawDocumentCard(doc, cx, cy, cardW, item.docType, item.quantity, item.lastIssued, item.hash);
      });
      const rows = Math.ceil(items.length / cols);
      y += rows * (cardH + gap);
      continue;
    }

    if (a.kind === "compare-bars") {
      const rows = a.rows as Array<{
        label: string;
        inicial: number;
        atual: number;
        max?: number;
        trend?: ClinicalTrend;
      }>;
      for (const row of rows) {
        const max = row.max ?? Math.max(row.inicial, row.atual, 10);
        y = drawCompareBarsRow(
          doc,
          M + PAD,
          y,
          contentW - 2 * PAD,
          row.label,
          row.inicial,
          row.atual,
          max,
          row.trend,
        );
      }
      continue;
    }

    if (a.kind === "badge") {
      y = drawAdaptiveBadge(
        doc,
        M + PAD,
        y,
        contentW - 2 * PAD,
        a.label as string | undefined,
        String(a.text),
        a.variant as "success" | "warning" | "danger" | "neutral" | "info",
      );
      continue;
    }

    if (a.kind === "dashboard") {
      y = drawPublishingDashboard(
        doc,
        M + PAD,
        y,
        contentW - 2 * PAD,
        a.columns as 2 | 3,
        a.items as Array<{
          label: string;
          value: string;
          variant?: "success" | "warning" | "info" | "neutral" | "danger";
          barValue?: number;
          barMax?: number;
        }>,
      );
      continue;
    }

    if (a.kind === "timeline") {
      y = drawPublishingTimeline(
        doc,
        M + PAD,
        y,
        contentW - 2 * PAD,
        a.items as Array<{ date: string; title: string }>,
      );
      continue;
    }

    if (a.kind === "compare-table") {
      drawCompareTableCompact(
        doc,
        M + PAD,
        y,
        contentW - 2 * PAD,
        a.rows as Array<{
          label: string;
          inicial: string;
          anterior: string;
          atual: string;
          trend?: ClinicalTrend;
        }>,
      );
      y += a.h;
      continue;
    }

    if (a.kind === "checks-row") {
      const innerW = contentW - 2 * PAD;
      const items = a.items as Array<{ label: string; checked: boolean }>;
      const colW = innerW / items.length;
      items.forEach((it, ci) => {
        const x = M + PAD + ci * colW;
        doc.setDrawColor(...C.hairline);
        doc.setLineWidth(0.35);
        doc.rect(x, y + 2, 9, 9, "S");
        if (it.checked) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(PUB_TYPE.body);
          doc.setTextColor(...C.brand);
          doc.text("✓", x + 2, y + 9);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(PUB_TYPE.body);
        doc.setTextColor(...C.ink);
        doc.text(it.label, x + 14, y + 9);
      });
      y += a.h;
      continue;
    }

    if (a.kind === "evolution") {
      const e = a.item as { index?: number; data: string; hora?: string | null };
      const head = `${e.index != null ? `#${e.index} — ` : ""}${e.data}${e.hora ? ` · ${e.hora}` : ""}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(PUB_TYPE.label);
      doc.setTextColor(...C.brand);
      doc.text(head.toUpperCase(), M + PAD, y + 9);
      let ey = y + 16;
      for (const f of a.lines as Array<{ label: string; text: string[] }>) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(PUB_TYPE.caption);
        doc.setTextColor(...C.meta);
        doc.text(f.label.toUpperCase(), M + PAD, ey);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(PUB_TYPE.body);
        doc.setTextColor(...C.ink);
        doc.text(f.text, M + PAD, ey + 10);
        ey += 10 + f.text.length * PUB_LAYOUT.lineH;
      }
      y += a.h;
      continue;
    }

    if (a.kind === "block-gap") {
      y += a.h;
    }
  }
}

function drawCompareTableCompact(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  rows: Array<{ label: string; inicial: string; anterior: string; atual: string; trend?: ClinicalTrend }>,
) {
  const colW = w / 4;
  doc.setFillColor(...C.surface);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, 16, PUB_LAYOUT.badgeRadius, PUB_LAYOUT.badgeRadius, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(PUB_TYPE.caption);
  doc.setTextColor(...C.brand);
  ["Indicador", "Inicial", "Anterior", "Atual"].forEach((h, i) => {
    doc.text(h.toUpperCase(), x + i * colW + 4, y + 10);
  });
  let rowY = y + 18;
  rows.forEach((row, ri) => {
    const cells = [row.label, row.inicial, row.anterior, row.atual];
    const lineCounts = cells.map((cell) => wrapText(doc, cell, colW - 6).length);
    const rowH = Math.max(...lineCounts, 1) * PUB_LAYOUT.lineH + 4;
    if (ri % 2 === 0) {
      doc.setFillColor(...C.brandSoft);
      doc.rect(x, rowY - 1, w, rowH, "F");
    }
    cells.forEach((cell, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(PUB_TYPE.subtitle);
      doc.setTextColor(...(i === 0 ? C.ink : C.meta));
      doc.text(wrapText(doc, cell, colW - 6), x + i * colW + 4, rowY + 9);
    });
    rowY += rowH;
  });
}
