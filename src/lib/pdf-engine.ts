// FisioOS PDF Engine V2 — editorial / clínico premium
// Renderer puro (sem supabase). Consome contexto pré-carregado (clínica + logo).
// Wrapper em src/lib/pdf.ts adiciona o fetch + upload.

import jsPDF from "jspdf";
import QRCode from "qrcode";

// ---------- Types ----------

export type ClinicData = {
  nome_fantasia: string | null;
  razao_social: string | null;
  cnpj: string | null;
  telefones: string[] | null;
  emails: string[] | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  rodape_institucional: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

export type Professional = {
  nome: string | null;
  profissao: string | null;
  conselho: string | null;
  registro: string | null;
};

export type EvolutionItem = {
  data: string;
  hora?: string | null;
  index?: number;
  conduta?: string | null;
  resultado?: string | null;
  intercorrencias?: string | null;
  proximos?: string | null;
};

export type PdfContent =
  | { kind: "grid"; rows: Array<readonly [string, string] | string[]>; columns?: 1 | 2 }
  | { kind: "paragraph"; label?: string; text: string }
  | { kind: "highlight"; label: string; text: string }
  | { kind: "eva"; value: number | null }
  | { kind: "checks"; label?: string; items: Array<{ label: string; checked: boolean }> }
  | { kind: "evolutions"; items: Array<EvolutionItem> };

export type PdfBlock = { title: string; children: PdfContent[] };
export type PdfSection = { title: string; body: string };

export type BuildPdfOpts = {
  title: string;
  subtitle?: string;
  patientName?: string;
  sections?: PdfSection[];
  blocks?: PdfBlock[];
  professional?: Professional | null;
  validationHash?: string | null;
  validationUrlBase?: string;
  contratante?: {
    nome?: string | null;
    cpf?: string | null;
    vinculo?: string | null;
  } | null;
  patientSnapshot?: { nome?: string | null; cpf?: string | null } | null;
  /**
   * Quando true, o bloco de assinatura profissional NÃO é desenhado e o
   * espaço reservado é removido. Usado em materiais institucionais da
   * Biblioteca (cartilhas, protocolos, POPs) que não exigem responsável
   * técnico.
   */
  hideSignature?: boolean;
};

export type PdfRenderCtx = {
  clinic: ClinicData;
  logo: string | null; // data URL or null
};

// ---------- Design tokens ----------

const C = {
  brand: [60, 80, 60] as [number, number, number],
  brandSoft: [248, 250, 246] as [number, number, number],
  ink: [26, 26, 26] as [number, number, number],
  meta: [107, 107, 107] as [number, number, number],
  hairline: [201, 210, 194] as [number, number, number],
  hairlineSoft: [228, 232, 222] as [number, number, number],
  highlightBg: [240, 244, 238] as [number, number, number],
  evaLeve: [59, 130, 246] as [number, number, number],     // 0-2 azul
  evaModerada: [34, 197, 94] as [number, number, number], // 3-7 verde
  evaIntensa: [239, 68, 68] as [number, number, number],  // 8-10 vermelho
} as const;

function hexToRgb(hex?: string | null): [number, number, number] | null {
  const raw = (hex ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function mixRgb(a: [number, number, number], b: [number, number, number], weight: number): [number, number, number] {
  return a.map((v, i) => Math.round(v * weight + b[i] * (1 - weight))) as [number, number, number];
}

function applyClinicPalette(c: ClinicData) {
  const primary = hexToRgb(c.primary_color) ?? [60, 80, 60] as [number, number, number];
  const secondary = hexToRgb(c.secondary_color) ?? primary;
  const soft = mixRgb(primary, [255, 255, 255], 0.08);
  const highlight = mixRgb(secondary, [255, 255, 255], 0.10);
  const line = mixRgb(primary, [255, 255, 255], 0.28);
  (C as any).brand = primary;
  (C as any).brandSoft = soft;
  (C as any).highlightBg = highlight;
  (C as any).hairline = line;
  (C as any).hairlineSoft = mixRgb(primary, [255, 255, 255], 0.16);
}

function dataUrlImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" | undefined {
  if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";
  if (/^data:image\/png/i.test(dataUrl)) return "PNG";
  return undefined;
}

const S = {
  M: 40,
  HEADER_H: 115,
  FOOTER_H: 32,
  BAR_H: 14,
  BAR_GAP: 10,
  BLOCK_GAP: 18,
  BLOCK_GAP_COMPACT: 12,
  BLOCK_GAP_TIGHT: 8,
  PAD_X: 14,
  PAD_Y: 11,
  LINE_H: 16,
  LABEL_H: 13,
  SIG_CONTRACT_H: 200,
  SIG_DEFAULT_H: 90,
  TOP_AFTER_HEADER: 22,
  TITLE_TO_DIVIDER: 8,
  DIVIDER_TO_CONTENT: 16,
  TRI: 0,
};

const T = {
  docTitle: 15,
  docSubtitle: 8.5,
  blockTitle: 9.5,
  body: 10,
  meta: 7.5,
  label: 7,
  sigName: 10,
  sigRole: 9,
  sigMeta: 8,
  headerName: 16,
  headerMeta: 8.5,
};

// ---------- Empty / humanize ----------

const EMPTY_RE = /^(—|null|undefined|n\/a|na|n\.d\.)$/i;
const isEmptyText = (v: string | null | undefined): boolean => {
  if (v == null) return true;
  const t = String(v).trim();
  return t === "" || EMPTY_RE.test(t);
};

const cleanText = (v: string | null | undefined): string => (isEmptyText(v) ? "" : String(v).trim());

// ---------- Logo loader (used by wrapper, but exposed for fixtures) ----------

export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return null;
    // Node + browser: convert to base64
    if (typeof window === "undefined") {
      const b64 = Buffer.from(buf).toString("base64");
      return `data:${ct};base64,${b64}`;
    }
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(new Blob([buf], { type: ct }));
    });
  } catch {
    return null;
  }
}

