import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { loadClinicLogoForPdf } from "@/lib/pdf-logo-loader";
import type { ClinicData } from "@/lib/pdf-engine";
import { renderPremiumReceiptPage } from "./premium-renderer";
import {
  getStoredReceiptPrintMode,
  type ReceiptPdfData,
  type ReceiptPrintMode,
  RECEIPT_LAYOUT_VERSION,
} from "./types";

export type { ReceiptPdfData, ReceiptPrintMode };
export {
  RECEIPT_LAYOUT_VERSION,
  getStoredReceiptPrintMode,
  storeReceiptPrintMode,
  RECEIPT_PRINT_MODE_KEY,
} from "./types";
export { valorPorExtenso } from "./extenso";

async function loadContext(clinicId: string | null) {
  let cid = clinicId;
  if (!cid) {
    const [{ data: supportCid }, { data: ownCid }] = await Promise.all([
      supabase.rpc("current_support_session_clinic"),
      supabase.rpc("current_clinic_id"),
    ]);
    cid = (supportCid as string | null) ?? (ownCid as string | null);
  }
  let clinic: ClinicData | null = null;
  if (cid) {
    const { data } = await supabase
      .from("clinic_settings")
      .select(
        "nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional, logo_url, primary_color, secondary_color",
      )
      .eq("clinic_id", cid)
      .maybeSingle();
    clinic = data as ClinicData | null;
  }
  const c = (clinic ?? {}) as ClinicData & { logo_url?: string | null };
  const logo = await loadClinicLogoForPdf(c.logo_url);
  return { clinic: c, logo };
}

function resolvePrintMode(data: ReceiptPdfData): ReceiptPrintMode {
  return data.printMode ?? getStoredReceiptPrintMode();
}

/** Gera PDF de um recibo (modo A4 ou econômico). */
export async function buildReceiptPdf(data: ReceiptPdfData): Promise<jsPDF> {
  const ctx = await loadContext(data.clinicId ?? null);
  const mode = resolvePrintMode(data);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  renderPremiumReceiptPage(doc, data, ctx.clinic, ctx.logo, mode, 0);
  return doc;
}

/** Gera PDF com vários recibos (modo econômico: 2 por folha). */
export async function buildReceiptsBatchPdf(items: ReceiptPdfData[]): Promise<jsPDF> {
  if (!items.length) return new jsPDF({ unit: "pt", format: "a4" });
  const ctx = await loadContext(items[0].clinicId ?? null);
  const mode = resolvePrintMode(items[0]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  if (mode === "economico") {
    for (let i = 0; i < items.length; i += 2) {
      if (i > 0) doc.addPage();
      renderPremiumReceiptPage(doc, items[i], ctx.clinic, ctx.logo, "economico", 0);
      if (items[i + 1]) {
        renderPremiumReceiptPage(doc, items[i + 1], ctx.clinic, ctx.logo, "economico", 1);
      }
    }
  } else {
    items.forEach((item, i) => {
      if (i > 0) doc.addPage();
      renderPremiumReceiptPage(doc, item, ctx.clinic, ctx.logo, "a4", 0);
    });
  }

  return doc;
}

function fileName(data: ReceiptPdfData) {
  return `Recibo_${String(data.numero).padStart(3, "0")}.pdf`;
}

export async function downloadReceiptPdf(data: ReceiptPdfData) {
  const doc = await buildReceiptPdf(data);
  doc.save(fileName(data));
}

export async function downloadReceiptsBatchPdf(items: ReceiptPdfData[], filename = "Recibos.pdf") {
  const doc = await buildReceiptsBatchPdf(items);
  doc.save(filename);
}

export async function previewReceiptPdf(data: ReceiptPdfData) {
  const doc = await buildReceiptPdf(data);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
}

export async function previewReceiptsBatchPdf(items: ReceiptPdfData[]) {
  const doc = await buildReceiptsBatchPdf(items);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
}

export async function printReceiptPdf(data: ReceiptPdfData) {
  const doc = await buildReceiptPdf(data);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
  try {
    doc.save(fileName(data));
  } catch {
    /* noop */
  }
}

export async function printReceiptsBatchPdf(items: ReceiptPdfData[]) {
  const doc = await buildReceiptsBatchPdf(items);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
}
