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
import { PDF_COLORS as C, PDF_SPACING as S, PDF_TYPOGRAPHY as T, PDF_QR, PDF_LOGO, applyClinicPalette } from "./tokens";
import { cleanText, isEmptyText, wrapText, truncateLine } from "./text";
import { prepareLogoInput } from "./logo";
import { drawLogoBox } from "./images";
import { drawDocumentHeader, drawLeftBand, drawLegacyClinicHeader, drawCompactRunningHeader, measureDocumentHeaderHeight } from "./header-engine";
import { drawDocumentFooter, drawValidationQr, drawValidationHashFallback } from "./footer-engine";
import { drawMiniIcon, fieldIconFor } from "./icons";
import { computeLayoutFillRatio } from "@/lib/dossier/layout-composer";
import {
  composeAndBalance,
  measurePublishingBlock,
  renderPublishingPageContent,
  drawPublishingCover,
  drawPublishingToc,
  drawPublishingPageHeader,
  drawPublishingFooter,
  drawPublishingConclusionPage,
  PUBLISHING_HEADER_H,
  PUBLISHING_FOOTER_H,
  PUBLISHING_FRONT_PAGES,
} from "./publishing";
import { PUB_LAYOUT, PUB_SPACE } from "./publishing/typography";

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
  | { kind: "badge"; label?: string; text: string; variant: "success" | "warning" | "danger" | "neutral" | "info"; h: number; blockId: number }
  | { kind: "timeline"; items: Array<{ date: string; title: string }>; h: number; blockId: number }
  | {
      kind: "dashboard";
      columns: 2 | 3;
      items: Array<{ label: string; value: string; variant?: "success" | "warning" | "info" | "neutral" | "danger" }>;
      h: number;
      blockId: number;
    }
  | { kind: "compare-table"; rows: Array<{ label: string; inicial: string; anterior: string; atual: string; trend?: ClinicalTrend }>; h: number; blockId: number }
  | { kind: "block-gap"; h: number; blockId: number };

type BlockGroup = {
  id: number;
  title: string;
  atoms: Atom[];
  totalH: number;
  pageBreakBefore?: boolean;
  indexLabel?: string;
};

type Page = {
  atoms: Atom[];
  blockSegments: Array<{ blockId: number; startIdx: number; endIdx: number; isContinuation: boolean }>;
  contentH: number;
  topY: number;
};

// ---------- Measurement ----------

