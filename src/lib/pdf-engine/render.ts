// Orquestrador principal do motor PDF — composição, paginação e render.

import { jsPDF } from "jspdf";
import type {
  BuildPdfOpts,
  ClinicData,
  ClinicalTrend,
  EvolutionItem,
  PdfBlock,
  PdfContent,
  PdfRenderCtx,
  PdfSection,
  Professional,
} from "./types";
import { PDF_COLORS as C, PDF_SPACING as S, PDF_TYPOGRAPHY as T, applyClinicPalette } from "./tokens";
import { cleanText, isEmptyText, wrapText } from "./text";
import { prepareLogoForPdf } from "./logo";
import { drawDocumentHeader, drawLeftBand, drawLegacyClinicHeader } from "./header-engine";
import { drawDocumentFooter, drawValidationQr } from "./footer-engine";
import { drawMiniIcon, fieldIconFor } from "./icons";

// ---------- Sanitização contrato ----------

function sanitizeContractParagraph(raw: string): string {
  const cutMarker = /(jur[ií]dicos e legais efeitos\.)/i;
  const m = raw.match(cutMarker);
  if (!m) return raw;
  const idx = (m.index ?? 0) + m[0].length;
  return raw.slice(0, idx).trimEnd();
}

function isClosingClause(title: string): boolean {
  return /foro|oitava|encerramento/i.test(title || "");
}

// ---------- Atom model ----------

type Atom =
  | { kind: "title"; label: string; h: number; continuation?: boolean; blockId: number }
  | { kind: "label"; text: string; h: number; blockId: number }
  | { kind: "para-line"; line: string; h: number; blockId: number; splitMarker?: "first" | "mid" | "last" }
  | { kind: "grid-row"; cells: Array<[string, string]>; cols: 1 | 2; h: number; blockId: number }
  | { kind: "highlight"; label: string; lines: string[]; h: number; blockId: number }
  | { kind: "eva"; value: number | null; h: number; blockId: number }
  | { kind: "checks-row"; items: Array<{ label: string; checked: boolean }>; h: number; blockId: number }
  | { kind: "evolution"; item: EvolutionItem; lines: { label: string; text: string[] }[]; h: number; blockId: number }
  | { kind: "badge"; label?: string; text: string; variant: "success" | "warning" | "danger" | "neutral"; h: number; blockId: number }
  | { kind: "compare-table"; rows: Array<{ label: string; inicial: string; anterior: string; atual: string; trend?: ClinicalTrend }>; h: number; blockId: number }
  | { kind: "block-gap"; h: number; blockId: number };

type BlockGroup = { id: number; title: string; atoms: Atom[]; totalH: number };

type Page = {
  atoms: Atom[];
  blockSegments: Array<{ blockId: number; startIdx: number; endIdx: number; isContinuation: boolean }>;
  contentH: number;
  topY: number;
};

// ---------- Measurement ----------

