import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "./format";
import logoAsset from "@/assets/logo.jpg.asset.json";

type ClinicSettings = {
  nome_fantasia: string | null;
  razao_social: string | null;
  cnpj: string | null;
  telefones: string[] | null;
  emails: string[] | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  rodape_institucional: string | null;
};

type Professional = {
  nome: string;
  profissao: string;
  conselho: string | null;
  registro: string | null;
};

// ---------- Content primitives ----------

export type PdfContent =
  | { kind: "grid"; rows: Array<readonly [string, string] | string[]>; columns?: 1 | 2 }
  | { kind: "paragraph"; label?: string; text: string }
  | { kind: "highlight"; label: string; text: string }
  | { kind: "eva"; value: number | null }
  | { kind: "checks"; label?: string; items: Array<{ label: string; checked: boolean }> }
  | { kind: "evolutions"; items: Array<EvolutionItem> };

export type EvolutionItem = {
  data: string;
  hora?: string | null;
  index?: number;
  conduta?: string | null;
  resultado?: string | null;
  intercorrencias?: string | null;
  proximos?: string | null;
};

export type PdfBlock = { title: string; children: PdfContent[] };

// Legacy
export type PdfSection = { title: string; body: string };

// ---------- Logo loader ----------

let cachedLogo: string | null | undefined;
async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const res = await fetch(logoAsset.url);
    const blob = await res.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    cachedLogo = null;
  }
  return cachedLogo;
}

// ---------- Colors ----------

const C = {
  brand: [60, 80, 60] as [number, number, number],
  brandSoft: [244, 247, 244] as [number, number, number],
  border: [169, 182, 162] as [number, number, number],
  highlightBg: [238, 243, 236] as [number, number, number],
  text: [30, 30, 30] as [number, number, number],
  label: [110, 110, 110] as [number, number, number],
  muted: [140, 140, 140] as [number, number, number],
  evaGreen: [120, 180, 110] as [number, number, number],
  evaYellow: [240, 200, 80] as [number, number, number],
  evaRed: [210, 80, 70] as [number, number, number],
  olive: [85, 107, 47] as [number, number, number],
};

// ---------- Build ----------

