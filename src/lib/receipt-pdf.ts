// FisioOS — Recibo White Label
// Layout dedicado para recibos financeiros. Todos os dados visuais
// (logotipo, nome fantasia, razão social, CNPJ, endereço, telefones,
// e-mails, cores) são carregados dinamicamente da clínica ativa
// (`clinic_settings`). Não existe qualquer referência fixa a marcas
// específicas — cada tenant vê apenas a própria identidade.

import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { resolveClinicLogoUrl } from "@/lib/clinic-logo";
import { urlToDataUrl, type ClinicData, type Professional } from "@/lib/pdf-engine";

export type ReceiptPdfData = {
  numero: number;
  patientName?: string | null;
  patientCpf?: string | null;
  responsavelFinanceiro?: string | null;
  description: string;
  serviceLabel?: string | null; // ex: "avaliação fisioterapêutica"
  amount: number;
  payment_method: string;
  payment_date: string;       // YYYY-MM-DD
  issued_at: string;          // ISO
  professional?: Professional | null;
  cancelled?: boolean;
  cancellation_reason?: string | null;
  clinicId?: string | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
};

// ---------------- helpers ----------------

function hexToRgb(hex?: string | null): [number, number, number] | null {
  const raw = (hex ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(raw)) return null;
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function dataUrlImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (/^data:image\/jpe?g/i.test(dataUrl)) return "JPEG";
  if (/^data:image\/webp/i.test(dataUrl)) return "WEBP";
  return "PNG";
}

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function fmtLongDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// ---------- Número por extenso (BRL) ----------

const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function trio(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CENTENAS[c]);
  if (r) {
    if (r < 10) parts.push(UNI[r]);
    else if (r < 20) parts.push(DEZ_A_DEZENOVE[r - 10]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      parts.push(u ? `${DEZENAS[d]} e ${UNI[u]}` : DEZENAS[d]);
    }
  }
  return parts.join(" e ");
}

function intExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const parts: string[] = [];
  if (milhoes) parts.push(`${milhoes === 1 ? "um milhão" : `${trio(milhoes)} milhões`}`);
  if (milhares) parts.push(`${milhares === 1 ? "mil" : `${trio(milhares)} mil`}`);
  if (resto) parts.push(trio(resto));
  return parts.join(" e ").replace(/\s+/g, " ").trim();
}

export function valorPorExtenso(valor: number): string {
  const round = Math.round(valor * 100);
  const reais = Math.floor(round / 100);
  const cent = round % 100;
  const txtReais = reais > 0 ? `${intExtenso(reais)} ${reais === 1 ? "real" : "reais"}` : "";
  const txtCent = cent > 0 ? `${intExtenso(cent)} ${cent === 1 ? "centavo" : "centavos"}` : "";
  if (txtReais && txtCent) return `${txtReais} e ${txtCent}`;
  return txtReais || txtCent || "zero real";
}

// ---------------- Carregamento de contexto ----------------

async function loadContext(clinicId: string | null) {
  let cid = clinicId;
  if (!cid) {
    const [{ data: supportCid }, { data: ownCid }] = await Promise.all([
      supabase.rpc("current_support_session_clinic"),
      supabase.rpc("current_clinic_id"),
    ]);
    cid = (supportCid as string | null) ?? (ownCid as string | null);
  }
  let clinic: any = null;
  if (cid) {
    const { data } = await supabase
      .from("clinic_settings")
      .select(
        "nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional, logo_url, primary_color, secondary_color",
      )
      .eq("clinic_id", cid)
      .maybeSingle();
    clinic = data;
  }
  const c = (clinic ?? {}) as ClinicData & { logo_url?: string | null };
  let logo: string | null = null;
  const resolved = await resolveClinicLogoUrl(c.logo_url ?? null);
  if (resolved) logo = await urlToDataUrl(resolved);
  return { clinic: c, logo };
}

// ---------------- Render ----------------

