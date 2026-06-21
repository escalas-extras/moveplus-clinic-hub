// FisioOS PDF — supabase-aware wrapper around the pure engine.
// Engine puro: src/lib/pdf-engine.ts (sem supabase, usado por fixtures).

import { supabase } from "@/integrations/supabase/client";
import {
  renderPdf,
  urlToDataUrl,
  type BuildPdfOpts,
  type ClinicData,
  type PdfBlock,
  type PdfContent,
  type PdfSection,
  type EvolutionItem,
  type Professional,
} from "./pdf-engine";

export type { BuildPdfOpts, PdfBlock, PdfContent, PdfSection, EvolutionItem, Professional };

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

export async function buildPdf(opts: BuildPdfOpts) {
  const { data: cid } = await supabase.rpc("current_clinic_id");
  let q = supabase
    .from("clinic_settings")
    .select(
      "nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional, logo_url",
    );
  q = cid ? q.eq("clinic_id", cid as string) : q.limit(1);
  const { data: clinic } = await q.maybeSingle();

  const c = (clinic ?? {}) as ClinicData & { logo_url?: string | null };
  const logo = await loadClinicLogo(c.logo_url);
  return renderPdf(opts, { clinic: c, logo });
}

// ---------- Public helpers ----------

export async function downloadPdf(opts: BuildPdfOpts) {
  const doc = await buildPdf(opts);
  doc.save(`${opts.title.replace(/\s+/g, "_")}.pdf`);
}

export async function previewPdf(opts: BuildPdfOpts) {
  const doc = await buildPdf(opts);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
}

export async function printPdf(opts: BuildPdfOpts) {
  const doc = await buildPdf(opts);
  const url = URL.createObjectURL(doc.output("blob"));
  const w = window.open(url, "_blank");
  if (w) w.addEventListener("load", () => { try { w.print(); } catch { /* noop */ } });
}

export const generatePdf = downloadPdf;

// ---------- Upload + register ----------

type DocFolder =
  | "avaliacoes" | "reavaliacoes" | "evolucoes" | "relatorios"
  | "recibos" | "declaracoes" | "encaminhamentos" | "termos";
type DocumentType =
  | "avaliacao" | "reavaliacao" | "evolucao" | "relatorio"
  | "recibo" | "declaracao" | "encaminhamento" | "termo" | "laudo";

export async function uploadAndRegisterPdf(opts: {
  pdfOpts: BuildPdfOpts;
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