// ---------- Sanitização contrato (somente cláusula final / Foro) ----------

function sanitizeContractParagraph(raw: string): string {
  // Em contratos, o template legado armazena nas cláusulas finais (Foro/
  // Oitava) artefatos visuais de assinatura inline. Como o bloco visual
  // de assinaturas é renderizado separadamente ao final, esses artefatos
  // viram duplicidade e devem ser removidos. Cortamos tudo após a frase
  // "...legais efeitos." (inclusive a linha "Cidade/UF, data." e os
  // underlines "_____", "CONTRATANTE: ...", etc).
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
  | { kind: "block-gap"; h: number; blockId: number };

type BlockGroup = { id: number; title: string; atoms: Atom[]; totalH: number };

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
      const lines: string[] = doc.splitTextToSize(cleaned, innerW);
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
      const colW = (innerW) / cols;
      for (let i = 0; i < ch.rows.length; i += cols) {
        const rowCells = ch.rows.slice(i, i + cols).map((r) => [r[0], r[1] ?? ""] as [string, string]);
        // hide row when all values are empty
        const allEmpty = rowCells.every(([, v]) => isEmptyText(v));
        if (allEmpty) continue;
        // hide individual empty cells by replacing with empty string (rendered as nothing)
        const visibleCells = rowCells.map(([k, v]) => [k, isEmptyText(v) ? "" : v] as [string, string]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(T.body);
        const cellH = visibleCells.map(([, v]) =>
          v ? doc.splitTextToSize(v, colW - 8).length * S.LINE_H : 0,
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
      const lines: string[] = doc.splitTextToSize(text, innerW - 20);
      const h = 14 + lines.length * S.LINE_H + 10;
      atoms.push({ kind: "highlight", label: ch.label, lines, h, blockId: id });
      continue;
    }

    if (ch.kind === "eva") {
      atoms.push({ kind: "eva", value: ch.value, h: 56, blockId: id });
      continue;
    }

    if (ch.kind === "checks") {
      // 3 per row
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
          fields.push({ label, text: doc.splitTextToSize(v, innerW - 8) });
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
  }

  // tail gap for the block (will be consumed at composition end-of-page)
  atoms.push({ kind: "block-gap", h: S.BLOCK_GAP, blockId: id });

  const totalH = atoms.reduce((s, a) => s + a.h, 0);
  return { id, title: block.title, atoms, totalH };
}

// ---------- Composition (two-phase) ----------


type Page = {
  atoms: Atom[];
  blockSegments: Array<{ blockId: number; startIdx: number; endIdx: number; isContinuation: boolean }>;
  contentH: number;
  topY: number;
};

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
  const pageBottom = bottomY;

  const flush = () => {
    pages.push(cur);
    cur = { atoms: [], blockSegments: [], contentH: 0, topY: topYRest };
    y = topYRest;
  };


  const isLastGroup = (gi: number) => gi === groups.length - 1;

  // Flatten with per-group context so we know first paragraph of each block (for orphan-title rule)
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const isLast = isLastGroup(gi);
    const localBottom = isLast ? pageBottom - signatureReserveH : pageBottom;

    // Headroom: title + first 4 lines of first paragraph (or whole block if smaller)
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
      // Replace block-gap with configured value
      const atom: Atom = a.kind === "block-gap" ? { ...a, h: blockGap } : a;

      const bottom = isLast ? pageBottom - signatureReserveH : pageBottom;
      const fits = y + atom.h <= bottom;

      if (atom.kind === "title") {
        // first atom of block; ensured by headroom check above
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

      // doesn't fit: need page break
      if (atom.kind === "para-line") {
        // line-by-line: just break here, push remaining lines onto next pages
        // Close current segment, push continuation title on next page
        cur.blockSegments.push({ blockId: g.id, startIdx: segStartIdx, endIdx: cur.atoms.length - 1, isContinuation });
        flush();
        // continuation title
        const contTitle: Atom = { kind: "title", label: `${g.title} (continuação)`, h: S.BAR_H + S.BAR_GAP, blockId: g.id, continuation: true };
        cur.atoms.push(contTitle);
        cur.contentH += contTitle.h;
        y += contTitle.h;
        segStartIdx = 0;
        isContinuation = true;
        // place atom on new page
        cur.atoms.push(atom);
        cur.contentH += atom.h;
        y += atom.h;
        continue;
      }

      // non-splittable atom: move to next page; if it still doesn't fit (huge), draw anyway
      cur.blockSegments.push({ blockId: g.id, startIdx: segStartIdx, endIdx: cur.atoms.length - 1, isContinuation });
      flush();
      const contTitle: Atom = { kind: "title", label: `${g.title} (continuação)`, h: S.BAR_H + S.BAR_GAP, blockId: g.id, continuation: true };
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

// Calcula ocupação útil (0-1) da última página de conteúdo, incluindo a reserva da assinatura.
function lastPageFill(pages: Page[], usableH: number, sigH: number): number {
  if (pages.length === 0) return 0;
  const last = pages[pages.length - 1];
  return Math.min(1, (last.contentH + sigH) / usableH);
}

// ---------- Render ----------

export async function renderPdf(opts: BuildPdfOpts, ctx: PdfRenderCtx): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = S.M;
  const contentW = W - 2 * M;
  const c = ctx.clinic;
  applyClinicPalette(c);
  const isContract = /contrato/i.test(opts.title || "");

  // ----- Normalize blocks -----
  const blocks: PdfBlock[] = opts.blocks
    ? opts.blocks
    : (opts.sections ?? []).map((s) => ({
        title: s.title,
        children: [{ kind: "paragraph" as const, text: s.body || "" }],
      }));

  // ----- Measure groups -----
  const groups: BlockGroup[] = blocks.map((b, i) => measureBlock(doc, b, i, contentW, isContract));

  // ----- Compose with progressive compaction -----
  const topYFirst = S.HEADER_H + S.TOP_AFTER_HEADER + 13 + (opts.subtitle ? 12 : 0) + S.TITLE_TO_DIVIDER + S.DIVIDER_TO_CONTENT;
  const topYRest = S.M + 28;
  const bottomY = H - S.FOOTER_H - 16;
  const sigDraw = isContract ? S.SIG_CONTRACT_H : S.SIG_DEFAULT_H;
  const usableHRest = bottomY - topYRest;

  // Reserva igual ao tamanho real do bloco de assinatura + folga p/ QR.
  // Compaction varia APENAS o gap entre blocos — assim a reserva nunca é
  // inferior ao espaço efetivamente desenhado (sem sobreposição com QR/rodapé).
  const qrReserve = isContract ? 64 : 0;
  const sigReserve = opts.hideSignature ? 0 : sigDraw + qrReserve;
  const gapTiers: number[] = [S.BLOCK_GAP, S.BLOCK_GAP_COMPACT, S.BLOCK_GAP_TIGHT];
  let pages = compose(groups, topYFirst, topYRest, bottomY, sigReserve, gapTiers[0]);
  for (let t = 1; t < gapTiers.length; t++) {
    const fill = lastPageFill(pages, usableHRest, sigReserve);
    if (fill >= 0.5 || pages.length === 1) break;
    const next = compose(groups, topYFirst, topYRest, bottomY, sigReserve, gapTiers[t]);
    if (next.length < pages.length || lastPageFill(next, usableHRest, sigReserve) > fill) {
      pages = next;
    }
  }



  // ----- Draw -----
  drawHeader(doc, c, ctx.logo, W);

  // Document title strip
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
  // Patient pill (right side)
  if (opts.patientName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T.docSubtitle);
    doc.setTextColor(...C.meta);
    doc.text(opts.patientName, W - M, S.HEADER_H + S.TOP_AFTER_HEADER, { align: "right" });
  }
  // Divider (double hairline)
  const dividerY = S.HEADER_H + S.TOP_AFTER_HEADER + 13 + (opts.subtitle ? 12 : 0) + S.TITLE_TO_DIVIDER;
  doc.setDrawColor(...C.brand);
  doc.setLineWidth(0.8);
  doc.line(M, dividerY, W - M, dividerY);
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.3);
  doc.line(M, dividerY + 2.5, W - M, dividerY + 2.5);

  // Pages
  for (let pi = 0; pi < pages.length; pi++) {
    if (pi > 0) {
      doc.addPage();
      // (header não se repete; rodapé sim — será desenhado depois para cada página)
    }
    renderPageContent(doc, pages[pi], pages[pi].topY, W, contentW, M);
  }

  // Signature on last page
  const lastPageIdx = pages.length;
  const lastPage = pages[pages.length - 1];
  let lastContentY = lastPage.topY;
  for (const a of lastPage.atoms) lastContentY += a.h;
  lastContentY = Math.min(lastContentY, bottomY - sigDraw);


  doc.setPage(lastPageIdx);
  if (!opts.hideSignature) {
    drawSignatureArea(doc, opts, c, W, H, M, lastContentY, sigDraw, isContract);
  }

  // Footers + QR
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, c, W, H, M, i, pageCount);
    if (i === pageCount && opts.validationHash) {
      await drawQR(doc, opts.validationHash, opts.validationUrlBase, W, H, M, isContract);
    }
  }

  return doc;
}