function measureBlock(doc: jsPDF, block: PdfBlock, id: number, contentW: number, isContract: boolean): BlockGroup {
  const atoms: Atom[] = [];
  const padX2 = S.PAD_X * 2;
  const innerW = contentW - padX2;

  atoms.push({ kind: "title", label: block.title, h: S.BAR_H + S.BAR_GAP, blockId: id });

  for (const ch of block.children) {
    if (ch.kind === "paragraph") {
      let text = ch.text || "";
      if (isContract && isClosingClause(block.title)) text = sanitizeContractParagraph(text);
      const cleaned = cleanText(text);
      if (!cleaned) continue;
      if (ch.label) {
        atoms.push({ kind: "label", text: ch.label, h: S.LABEL_H, blockId: id });
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      const lines = wrapText(doc, cleaned, innerW);
      lines.forEach((ln, i) => {
        atoms.push({
          kind: "para-line",
          line: ln,
          h: S.LINE_H,
          blockId: id,
          splitMarker: i === 0 ? "first" : i === lines.length - 1 ? "last" : "mid",
        });
      });
      continue;
    }

    if (ch.kind === "grid") {
      const cols = ch.columns ?? 2;
      const colW = innerW / cols;
      for (let i = 0; i < ch.rows.length; i += cols) {
        const rowCells = ch.rows.slice(i, i + cols).map((r) => [r[0], r[1] ?? ""] as [string, string]);
        const allEmpty = rowCells.every(([, v]) => isEmptyText(v));
        if (allEmpty) continue;
        const visibleCells = rowCells.map(([k, v]) => [k, isEmptyText(v) ? "" : v] as [string, string]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(T.body);
        const cellH = visibleCells.map(([, v]) =>
          v ? wrapText(doc, v, colW - 8).length * S.LINE_H : 0,
        );
        const rowH = S.LABEL_H + Math.max(...cellH, S.LINE_H) + 6;
        atoms.push({ kind: "grid-row", cells: visibleCells, cols: cols as 1 | 2, h: rowH, blockId: id });
      }
      continue;
    }

    if (ch.kind === "highlight") {
      const text = cleanText(ch.text);
      if (!text) continue;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      const lines = wrapText(doc, text, innerW - 20);
      const h = 14 + lines.length * S.LINE_H + 10;
      atoms.push({ kind: "highlight", label: ch.label, lines, h, blockId: id });
      continue;
    }

    if (ch.kind === "eva") {
      atoms.push({ kind: "eva", value: ch.value, h: 92, blockId: id });
      continue;
    }

    if (ch.kind === "checks") {
      const perRow = 3;
      for (let i = 0; i < ch.items.length; i += perRow) {
        atoms.push({
          kind: "checks-row",
          items: ch.items.slice(i, i + perRow),
          h: 18,
          blockId: id,
        });
      }
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
        const linesTotal = fields.reduce((s, f) => s + S.LABEL_H + f.text.length * S.LINE_H, 0);
        const h = 14 + linesTotal + 8;
        atoms.push({ kind: "evolution", item: e, lines: fields, h, blockId: id });
      }
      continue;
    }

    if (ch.kind === "badge") {
      atoms.push({
        kind: "badge",
        label: ch.label,
        text: ch.text,
        variant: ch.variant,
        h: ch.label ? 28 : 22,
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "compare-table") {
      if (!ch.rows.length) continue;
      const colW = (innerW - 8) / 4;
      let tableH = 22;
      for (const row of ch.rows) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(T.body);
        const heights = [
          wrapText(doc, row.label, colW - 4).length,
          wrapText(doc, row.inicial, colW - 4).length,
          wrapText(doc, row.anterior, colW - 4).length,
          wrapText(doc, row.atual, colW - 4).length,
        ];
        tableH += Math.max(...heights, 1) * S.LINE_H + 8;
      }
      atoms.push({ kind: "compare-table", rows: ch.rows, h: tableH, blockId: id });
      continue;
    }
  }

  atoms.push({ kind: "block-gap", h: S.BLOCK_GAP, blockId: id });
  const totalH = atoms.reduce((s, a) => s + a.h, 0);
  return { id, title: block.title, atoms, totalH };
}

// ---------- Composition ----------

function compose(
  groups: BlockGroup[],
  topYFirst: number,
  topYRest: number,
  bottomY: number,
  signatureReserveH: number,
  blockGap: number,
): Page[] {
  const pages: Page[] = [];
  let cur: Page = { atoms: [], blockSegments: [], contentH: 0, topY: topYFirst };
  let y = topYFirst;

  const flush = () => {
    pages.push(cur);
    cur = { atoms: [], blockSegments: [], contentH: 0, topY: topYRest };
    y = topYRest;
  };

  const isLastGroup = (gi: number) => gi === groups.length - 1;

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const isLast = isLastGroup(gi);
    const localBottom = isLast ? bottomY - signatureReserveH : bottomY;

    const firstParaLines = g.atoms.filter((a) => a.kind === "para-line" && a.blockId === g.id);
    const headroomLines = Math.min(4, firstParaLines.length || 4);
    const titleAtom = g.atoms[0];
    const headroom = titleAtom.h + headroomLines * S.LINE_H + 4;

    if (y + headroom > localBottom && cur.atoms.length > 0) {
      flush();
    }

    let segStartIdx = cur.atoms.length;
    let isContinuation = false;

    for (let ai = 0; ai < g.atoms.length; ai++) {
      const a = g.atoms[ai];
      const atom: Atom = a.kind === "block-gap" ? { ...a, h: blockGap } : a;

      const bottom = isLast ? bottomY - signatureReserveH : bottomY;
      const fits = y + atom.h <= bottom;

      if (atom.kind === "title") {
        cur.atoms.push(atom);
        cur.contentH += atom.h;
        y += atom.h;
        continue;
      }

      if (fits) {
        cur.atoms.push(atom);
        cur.contentH += atom.h;
        y += atom.h;
        continue;
      }

      if (atom.kind === "para-line") {
        cur.blockSegments.push({ blockId: g.id, startIdx: segStartIdx, endIdx: cur.atoms.length - 1, isContinuation });
        flush();
        const contTitle: Atom = {
          kind: "title",
          label: `${g.title} (continuação)`,
          h: S.BAR_H + S.BAR_GAP,
          blockId: g.id,
          continuation: true,
        };
        cur.atoms.push(contTitle);
        cur.contentH += contTitle.h;
        y += contTitle.h;
        segStartIdx = 0;
        isContinuation = true;
        cur.atoms.push(atom);
        cur.contentH += atom.h;
        y += atom.h;
        continue;
      }

      cur.blockSegments.push({ blockId: g.id, startIdx: segStartIdx, endIdx: cur.atoms.length - 1, isContinuation });
      flush();
      const contTitle: Atom = {
        kind: "title",
        label: `${g.title} (continuação)`,
        h: S.BAR_H + S.BAR_GAP,
        blockId: g.id,
        continuation: true,
      };
      cur.atoms.push(contTitle);
      cur.contentH += contTitle.h;
      y += contTitle.h;
      segStartIdx = 0;
      isContinuation = true;
      cur.atoms.push(atom);
      cur.contentH += atom.h;
      y += atom.h;
    }

    cur.blockSegments.push({ blockId: g.id, startIdx: segStartIdx, endIdx: cur.atoms.length - 1, isContinuation });
  }

  if (cur.atoms.length > 0) pages.push(cur);
  return pages;
}

function lastPageFill(pages: Page[], usableH: number, sigH: number): number {
  if (pages.length === 0) return 0;
  const last = pages[pages.length - 1];
  return Math.min(1, (last.contentH + sigH) / usableH);
}

// ---------- Render entry ----------

export async function renderPdf(opts: BuildPdfOpts, ctx: PdfRenderCtx): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = S.M;
  const contentW = W - 2 * M;
  const c = ctx.clinic;
  applyClinicPalette(c);

  const preparedLogo = await prepareLogoForPdf(ctx.logo);
  const logoDraw = preparedLogo ?? ctx.logo;

  const isContract = /contrato/i.test(opts.title || "");
  const isClinicalPremium = opts.layout === "clinical-premium";
  const isMatrixV2 = isContract || isClinicalPremium;

  const blocks: PdfBlock[] = opts.blocks
    ? opts.blocks
    : (opts.sections ?? []).map((s) => ({
        title: s.title,
        children: [{ kind: "paragraph" as const, text: s.body || "" }],
      }));

  const groups: BlockGroup[] = blocks.map((b, i) => measureBlock(doc, b, i, contentW, isContract));

  const topYFirst = isClinicalPremium
    ? S.HEADER_H + 12
    : S.HEADER_H + S.TOP_AFTER_HEADER + 13 + (opts.subtitle ? 12 : 0) + S.TITLE_TO_DIVIDER + S.DIVIDER_TO_CONTENT;
  const topYRest = S.M + 28;
  const bottomY = H - S.FOOTER_H - 16;
  const sigDraw = isContract ? S.SIG_CONTRACT_H : S.SIG_DEFAULT_H;
  const usableHRest = bottomY - topYRest;

  const qrReserve = isContract ? 64 : 0;
  const sigReserve = opts.hideSignature ? 0 : isContract ? sigDraw + qrReserve : 0;
  const gapTiers: number[] = isContract
    ? [S.BLOCK_GAP_CONTRACT, S.BLOCK_GAP, S.BLOCK_GAP_COMPACT]
    : [S.BLOCK_GAP, S.BLOCK_GAP_COMPACT, S.BLOCK_GAP_TIGHT];

  let pages = compose(groups, topYFirst, topYRest, bottomY, sigReserve, gapTiers[0]);
  for (let t = 1; t < gapTiers.length; t++) {
    const fill = lastPageFill(pages, usableHRest, sigReserve);
    if (fill >= 0.5 || pages.length === 1) break;
    const next = compose(groups, topYFirst, topYRest, bottomY, sigReserve, gapTiers[t]);
    if (next.length < pages.length || lastPageFill(next, usableHRest, sigReserve) > fill) {
      pages = next;
    }
  }

  if (isClinicalPremium) {
    drawDocumentHeader(doc, c, W, opts, {
      logo: logoDraw,
      includeDocumentCard: true,
      includeBottomRule: true,
      isContract: false,
    });
  } else {
    drawLegacyClinicHeader(doc, c, logoDraw, W);

    let titleY = S.HEADER_H + S.TOP_AFTER_HEADER;
    doc.setTextColor(...C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.docTitle + 1);
    doc.text(opts.title, M, titleY);
    if (opts.subtitle) {
      titleY += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.docSubtitle);
      doc.setTextColor(...C.meta);
      doc.text(opts.subtitle, M, titleY);
    }
    if (opts.patientName) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.docSubtitle);
      doc.setTextColor(...C.meta);
      doc.text(opts.patientName, W - M, S.HEADER_H + S.TOP_AFTER_HEADER, { align: "right" });
    }

    const dividerY = S.HEADER_H + S.TOP_AFTER_HEADER + 13 + (opts.subtitle ? 12 : 0) + S.TITLE_TO_DIVIDER;
    doc.setDrawColor(...C.brand);
    doc.setLineWidth(0.8);
    doc.line(M, dividerY, W - M, dividerY);
    doc.setDrawColor(...C.hairline);
    doc.setLineWidth(0.3);
    doc.line(M, dividerY + 2.5, W - M, dividerY + 2.5);
  }

  for (let pi = 0; pi < pages.length; pi++) {
    if (pi > 0) doc.addPage();
    renderPageContent(doc, pages[pi], pages[pi].topY, contentW, M, isContract, isClinicalPremium);
  }

  const lastPageIdx = pages.length;
  const lastPage = pages[pages.length - 1];
  let lastContentY = lastPage.topY;
  for (const a of lastPage.atoms) lastContentY += a.h;
  lastContentY = Math.min(lastContentY, bottomY - sigDraw);

  doc.setPage(lastPageIdx);
  if (!opts.hideSignature) {
    drawSignatureArea(doc, opts, c, W, H, M, lastContentY, sigDraw, isContract);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    if (isMatrixV2) drawLeftBand(doc, H);
    drawDocumentFooter(doc, c, W, H, M, {
      page: i,
      pageCount,
      documentVersion: opts.documentVersion ?? null,
      validationHash: opts.validationHash ?? null,
    });
    if (i === pageCount && opts.validationHash) {
      await drawValidationQr(doc, opts.validationHash, W, H, opts.validationUrlBase);
    }
  }

  return doc;
}

