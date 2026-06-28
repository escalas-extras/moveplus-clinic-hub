import type { PdfBlock, Professional } from "@/lib/pdf-engine";

export const DOSSIER_DOCUMENT_TITLE = "HISTÓRICO CLÍNICO INTEGRADO";

export type ClinicalDossierInput = {
  patient: Record<string, unknown>;
  assessments: Record<string, unknown>[];
  evolutions: Record<string, unknown>[];
  discharges: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  goals?: Record<string, unknown>[];
  institutionalMessage?: string;
  /** Futuro: resumo consolidado do caso (não renderizar se vazio). */
  caseSummary?: string | null;
  /** Futuro: considerações do profissional para a conclusão. */
  professionalNotes?: string | null;
};

export type DossierContext = {
  patient: Record<string, unknown>;
  sortedAssessments: Record<string, unknown>[];
  initialAssessment?: Record<string, unknown>;
  reassessments: Record<string, unknown>[];
  sortedEvolutions: Record<string, unknown>[];
  latestDischarge?: Record<string, unknown>;
  documents: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  professional: Professional | null;
  clinicId: string | null;
  generatedAt: string;
  validationHash: string;
  institutionalMessage?: string;
  caseSummary?: string | null;
  professionalNotes?: string | null;
};

export type DossierPanoramaStats = {
  patientName: string;
  followUpDays: number | null;
  followUpLabel: string;
  sessionCount: number;
  assessmentCount: number;
  evolutionCount: number;
  reassessmentCount: number;
  scalesUsed: string[];
  documentCount: number;
  objectivesAchieved: string[];
  objectivesPending: string[];
  hasDischarge: boolean;
  dischargeDate?: string;
};

export type DossierConclusionMeta = {
  treatmentSummary: string;
  periodLabel: string;
  sessionCount: number;
  assessmentCount: number;
  evolutionCount: number;
  reassessmentCount: number;
  objectivesAchieved: string[];
  objectivesPending: string[];
  hasDischarge: boolean;
  professionalNotes?: string;
  professional: Professional | null;
};

export type DossierSectionBlock = PdfBlock & {
  includeInIndex?: boolean;
  indexLabel?: string;
};

export type IndexEntry = {
  label: string;
  blockId: number;
};