function measureBlock(
  doc: jsPDF,
  block: PdfBlock,
  id: number,
  contentW: number,
  isContract: boolean,
  editorial = false,
): BlockGroup {
  const atoms: Atom[] = [];
  const padX2 = S.PAD_X * 2;
  const innerW = contentW - padX2;
  const compact = block.layout?.compact ?? editorial;
  const barH = compact ? 26 : S.BAR_H;
  const barGap = compact ? 4 : S.BAR_GAP;
  const lineH = compact ? 14 : S.LINE_H;

  atoms.push({ kind: "title", label: block.title, h: barH + barGap, blockId: id });

  for (const ch of block.children) {
    if (ch.kind === "paragraph") {
      let text = ch.text || "";
      if (isContract && isClosingClause(block.title)) text = sanitizeContractParagraph(text);
      const cleaned = cleanText(text);
      if (!cleaned) {
        if (ch.label) {
          atoms.push({ kind: "label", text: ch.label, h: S.LABEL_H, blockId: id });
        }
        continue;
      }
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
          h: lineH,
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
      const h = (compact ? 10 : 14) + lines.length * lineH + (compact ? 8 : 10);
      atoms.push({ kind: "highlight", label: ch.label, lines, h, blockId: id });
      continue;
    }

    if (ch.kind === "eva") {
      atoms.push({ kind: "eva", value: ch.value, h: 92, blockId: id });
      continue;
    }

    if (ch.kind === "checks") {
      if (ch.label) {
        atoms.push({ kind: "label", text: ch.label, h: S.LABEL_H, blockId: id });
      }
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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(T.body);
      const lines = wrapText(doc, ch.text, innerW - 20).length;
      const h = (ch.label ? 12 : 0) + Math.max(lines, 1) * lineH + (compact ? 10 : 14);
      atoms.push({
        kind: "badge",
        label: ch.label,
        text: ch.text,
        variant: ch.variant,
        h,
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "dashboard") {
      if (!ch.items.length) continue;
      const cols = ch.columns;
      const cellH = compact ? 34 : 40;
      const rows = Math.ceil(ch.items.length / cols);
      atoms.push({
        kind: "dashboard",
        columns: cols,
        items: ch.items,
        h: rows * cellH + 6,
        blockId: id,
      });
      continue;
    }

    if (ch.kind === "timeline") {
      if (!ch.items.length) continue;
      const itemH = compact ? 24 : 32;
      atoms.push({
        kind: "timeline",
        items: ch.items,
        h: ch.items.length * itemH + 6,
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
        tableH += Math.max(...heights, 1) * S.LINE_H + 6;
      }
      atoms.push({ kind: "compare-table", rows: ch.rows, h: tableH, blockId: id });
      continue;
    }
  }

  atoms.push({ kind: "block-gap", h: compact ? 6 : S.BLOCK_GAP, blockId: id });
  const totalH = atoms.reduce((s, a) => s + a.h, 0);
  return { id, title: block.title, atoms, totalH, pageBreakBefore: block.pageBreakBefore, indexLabel: block.indexLabel };
}

// ---------- Composition ----------

function compose(
  groups: BlockGroup[],
  topYFirst: number,
  topYRest: number,
  bottomY: number,
  signatureReserveH: number,
  blockGap: number,
  mode: "default" | "editorial" = "default",
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

    if (mode !== "editorial" && g.pageBreakBefore && cur.atoms.length > 0) {
      flush();
    }

    const firstParaLines = g.atoms.filter((a) => a.kind === "para-line" && a.blockId === g.id);
    const headroomLines = mode === "editorial" ? 3 : Math.min(4, firstParaLines.length || 4);
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

const DOSSIER_FRONT_PAGES = 2;
const DOSSIER_HEADER_H = 54;
const DOSSIER_FOOTER_H = 36;

function pageSectionForContentPage(page: Page, groups: BlockGroup[]): string {
  for (const a of page.atoms) {
    if (a.kind === "title" && !a.continuation) {
      const g = groups[a.blockId];
      return g?.indexLabel ?? g?.title ?? "";
    }
  }
  if (page.blockSegments.length) {
    const blockId = page.blockSegments[0].blockId;
    const g = groups[blockId];
    return g?.indexLabel ?? g?.title ?? "";
  }
  return "";
}

function drawDossierCover(
  doc: jsPDF,
  opts: BuildPdfOpts,
  c: ClinicData,
  logoDraw: Awaited<ReturnType<typeof prepareLogoInput>>,
  W: number,
  H: number,
  M: number,
) {
  drawLeftBand(doc, H);
  const clinicName = cleanText(c.nome_fantasia ?? "") || cleanText(c.razao_social ?? "") || "Clínica";
  const meta = opts.dossier;
  const docTitle = meta?.documentTitle ?? "HISTÓRICO CLÍNICO INTEGRADO";

  drawLogoBox(doc, c, logoDraw, { x: W / 2 - PDF_LOGO.boxW / 2, y: H * 0.12, w: PDF_LOGO.boxW, h: PDF_LOGO.boxH });

  doc.setDrawColor(...C.brand);
  doc.setLineWidth(1.5);
  doc.line(M + 40, H * 0.36, W - M - 40, H * 0.36);

  doc.setTextColor(...C.brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(clinicName.toUpperCase(), W / 2, H * 0.40, { align: "center" });

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const titleLines = wrapText(doc, docTitle, W - 2 * M - 48);
  let titleY = H * 0.48;
  for (const ln of titleLines) {
    doc.text(ln, W / 2, titleY, { align: "center" });
    titleY += 26;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.setTextColor(...C.ink);
  doc.text(meta?.patientName ?? opts.patientName ?? "Paciente", W / 2, titleY + 8, { align: "center" });

  doc.setFontSize(T.docSubtitle);
  doc.setTextColor(...C.meta);
  if (meta?.generatedAt) {
    doc.text(`Gerado em ${meta.generatedAt}`, W / 2, titleY + 32, { align: "center" });
  }

  doc.setFontSize(8.5);
  doc.setTextColor(...C.meta);
  doc.text("Documento oficial e confidencial — uso exclusivo clínico", W / 2, H - M - 32, { align: "center" });
}

function drawDossierPageHeader(
  doc: jsPDF,
  opts: BuildPdfOpts,
  W: number,
  M: number,
  sectionTitle: string,
) {
  const meta = opts.dossier;
  const docTitle = meta?.documentTitle ?? "HISTÓRICO CLÍNICO INTEGRADO";
  const patient = meta?.patientName ?? opts.patientName ?? "Paciente";
  const y0 = M + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.brand);
  doc.text(docTitle, M, y0);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.meta);
  const rightLine = sectionTitle ? `${patient}  ·  ${sectionTitle}` : patient;
  doc.text(truncateLine(doc, rightLine, W - 2 * M), W - M, y0, { align: "right" });

  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.4);
  doc.line(M, y0 + 8, W - M, y0 + 8);
}

function drawDossierFooter(
  doc: jsPDF,
  c: ClinicData,
  opts: BuildPdfOpts,
  W: number,
  H: number,
  M: number,
  page: number,
  pageCount: number,
) {
  const fy = H - DOSSIER_FOOTER_H;
  doc.setDrawColor(...C.hairlineSoft);
  doc.setLineWidth(0.3);
  doc.line(M, fy, W - M, fy);

  const clinicName =
    cleanText(c.nome_fantasia ?? "") || cleanText(c.razao_social ?? "") || "Clínica";
  const generatedAt = opts.dossier?.generatedAt ?? "";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.meta);
  doc.text(clinicName, M, fy + 12);
  doc.text(`Página ${page} de ${pageCount}`, W / 2, fy + 12, { align: "center" });
  if (generatedAt) {
    doc.text(`Gerado em ${generatedAt}`, W - M, fy + 12, { align: "right" });
  }
}

async function drawDossierConclusionPage(
  doc: jsPDF,
  opts: BuildPdfOpts,
  c: ClinicData,
  W: number,
  H: number,
  M: number,
  validationUrlBase?: string,
) {
  const meta = opts.dossier;
  const conclusion = meta?.conclusion;
  let y = M + DOSSIER_HEADER_H + 8;
  const contentW = W - 2 * M;

  drawDossierPageHeader(doc, opts, W, M, "Conclusão do tratamento");

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.docTitle);
  doc.text("CONCLUSÃO DO TRATAMENTO", M, y);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.label);
  doc.setTextColor(...C.brand);
  doc.text("RESUMO", M, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.body);
  doc.setTextColor(...C.ink);
  const summaryText = conclusion?.treatmentSummary ?? meta?.summary?.treatmentSummary ?? "";
  for (const ln of wrapText(doc, summaryText, contentW)) {
    doc.text(ln, M, y);
    y += S.LINE_H;
  }
  y += 10;

  const statRows: Array<[string, string]> = [
    ["Período do tratamento", conclusion?.periodLabel ?? "—"],
    ["Total de sessões", String(conclusion?.sessionCount ?? 0)],
    ["Avaliações", String(conclusion?.assessmentCount ?? 0)],
    ["Evoluções", String(conclusion?.evolutionCount ?? 0)],
    ["Reavaliações", String(conclusion?.reassessmentCount ?? 0)],
    [
      "Alta registrada",
      conclusion?.hasDischarge ? "Sim" : "Não",
    ],
  ];

  for (const [label, value] of statRows) {
    doc.setFillColor(...C.surface);
    doc.roundedRect(M, y, contentW, 20, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.meta);
    doc.text(label.toUpperCase(), M + 10, y + 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.body);
    doc.setTextColor(...C.ink);
    doc.text(value, W - M - 10, y + 13, { align: "right" });
    y += 24;
  }

  if (conclusion?.objectivesAchieved?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.label);
    doc.setTextColor(...[5, 122, 85] as [number, number, number]);
    doc.text("OBJETIVOS ALCANÇADOS", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.body);
    doc.setTextColor(...C.ink);
    for (const ln of wrapText(doc, conclusion.objectivesAchieved.join(" · "), contentW)) {
      doc.text(ln, M, y);
      y += S.LINE_H;
    }
    y += 8;
  }

  if (conclusion?.objectivesPending?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.label);
    doc.setTextColor(...[180, 83, 9] as [number, number, number]);
    doc.text("OBJETIVOS PENDENTES", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.body);
    doc.setTextColor(...C.ink);
    for (const ln of wrapText(doc, conclusion.objectivesPending.join(" · "), contentW)) {
      doc.text(ln, M, y);
      y += S.LINE_H;
    }
    y += 8;
  }

  if (conclusion?.professionalNotes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.label);
    doc.setTextColor(...C.brand);
    doc.text("CONSIDERAÇÕES DO PROFISSIONAL", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.body);
    doc.setTextColor(...C.ink);
    for (const ln of wrapText(doc, conclusion.professionalNotes, contentW)) {
      doc.text(ln, M, y);
      y += S.LINE_H;
    }
    y += 10;
  }

  const prof = conclusion?.professional ?? opts.professional ?? null;
  const profNome = cleanText(prof?.nome ?? "");
  const profReg = prof
    ? (() => {
        const num = cleanText(prof.registro ?? "");
        const council = cleanText(prof.conselho ?? "") || "CREFITO";
        return num ? `${council} nº ${num}` : "";
      })()
    : "";

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.label);
  doc.setTextColor(...C.brand);
  doc.text("RESPONSÁVEL PELO TRATAMENTO", M, y);
  y += 20;

  const sigX = W / 2;
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.5);
  doc.line(sigX - 120, y, sigX + 120, y);
  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.body);
  doc.setTextColor(...C.ink);
  doc.text(profNome || "Profissional responsável", sigX, y, { align: "center" });
  y += 12;
  if (profReg) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.sigMeta);
    doc.text(profReg, sigX, y, { align: "center" });
    y += 12;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.meta);
  doc.text("Assinatura", sigX, y, { align: "center" });
  y += 24;

  if (opts.validationHash) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.label);
    doc.setTextColor(...C.brand);
    doc.text("VALIDAÇÃO", M, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.meta);
    doc.text(`Hash: ${opts.validationHash.slice(0, 24)}…`, M, y);
    if (meta?.generatedAt) {
      doc.text(`Data da emissão: ${meta.generatedAt}`, M, y + 10);
    }
    const ok = await drawValidationQr(doc, opts.validationHash, W, H, validationUrlBase, M);
    if (!ok) drawValidationHashFallback(doc, opts.validationHash, W, H, M);
  }

  const institutional =
    meta?.institutionalMessage ||
    cleanText(c.rodape_institucional ?? "") ||
    "Este documento consolida o histórico clínico registrado durante o acompanhamento fisioterapêutico do paciente.";

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.meta);
  const footY = H - DOSSIER_FOOTER_H - 28;
  wrapText(doc, institutional, contentW).forEach((ln, i) => {
    doc.text(ln, W / 2, footY + i * 9, { align: "center" });
  });
}