// ---------- Page content ----------

function renderPageContent(
  doc: jsPDF,
  page: Page,
  topY: number,
  contentW: number,
  M: number,
  isContract: boolean,
  isClinicalPremium = false,
) {
  let y = topY;
  let segOpenBlockId: number | null = null;
  let segStartY = y;

  const closeSegment = (endY: number) => {
    if (segOpenBlockId == null) return;
    doc.setDrawColor(...C.hairline);
    doc.setLineWidth(0.3);
    doc.rect(M, segStartY, contentW, endY - segStartY, "S");
    segOpenBlockId = null;
  };

  for (let i = 0; i < page.atoms.length; i++) {
    const a = page.atoms[i];

    if (a.kind === "title") {
      if (segOpenBlockId != null) closeSegment(y);
      segStartY = y;
      segOpenBlockId = a.blockId;
      drawBlockTitle(doc, a.label, M, y, contentW, isContract || isClinicalPremium);
      y += S.BAR_H;
      y += S.BAR_GAP;
      continue;
    }

    if (a.kind === "label") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(T.label);
      doc.setTextColor(...C.brand);
      doc.text(a.text.toUpperCase(), M + S.PAD_X, y + 10);
      y += S.LABEL_H;
      continue;
    }

    if (a.kind === "para-line") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      doc.setTextColor(...C.ink);
      doc.text(a.line, M + S.PAD_X, y + 10);
      y += S.LINE_H;
      continue;
    }

    if (a.kind === "grid-row") {
      const innerW = contentW - 2 * S.PAD_X;
      const colW = innerW / a.cols;
      a.cells.forEach(([label, value], ci) => {
        const x = M + S.PAD_X + ci * colW;
        drawMiniIcon(doc, fieldIconFor(label), x, y + 1, 8, C.brand);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(T.label);
        doc.setTextColor(...C.meta);
        doc.text(label, x + 12, y + 8);
        if (value) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(T.body);
          doc.setTextColor(...C.ink);
          const lines = wrapText(doc, value, colW - 12);
          doc.text(lines, x, y + S.LABEL_H + 8);
        }
      });
      y += a.h;
      continue;
    }

    if (a.kind === "highlight") {
      doc.setFillColor(...C.highlightBg);
      doc.roundedRect(M + S.PAD_X, y, contentW - 2 * S.PAD_X, a.h, S.CARD_RADIUS, S.CARD_RADIUS, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(T.label);
      doc.setTextColor(...C.brand);
      doc.text(a.label.toUpperCase(), M + S.PAD_X + 10, y + 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(T.body);
      doc.setTextColor(...C.ink);
      doc.text(a.lines, M + S.PAD_X + 10, y + 24);
      y += a.h;
      continue;
    }

    if (a.kind === "eva") {
      drawEva(doc, a.value, M + S.PAD_X, y, contentW - 2 * S.PAD_X);
      y += a.h;
      continue;
    }

    if (a.kind === "checks-row") {
      const innerW = contentW - 2 * S.PAD_X;
      const colW = innerW / a.items.length;
      a.items.forEach((it, ci) => {
        const x = M + S.PAD_X + ci * colW;
        doc.setDrawColor(...C.hairlineSoft);
        doc.setLineWidth(0.5);
        doc.rect(x, y + 2, 10, 10, "S");
        if (it.checked) {
          doc.setFillColor(...C.brand);
          doc.rect(x + 2, y + 4, 6, 6, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(T.body);
        doc.setTextColor(...C.ink);
        doc.text(it.label, x + 16, y + 10);
      });
      y += a.h;
      continue;
    }

    if (a.kind === "evolution") {
      const e = a.item;
      const head = `${e.index != null ? `#${e.index} — ` : ""}${e.data}${e.hora ? ` · ${e.hora}` : ""}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(T.label);
      doc.setTextColor(...C.brand);
      doc.text(head.toUpperCase(), M + S.PAD_X, y + 10);
      let ey = y + S.LABEL_H + 6;
      for (const f of a.lines) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(T.label);
        doc.setTextColor(...C.meta);
        doc.text(f.label.toUpperCase(), M + S.PAD_X, ey);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(T.body);
        doc.setTextColor(...C.ink);
        doc.text(f.text, M + S.PAD_X, ey + S.LABEL_H);
        ey += S.LABEL_H + f.text.length * S.LINE_H;
      }
      y += a.h;
      continue;
    }

    if (a.kind === "badge") {
      drawClinicalBadge(doc, M + S.PAD_X, y, contentW - 2 * S.PAD_X, a);
      y += a.h;
      continue;
    }

    if (a.kind === "compare-table") {
      drawCompareTable(doc, M + S.PAD_X, y, contentW - 2 * S.PAD_X, a.rows);
      y += a.h;
      continue;
    }

    if (a.kind === "block-gap") {
      closeSegment(y);
      y += a.h;
      continue;
    }
  }
  closeSegment(y);
}

function sectionNumber(label: string): string | null {
  return label.match(/^\s*(\d+)/)?.[1] ?? null;
}

function badgeColors(variant: "success" | "warning" | "danger" | "neutral"): {
  bg: [number, number, number];
  fg: [number, number, number];
} {
  if (variant === "success") return { bg: [236, 253, 245], fg: [5, 122, 85] };
  if (variant === "warning") return { bg: [255, 251, 235], fg: [180, 83, 9] };
  if (variant === "danger") return { bg: [254, 242, 242], fg: [185, 28, 28] };
  return { bg: [248, 250, 252], fg: [71, 85, 105] };
}

function drawClinicalBadge(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  atom: Extract<Atom, { kind: "badge" }>,
) {
  const colors = badgeColors(atom.variant);
  const h = atom.h;
  doc.setFillColor(...colors.bg);
  doc.roundedRect(x, y, w, h, 6, 6, "F");
  if (atom.label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.label);
    doc.setTextColor(...C.meta);
    doc.text(atom.label.toUpperCase(), x + 10, y + 11);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.body);
  doc.setTextColor(...colors.fg);
  doc.text(wrapText(doc, atom.text, w - 20), x + 10, y + (atom.label ? 24 : 14));
}

