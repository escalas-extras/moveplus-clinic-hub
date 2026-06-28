// FisioOS PDF — supabase-aware wrapper around the pure engine.
// Engine puro: src/lib/pdf-engine.ts (sem supabase, usado por fixtures).

import { supabase } from "@/integrations/supabase/client";
import { invalidateSignedClinicLogoUrl } from "@/lib/clinic-logo";
import { validateProfessionalForDoc } from "@/lib/professional-resolver";
import {
  renderPdf,
  prepareLogoForPdf,
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

function storageRefFromUrl(raw: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(raw);
    const marker = "/storage/v1/object/";
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    const tail = url.pathname.slice(idx + marker.length).split("/");
    const mode = tail.shift();
    if (mode !== "sign" && mode !== "public") return null;
    const bucket = decodeURIComponent(tail.shift() ?? "");
    const path = decodeURIComponent(tail.join("/"));
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

async function signFresh(bucket: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Sempre resolve a logo a partir do valor atual em clinic_settings.logo_url,
 * sem consultar o cache persistente — garante que alterações de identidade
 * visual da clínica reflitam imediatamente no PDF.
 */
async function loadClinicLogo(clinicLogoUrl?: string | null): Promise<string | null> {
  const value = clinicLogoUrl?.trim();
  if (!value) return null;

  // Invalida cache de qualquer resolução anterior deste mesmo path.
  invalidateSignedClinicLogoUrl(value);

  let resolved: string | null = null;
  const embedded = /^https?:\/\//i.test(value) ? storageRefFromUrl(value) : null;
  if (embedded) {
    resolved = (await signFresh(embedded.bucket, embedded.path)) ?? value;
  } else if (/^https?:\/\//i.test(value)) {
    resolved = value;
  } else {
    resolved = (await signFresh("documents", value)) ?? (await signFresh("clinic-logos", value));
  }

  if (!resolved || !isLikelyImageUrl(resolved)) return null;
  const raw = await urlToDataUrl(resolved);
  if (!raw) return null;
  const prepared = await prepareLogoForPdf(raw);
  return prepared?.dataUrl ?? raw;
}

/**
 * Builds a PDF for a given clinic. Branding (logo, cores, rodapé) é sempre
 * resolvido a partir da `clinic_id` da clínica PROPRIETÁRIA do documento —
 * nunca da clínica logada quando elas divergem.
 *
 * Bloco D: `opts.clinicId` permite que documentos históricos, materiais
 * abertos durante uma sessão de suporte ou geração em background usem
 * exatamente o branding correto. Quando omitido, faz fallback para a
 * clínica ativa (sessão de suporte → clínica do usuário).
 */
export async function buildPdf(opts: BuildPdfOpts & { clinicId?: string | null }) {
  // Documentos clínicos exigem profissional responsável com nome + conselho + registro.
  // Materiais institucionais da biblioteca passam hideSignature=true e ficam isentos.
  if (!opts.hideSignature) {
    const v = validateProfessionalForDoc((opts.professional ?? null) as any);
    if (v.status !== "ok") {
      throw new Error(v.message);
    }
  }

  let cid: string | null = opts.clinicId ?? null;
  if (!cid) {
    const [{ data: supportCid }, { data: ownCid }] = await Promise.all([
      supabase.rpc("current_support_session_clinic"),
      supabase.rpc("current_clinic_id"),
    ]);
    cid = (supportCid as string | null) ?? (ownCid as string | null);
  }

  // Sem clínica resolvida, não puxar nenhum clinic_settings (evita vazamento entre clínicas).
  let clinic: any = null;
  if (cid) {
    const { data } = await supabase
      .from("clinic_settings")
      .select(
        "nome_fantasia, razao_social, cnpj, telefones, emails, endereco, cidade, estado, rodape_institucional, logo_url, primary_color, secondary_color",
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

export async function downloadPdf(opts: BuildPdfOpts & { clinicId?: string | null }) {
  const doc = await buildPdf(opts);
  doc.save(`${opts.title.replace(/\s+/g, "_")}.pdf`);
}

export async function previewPdf(opts: BuildPdfOpts & { clinicId?: string | null }) {
  const doc = await buildPdf(opts);
  const url = URL.createObjectURL(doc.output("blob"));
  window.open(url, "_blank");
}

// `printPdf` é mantido por compatibilidade, mas NUNCA chama window.print():
// abre o PDF real em nova aba e dispara o download.
export async function printPdf(opts: BuildPdfOpts & { clinicId?: string | null }) {
  const doc = await buildPdf(opts);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  try {
    doc.save(`${opts.title.replace(/\s+/g, "_")}.pdf`);
  } catch {
    /* noop */
  }
}


export const generatePdf = downloadPdf;

// Alias semântico — todos os PDFs (clínicos, biblioteca, protocolos,
// cartilhas, relatórios) passam pelo mesmo motor com branding da clínica
// resolvida via current_clinic_id().
export const buildBrandedPdf = buildPdf;
export const downloadBrandedPdf = downloadPdf;
export const previewBrandedPdf = previewPdf;

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
  clinicId: string;
}) {
  if (!opts.clinicId) throw new Error("clinicId é obrigatório para upload de documentos");
  const doc = await buildPdf({ ...opts.pdfOpts, clinicId: opts.clinicId });
  const blob = doc.output("blob");
  const path = `${opts.clinicId}/${opts.folder}/${opts.referenciaId}-${Date.now()}.pdf`;
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