function blockFirstPages(pages: Page[]): Map<number, number> {
  const map = new Map<number, number>();
  for (let pi = 0; pi < pages.length; pi++) {
    for (const a of pages[pi].atoms) {
      if (a.kind === "title" && !a.continuation && !map.has(a.blockId)) {
        map.set(a.blockId, pi);
      }
    }
  }
  return map;
}

function drawDossierToc(
  doc: jsPDF,
  opts: BuildPdfOpts,
  blockPages: Map<number, number>,
  contentOffset: number,
  conclusionPage: number,
  W: number,
  M: number,
) {
  drawLeftBand(doc, doc.internal.pageSize.getHeight());
  drawDossierPageHeader(doc, opts, W, M, "Índice");
  let y = M + DOSSIER_HEADER_H + 20;

  doc.setTextColor(...C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.docTitle);
  doc.text("Índice", M, y);
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.body);
  const lineH = S.LINE_H + 6;
  const rightX = W - M;
  const linkW = W - 2 * M;
  const entries = opts.dossier?.indexEntries ?? [];

  for (const entry of entries) {
    const logicalPage = blockPages.get(entry.blockId) ?? 0;
    const pdfPage = contentOffset + logicalPage + 1;
    const pageLabel = String(pdfPage);

    doc.setTextColor(...C.ink);
    const titleW = doc.getTextWidth(entry.label);
    const pageW = doc.getTextWidth(pageLabel);
    const dotsW = Math.max(12, linkW - titleW - pageW - 16);
    const dots = ".".repeat(Math.min(80, Math.floor(dotsW / doc.getTextWidth("."))));

    doc.textWithLink(entry.label, M, y, { pageNumber: pdfPage });
    doc.setTextColor(...C.meta);
    doc.text(dots, M + titleW + 6, y);
    doc.setTextColor(...C.brand);
    doc.textWithLink(pageLabel, rightX - pageW, y, { pageNumber: pdfPage });
    y += lineH;

    if (y > doc.internal.pageSize.getHeight() - DOSSIER_FOOTER_H - 48) break;
  }

  const conclusionLabel = "Conclusão do tratamento";
  doc.setTextColor(...C.ink);
  doc.textWithLink(conclusionLabel, M, y, { pageNumber: conclusionPage });
  doc.setTextColor(...C.brand);
  doc.textWithLink(String(conclusionPage), rightX - doc.getTextWidth(String(conclusionPage)), y, {
    pageNumber: conclusionPage,
  });
  y += lineH;

  doc.setFontSize(8);
  doc.setTextColor(...C.meta);
  doc.text("Clique em um item para ir à seção correspondente.", M, y + 8);
}