function trendSymbol(trend?: ClinicalTrend): string {
  if (trend === "melhorou") return "↑";
  if (trend === "piorou") return "↓";
  if (trend === "estavel") return "→";
  return "";
}

function drawCompareTable(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  rows: Array<{ label: string; inicial: string; anterior: string; atual: string; trend?: ClinicalTrend }>,
) {
  const colW = w / 4;
  const headers = ["Indicador", "Inicial", "Anterior", "Atual"];
  doc.setFillColor(...C.surface);
  doc.roundedRect(x, y, w, 18, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.label);
  doc.setTextColor(...C.brand);
  headers.forEach((h, i) => {
    doc.text(h.toUpperCase(), x + i * colW + 6, y + 12);
  });

  let rowY = y + 22;
  rows.forEach((row, ri) => {
    if (ri % 2 === 0) {
      doc.setFillColor(...C.brandSoft);
      doc.rect(x, rowY - 2, w, 18, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.body);
    doc.setTextColor(...C.ink);
    const cells = [row.label, row.inicial, row.anterior, `${row.atual}${trendSymbol(row.trend) ? ` ${trendSymbol(row.trend)}` : ""}`];
    const lineCounts = cells.map((cell, i) => wrapText(doc, cell, colW - 8).length);
    const rowH = Math.max(...lineCounts, 1) * S.LINE_H + 6;
    cells.forEach((cell, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(T.body);
      doc.setTextColor(...(i === 0 ? C.ink : C.meta));
      doc.text(wrapText(doc, cell, colW - 8), x + i * colW + 6, rowY + 10);
    });
    rowY += rowH;
  });
}

function drawBlockTitle(doc: jsPDF, label: string, x: number, y: number, w: number, isContract = false) {
  const n = sectionNumber(label);
  const title = label.replace(/^\s*\d+[\.\s-]*/, "");
  doc.setFillColor(...C.paper);
  doc.roundedRect(x, y, w, S.BAR_H, S.CARD_RADIUS, S.CARD_RADIUS, "F");
  doc.setFillColor(...C.brand);
  doc.roundedRect(x + 10, y + 7, 16, 16, 3, 3, "F");
  if (n != null) {
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(n, x + 18, y + 18, { align: "center" });
  } else if (isContract) {
    drawMiniIcon(doc, "file", x + 13.5, y + 10.5, 9, [255, 255, 255] as [number, number, number]);
  }
  doc.setTextColor(...C.brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.blockTitle);
  doc.text(title.toUpperCase(), x + 34, y + 18);

  if (isContract) {
    doc.setDrawColor(...C.hairlineSoft);
    doc.setLineWidth(0.4);
    doc.line(x + S.PAD_X, y + S.BAR_H + 2, x + w - S.PAD_X, y + S.BAR_H + 2);
  }
}

// ---------- EVA ----------

function drawEva(doc: jsPDF, value: number | null, x: number, y: number, w: number) {
  const safeValue = value == null ? null : Math.max(0, Math.min(10, Math.round(value)));
  const zone = evaZoneFor(safeValue);
  const panelX = x;
  const panelY = y + 2;
  const panelW = w;
  const panelH = 78;
  const barX = panelX + 12;
  const barY = panelY + 40;
  const barW = panelW - 24;
  const barH = 12;

  doc.setDrawColor(...C.hairlineSoft);
  doc.setFillColor(...C.paper);
  doc.roundedRect(panelX, panelY, panelW, panelH, S.CARD_RADIUS, S.CARD_RADIUS, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.meta);
  doc.text("ESCALA VISUAL ANALÓGICA - EVA", panelX + 14, panelY + 16);
  doc.setFontSize(14);
  doc.setTextColor(...(zone?.color ?? C.blue));
  doc.text(safeValue != null ? `EVA  ${safeValue}/10` : "EVA  —/10", panelX + panelW - 14, panelY + 22, { align: "right" });
  if (zone) {
    doc.setFontSize(7.2);
    doc.text(zone.label.toUpperCase(), panelX + panelW - 14, panelY + 34, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...C.meta);
    doc.text(zone.description, panelX + panelW - 14, panelY + 44, { align: "right" });
  }

  drawSegmentedEvaGradient(doc, barX, barY, barW, barH);
  for (let i = 0; i <= 10; i++) {
    const tx = barX + (i / 10) * barW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...(evaZoneFor(i)?.color ?? C.meta));
    doc.text(String(i), tx, barY + barH + 14, { align: "center" });
  }
  if (safeValue != null) {
    const mx = barX + (safeValue / 10) * barW;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(2);
    doc.circle(mx, barY + barH / 2, 8.5, "S");
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(1.3);
    doc.circle(mx, barY + barH / 2, 7, "S");
  }

  const legend = [
    { label: "0", desc: "Sem dor", color: C.evaBlue, x: 0.02 },
    { label: "1-3", desc: "Dor leve", color: C.evaGreen, x: 0.20 },
    { label: "4-6", desc: "Dor moderada", color: [104, 173, 71] as [number, number, number], x: 0.38 },
    { label: "7-8", desc: "Dor intensa", color: C.evaOrange, x: 0.60 },
    { label: "9-10", desc: "Dor extrema", color: C.evaRed, x: 0.80 },
  ];
  for (const item of legend) {
    const lx = barX + item.x * barW;
    doc.setFillColor(...item.color);
    doc.circle(lx, panelY + 67, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.ink);
    doc.text(item.label, lx + 10, panelY + 65);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.meta);
    doc.text(item.desc, lx + 10, panelY + 73);
  }
}

