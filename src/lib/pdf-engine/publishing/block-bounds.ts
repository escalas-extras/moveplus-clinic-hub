/**
 * Sprint D3.2 — limites de altura por tipo de bloco/conteúdo.
 * min / ideal / max em pt (A4, margens do dossiê editorial).
 */

import type { PdfBlock, PdfContent } from "../types";

export type BlockBounds = { min: number; ideal: number; max: number };

export const PUBLISHING_BOUNDS: Record<string, BlockBounds> = {
  title: { min: 22, ideal: 28, max: 34 },
  paragraph: { min: 80, ideal: 140, max: 260 },
  highlight: { min: 48, ideal: 72, max: 120 },
  badge: { min: 36, ideal: 52, max: 88 },
  eva: { min: 44, ideal: 52, max: 64 },
  timeline: { min: 80, ideal: 160, max: 320 },
  dashboard: { min: 100, ideal: 180, max: 280 },
  compareBars: { min: 60, ideal: 120, max: 220 },
  compareTable: { min: 80, ideal: 160, max: 400 },
  objective: { min: 32, ideal: 44, max: 72 },
  documentCard: { min: 48, ideal: 64, max: 96 },
  gridRow: { min: 24, ideal: 32, max: 48 },
};

const SECTION_DEFAULTS: Record<string, BlockBounds> = {
  Identificação: { min: 280, ideal: 420, max: 560 },
  "Panorama do caso": { min: 120, ideal: 200, max: 280 },
  "Panorama comparativo": { min: 80, ideal: 160, max: 240 },
  "Objetivos terapêuticos": { min: 80, ideal: 180, max: 320 },
  "Linha do tempo do tratamento": { min: 120, ideal: 240, max: 360 },
  "Documentos emitidos": { min: 80, ideal: 160, max: 280 },
  "Resumo do caso": { min: 80, ideal: 180, max: 260 },
};

export function boundsForBlock(block: PdfBlock): BlockBounds {
  if (block.layout?.minHeight != null && block.layout?.idealHeight != null && block.layout?.maxHeight != null) {
    return {
      min: block.layout.minHeight,
      ideal: block.layout.idealHeight,
      max: block.layout.maxHeight,
    };
  }
  return SECTION_DEFAULTS[block.title] ?? { min: 60, ideal: 120, max: 320 };
}

export function clampHeight(h: number, bounds: BlockBounds): number {
  return Math.max(bounds.min, Math.min(bounds.max, h));
}

export function estimateContentBounds(ch: PdfContent): BlockBounds {
  switch (ch.kind) {
    case "paragraph":
      return PUBLISHING_BOUNDS.paragraph;
    case "highlight":
      return PUBLISHING_BOUNDS.highlight;
    case "badge":
      return PUBLISHING_BOUNDS.badge;
    case "eva":
      return PUBLISHING_BOUNDS.eva;
    case "timeline":
      return {
        ...PUBLISHING_BOUNDS.timeline,
        ideal: Math.min(PUBLISHING_BOUNDS.timeline.max, 26 * ch.items.length + 12),
      };
    case "dashboard": {
      const rows = Math.ceil(ch.items.length / ch.columns);
      const hasBars = ch.items.some((i) => i.barValue != null);
      const cellH = hasBars ? 48 : 38;
      return {
        min: 80,
        ideal: rows * cellH + 8,
        max: rows * cellH + 16,
      };
    }
    case "compare-bars":
      return {
        ...PUBLISHING_BOUNDS.compareBars,
        ideal: 28 + ch.rows.length * 36,
      };
    case "compare-table":
      return {
        ...PUBLISHING_BOUNDS.compareTable,
        ideal: 22 + ch.rows.length * 28,
      };
    case "objective":
      return PUBLISHING_BOUNDS.objective;
    case "document-cards": {
      const rows = Math.ceil(ch.items.length / 2);
      return { min: 48, ideal: rows * 72 + 8, max: rows * 88 + 12 };
    }
    case "grid":
      return PUBLISHING_BOUNDS.gridRow;
    default:
      return { min: 24, ideal: 48, max: 120 };
  }
}

/** Meta editorial: páginas entre 75% e 90% ocupadas. */
export const DENSITY_TARGET = { min: 0.75, max: 0.9, rebalanceBelow: 0.65 } as const;