async function renderClinicalDossierPdf(opts: BuildPdfOpts, ctx: PdfRenderCtx): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = S.M;
  const contentW = W - 2 * M;
  const c = ctx.clinic;
  applyClinicPalette(c);

  const preparedLogo = await prepareLogoInput(ctx.logo);
  const logoDraw = preparedLogo;

  const blocks: PdfBlock[] = opts.blocks ?? [];
  const groups = blocks.map((b, i) => measurePublishingBlock(doc, b, i, contentW));

  const topYFirst = M + PUBLISHING_HEADER_H + 6;
  const topYRest = M + PUBLISHING_HEADER_H + 6;
  const bottomY = H - PUBLISHING_FOOTER_H - 12;
  const editorialGap = PUB_SPACE.blockGap;

  const { pages, densities, avgDensity, rebalancePasses } = composeAndBalance(
    groups,
    topYFirst,
    topYRest,
    bottomY,
    editorialGap,
    PUB_LAYOUT.lineH,
  );

  if (opts.dossier) {
    opts.dossier.layoutStats = {
      contentPages: pages.length,
      avgFillRatio: avgDensity,
      estimatedPagesBefore: opts.dossier.layoutStats?.estimatedPagesBefore ?? pages.length,
      estimatedPagesAfter: pages.length,
      forcedBreaksRemoved: opts.dossier.layoutStats?.forcedBreaksRemoved ?? 0,
      pageDensities: densities,
      rebalancePasses,
    };
  }

  const blockPages = blockFirstPages(pages as Page[]);
  const conclusionPage = PUBLISHING_FRONT_PAGES + pages.length + 1;

  await drawPublishingCover(doc, opts, c, logoDraw, W, H, M, opts.validationUrlBase);

  doc.addPage();
  drawPublishingToc(doc, opts, blockPages, PUBLISHING_FRONT_PAGES, conclusionPage, W, M);

  for (let pi = 0; pi < pages.length; pi++) {
    doc.addPage();
    const section = pageSectionForContentPage(pages[pi] as Page[], groups as BlockGroup[]);
    drawPublishingPageHeader(doc, opts, logoDraw, c, W, M, section || undefined);
    renderPublishingPageContent(doc, pages[pi], pages[pi].topY, contentW, M);
  }

  doc.addPage();
  await drawPublishingConclusionPage(doc, opts, c, logoDraw, W, H, M, opts.validationUrlBase);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawLeftBand(doc, H);
    if (i === 1) {
      const clinicName =
        cleanText(c.nome_fantasia ?? "") || cleanText(c.razao_social ?? "") || "Clínica";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.meta);
      doc.text(clinicName, W / 2, H - M - 10, { align: "center" });
    } else {
      drawPublishingFooter(doc, c, opts, W, H, M, i, pageCount);
    }
  }

  return doc;
}