function drawSegmentedEvaGradient(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const segments = 90;
  const anchors = [
    { at: 0, color: C.evaBlue },
    { at: 0.3, color: C.evaGreen },
    { at: 0.6, color: C.evaYellow },
    { at: 0.8, color: C.evaOrange },
    { at: 1, color: C.evaRed },
  ] as const;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const color = gradientColorAt(t, anchors);
    doc.setFillColor(...color);
    doc.rect(x + (i / segments) * w, y, w / segments + 0.5, h, "F");
  }
}

function gradientColorAt(
  t: number,
  anchors: ReadonlyArray<{ at: number; color: readonly [number, number, number] }>,
): [number, number, number] {
  const nextIndex = anchors.findIndex((a) => a.at >= t);
  if (nextIndex <= 0) return [...anchors[0].color] as [number, number, number];
  const start = anchors[nextIndex - 1];
  const end = anchors[nextIndex];
  const localT = (t - start.at) / Math.max(0.001, end.at - start.at);
  return start.color.map((v, i) => Math.round(v + (end.color[i] - v) * localT)) as [number, number, number];
}

function evaZoneFor(value: number | null): { label: string; description: string; color: [number, number, number] } | null {
  if (value == null) return null;
  if (value === 0) return { label: "Sem dor", description: "Sem limitação dolorosa no momento.", color: C.evaBlue };
  if (value <= 3) return { label: "Dor leve", description: "Desconforto presente.", color: C.evaGreen };
  if (value <= 6) return { label: "Dor moderada", description: "Interfere nas atividades.", color: [104, 173, 71] };
  if (value <= 8) return { label: "Dor intensa", description: "Limitação funcional importante.", color: C.evaOrange };
  return { label: "Dor extrema", description: "Alto impacto funcional.", color: C.evaRed };
}

