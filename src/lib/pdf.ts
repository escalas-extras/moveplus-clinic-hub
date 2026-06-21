import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "./format";



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
// White-label: only the clinic's own logo is ever rendered as an image.
// When none exists we return null and the header draws a neutral institutional
// monogram (no legacy brand fallback).

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null;
    const blob = await res.blob();
    if (blob.size === 0) return null;
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function isLikelyImageUrl(url: string): boolean {
  if (/\.git(\?|$|#)/i.test(url)) return false;
  if (/^https?:\/\/(www\.)?github\.com\//i.test(url) && !/\/raw\//.test(url)) return false;
  return true;
}

async function loadClinicLogo(clinicLogoUrl?: string | null): Promise<string | null> {
  if (!clinicLogoUrl) return null;
  let finalUrl = clinicLogoUrl;
  if (!/^https?:\/\//.test(clinicLogoUrl)) {
    const { data } = supabase.storage.from("documents").getPublicUrl(clinicLogoUrl);
    finalUrl = data.publicUrl;
  }
  if (!isLikelyImageUrl(finalUrl)) return null;
  return await urlToDataUrl(finalUrl);
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
  validationHash?: string | null;
  validationUrlBase?: string;
}) {

  const { data: clinic } = await supabase
    .from("clinic_settings")
    .select("nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional, logo_url")
    .limit(1)
    .maybeSingle();

  const c = (clinic ?? {}) as ClinicSettings & { logo_url?: string | null };
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const contentW = W - 2 * M;
  const logo = await loadClinicLogo(c.logo_url);

  // Header (once, page 1)
  const HEADER_H = 165;
  const LOGO_SIZE = 135;
  const drawHeader = () => {
    doc.setFillColor(...C.brandSoft);
    doc.rect(0, 0, W, HEADER_H, "F");
    if (logo) {
      try { doc.addImage(logo, "JPEG", M, 15, LOGO_SIZE, LOGO_SIZE); } catch { /* ignore */ }
    } else {
      // Neutral institutional monogram (no legacy brand fallback)
      const cx = M + LOGO_SIZE / 2;
      const cy = 15 + LOGO_SIZE / 2;
      doc.setFillColor(...C.brand);
      doc.circle(cx, cy, LOGO_SIZE / 2 - 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(34);
      const monogram = (c.nome_fantasia || "FisioOS").trim().charAt(0).toUpperCase() || "F";
      doc.text(monogram, cx, cy + 12, { align: "center" });
    }
    const tx = M + LOGO_SIZE + 14;
    doc.setTextColor(...C.brand);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const lines = [
      c.razao_social,
      c.cnpj ? `CNPJ: ${c.cnpj}` : null,
      [c.telefones?.join(" · "), c.emails?.join(" · ")].filter(Boolean).join("  ·  "),
    ].filter(Boolean) as string[];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Vertically center the text block with the logo
    const logoCenterY = 15 + LOGO_SIZE / 2;
    const titleH = 18;
    const lineH = 10;
    const titleLineGap = 6;
    const totalH = titleH + titleLineGap + lines.length * lineH;
    const textTopY = logoCenterY - totalH / 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(c.nome_fantasia || "FisioOS", tx, textTopY + titleH);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(lines, tx, textTopY + titleH + titleLineGap + lineH);
  };
  drawHeader();

  // Document title strip
  let y = HEADER_H + 18;
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

  // Page-break helper (replaceable per-block to close borders properly)
  let pageY = y;
  let ensure: (need: number) => void = (need: number) => {
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

  function drawBlockTitleBar(label: string) {
    const titleH = 20;
    doc.setFillColor(...C.brand);
    doc.rect(M, y, contentW, titleH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(label.toUpperCase(), M + 10, y + 13);
    y += titleH;
    y += 10;
  }

  function renderBlock(block: PdfBlock) {
    // Ensure title bar + at least one content line fits together (no orphan titles)
    const MIN_TITLE_WITH_CONTENT = 56; // 20 title + 10 gap + ~26 first line + breathing
    ensure(MIN_TITLE_WITH_CONTENT);

    let segStartY = y;
    let currentTitle = block.title;

    drawBlockTitleBar(currentTitle);

    // Block-scoped ensure: closes the current segment border AND repeats the title
    // on the new page so continuation content stays inside a visible card.
    const prevEnsure = ensure;
    ensure = (need: number) => {
      if (y + need > H - 80) {
        // close current segment border
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.5);
        doc.rect(M, segStartY, contentW, y - segStartY, "S");
        doc.addPage();
        y = M + 8;
        pageY = y;
        segStartY = y;
        // Repeat title with "(continuação)" so content never floats loose
        const contTitle = `${block.title} (continuação)`;
        drawBlockTitleBar(contTitle);
        segStartY = y - 30; // include the title bar inside the new card border
      }
    };

    for (const ch of block.children) {
      renderContent(ch);
      y += 6;
    }
    y += 4;

    // Outer border around final segment
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.rect(M, segStartY, contentW, y - segStartY, "S");

    ensure = prevEnsure;
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
  const BAR_H = 9.45;
  const TRI = 50;
  const decorOpacity = 0.25;
  const GState = (doc as any).GState;
  const normalFooterY = H - 70;

  const isContract = /contrato/i.test(opts.title || "");
  const renderSignatures = true; // sempre renderiza bloco de assinatura nos documentos

  // Altura estimada do bloco de assinatura
  const SIG_BLOCK_H = isContract ? 360 : 140;

  // Se assinatura não cabe na última página, abre nova
  if (renderSignatures && y + SIG_BLOCK_H > H - 90) {
    doc.addPage();
    pageY = M + 8;
    y = pageY;
  }


  const pageCount = doc.getNumberOfPages();
  const lastPageEndY = y; // posição real do cursor após renderização


  // Helper: monta cidade/UF da clínica para "local e data"
  const localStr = [c.cidade, c.estado].filter(Boolean).join("/") || "—";
  const dataStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const localData = `${localStr}, ${dataStr}.`;

  // Helper: assinatura institucional com hierarquia tipográfica
  // (linha → nome destacado → profissão → registro). Campos vazios são ocultados.
  function drawSignatureBlock(
    cx: number,
    sigY: number,
    sigW: number,
    opts: {
      name?: string | null;
      role?: string | null;
      registry?: string | null;
      placeholderName?: string; // ex.: "Nome: ____" para contratante/testemunha
      placeholderId?: string;   // ex.: "CPF: ____"
    },
  ) {
    doc.setDrawColor(...C.text);
    doc.setLineWidth(0.6);
    const sigX = cx - sigW / 2;
    doc.line(sigX, sigY, sigX + sigW, sigY);

    let ly = sigY + 14;
    const hasName = !!(opts.name && opts.name.trim());

    if (hasName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...C.text);
      doc.text(opts.name!.trim(), cx, ly, { align: "center" });
      ly += 12;
    } else if (opts.placeholderName) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text(opts.placeholderName, cx, ly, { align: "center" });
      ly += 12;
    }

    if (opts.role && opts.role.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.label);
      doc.text(opts.role.trim(), cx, ly, { align: "center" });
      ly += 11;
    }

    if (opts.registry && opts.registry.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.label);
      doc.text(opts.registry.trim(), cx, ly, { align: "center" });
      ly += 11;
    }

    if (opts.placeholderId) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...C.muted);
      doc.text(opts.placeholderId, cx, ly, { align: "center" });
    }
  }

  // Monta linha de registro profissional sem deixar "CREFITO:" solto.
  function buildRegistryLine(prof?: Professional | null): string | null {
    if (!prof) return null;
    const num = (prof.registro || "").trim();
    if (!num) return null;
    const council = (prof.conselho || "CREFITO").trim();
    // Se o conselho já contém um número (ex.: "CREFITO-8 12345"), usa direto.
    if (/\d/.test(council) && !prof.registro) return council;
    return `${council} ${num}`;
  }

  function buildRoleLine(prof?: Professional | null): string {
    return (prof?.profissao && prof.profissao.trim()) || "Fisioterapeuta";
  }

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    let fy = normalFooterY;

    if (i === pageCount && renderSignatures) {
      const desiredTop = lastPageEndY + 28;
      const sigBlockTop = Math.max(desiredTop, H - SIG_BLOCK_H - 70);

      // Local e data — discreto, alinhado à direita para não competir com a assinatura
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.label);
      doc.text(localData, W - M, sigBlockTop, { align: "right" });

      const prof = opts.professional ?? null;
      const profNome = prof?.nome && prof.nome.trim() ? prof.nome : null;
      const registry = buildRegistryLine(prof);
      const role = buildRoleLine(prof);

      if (isContract) {
        const colW = (W - 2 * M) / 2;
        const sigW = 200;
        const rowGap = 78;
        let by = sigBlockTop + 56;

        // Linha 1: Contratante | Contratada
        drawSignatureBlock(M + colW / 2, by, sigW, {
          role: "Contratante",
          placeholderName: "Nome: __________________",
          placeholderId: "CPF: __________________",
        });
        drawSignatureBlock(M + colW + colW / 2, by, sigW, {
          name: c.razao_social || c.nome_fantasia || null,
          role: "Contratada",
          registry: c.cnpj ? `CNPJ: ${c.cnpj}` : undefined,
          placeholderId: c.cnpj ? undefined : "CNPJ: __________________",
        });

        // Linha 2: Profissional responsável (centralizado)
        by += rowGap;
        drawSignatureBlock(W / 2, by, sigW + 60, {
          name: profNome,
          role,
          registry: registry ?? undefined,
          placeholderName: profNome ? undefined : "Profissional responsável",
        });

        // Linha 3: Testemunhas
        by += rowGap;
        drawSignatureBlock(M + colW / 2, by, sigW, {
          role: "Testemunha 1",
          placeholderName: "Nome: __________________",
          placeholderId: "CPF: __________________",
        });
        drawSignatureBlock(M + colW + colW / 2, by, sigW, {
          role: "Testemunha 2",
          placeholderName: "Nome: __________________",
          placeholderId: "CPF: __________________",
        });
      } else {
        // Fechamento institucional: assinatura única do profissional,
        // seguida de bloco discreto com identidade da clínica.
        const sigY = sigBlockTop + 64;
        drawSignatureBlock(W / 2, sigY, 260, {
          name: profNome,
          role,
          registry: registry ?? undefined,
          placeholderName: profNome ? undefined : "Profissional responsável",
        });

        // Separador fino
        const sepY = sigY + 52;
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.3);
        const sepW = 80;
        doc.line(W / 2 - sepW / 2, sepY, W / 2 + sepW / 2, sepY);

        // Identidade institucional da clínica (subordinada à assinatura)
        let cyy = sepY + 14;
        const clinicName = c.nome_fantasia || c.razao_social;
        if (clinicName) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(...C.brand);
          doc.text(clinicName, W / 2, cyy, { align: "center" });
          cyy += 11;
        }
        if (c.cnpj) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...C.muted);
          doc.text(`CNPJ ${c.cnpj}`, W / 2, cyy, { align: "center" });
        }
      }
    }

    // Decoração: triângulo no canto superior direito
    doc.setGState(new GState({ opacity: decorOpacity }));
    doc.setFillColor(...C.olive);
    doc.triangle(W - TRI, 0, W, 0, W, TRI, "F");
    doc.setGState(new GState({ opacity: 1 }));

    // Faixa do rodapé
    doc.setGState(new GState({ opacity: decorOpacity }));
    doc.setFillColor(...C.olive);
    doc.rect(0, H - BAR_H, W, BAR_H, "F");
    doc.setGState(new GState({ opacity: 1 }));

    // Divisor + texto do rodapé
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.line(M, fy, W - M, fy);
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(`Emitido em ${fmtDateTime(new Date())}`, M, fy + 14);
    {
      const cityState = [c.cidade, c.estado].filter(Boolean).join("/");
      const footerName = c.nome_fantasia ?? "FisioOS";
      const footerText = c.rodape_institucional || [footerName, cityState].filter(Boolean).join(" · ");
      doc.text(footerText, M, fy + 26);
    }
    doc.text(`Página ${i} de ${pageCount}`, W - M - 4, fy + 14, { align: "right" });

    // QR + hash de validação (somente última página)
    if (i === pageCount && opts.validationHash) {
      try {
        const base = opts.validationUrlBase || (typeof window !== "undefined" ? window.location.origin : "");
        const url = `${base}/validar/${opts.validationHash}`;
        const qrDataUrl = await QRCode.toDataURL(url, { margin: 0, width: 180 });
        const qrSize = 56;
        const qrX = W - M - qrSize;
        const qrY = fy - qrSize - 6;
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.text("Valide em:", qrX, qrY - 4);
        doc.text(`${opts.validationHash.slice(0, 12)}…`, qrX, qrY + qrSize + 8);
      } catch { /* ignore QR errors */ }
    }
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