// ---------- Render entry ----------

export async function renderPdf(opts: BuildPdfOpts, ctx: PdfRenderCtx): Promise<jsPDF> {
  if (opts.layout === "fisioos-ds") {
    const { renderFisioosDsDocument } = await import("./design-system/render-document");
    return renderFisioosDsDocument(opts, ctx);
  }

  if (opts.dossier) {
    return renderClinicalDossierPdf(opts, ctx);
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = S.M;
  const contentW = W - 2 * M;
  const c = ctx.clinic;
  applyClinicPalette(c);

  const preparedLogo = await prepareLogoInput(ctx.logo);
  const logoDraw = preparedLogo;

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

  const headerH = isClinicalPremium
    ? measureDocumentHeaderHeight(doc, c, W, { showProfessional: true, professional: opts.professional ?? null }, true)
    : measureDocumentHeaderHeight(doc, c, W, { showProfessional: false }, false);

  const topYFirst = isClinicalPremium
    ? headerH + 12
    : headerH + S.TOP_AFTER_HEADER + 13 + (opts.subtitle ? 12 : 0) + S.TITLE_TO_DIVIDER + S.DIVIDER_TO_CONTENT;
  const topYRest = isClinicalPremium ? S.M + 48 : S.M + 28;
  const bottomY = H - S.FOOTER_H - 16;
  const sigDraw = isContract ? S.SIG_CONTRACT_H : S.SIG_DEFAULT_H;
  const usableHRest = bottomY - topYRest;

  const hasValidation = !!opts.validationHash;
  const qrReserve = isContract || hasValidation ? PDF_QR.size + PDF_QR.marginBottom + 8 : 0;
  const sigReserve = opts.hideSignature
    ? hasValidation
      ? qrReserve
      : 0
    : isContract
      ? sigDraw + qrReserve
      : sigDraw + qrReserve;
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
      isContract,
      professional: opts.professional ?? null,
    });
  } else {
    drawLegacyClinicHeader(doc, c, logoDraw, W);

    let titleY = headerH + S.TOP_AFTER_HEADER;
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
      doc.text(opts.patientName, W - M, headerH + S.TOP_AFTER_HEADER, { align: "right" });
    }

    const dividerY = headerH + S.TOP_AFTER_HEADER + 13 + (opts.subtitle ? 12 : 0) + S.TITLE_TO_DIVIDER;
    doc.setDrawColor(...C.brand);
    doc.setLineWidth(0.8);
    doc.line(M, dividerY, W - M, dividerY);
    doc.setDrawColor(...C.hairline);
    doc.setLineWidth(0.3);
    doc.line(M, dividerY + 2.5, W - M, dividerY + 2.5);
  }

  for (let pi = 0; pi < pages.length; pi++) {
    if (pi > 0) {
      doc.addPage();
      if (isClinicalPremium) {
        drawCompactRunningHeader(doc, c, opts, W, M);
      }
    }
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
      const ok = await drawValidationQr(doc, opts.validationHash, W, H, opts.validationUrlBase, M);
      if (!ok) drawValidationHashFallback(doc, opts.validationHash, W, H, M);
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
      drawBlockTitle(doc, a.label, M, y, contentW, isContract, isClinicalPremium);
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
          doc.setDrawColor(...C.ink);
          doc.setLineWidth(0.9);
          doc.line(x + 2, y + 4, x + 8, y + 10);
          doc.line(x + 8, y + 4, x + 2, y + 10);
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

    if (a.kind === "dashboard") {
      y = drawDashboard(doc, M + S.PAD_X, y, contentW - 2 * S.PAD_X, a);
      continue;
    }

    if (a.kind === "timeline") {
      y = drawTimeline(doc, M + S.PAD_X, y, contentW - 2 * S.PAD_X, a);
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
  let textY = y + 12;
  if (atom.label) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.label);
    doc.setTextColor(...C.meta);
    doc.text(atom.label.toUpperCase(), x + 10, textY);
    textY += 14;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.body);
  doc.setTextColor(...colors.fg);
  const lines = wrapText(doc, atom.text, w - 20);
  lines.forEach((ln, i) => {
    doc.text(ln, x + 10, textY + i * S.LINE_H);
  });
}