// ---------- Signature ----------

function drawSignatureArea(
  doc: jsPDF,
  opts: BuildPdfOpts,
  c: ClinicData,
  W: number,
  H: number,
  M: number,
  contentEndY: number,
  sigH: number,
  isContract: boolean,
) {
  const qrReserve = isContract ? 64 : 0;
  const maxTop = H - S.FOOTER_H - 16 - sigH - qrReserve;
  const top = isContract ? maxTop : Math.min(contentEndY + 8, maxTop);

  const dataStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const localStr = [cleanText(c.cidade), cleanText(c.estado)].filter(Boolean).join("/") || "";
  const localData = localStr ? `${localStr}, ${dataStr}.` : `${dataStr}.`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.sigMeta);
  doc.setTextColor(...C.meta);
  doc.text(localData, W - M, top, { align: "right" });

  const prof = opts.professional ?? null;
  const profNome = cleanText(prof?.nome ?? "") || null;
  const profRole = cleanText(prof?.profissao ?? "") || "Fisioterapeuta";
  const profRegistry = buildRegistry(prof);

  if (isContract) {
    drawContractSignatures(doc, opts, c, W, M, top + 18, profNome, profRole, profRegistry);
  } else {
    drawProfessionalSignature(doc, W, M, top + 16, profNome, profRole, profRegistry);
  }
}