// ---------- Header ----------

function drawHeader(doc: jsPDF, c: ClinicData, logo: string | null, W: number) {
  // Subtle background tint
  doc.setFillColor(...C.brandSoft);
  doc.rect(0, 0, W, S.HEADER_H, "F");

  const M = S.M;
  const logoSize = 78;
  const logoY = (S.HEADER_H - logoSize) / 2;

  if (logo) {
    try {
      doc.addImage(logo, dataUrlImageFormat(logo) ?? "PNG", M, logoY, logoSize, logoSize);
    } catch {
      drawMonogram(doc, c, M, logoY, logoSize);
    }
  } else {
    drawMonogram(doc, c, M, logoY, logoSize);
  }

  // Text block (vertically centered)
  const tx = M + logoSize + 14;
  const lines: string[] = [];
  const razao = cleanText(c.razao_social);
  const cnpj = cleanText(c.cnpj);
  if (razao || cnpj) {
    lines.push([razao, cnpj ? `CNPJ ${cnpj}` : ""].filter(Boolean).join("  ·  "));
  }
  const tels = Array.isArray(c.telefones) ? c.telefones.filter(Boolean).join(" · ") : "";
  const emails = Array.isArray(c.emails) ? c.emails.filter(Boolean).join(" · ") : "";
  const contactLine = [tels, emails].filter(Boolean).join("  ·  ");
  if (contactLine) lines.push(contactLine);
  const endereco = cleanText(c.endereco);
  const cityState = [cleanText(c.cidade), cleanText(c.estado)].filter(Boolean).join("/");
  const addrLine = [endereco, cityState].filter(Boolean).join(" · ");
  if (addrLine) lines.push(addrLine);

  const nameSize = T.headerName;
  const metaSize = T.headerMeta;
  const lineH = 11;
  const totalH = nameSize + 4 + lines.length * lineH;
  const startY = (S.HEADER_H - totalH) / 2 + nameSize;

  doc.setTextColor(...C.brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(nameSize);
  const name = cleanText(c.nome_fantasia) || "FisioOS";
  doc.text(name, tx, startY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(metaSize);
  doc.setTextColor(...C.meta);
  lines.forEach((ln, i) => doc.text(ln, tx, startY + 6 + (i + 1) * lineH - lineH + 4));
}

function drawMonogram(doc: jsPDF, c: ClinicData, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  doc.setFillColor(...C.brand);
  doc.circle(cx, cy, size / 2 - 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  const name = cleanText(c.nome_fantasia) || "FisioOS";
  const monogram = name.charAt(0).toUpperCase() || "F";
  doc.text(monogram, cx, cy + 10, { align: "center" });
}

// ---------- Page content ----------

function renderPageContent(
  doc: jsPDF,
  page: Page,
  topY: number,
  W: number,
  contentW: number,
  M: number,
) {
  let y = topY;
  // Group atoms by segment to draw block frames
  const segments = page.blockSegments;

  // Render each atom, drawing block frames around their atoms
  // We track segment start Y to draw the border at the end
  let segmentIdx = 0;
  let segStartY = y;
  let segOpenBlockId: number | null = null;

  const closeSegment = (endY: number) => {
    if (segOpenBlockId == null) return;
    doc.setDrawColor(...C.hairline);
    doc.setLineWidth(0.3);
    doc.rect(M, segStartY, contentW, endY - segStartY, "S");
    segOpenBlockId = null;
  };

  for (let i = 0; i < page.atoms.length; i++) {
    const a = page.atoms[i];

    // Open segment on title
    if (a.kind === "title") {
      if (segOpenBlockId != null) closeSegment(y);
      segStartY = y;
      segOpenBlockId = a.blockId;
      drawBlockTitle(doc, a.label, M, y, contentW);
      y += S.BAR_H;
      y += S.BAR_GAP;
      continue;
    }

    if (a.kind === "label") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(T.label);
      doc.setTextColor(...C.meta);
      doc.text(a.text.toUpperCase(), M + S.PAD_X, y + 8);
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
        doc.setFont("helvetica", "bold");
        doc.setFontSize(T.label);
        doc.setTextColor(...C.meta);
        doc.text(label.toUpperCase(), x, y + 8);
        if (value) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(T.body);
          doc.setTextColor(...C.ink);
          const lines = doc.splitTextToSize(value, colW - 8);
          doc.text(lines, x, y + S.LABEL_H + 8);
        }
      });
      y += a.h;
      continue;
    }

    if (a.kind === "highlight") {
      doc.setFillColor(...C.highlightBg);
      doc.rect(M + S.PAD_X, y, contentW - 2 * S.PAD_X, a.h, "F");
      doc.setFillColor(...C.brand);
      doc.rect(M + S.PAD_X, y, 3, a.h, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(T.label);
      doc.setTextColor(...C.brand);
      doc.text(a.label.toUpperCase(), M + S.PAD_X + 10, y + 11);
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
        doc.setDrawColor(...C.hairline);
        doc.setLineWidth(0.5);
        doc.rect(x, y + 2, 10, 10, "S");
        if (it.checked) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...C.brand);
          doc.text("✓", x + 1.6, y + 10.4);
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

    if (a.kind === "block-gap") {
      // close current segment border before gap
      closeSegment(y);
      y += a.h;
      continue;
    }
  }
  closeSegment(y);
}

