/**
 * Sprint D3 — estimativas de altura por seção (Layout Composer).
 * Valores em pt; calibrados para A4 com margens do dossiê editorial.
 */

import type { PdfBlock, PdfContent } from "@/lib/pdf-engine";

const ED = {
  TITLE: 30,
  BAR_GAP: 4,
  BLOCK_GAP: 8,
  HIGHLIGHT: 52,
  PARAGRAPH_LINE: 15,
  TIMELINE_ITEM: 24,
  DASHBOARD_CELL: 38,
  COMPARE_ROW: 22,
  EVA: 44,
};

export function estimateContentHeight(ch: PdfContent): number {
  if (ch.kind === "highlight") {
    const lines = Math.max(1, Math.ceil(String(ch.text).length / 70));
    return ED.HIGHLIGHT + lines * 8;
  }
  if (ch.kind === "paragraph") {
    const lines = Math.max(1, Math.ceil(String(ch.text).length / 85));
    return (ch.label ? 14 : 0) + lines * ED.PARAGRAPH_LINE;
  }
  if (ch.kind === "badge") {
    const lines = Math.max(1, Math.ceil(String(ch.text).length / 60));
    return (ch.label ? 12 : 0) + lines * 14 + 12;
  }
  if (ch.kind === "grid") {
    const cols = ch.columns ?? 2;
    const rows = Math.ceil(ch.rows.length / cols);
    return rows * 28 + 8;
  }
  if (ch.kind === "eva") return ED.EVA;
  if (ch.kind === "timeline") return ch.items.length * ED.TIMELINE_ITEM + 8;
  if (ch.kind === "dashboard") {
    const rows = Math.ceil(ch.items.length / ch.columns);
    return rows * ED.DASHBOARD_CELL + 8;
  }
  if (ch.kind === "compare-table") return 22 + ch.rows.length * ED.COMPARE_ROW;
  if (ch.kind === "compare-bars") return 8 + ch.rows.length * 36;
  if (ch.kind === "objective") return 40;
  if (ch.kind === "document-cards") {
    const rows = Math.ceil(ch.items.length / 2);
    return rows * 70 + 4;
  }
  if (ch.kind === "checks") return 20 + ch.items.filter((i) => i.checked).length * 14;
  if (ch.kind === "evolutions") return 40 + ch.items.length * 48;
  return 24;
}

export function estimateSectionHeight(block: PdfBlock): number {
  if (block.layout?.idealHeight) return block.layout.idealHeight;
  if (block.layout?.estimatedHeight) return block.layout.estimatedHeight;
  let h = ED.TITLE + ED.BAR_GAP;
  for (const ch of block.children) h += estimateContentHeight(ch);
  return h + ED.BLOCK_GAP;
}

export const SECTION_ESTIMATES = {
  identification: 420,
  timeline: 300,
  summary: 220,
  panorama: 280,
  objectives: 180,
  documents: 240,
  comparative: 200,
} as const;