function buildRegistry(prof?: Professional | null): string | null {
  if (!prof) return null;
  const num = cleanText(prof.registro ?? "");
  const council = cleanText(prof.conselho ?? "") || "CREFITO";
  if (!num) return null;
  if (/\d/.test(council) && !prof.registro) return council;
  return `${council} nº ${num}`;
}

function drawContractSignatures(
  doc: jsPDF,
  opts: BuildPdfOpts,
  c: ClinicData,
  W: number,
  M: number,
  startY: number,
  profNome: string | null,
  profRole: string,
  profRegistry: string | null,
) {
  const colW = (W - 2 * M) / 2;
  const sigW = 200;
  const SPACE_PARTY = 28;
  const SPACE_WITNESS = 40;
  const row1Top = startY;
  const row2Top = row1Top + SPACE_PARTY + 10 + 5 * 11 + 14;

  const ct = opts.contratante ?? null;
  const ctNome = cleanText(ct?.nome ?? "") || null;
  const ctCpf = cleanText(ct?.cpf ?? "");
  const ctVinculo = cleanText(ct?.vinculo ?? "");
  const isResponsavel = !!ctVinculo && !/próprio paciente/i.test(ctVinculo);
  const ps = opts.patientSnapshot ?? null;
  const psNome = cleanText(ps?.nome ?? "");

  const contratanteLines: SigLine[] = [
    ctNome
      ? { text: ctNome, bold: true, size: T.sigName }
      : { text: "Nome: ____________________", muted: true, size: T.sigRole },
    ctCpf
      ? { text: `CPF ${ctCpf}`, size: T.sigMeta }
      : { text: "CPF: ____________________", muted: true, size: T.sigMeta },
    ...(isResponsavel ? [{ text: ctVinculo, size: T.sigMeta, muted: true } as SigLine] : []),
  ];
  if (isResponsavel && psNome) {
    contratanteLines.push({ text: " ", size: 4 });
    contratanteLines.push({ text: "Paciente beneficiário", size: 7, muted: true });
    contratanteLines.push({ text: psNome, size: T.sigMeta, italic: true });
  }
  drawSigCol(doc, M + colW / 2, row1Top, sigW, SPACE_PARTY, { label: "CONTRATANTE", lines: contratanteLines });

  const cnpj = cleanText(c.cnpj ?? "");
  const razao = cleanText(c.razao_social ?? "") || cleanText(c.nome_fantasia ?? "");
  drawSigCol(doc, M + colW + colW / 2, row1Top, sigW, SPACE_PARTY, {
    label: "CONTRATADA",
    lines: [
      profNome
        ? { text: profNome, bold: true, size: T.sigName }
        : { text: "Profissional responsável", muted: true, size: T.sigRole },
      { text: profRole, size: T.sigRole },
      profRegistry
        ? { text: profRegistry, bold: true, size: 9 }
        : { text: "CREFITO: __________________", muted: true, size: 9 },
      ...(razao ? [{ text: razao, size: T.sigMeta, muted: true } as SigLine] : []),
      ...(cnpj ? [{ text: `CNPJ ${cnpj}`, size: T.sigMeta, muted: true } as SigLine] : []),
    ],
  });

  drawSigCol(doc, M + colW / 2, row2Top, sigW, SPACE_WITNESS, {
    label: "TESTEMUNHA 1",
    lines: [
      { text: "Nome: ____________________", muted: true, size: T.sigRole },
      { text: "CPF: _____________________", muted: true, size: T.sigMeta },
    ],
  });
  drawSigCol(doc, M + colW + colW / 2, row2Top, sigW, SPACE_WITNESS, {
    label: "TESTEMUNHA 2",
    lines: [
      { text: "Nome: ____________________", muted: true, size: T.sigRole },
      { text: "CPF: _____________________", muted: true, size: T.sigMeta },
    ],
  });
}