function drawBlockTitle(doc: jsPDF, label: string, x: number, y: number, w: number) {
  doc.setFillColor(...C.brand);
  doc.rect(x, y, w, S.BAR_H, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.blockTitle);
  // Tracked uppercase: emulate letter-spacing by inserting hair spaces
  doc.text(label.toUpperCase(), x + 10, y + 9.5, { charSpace: 1.2 });
}

function drawEva(doc: jsPDF, value: number | null, x: number, y: number, w: number) {
  const barX = x + 20;
  const barW = w - 40;
  const barY = y + 26;
  const barH = 8;
  doc.setFillColor(...C.hairlineSoft);
  doc.rect(barX, barY, barW, barH, "F");
  if (value != null) {
    const t = Math.max(0, Math.min(10, value)) / 10;
    const fillW = barW * t;
    const color = value <= 3 ? C.evaGreen : value <= 6 ? C.evaYellow : C.evaRed;
    doc.setFillColor(...color);
    doc.rect(barX, barY, fillW, barH, "F");
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T.label);
  doc.setTextColor(...C.meta);
  doc.text("EVA", x, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(T.body);
  doc.setTextColor(...C.ink);
  doc.text(value != null ? `${value}/10` : "—", x + w, y + 14, { align: "right" });
  // Scale labels
  doc.setFontSize(7);
  doc.setTextColor(...C.meta);
  doc.text("0", barX, barY + barH + 9);
  doc.text("10", barX + barW, barY + barH + 9, { align: "right" });
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
  // Anchor: assinatura ancorada na base útil, com reserva extra abaixo para
  // o QR (somente contratos). compose reserva exatamente esse espaço,
  // evitando colisão com conteúdo, QR ou rodapé.
  const qrReserve = isContract ? 64 : 0;
  const top = H - S.FOOTER_H - 16 - sigH - qrReserve;

  // Local + data discreet, right aligned
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
    drawProfessionalSignature(doc, c, W, M, top + 16, profNome, profRole, profRegistry);
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

  // Espaço acima da linha (para assinatura manual / carimbo).
  const SPACE_PARTY = 28;     // contratante e contratada
  const SPACE_WITNESS = 40;   // testemunhas — mais espaço p/ caligrafia
  // Bloco completo: signSpace + label(10) + linhas
  const row1Top = startY;
  const row2Top = row1Top + SPACE_PARTY + 10 + 5 * 11 + 14; // gap entre linhas

  const ct = opts.contratante ?? null;
  const ctNome = cleanText(ct?.nome ?? "") || null;
  const ctCpf = cleanText(ct?.cpf ?? "");
  const ctVinculo = cleanText(ct?.vinculo ?? "");
  const isResponsavel = !!ctVinculo && !/próprio paciente/i.test(ctVinculo);
  const ps = opts.patientSnapshot ?? null;
  const psNome = cleanText(ps?.nome ?? "");

  // CONTRATANTE — paciente beneficiário subordinado
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
  drawSigCol(doc, M + colW / 2, row1Top, sigW, SPACE_PARTY, {
    label: "CONTRATANTE",
    lines: contratanteLines,
  });

  // CONTRATADA
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

  // Testemunhas — área útil ampliada para preenchimento manual
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
  c: ClinicData,
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
    label: profRole.toUpperCase(),
    lines: [
      profNome ? { text: profNome, bold: true, size: T.sigName } : { text: "Profissional responsável", muted: true, size: T.sigRole },
      ...(profRegistry ? [{ text: profRegistry, bold: true, size: T.sigMeta } as const] : []),
    ],
  });
  // Identidade clínica discreta
  const sepY = sigY + 40;
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.3);
  doc.line(cx - 50, sepY, cx + 50, sepY);
  const name = cleanText(c.nome_fantasia ?? "") || cleanText(c.razao_social ?? "");
  if (name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.brand);
    doc.text(name, cx, sepY + 12, { align: "center" });
  }
  const cnpj = cleanText(c.cnpj ?? "");
  if (cnpj) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.meta);
    doc.text(`CNPJ ${cnpj}`, cx, sepY + 22, { align: "center" });
  }
}