export async function buildPdf(opts: {
  title: string;
  subtitle?: string;
  patientName?: string;
  sections?: PdfSection[];
  blocks?: PdfBlock[];
  professional?: Professional | null;
}) {
  const { data: clinic } = await supabase
    .from("clinic_settings")
    .select("nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional")
    .limit(1)
    .maybeSingle();

  const c = (clinic ?? {}) as ClinicSettings;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const contentW = W - 2 * M;
  const logo = await loadLogoDataUrl();

  // Header (once, page 1)
  const drawHeader = () => {
    doc.setFillColor(...C.brandSoft);
    doc.rect(0, 0, W, 92, "F");
    if (logo) {
      try { doc.addImage(logo, "JPEG", M, 20, 54, 54); } catch { /* ignore */ }
    }
    const tx = logo ? M + 66 : M;
    doc.setTextColor(...C.brand);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(c.nome_fantasia || "Move 60+", tx, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines = [
      c.razao_social,
      c.cnpj ? `CNPJ: ${c.cnpj}` : null,
      c.endereco,
      [c.cidade, c.estado].filter(Boolean).join(" - "),
      [c.telefones?.join(" · "), c.emails?.join(" · ")].filter(Boolean).join("  ·  "),
    ].filter(Boolean) as string[];
    doc.text(lines, tx, 52);
  };
  drawHeader();

  // Document title strip
  let y = 110;
  doc.setTextColor(...C.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(opts.title, M, y);
  if (opts.subtitle) {
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.muted);
    doc.text(opts.subtitle, M, y);
  }
  y += 6;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.7);
  doc.line(M, y, W - M, y);
  y += 14;

  // Page-break helper
  let pageY = y;
  const ensure = (need: number) => {
    if (y + need > H - 80) {
      doc.addPage();
      y = M + 8;
      pageY = y;
    }
  };

  // ---------- Render blocks ----------
  const blocks: PdfBlock[] = opts.blocks
    ? opts.blocks
    : (opts.sections ?? []).map((s) => ({
        title: s.title,
        children: [{ kind: "paragraph" as const, text: s.body || "—" }],
      }));

  for (const block of blocks) {
    renderBlock(block);
  }

  function renderBlock(block: PdfBlock) {
    // Measure block first by rendering to a sandbox? Simpler: draw title bar then children with running y, then draw outer border at the end.
    const startY = y;
    ensure(40);

    // Title bar
    const titleH = 20;
    doc.setFillColor(...C.brand);
    doc.rect(M, y, contentW, titleH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(block.title.toUpperCase(), M + 10, y + 13);
    y += titleH;

    // Inner content area starts here
    const innerTop = y;
    y += 10;

    for (const ch of block.children) {
      renderContent(ch);
      y += 6;
    }
    y += 4;

    // Outer border around (titleY..y)
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.rect(M, startY, contentW, y - startY, "S");
    // light fill behind inner area
    // (skip fill — border alone keeps document clean and printable)
    void innerTop;

    y += 10;
  }

  function renderContent(ch: PdfContent) {
    if (ch.kind === "grid") {
      const cols = ch.columns ?? 2;
      const colW = (contentW - 20) / cols;
      const labelLineH = 10;
      const valueLineH = 12;
      for (let i = 0; i < ch.rows.length; i += cols) {
        const rowCells = ch.rows.slice(i, i + cols);
        // measure max value height
        const heights = rowCells.map(([, v]) => {
          const lines = doc.splitTextToSize(v || "—", colW - 8);
          return labelLineH + lines.length * valueLineH;
        });
        const rowH = Math.max(...heights) + 4;
        ensure(rowH);
        rowCells.forEach(([label, value], idx) => {
          const x = M + 10 + idx * colW;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(...C.label);
          doc.text(label.toUpperCase(), x, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(...C.text);
          const lines = doc.splitTextToSize(value || "—", colW - 8);
          doc.text(lines, x, y + labelLineH);
        });
        y += rowH;
      }
      return;
    }

    if (ch.kind === "paragraph") {
      if (ch.label) {
        ensure(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...C.label);
        doc.text(ch.label.toUpperCase(), M + 10, y);
        y += 10;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...C.text);
      const lines = doc.splitTextToSize(ch.text || "—", contentW - 20);
      for (const ln of lines) {
        ensure(12);
        doc.text(ln, M + 10, y);
        y += 12;
      }
      return;
    }

    if (ch.kind === "highlight") {
      const text = ch.text || "—";
      const lines = doc.splitTextToSize(text, contentW - 40);
      const boxH = 14 + lines.length * 12 + 8;
      ensure(boxH);
      // bg
      doc.setFillColor(...C.highlightBg);
      doc.rect(M + 10, y, contentW - 20, boxH, "F");
      // left bar
      doc.setFillColor(...C.brand);
      doc.rect(M + 10, y, 3, boxH, "F");
      // label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...C.brand);
      doc.text(ch.label.toUpperCase(), M + 20, y + 11);
      // text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...C.text);
      doc.text(lines, M + 20, y + 24);
      y += boxH;
      return;
    }

    if (ch.kind === "eva") {
      const boxH = 56;
      ensure(boxH);
      const barX = M + 30;
      const barY = y + 22;
      const barW = contentW - 60;
      const barH = 10;
      const steps = 10;
      const stepW = barW / steps;
      // colored gradient via 10 segments
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const col = lerpColor3(C.evaGreen, C.evaYellow, C.evaRed, t);
        doc.setFillColor(col[0], col[1], col[2]);
        doc.rect(barX + i * stepW, barY, stepW, barH, "F");
      }
      // scale numbers
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.label);
      for (let i = 0; i <= steps; i++) {
        const x = barX + i * stepW;
        doc.text(String(i), x, barY + barH + 12, { align: "center" });
      }
      // marker
      if (ch.value != null && !Number.isNaN(ch.value)) {
        const v = Math.max(0, Math.min(10, Number(ch.value)));
        const mx = barX + (v / 10) * barW;
        doc.setFillColor(...C.text);
        // triangle pointer above bar
        doc.triangle(mx - 4, barY - 6, mx + 4, barY - 6, mx, barY - 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...C.text);
        doc.text(`EVA: ${ch.value} / 10`, M + contentW / 2 + 90, y + 12, { align: "right" });
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...C.muted);
        doc.text("EVA não informada", M + contentW - 20, y + 12, { align: "right" });
      }
      // endpoint labels
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text("Sem dor", barX, y + 12);
      doc.text("Dor máxima", barX + barW, y + 12, { align: "right" });
      y += boxH;
      return;
    }

    if (ch.kind === "checks") {
      if (ch.label) {
        ensure(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...C.label);
        doc.text(ch.label.toUpperCase(), M + 10, y);
        y += 10;
      }
      const colW = (contentW - 20) / 3;
      const rowH = 14;
      const rows = Math.ceil(ch.items.length / 3);
      ensure(rows * rowH);
      ch.items.forEach((it, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = M + 10 + col * colW;
        const cy = y + row * rowH;
        // checkbox
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.6);
        doc.rect(x, cy - 8, 9, 9, "S");
        if (it.checked) {
          doc.setDrawColor(...C.brand);
          doc.setLineWidth(1.2);
          doc.line(x + 1.5, cy - 3.5, x + 4, cy - 1);
          doc.line(x + 4, cy - 1, x + 8, cy - 7);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.text);
        doc.text(it.label, x + 14, cy);
      });
      y += rows * rowH;
      return;
    }

    if (ch.kind === "evolutions") {
      if (!ch.items.length) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(...C.muted);
        ensure(14);
        doc.text("Nenhuma evolução vinculada.", M + 10, y);
        y += 12;
        return;
      }
      for (const ev of ch.items) {
        const dataStr = ev.data + (ev.hora ? `  ${String(ev.hora).slice(0, 5)}` : "");
        const rows: Array<[string, string]> = [];
        if (ev.conduta) rows.push(["Conduta aplicada", ev.conduta]);
        if (ev.resultado) rows.push(["Resultado observado", ev.resultado]);
        if (ev.intercorrencias) rows.push(["Intercorrências", ev.intercorrencias]);
        if (ev.proximos) rows.push(["Próximos passos", ev.proximos]);
        // measure
        const inner = rows.reduce((acc, [, v]) => {
          const lines = doc.splitTextToSize(v, contentW - 40);
          return acc + 10 + lines.length * 11 + 4;
        }, 0);
        const cardH = 22 + Math.max(inner, 14) + 8;
        ensure(cardH + 4);
        // card border
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.4);
        doc.rect(M + 10, y, contentW - 20, cardH, "S");
        // header strip
        doc.setFillColor(...C.brandSoft);
        doc.rect(M + 10, y, contentW - 20, 18, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...C.brand);
        doc.text(dataStr, M + 18, y + 12);
        if (ev.index != null) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.text(`Sessão #${ev.index}`, M + contentW - 18, y + 12, { align: "right" });
        }
        let cy = y + 26;
        for (const [label, value] of rows) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(...C.label);
          doc.text(label.toUpperCase(), M + 18, cy);
          cy += 9;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(...C.text);
          const lines = doc.splitTextToSize(value, contentW - 40);
          for (const ln of lines) {
            doc.text(ln, M + 18, cy);
            cy += 11;
          }
          cy += 4;
        }
        y += cardH + 8;
      }
      return;
    }
  }

  // ---------- Footer on every page ----------
  const pageCount = doc.getNumberOfPages();
  const lastPageEndY = pageY;
  const BAR_H = 9.45; // ~1/3 de 1cm em pt (mais sutil)
  const TRI = 50; // triângulo decorativo reduzido
  const decorOpacity = 0.25; // transparência sutil
  const GState = (doc as any).GState;
  const normalFooterY = H - 64;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    let fy = normalFooterY;
    let sigY = H - 94;

    if (i === pageCount && opts.professional) {
      // Move assinatura mais próxima do conteúdo na última página para evitar espaço vazio,
      // respeitando limites para não sobrepor o conteúdo nem sair da página.
      const desiredSigY = lastPageEndY + 30;
      const minSigY = H - 140;
      const maxSigY = H - 66;
      sigY = Math.min(maxSigY, Math.max(minSigY, desiredSigY));
      fy = sigY + 30;
    }

    // Decoração: triângulo no canto superior direito (oliva, transparente)
    doc.setGState(new GState({ opacity: decorOpacity }));
    doc.setFillColor(...C.olive);
    doc.triangle(W - TRI, 0, W, 0, W, TRI, "F");
    doc.setGState(new GState({ opacity: 1 })); // reset

    // Rodapé: faixa oliva transparente em toda a largura
    doc.setGState(new GState({ opacity: decorOpacity }));
    doc.setFillColor(...C.olive);
    const barY = fy < normalFooterY - 1 ? Math.min(fy + 34, H - BAR_H) : H - BAR_H;
    doc.rect(0, barY, W, BAR_H, "F");
    doc.setGState(new GState({ opacity: 1 })); // reset

    // Signature line on last page
    if (i === pageCount && opts.professional) {
      const prof = opts.professional;
      const isFisio = prof.profissao?.toLowerCase().includes("fisio");
      doc.setDrawColor(...C.text);
      doc.setLineWidth(0.5);
      const sigW = 220;
      const sigX = (W - sigW) / 2;
      doc.line(sigX, sigY, sigX + sigW, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.text);
      doc.text(prof.nome, W / 2, sigY + 11, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.text);
      const reg = isFisio
        ? `CREFITO-8 ${prof.registro || prof.conselho || ""}`.trim()
        : [prof.profissao, prof.conselho, prof.registro].filter(Boolean).join(" · ");
      doc.text(reg, W / 2, sigY + 22, { align: "center" });
    }

    // Footer divider
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.line(M, fy, W - M, fy);
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(`Emitido em ${fmtDateTime(new Date())}`, M, fy + 14);
    doc.text(c.rodape_institucional || `${c.nome_fantasia ?? "Move 60+"} · ${[c.cidade, c.estado].filter(Boolean).join("/")}`, M, fy + 26);
    doc.text(`Página ${i} de ${pageCount}`, W - M - 4, fy + 14, { align: "right" });
  }

  return doc;
}