function drawProfessionalSignature(
  doc: jsPDF,
  W: number,
  M: number,
  startY: number,
  profNome: string | null,
  profRole: string,
  profRegistry: string | null,
) {
  const cx = W / 2;
  const sigY = startY + 38;
  drawSigCol(doc, cx, sigY, 280, 0, {
    label: "Profissional Responsável",
    lines: [
      profNome ? { text: profNome, bold: true, size: T.sigName } : { text: "Profissional responsável", muted: true, size: T.sigRole },
      ...(profRegistry ? [{ text: profRegistry, bold: true, size: T.sigMeta } as const] : []),
    ],
  });
}

type SigLine = { text: string; bold?: boolean; muted?: boolean; italic?: boolean; size: number };

function drawSigCol(
  doc: jsPDF,
  cx: number,
  topY: number,
  sigW: number,
  signSpace: number,
  colOpts: { label: string; lines: SigLine[] },
) {
  const lineY = topY + signSpace;
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.5);
  doc.line(cx - sigW / 2, lineY, cx + sigW / 2, lineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 107, 107);
  doc.text(colOpts.label, cx, lineY + 10, { align: "center" });

  let ly = lineY + 22;
  for (const ln of colOpts.lines) {
    const style = ln.italic ? "italic" : ln.bold ? "bold" : "normal";
    doc.setFont("helvetica", style);
    doc.setFontSize(ln.size);
    doc.setTextColor(...(ln.muted ? C.meta : C.ink));
    doc.text(ln.text, cx, ly, { align: "center" });
    ly += ln.size + 2;
  }
}