type SigLine = { text: string; bold?: boolean; muted?: boolean; italic?: boolean; size: number };
function drawSigCol(
  doc: jsPDF,
  cx: number,
  topY: number,
  sigW: number,
  signSpace: number,
  opts: { label: string; lines: SigLine[] },
) {
  // Linha de assinatura
  const lineY = topY + signSpace;
  doc.setDrawColor(...C.ink);
  doc.setLineWidth(0.5);
  doc.line(cx - sigW / 2, lineY, cx + sigW / 2, lineY);

  // Título (abaixo da linha) — 7.5pt uppercase bold #6B6B6B com tracking
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 107, 107);
  // Título (abaixo da linha) — uppercase normal, sem letter-spacing exagerado.
  doc.text(opts.label.toUpperCase(), cx, lineY + 10, { align: "center" });

  // Conteúdo
  let ly = lineY + 22;
  for (const ln of opts.lines) {
    const style = ln.italic ? "italic" : ln.bold ? "bold" : "normal";
    doc.setFont("helvetica", style);
    doc.setFontSize(ln.size);
    doc.setTextColor(...(ln.muted ? C.meta : C.ink));
    doc.text(ln.text, cx, ly, { align: "center" });
    ly += ln.size + 2;
  }
}

// ---------- Footer + QR ----------

