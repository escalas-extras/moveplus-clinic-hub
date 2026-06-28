/**
 * Sprint D3.2 — renderização de conteúdo editorial (dossiê).
 */

import type { jsPDF } from "jspdf";
import type { ClinicalTrend } from "../types";
import { PDF_COLORS as C, PDF_SPACING as S, PDF_TYPOGRAPHY as T } from "../tokens";
import { wrapText } from "../text";
import { drawMiniIcon, fieldIconFor } from "../icons";
import type { PublishingAtom, PublishingPage } from "./compose";
import { documentCardColumns } from "./dossier-visuals";
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
      doc.setFontSize(T.label);
      doc.setTextColor(...C.brand);
      doc.text(String(a.text).toUpperCase(), M + S.PAD_X, y + 8);
      y += 12;
      continue;
    }

    if (a.kind === "para-line") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      doc.setTextColor(...C.ink);
      doc.text(String(a.line), M + S.PAD_X, y + 9);
      y += a.h;
      continue;
    }

    if (a.kind === "grid-cards") {
      y = drawGridAsCards(doc, M + S.PAD_X, y, contentW - 2 * S.PAD_X, a.cells as Array<[string, string]>);
      continue;
    }

    if (a.kind === "grid-row") {
      const innerW = contentW - 2 * S.PAD_X;
      const colW = innerW / (a.cols as number);
      const cells = a.cells as Array<[string, string]>;
      let maxLines = 1;
      cells.forEach(([label, value], ci) => {
        const x = M + S.PAD_X + ci * colW;
        drawMiniIcon(doc, fieldIconFor(label), x, y + 1, 8, C.brand);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(T.label);
        doc.setTextColor(...C.meta);
        doc.text(label, x + 12, y + 7);
        if (value) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(T.body);
          doc.setTextColor(...C.ink);
          const lines = wrapText(doc, value, colW - 12);
          maxLines = Math.max(maxLines, lines.length);
          lines.forEach((ln, li) => {
            doc.text(ln, x, y + 18 + li * 13);
          });
        }
      });
      y += a.h;
      continue;
    }

    if (a.kind === "highlight") {
      const boxX = M + S.PAD_X;
      const boxW = contentW - 2 * S.PAD_X;
      const lines = a.lines as string[];
      const labelH = a.label ? 14 : 0;
      const textLineH = 12;
      const boxH = a.h as number;

      doc.setFillColor(...C.highlightBg);
      doc.roundedRect(boxX, y, boxW, boxH, 5, 5, "F");

      let textY = y + 11;
      if (a.label) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(T.label);
        doc.setTextColor(...C.brand);
        doc.text(String(a.label).toUpperCase(), boxX + 10, textY);
        textY += labelH;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      doc.setTextColor(...C.ink);
      lines.forEach((ln, i) => {
        doc.text(ln, boxX + 10, textY + i * textLineH);
      });

      y += boxH;
      continue;
    }

    if (a.kind === "eva") {
      y = drawPublishingEva(doc, a.value as number | null, M + S.PAD_X, y, contentW - 2 * S.PAD_X);
      continue;
    }

    if (a.kind === "objective") {
      y = drawObjectiveBadge(
        doc,
        M + S.PAD_X,
        y,
        contentW - 2 * S.PAD_X,
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
      const gap = 6;
      const cardW = (contentW - 2 * S.PAD_X - gap * (cols - 1)) / cols;
      const cardH = 58;
      items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = M + S.PAD_X + col * (cardW + gap);
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
        y = drawCompareBarsRow(doc, M + S.PAD_X, y, contentW - 2 * S.PAD_X, row.label, row.inicial, row.atual, max, row.trend);
      }
      continue;
    }

    if (a.kind === "badge") {
      y = drawAdaptiveBadge(
        doc,
        M + S.PAD_X,
        y,
        contentW - 2 * S.PAD_X,
        a.label as string | undefined,
        String(a.text),
        a.variant as "success" | "warning" | "danger" | "neutral" | "info",
      );
      continue;
    }

    if (a.kind === "dashboard") {
      y = drawPublishingDashboard(
        doc,
        M + S.PAD_X,
        y,
        contentW - 2 * S.PAD_X,
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
        M + S.PAD_X,
        y,
        contentW - 2 * S.PAD_X,
        a.items as Array<{ date: string; title: string }>,
      );
      continue;
    }

    if (a.kind === "compare-table") {
      drawCompareTableCompact(doc, M + S.PAD_X, y, contentW - 2 * S.PAD_X, a.rows as Array<{
        label: string;
        inicial: string;
        anterior: string;
        atual: string;
        trend?: ClinicalTrend;
      }>);
      y += a.h;
      continue;
    }

    if (a.kind === "checks-row") {
      const innerW = contentW - 2 * S.PAD_X;
      const items = a.items as Array<{ label: string; checked: boolean }>;
      const colW = innerW / items.length;
      items.forEach((it, ci) => {
        const x = M + S.PAD_X + ci * colW;
        doc.setDrawColor(...C.hairlineSoft);
        doc.rect(x, y + 2, 9, 9, "S");
        if (it.checked) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...C.brand);
          doc.text("✓", x + 2, y + 9);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
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
      doc.setFontSize(T.label);
      doc.setTextColor(...C.brand);
      doc.text(head.toUpperCase(), M + S.PAD_X, y + 9);
      let ey = y + 16;
      for (const f of a.lines as Array<{ label: string; text: string[] }>) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.meta);
        doc.text(f.label.toUpperCase(), M + S.PAD_X, ey);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.ink);
        doc.text(f.text, M + S.PAD_X, ey + 10);
        ey += 10 + f.text.length * 13;
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
  doc.roundedRect(x, y, w, 16, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.brand);
  ["Indicador", "Inicial", "Anterior", "Atual"].forEach((h, i) => {
    doc.text(h.toUpperCase(), x + i * colW + 4, y + 10);
  });
  let rowY = y + 18;
  rows.forEach((row, ri) => {
    const cells = [row.label, row.inicial, row.anterior, row.atual];
    const lineCounts = cells.map((cell, i) => wrapText(doc, cell, colW - 6).length);
    const rowH = Math.max(...lineCounts, 1) * 13 + 4;
    if (ri % 2 === 0) {
      doc.setFillColor(...C.brandSoft);
      doc.rect(x, rowY - 1, w, rowH, "F");
    }
    cells.forEach((cell, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...(i === 0 ? C.ink : C.meta));
      doc.text(wrapText(doc, cell, colW - 6), x + i * colW + 4, rowY + 9);
    });
    rowY += rowH;
  });
}
