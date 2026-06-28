// FisioOS PDF — supabase-aware wrapper around the pure engine.
// Engine puro: src/lib/pdf-engine.ts (sem supabase, usado por fixtures).

import { supabase } from "@/integrations/supabase/client";
import { validateProfessionalForDoc } from "@/lib/professional-resolver";
import { loadClinicLogoForPdf } from "@/lib/pdf-logo-loader";
import {
  renderPdf,
  type BuildPdfOpts,
  type ClinicData,
  type PdfBlock,
  type PdfContent,
  type PdfSection,
  type EvolutionItem,
  type Professional,
} from "./pdf-engine";

export type { BuildPdfOpts, PdfBlock, PdfContent, PdfSection, EvolutionItem, Professional };

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
  // Dossiê consolidado pode usar skipProfessionalValidation quando não há profissional válido.
  if (!opts.hideSignature && !opts.skipProfessionalValidation) {
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
  const logo = await loadClinicLogoForPdf(c.logo_url);
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
