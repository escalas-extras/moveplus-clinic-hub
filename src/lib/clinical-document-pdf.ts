/**
 * Abertura e pré-visualização de documentos clínicos arquivados vs layout atual.
 */
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";
import { previewPdf, type BuildPdfOpts } from "@/lib/pdf";
import type { Professional } from "@/lib/pdf-engine";
import { withContractPremiumLayout } from "@/lib/document-pdf-layout";

export const ARCHIVED_PDF_NOTICE =
  "Documento arquivado — gerado com o layout vigente na data da emissão.";

export const CURRENT_LAYOUT_PREVIEW_NOTICE =
  "Pré-visualização — gerada com o layout atual.";

export type ClinicalDocumentRow = {
  id?: string;
  title: string;
  doc_type?: string | null;
  pdf_url: string | null;
  clinic_id: string;
  patient_id?: string;
  professional_id?: string | null;
  issued_at?: string | null;
  validation_hash?: string | null;
  content?: {
    sections?: Array<{ title: string; body: string }>;
    contratante?: BuildPdfOpts["contratante"];
    paciente_snapshot?: BuildPdfOpts["patientSnapshot"];
  } | null;
  body_text?: string | null;
};

function sectionsFromDocument(doc: ClinicalDocumentRow): Array<{ title: string; body: string }> {
  const stored = doc.content?.sections;
  if (Array.isArray(stored) && stored.length > 0) return stored;
  if (!doc.body_text?.trim()) return [];
  return doc.body_text
    .split(/\n(?=## )/)
    .map((block) => {
      const lines = block.trim().split("\n");
      const title = lines[0]?.replace(/^##\s*/, "").trim() || "Seção";
      const body = lines.slice(1).join("\n").trim();
      return { title, body };
    })
    .filter((s) => s.title || s.body);
}

export async function loadDocumentProfessional(
  professionalId: string | null | undefined,
): Promise<Professional | null> {
  if (!professionalId) return null;
  const { data } = await supabase
    .from("professionals")
    .select("nome, profissao, conselho, registro")
    .eq("id", professionalId)
    .maybeSingle();
  if (!data) return null;
  return {
    nome: data.nome,
    profissao: data.profissao,
    conselho: data.conselho,
    registro: data.registro,
  };
}

export function buildPdfOptsFromClinicalDocument(
  doc: ClinicalDocumentRow,
  patientName: string | null | undefined,
  professional: Professional | null,
): BuildPdfOpts & { clinicId: string } {
  const isContract = /contrato/i.test(doc.title || "") || doc.doc_type === "contrato";
  const content = doc.content ?? {};
  return withContractPremiumLayout(
    {
      title: doc.title,
      subtitle: doc.issued_at ? `Emitido em ${fmtDate(doc.issued_at)}` : undefined,
      patientName: patientName ?? content.paciente_snapshot?.nome ?? undefined,
      professional,
      sections: sectionsFromDocument(doc),
      clinicId: doc.clinic_id,
      validationHash: doc.validation_hash ?? undefined,
      contratante: isContract && content.contratante ? content.contratante : null,
      patientSnapshot: isContract && content.paciente_snapshot ? content.paciente_snapshot : null,
    },
    doc.doc_type,
  );
}

export async function openArchivedClinicalDocumentPdf(pdfUrl: string) {
  toast.info(ARCHIVED_PDF_NOTICE);
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(pdfUrl, 300);
  if (error || !data?.signedUrl) {
    toast.error("Não foi possível abrir o PDF arquivado.");
    return;
  }
  window.open(data.signedUrl, "_blank");
}

export async function previewClinicalDocumentWithCurrentLayout(
  doc: ClinicalDocumentRow,
  patientName: string | null | undefined,
) {
  toast.info(CURRENT_LAYOUT_PREVIEW_NOTICE);
  const professional = await loadDocumentProfessional(doc.professional_id);
  const opts = buildPdfOptsFromClinicalDocument(doc, patientName, professional);
  if (!opts.sections?.length) {
    toast.error("Conteúdo do documento indisponível para pré-visualização.");
    return;
  }
  await previewPdf(opts);
}

/** Pré-visualização ao vivo no wizard (conteúdo ainda não arquivado). */
export async function previewLiveDocumentPdf(opts: BuildPdfOpts & { clinicId?: string | null }) {
  toast.info(CURRENT_LAYOUT_PREVIEW_NOTICE);
  await previewPdf(opts);
}
