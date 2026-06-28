/**
 * Sprint D2 — Histórico Clínico Integrado
 * Orquestrador público; lógica modular em src/lib/dossier/
 */

import type { BuildPdfOpts } from "@/lib/pdf-engine";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { assembleDossier } from "@/lib/dossier/assemble-dossier";
import { DOSSIER_DOCUMENT_TITLE, type ClinicalDossierInput } from "@/lib/dossier/types";

export type { ClinicalDossierInput } from "@/lib/dossier/types";

export function generateDossierValidationHash(): string {
  const hashBytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(hashBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Monta BuildPdfOpts do histórico clínico integrado. */
export function buildClinicalDossierPdfOpts(
  input: ClinicalDossierInput,
): BuildPdfOpts & { clinicId: string | null } {
  const validationHash = generateDossierValidationHash();
  const generatedAt = new Date().toISOString();
  const assembled = assembleDossier(input, generatedAt, validationHash);

  return {
    layout: "clinical-premium",
    title: "Histórico Clínico Integrado",
    subtitle: `Documento oficial · ${fmtDate(generatedAt)}`,
    referenceLabel: "Paciente",
    referenceValue: String(input.patient.nome_completo ?? "—"),
    patientName: String(input.patient.nome_completo ?? ""),
    professional: assembled.ctx.professional,
    validationHash,
    clinicId: assembled.ctx.clinicId,
    hideSignature: true,
    skipProfessionalValidation: true,
    documentVersion: "D5",
    dossier: {
      patientName: String(input.patient.nome_completo ?? "Paciente"),
      generatedAt: fmtDateTime(generatedAt),
      documentTitle: DOSSIER_DOCUMENT_TITLE,
      institutionalMessage: input.institutionalMessage,
      cover: {
        professionalName: assembled.ctx.professional?.nome ?? undefined,
        periodLabel: assembled.conclusion.periodLabel,
      },
      summary: {
        treatmentSummary: assembled.conclusion.treatmentSummary,
        assessmentCount: assembled.conclusion.assessmentCount,
        evolutionCount: assembled.conclusion.evolutionCount,
        reassessmentCount: assembled.conclusion.reassessmentCount,
        hasDischarge: assembled.conclusion.hasDischarge,
        documentCount: assembled.panorama.documentCount,
      },
      conclusion: assembled.conclusion,
      indexEntries: assembled.indexEntries,
      layoutStats: {
        contentPages: 0,
        avgFillRatio: 0,
        estimatedPagesBefore: assembled.layoutComposer.estimatedPagesBefore,
        estimatedPagesAfter: assembled.layoutComposer.estimatedPagesAfter,
        forcedBreaksRemoved: assembled.layoutComposer.forcedBreaksRemoved,
      },
    },
    blocks: assembled.blocks,
  };
}