function drawTimeline(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  atom: Extract<Atom, { kind: "timeline" }>,
): number {
  const lineX = x + 10;
  let cy = y + 4;
  const itemH = atom.items.length ? atom.h / atom.items.length : 24;

  if (atom.items.length > 1) {
    doc.setDrawColor(...C.hairlineSoft);
    doc.setLineWidth(0.6);
    doc.line(lineX, cy + 4, lineX, cy + atom.h - 10);
  }

  for (let i = 0; i < atom.items.length; i++) {
    const item = atom.items[i];
    doc.setFillColor(...C.brand);
    doc.circle(lineX, cy + 5, 3.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.ink);
    doc.text(item.date, x + 24, cy + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.meta);
    doc.text(item.title, x + 24, cy + 15);

    if (i < atom.items.length - 1) {
      doc.setFontSize(8);
      doc.setTextColor(...C.hairlineSoft);
      doc.text("↓", lineX - 2, cy + itemH - 6);
    }

    cy += itemH;
  }

  return y + atom.h;
}

function drawDashboard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  atom: Extract<Atom, { kind: "dashboard" }>,
): number {
  const cols = atom.columns;
  const gap = 8;
  const cellW = (w - gap * (cols - 1)) / cols;
  const cellH = atom.h / Math.ceil(atom.items.length / cols);

  atom.items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + col * (cellW + gap);
    const cy = y + row * cellH;
    const colors = badgeColors(
      item.variant === "danger" ? "warning" : (item.variant ?? "neutral"),
    );

    doc.setFillColor(...colors.bg);
    doc.roundedRect(cx, cy, cellW, cellH - 4, 5, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.meta);
    doc.text(item.label.toUpperCase(), cx + 8, cy + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.fg);
    const valLines = wrapText(doc, item.value, cellW - 14);
    doc.text(valLines[0] ?? item.value, cx + 8, cy + 22);
    if (valLines.length > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(valLines[1], cx + 8, cy + 30);
    }
  });

  return y + atom.h;
}