export async function buildReceiptPdf(data: ReceiptPdfData): Promise<jsPDF> {
  const ctx = await loadContext(data.clinicId ?? null);
  const c = ctx.clinic;

  const primary = hexToRgb(c.primary_color) ?? [22, 101, 52];     // verde profundo padrão
  const accent = hexToRgb(c.secondary_color) ?? [234, 88, 12];    // laranja padrão
  const ink: [number, number, number] = [30, 41, 59];
  const meta: [number, number, number] = [100, 116, 139];
  const hairline: [number, number, number] = [203, 213, 225];

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;

  // ─── faixa decorativa topo ───
  doc.setFillColor(...primary);
  doc.rect(0, 0, W, 6, "F");
  doc.setFillColor(...accent);
  doc.rect(0, 6, W, 2, "F");

  // ─── HEADER ───
  const headerTop = 28;
  const logoSize = 76;
  if (ctx.logo) {
    try {
      doc.addImage(ctx.logo, dataUrlImageFormat(ctx.logo), M, headerTop, logoSize, logoSize);
    } catch { /* ignore */ }
  } else {
    // monograma fallback
    doc.setFillColor(...primary);
    doc.circle(M + logoSize / 2, headerTop + logoSize / 2, logoSize / 2 - 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    const name = (c.nome_fantasia || "F").trim();
    doc.text(name.charAt(0).toUpperCase(), M + logoSize / 2, headerTop + logoSize / 2 + 10, { align: "center" });
  }

  // bloco textual da clínica
  const tx = M + logoSize + 16;
  let ty = headerTop + 6;
  const nomeFantasia = (c.nome_fantasia || "Clínica").trim();
  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(nomeFantasia, tx, ty);
  ty += 14;

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  if (c.razao_social) { doc.text(c.razao_social.toUpperCase(), tx, ty); ty += 10; }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...meta);
  if (c.cnpj) { doc.text(`CNPJ ${c.cnpj}`, tx, ty); ty += 10; }

  // Contato (direita)
  const rxStart = W - M - 230;
  let ry = headerTop + 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  const tels = Array.isArray(c.telefones) ? c.telefones.filter(Boolean) : [];
  const emails = Array.isArray(c.emails) ? c.emails.filter(Boolean) : [];
  const endereco = c.endereco || "";
  const cityState = [c.cidade, c.estado].filter(Boolean).join("/");
  const addr = [endereco, cityState].filter(Boolean).join(" – ");
  const contactLines: string[] = [];
  if (addr) contactLines.push(`📍 ${addr}`);
  if (tels.length) contactLines.push(`✆ ${tels.join(" · ")}`);
  if (emails.length) contactLines.push(`✉ ${emails.join(" · ")}`);
  for (const line of contactLines) {
    const wrapped = doc.splitTextToSize(line, 230);
    doc.text(wrapped, rxStart, ry);
    ry += wrapped.length * 12;
  }

  // Selo "RECIBO Nº"
  const seloW = 86, seloH = 56;
  const seloX = W - M - seloW;
  const seloY = headerTop;
  doc.setFillColor(...primary);
  doc.roundedRect(seloX, seloY, seloW, seloH, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("RECIBO Nº", seloX + seloW / 2, seloY + 16, { align: "center" });
  doc.setFontSize(22);
  doc.text(String(data.numero).padStart(3, "0"), seloX + seloW / 2, seloY + 42, { align: "center" });

  // só puxar seloY pra direita se faltava espaço no header… mas mantemos contato à direita normal
  // (selo cobre só se contato for curto — aceitável; alternativamente colocamos selo abaixo do contato)

  // Divisor
  const divY = headerTop + 110;
  doc.setDrawColor(...primary);
  doc.setLineWidth(1);
  doc.line(M, divY, W - M, divY);

  // ─── CORPO ───
  let by = divY + 24;
  const responsavel = (data.responsavelFinanceiro || data.patientName || "—").trim();
  const paciente = (data.patientName || "—").trim();
  const servico = (data.serviceLabel || data.description || "atendimento fisioterapêutico").trim();
  const extenso = valorPorExtenso(data.amount);

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const corpoText =
    `Recebi de ${responsavel} a quantia de ${brl(data.amount)} (${extenso}), ` +
    `referente à ${servico} realizada para a paciente ${paciente}.`;
  const corpoLines = doc.splitTextToSize(corpoText, W - 2 * M);
  doc.text(corpoLines, M, by);
  by += corpoLines.length * 16 + 14;

  // ─── QUADRO DE INFORMAÇÕES (esquerda) + LOCAL/DATA + ASSINATURA (direita) ───
  const quadroW = (W - 2 * M) * 0.62;
  const quadroX = M;
  const quadroY = by;

  type Row = { label: string; value: string };
  const rows: Row[] = [
    { label: "Paciente:", value: paciente },
    { label: "Responsável Financeiro:", value: responsavel },
    { label: "Forma de Pagamento:", value: PAYMENT_LABEL[data.payment_method] ?? (data.payment_method || "—") },
    { label: "Data do Pagamento:", value: fmtDate(data.payment_date) },
    { label: "Valor Recebido:", value: brl(data.amount) },
  ];
  const rowH = 30;
  const tagW = 30;

  // quadro com borda
  doc.setDrawColor(...hairline);
  doc.setLineWidth(0.6);
  doc.roundedRect(quadroX, quadroY, quadroW, rowH * rows.length, 4, 4, "S");

  // coluna de tags (lado esquerdo verde)
  doc.setFillColor(...primary);
  doc.rect(quadroX, quadroY, tagW, rowH * rows.length, "F");

  // separadores e conteúdo
  rows.forEach((r, i) => {
    const y = quadroY + i * rowH;
    if (i > 0) {
      doc.setDrawColor(...hairline);
      doc.setLineWidth(0.3);
      doc.line(quadroX + tagW, y, quadroX + quadroW, y);
    }
    // ícone (texto simples) — mantemos visual neutro
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const iconChars = ["P", "R", "$", "D", "V"]; // marcadores neutros
    doc.text(iconChars[i] ?? "•", quadroX + tagW / 2, y + rowH / 2 + 3.5, { align: "center" });

    // label
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(r.label, quadroX + tagW + 12, y + rowH / 2 - 1);

    // valor
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...primary);
    const labelW = doc.getTextWidth(r.label) + 18;
    const valX = quadroX + tagW + 12 + Math.max(labelW, 140);
    const maxValW = quadroW - (valX - quadroX) - 10;
    const valLines = doc.splitTextToSize(r.value, maxValW);
    doc.text(valLines[0] ?? "", valX, y + rowH / 2 + 3);
  });

  // Local / Data + Assinatura (direita)
  const sigX = quadroX + quadroW + 28;
  const sigW = W - M - sigX;
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const localStr = [c.cidade, c.estado].filter(Boolean).join("/") || "—";
  doc.text(`${localStr},`, sigX, quadroY + 12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  doc.text(fmtLongDate(data.issued_at), sigX, quadroY + 28);

  // linha de assinatura
  const lineY = quadroY + rowH * rows.length - 18;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.6);
  doc.line(sigX, lineY, sigX + sigW - 4, lineY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...meta);
  doc.text("Assinatura e carimbo do profissional", sigX + sigW / 2 - 2, lineY + 12, { align: "center" });

  // ─── RODAPÉ PROFISSIONAL ───
  const footTop = H - 130;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.8);
  doc.line(M, footTop, W - M, footTop);

  // monograma profissional (caduceu estilizado simples)
  const monoCx = M + 28;
  const monoCy = footTop + 38;
  doc.setDrawColor(...primary);
  doc.setLineWidth(1.2);
  doc.circle(monoCx, monoCy, 22, "S");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.setFontSize(20);
  doc.text("✚", monoCx, monoCy + 7, { align: "center" });

  const prof = data.professional ?? null;
  const profNome = (prof?.nome ?? "").trim();
  const profRole = (prof?.profissao ?? "Fisioterapeuta").trim();
  const conselho = (prof?.conselho ?? "CREFITO").trim();
  const registro = (prof?.registro ?? "").trim();

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  if (profNome) doc.text(profNome, monoCx + 32, footTop + 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...meta);
  doc.text(profRole, monoCx + 32, footTop + 44);
  if (registro) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primary);
    doc.text(`${conselho} nº ${registro}`, monoCx + 32, footTop + 58);
  }

  // direita do rodapé — razão social + CNPJ
  const rFootX = W / 2 + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...ink);
  if (c.razao_social) doc.text(c.razao_social.toUpperCase(), rFootX, footTop + 28);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...meta);
  if (c.cnpj) doc.text(`CNPJ ${c.cnpj}`, rFootX, footTop + 44);
  if (c.rodape_institucional) {
    const inst = doc.splitTextToSize(c.rodape_institucional, W - rFootX - M);
    doc.text(inst, rFootX, footTop + 58);
  }

  // faixa decorativa rodapé
  doc.setFillColor(...accent);
  doc.rect(0, H - 8, W, 2, "F");
  doc.setFillColor(...primary);
  doc.rect(0, H - 6, W, 6, "F");

  // Carimbo "CANCELADO"
  if (data.cancelled) {
    doc.saveGraphicsState();
    const anyDoc = doc as any;
    if (typeof anyDoc.GState === "function" && typeof anyDoc.setGState === "function") {
      anyDoc.setGState(new anyDoc.GState({ opacity: 0.18 }));
    }
    doc.setTextColor(200, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(96);
    doc.text("CANCELADO", W / 2, H / 2 + 30, { align: "center", angle: -22 });
    doc.restoreGraphicsState();
    if (data.cancellation_reason) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(200, 30, 30);
      doc.text(`Motivo do cancelamento: ${data.cancellation_reason}`, M, H - 18);
    }
  }

  return doc;
}

// ---------- Public helpers ----------

function fileName(data: ReceiptPdfData) {
  return `Recibo_${String(data.numero).padStart(3, "0")}.pdf`;
}

export async function downloadReceiptPdf(data: ReceiptPdfData) {
  const doc = await buildReceiptPdf(data);
  doc.save(fileName(data));
}

export async function previewReceiptPdf(data: ReceiptPdfData) {
  const doc = await buildReceiptPdf(data);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
}

export async function printReceiptPdf(data: ReceiptPdfData) {
  const doc = await buildReceiptPdf(data);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
  try { doc.save(fileName(data)); } catch { /* noop */ }
}