function lerpColor3(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
  t: number,
): [number, number, number] {
  if (t < 0.5) {
    const k = t / 0.5;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  const k = (t - 0.5) / 0.5;
  return [b[0] + (c[0] - b[0]) * k, b[1] + (c[1] - b[1]) * k, b[2] + (c[2] - b[2]) * k];
}

// ---------- Public helpers ----------

export async function downloadPdf(opts: Parameters<typeof buildPdf>[0]) {
  const doc = await buildPdf(opts);
  doc.save(`${opts.title.replace(/\s+/g, "_")}.pdf`);
}

export async function previewPdf(opts: Parameters<typeof buildPdf>[0]) {
  const doc = await buildPdf(opts);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
}

export async function printPdf(opts: Parameters<typeof buildPdf>[0]) {
  const doc = await buildPdf(opts);
  const url = URL.createObjectURL(doc.output("blob"));
  const w = window.open(url, "_blank");
  if (w) {
    w.addEventListener("load", () => { try { w.print(); } catch { /* noop */ } });
  }
}

export const generatePdf = downloadPdf;

type DocFolder = "avaliacoes" | "reavaliacoes" | "evolucoes" | "relatorios" | "recibos" | "declaracoes" | "encaminhamentos" | "termos";
type DocumentType = "avaliacao" | "reavaliacao" | "evolucao" | "relatorio" | "recibo" | "declaracao" | "encaminhamento" | "termo" | "laudo";

export async function uploadAndRegisterPdf(opts: {
  pdfOpts: Parameters<typeof buildPdf>[0];
  folder: DocFolder;
  tipo: DocumentType;
  patientId: string;
  professionalId: string;
  referenciaId: string;
}) {
  const doc = await buildPdf(opts.pdfOpts);
  const blob = doc.output("blob");
  const path = `${opts.folder}/${opts.referenciaId}-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from("documents").upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) throw upErr;
  const { error: insErr } = await supabase.from("documents").insert({
    patient_id: opts.patientId,
    professional_id: opts.professionalId,
    tipo: opts.tipo,
    referencia_id: opts.referenciaId,
    pdf_path: path,
    emitido_em: new Date().toISOString(),
  });
  if (insErr) throw insErr;
  return path;
}