function trendSymbol(trend?: ClinicalTrend): string {
  if (trend === "melhorou") return " ↑";
  if (trend === "piorou") return " ↓";
  if (trend === "estavel") return " =";
  return "";
}

function trendWord(trend?: ClinicalTrend): string {
  if (trend === "melhorou") return " (melhorou)";
  if (trend === "piorou") return " (piorou)";
  if (trend === "estavel") return " (estável)";
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T.body);
    doc.setTextColor(...C.ink);
    const cells = [
      row.label,
      row.inicial,
      row.anterior,
      `${row.atual}${trendSymbol(row.trend)}${trendWord(row.trend)}`,
    ];
    const lineCounts = cells.map((cell, i) => wrapText(doc, cell, colW - 8).length);
    const rowH = Math.max(...lineCounts, 1) * S.LINE_H + 6;
    if (ri % 2 === 0) {
      doc.setFillColor(...C.brandSoft);
      doc.rect(x, rowY - 2, w, rowH, "F");
    }
    cells.forEach((cell, i) => {
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.setFontSize(T.body);
      doc.setTextColor(...(i === 0 ? C.ink : C.meta));
      doc.text(wrapText(doc, cell, colW - 8), x + i * colW + 6, rowY + 10);
    });
    rowY += rowH;
  });
}

function drawBlockTitle(
  doc: jsPDF,
  label: string,
  x: number,
  y: number,
  w: number,
  isContract = false,
  isClinicalPremium = false,
) {
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
  } else if (isContract && !isClinicalPremium) {
    drawMiniIcon(doc, "file", x + 13.5, y + 10.5, 9, [255, 255, 255] as [number, number, number]);
  }
  doc.setTextColor(...C.brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.blockTitle);
  doc.text(title.toUpperCase(), x + 34, y + 18);

  if (isContract && !isClinicalPremium) {
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
  const qrReserve = isContract || opts.validationHash ? PDF_QR.size + PDF_QR.marginBottom + 8 : 0;
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
      { text: profRole, size: T.sigRole },
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