function drawFooter(doc: jsPDF, c: ClinicData, W: number, H: number, M: number, page: number, pageCount: number) {
  const fy = H - S.FOOTER_H + 4;
  doc.setDrawColor(...C.hairline);
  doc.setLineWidth(0.3);
  doc.line(M, fy, W - M, fy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.meta);
  const issued = `Emitido em ${nowLabel()}`;
  const name = cleanText(c.nome_fantasia ?? "") || "FisioOS";
  const cityState = [cleanText(c.cidade ?? ""), cleanText(c.estado ?? "")].filter(Boolean).join("/");
  const footerName = cleanText(c.rodape_institucional ?? "") || [name, cityState].filter(Boolean).join(" · ");
  doc.text(issued, M, fy + 10);
  doc.text(footerName, M, fy + 20);
  doc.text(`Página ${page} de ${pageCount}`, W - M, fy + 10, { align: "right" });
}

function nowLabel(): string {
  return new Date().toLocaleString("pt-BR");
}

async function drawQR(
  doc: jsPDF,
  hash: string,
  base: string | undefined,
  W: number,
  H: number,
  M: number,
  isContract: boolean,
) {
  try {
    const origin = base || (typeof window !== "undefined" ? window.location.origin : "https://fisioos.app");
    const url = `${origin}/validar/${hash}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 0, width: 200 });
    const size = 44;
    // QR no canto inferior direito; assinatura reserva 64pt abaixo, garantindo
    // afastamento mínimo de ~20pt da área das testemunhas.
    const x = W - M - size;
    const y = H - S.FOOTER_H - size - 8;
    doc.addImage(dataUrl, "PNG", x, y, size, size);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...C.meta);
    doc.text("Validação digital", x + size / 2, y - 4, { align: "center" });
    doc.text(`${hash.slice(0, 12)}…`, x + size / 2, y + size + 7, { align: "center" });
  } catch { /* ignore */ }
}

