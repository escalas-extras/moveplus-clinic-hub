/**
 * Sprint D3.2 — medição editorial de blocos para composição.
 */

import type { jsPDF } from "jspdf";
import type { PdfBlock } from "../types";
import { PDF_SPACING as S, PDF_TYPOGRAPHY as T } from "../tokens";
import { cleanText, isEmptyText, wrapText } from "../text";
import { documentCardColumns } from "./dossier-visuals";
import type { PublishingBlockGroup, PublishingAtom } from "./compose";

function isClosingClause(title: string): boolean {
  return /foro|oitava|encerramento/i.test(title || "");
}

function sanitizeContractParagraph(raw: string): string {
  const cutMarker = /(jur[ií]dicos e legais efeitos\.)/i;
  const m = raw.match(cutMarker);
  if (!m) return raw;
  return raw.slice(0, (m.index ?? 0) + m[0].length).trimEnd();
}

export function measurePublishingBlock(
  doc: jsPDF,
  block: PdfBlock,
  id: number,
  contentW: number,
  isContract = false,
): PublishingBlockGroup {
  const atoms: PublishingAtom[] = [];
  const padX2 = S.PAD_X * 2;
  const innerW = contentW - padX2;
  const lineH = 13;
  const titleH = 20;

  atoms.push({ kind: "title", label: block.title, h: titleH, blockId: id });

  for (const ch of block.children) {
    if (ch.kind === "paragraph") {
      let text = ch.text || "";
      if (isContract && isClosingClause(block.title)) text = sanitizeContractParagraph(text);
      const cleaned = cleanText(text);
      if (!cleaned) {
        if (ch.label) atoms.push({ kind: "label", text: ch.label, h: 12, blockId: id });
        continue;
      }
      if (ch.label) atoms.push({ kind: "label", text: ch.label, h: 12, blockId: id });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      wrapText(doc, cleaned, innerW).forEach((ln, i) => {
        atoms.push({
          kind: "para-line",
          line: ln,
          h: lineH,
          blockId: id,
          splitMarker: i === 0 ? "first" : "last",
        });
      });
      continue;
    }

    if (ch.kind === "grid") {
      const cols = ch.columns ?? 2;
      const visibleRows: Array<[string, string]> = [];
      for (let i = 0; i < ch.rows.length; i += cols) {
        const rowCells = ch.rows.slice(i, i + cols).map((r) => [r[0], r[1] ?? ""] as [string, string]);
        if (rowCells.every(([, v]) => isEmptyText(v))) continue;
        rowCells.forEach(([k, v]) => {
          if (!isEmptyText(v)) visibleRows.push([k, v]);
        });
      }
      if (visibleRows.length <= 4) {
        const rows = Math.ceil(visibleRows.length / 2);
        atoms.push({ kind: "grid-cards", cells: visibleRows, h: rows * 42 + 4, blockId: id });
      } else {
        const colW = innerW / cols;
        for (let i = 0; i < ch.rows.length; i += cols) {
          const rowCells = ch.rows.slice(i, i + cols).map((r) => [r[0], r[1] ?? ""] as [string, string]);
          if (rowCells.every(([, v]) => isEmptyText(v))) continue;
          const visibleCells = rowCells.map(([k, v]) => [k, isEmptyText(v) ? "" : v] as [string, string]);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(T.body);
          const cellH = visibleCells.map(([, v]) =>
            v ? wrapText(doc, v, colW - 8).length * lineH : 0,
          );
          atoms.push({
            kind: "grid-row",
            cells: visibleCells,
            cols: cols as 1 | 2,
            h: 12 + Math.max(...cellH, lineH) + 4,
            blockId: id,
          });
        }
      }
      continue;
    }

    if (ch.kind === "highlight") {
      const text = cleanText(ch.text);
      if (!text) continue;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      const lines = wrapText(doc, text, innerW - 20);
      const labelH = ch.label ? 14 : 0;
      const textLineH = 12;
      const h = labelH + 12 + lines.length * textLineH + 10;
      atoms.push({
        kind: "highlight",
        label: ch.label,
        lines,
        h,
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "eva") {
      atoms.push({ kind: "eva", value: ch.value, h: 56, blockId: id });
      continue;
    }

    if (ch.kind === "checks") {
      if (ch.label) atoms.push({ kind: "label", text: ch.label, h: 12, blockId: id });
      for (let i = 0; i < ch.items.length; i += 3) {
        atoms.push({ kind: "checks-row", items: ch.items.slice(i, i + 3), h: 16, blockId: id });
      }
      continue;
    }

    if (ch.kind === "objective") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      const lines = wrapText(doc, ch.text, innerW - 52).length;
      atoms.push({
        kind: "objective",
        label: ch.label,
        text: ch.text,
        status: ch.status,
        h: Math.max(36, 14 + lines * 13 + 10),
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "document-cards") {
      const cols = documentCardColumns(ch.items.length);
      const rows = Math.ceil(ch.items.length / cols);
      atoms.push({ kind: "document-cards", items: ch.items, h: rows * 62 + 4, blockId: id });
      continue;
    }

    if (ch.kind === "compare-bars") {
      atoms.push({
        kind: "compare-bars",
        rows: ch.rows,
        h: 8 + ch.rows.length * 38,
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "badge") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      const lines = wrapText(doc, ch.text, innerW - 20).length;
      atoms.push({
        kind: "badge",
        label: ch.label,
        text: ch.text,
        variant: ch.variant,
        h: (ch.label ? 12 : 0) + Math.max(lines, 1) * lineH + 10,
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "dashboard") {
      if (!ch.items.length) continue;
      const cellH = 46;
      const gap = 5;
      const rows = Math.ceil(ch.items.length / ch.columns);
      const h = rows * cellH + Math.max(0, rows - 1) * gap;
      atoms.push({
        kind: "dashboard",
        columns: ch.columns,
        items: ch.items,
        h,
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "timeline") {
      if (!ch.items.length) continue;
      atoms.push({
        kind: "timeline",
        items: ch.items,
        h: ch.items.length * 28 + 4,
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "compare-table") {
      if (!ch.rows.length) continue;
      if (ch.rows.length <= 3) {
        const numericRows = ch.rows
          .map((r) => ({
            label: r.label,
            inicial: parseFloat(String(r.inicial).replace(/[^\d.,-]/g, "").replace(",", ".")),
            atual: parseFloat(String(r.atual).replace(/[^\d.,-]/g, "").replace(",", ".")),
            trend: r.trend,
          }))
          .filter((r) => !Number.isNaN(r.inicial) && !Number.isNaN(r.atual));
        if (numericRows.length === ch.rows.length) {
          const max = Math.max(...numericRows.flatMap((r) => [r.inicial, r.atual]), 10);
          atoms.push({
            kind: "compare-bars",
            rows: numericRows.map((r) => ({ ...r, max })),
            h: 8 + numericRows.length * 38,
            blockId: id,
          });
          continue;
        }
      }
      const colW = (innerW - 8) / 4;
      let tableH = 20;
      for (const row of ch.rows) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(T.body);
        const heights = [
          wrapText(doc, row.label, colW - 4).length,
          wrapText(doc, row.inicial, colW - 4).length,
          wrapText(doc, row.anterior, colW - 4).length,
          wrapText(doc, row.atual, colW - 4).length,
        ];
        tableH += Math.max(...heights, 1) * lineH + 4;
      }
      atoms.push({ kind: "compare-table", rows: ch.rows, h: tableH, blockId: id });
      continue;
    }

    if (ch.kind === "evolutions") {
      for (const e of ch.items) {
        const fields: { label: string; text: string[] }[] = [];
        const add = (label: string, val: string | null | undefined) => {
          const v = cleanText(val);
          if (!v) return;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(T.body);
          fields.push({ label, text: wrapText(doc, v, innerW - 8) });
        };
        add("Conduta", e.conduta);
        add("Resultado", e.resultado);
        add("Intercorrências", e.intercorrencias);
        add("Próximos passos", e.proximos);
        const linesTotal = fields.reduce((s, f) => s + 12 + f.text.length * lineH, 0);
        atoms.push({ kind: "evolution", item: e, lines: fields, h: 12 + linesTotal + 6, blockId: id });
      }
      continue;
    }
  }

  atoms.push({ kind: "block-gap", h: 5, blockId: id });
  const totalH = atoms.reduce((s, a) => s + a.h, 0);
  return { id, title: block.title, atoms, totalH, indexLabel: block.indexLabel };
}
