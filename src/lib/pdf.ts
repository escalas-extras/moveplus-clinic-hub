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
  // Caminho relativo: resolve no bucket de logos (privado, via signed URL).
  if (!/^https?:\/\//.test(clinicLogoUrl)) {
    // novo bucket padrão
    const { data: signed } = await supabase.storage
      .from("clinic-logos")
      .createSignedUrl(clinicLogoUrl, 60 * 60);
    if (signed?.signedUrl) return await urlToDataUrl(signed.signedUrl);
    // fallback legado: bucket `documents`
    const { data } = supabase.storage.from("documents").getPublicUrl(clinicLogoUrl);
    return await urlToDataUrl(data.publicUrl);
  }
  if (!isLikelyImageUrl(clinicLogoUrl)) return null;
  return await urlToDataUrl(clinicLogoUrl);
}

export async function buildPdf(opts: BuildPdfOpts) {
  const { data: cid } = await supabase.rpc("current_clinic_id");
  // Sem clínica ativa, não puxar nenhum clinic_settings (evita vazamento entre clínicas).
  let clinic: any = null;
  if (cid) {
    const { data } = await supabase
      .from("clinic_settings")
      .select(
        "nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional, logo_url",
      )
      .eq("clinic_id", cid as string)
      .maybeSingle();
    clinic = data;
  }

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
