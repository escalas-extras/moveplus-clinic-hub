export type ClinicData = {
  nome_fantasia: string | null;
  razao_social: string | null;
  cnpj: string | null;
  telefones: string[] | null;
  emails: string[] | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  rodape_institucional: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

export type Professional = {
  nome: string | null;
  profissao: string | null;
  conselho: string | null;
  registro: string | null;
};

export type EvolutionItem = {
  data: string;
  hora?: string | null;
  index?: number;
  conduta?: string | null;
  resultado?: string | null;
  intercorrencias?: string | null;
  proximos?: string | null;
};

export type ClinicalTrend = "melhorou" | "estavel" | "piorou" | "indeterminado";

export type PdfContent =
  | { kind: "grid"; rows: Array<readonly [string, string] | string[]>; columns?: 1 | 2 }
  | { kind: "paragraph"; label?: string; text: string }
  | { kind: "highlight"; label: string; text: string }
  | { kind: "eva"; value: number | null }
  | { kind: "checks"; label?: string; items: Array<{ label: string; checked: boolean }> }
  | { kind: "evolutions"; items: Array<EvolutionItem> }
  | {
      kind: "badge";
      label?: string;
      text: string;
      variant: "success" | "warning" | "danger" | "neutral" | "info";
    }
  | {
      kind: "compare-table";
      rows: Array<{
        label: string;
        inicial: string;
        anterior: string;
        atual: string;
        trend?: ClinicalTrend;
      }>;
    }
  | { kind: "timeline"; items: Array<{ date: string; title: string }> }
  | {
      kind: "dashboard";
      columns: 2 | 3;
      items: Array<{
        label: string;
        value: string;
        variant?: "success" | "warning" | "info" | "neutral" | "danger";
        /** Sprint D3.2 — valor para mini gráfico de barras (SVG via jsPDF). */
        barValue?: number;
        barMax?: number;
      }>;
    }
  | {
      kind: "objective";
      label?: string;
      text: string;
      status: "achieved" | "pending" | "progress";
    }
  | {
      kind: "document-cards";
      items: Array<{
        docType: string;
        quantity: number;
        lastIssued: string;
        hash: string;
      }>;
    }
  | {
      kind: "compare-bars";
      rows: Array<{
        label: string;
        inicial: number;
        atual: number;
        max?: number;
        trend?: ClinicalTrend;
      }>;
    };

export type PdfBlock = {
  title: string;
  children: PdfContent[];
  /** Dossiê: força nova página antes desta seção. */
  pageBreakBefore?: boolean;
  /** Dossiê: incluir no índice (padrão true). */
  includeInIndex?: boolean;
  /** Dossiê: rótulo no índice. */
  indexLabel?: string;
  /** Sprint D3 — layout editorial (somente Histórico Clínico Integrado). */
  layout?: {
    compact?: boolean;
    editorial?: boolean;
    estimatedHeight?: number;
    /** Sprint D3.2 — limites de altura para composição inteligente. */
    minHeight?: number;
    idealHeight?: number;
    maxHeight?: number;
    dashboardColumns?: 2 | 3;
    packWithNext?: boolean;
    packWithPrevious?: boolean;
  };
};
export type PdfSection = { title: string; body: string };

export type BuildPdfOpts = {
  title: string;
  subtitle?: string;
  patientName?: string;
  sections?: PdfSection[];
  blocks?: PdfBlock[];
  professional?: Professional | null;
  validationHash?: string | null;
  validationUrlBase?: string;
  contratante?: {
    nome?: string | null;
    cpf?: string | null;
    vinculo?: string | null;
  } | null;
  patientSnapshot?: { nome?: string | null; cpf?: string | null } | null;
  hideSignature?: boolean;
  /** Versão interna do template — exibida no rodapé quando informada. */
  documentVersion?: string;
  /** Layout premium clínico (Sprint 8B) — usa drawDocumentHeader completo. */
  layout?: "legacy" | "clinical-premium" | "fisioos-ds";
  /** Rótulo do campo de referência no card do cabeçalho (ex.: "Data da sessão"). */
  referenceLabel?: string;
  /** Valor exibido no card do cabeçalho; padrão derivado do subtitle. */
  referenceValue?: string;
  /** Metadados do Histórico Clínico Integrado (capa, índice, encerramento). */
  dossier?: {
    patientName: string;
    generatedAt?: string;
    clinicLabel?: string;
    documentTitle?: string;
    institutionalMessage?: string;
    summary?: {
      treatmentSummary: string;
      assessmentCount: number;
      evolutionCount: number;
      reassessmentCount: number;
      hasDischarge: boolean;
      documentCount: number;
    };
    conclusion?: {
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
      professional?: Professional | null;
    };
    indexEntries?: Array<{ label: string; blockId: number }>;
    /** Sprint D4 — metadados de capa institucional (somente apresentação). */
    cover?: {
      professionalName?: string;
      periodLabel?: string;
      clinicName?: string;
    };
    layoutStats?: {
      contentPages: number;
      avgFillRatio: number;
      estimatedPagesBefore: number;
      estimatedPagesAfter: number;
      forcedBreaksRemoved: number;
      /** Sprint D3.2 — densidade por página de conteúdo (0–1). */
      pageDensities?: number[];
      rebalancePasses?: number;
    };
  };
  /** Pula validação de profissional (ex.: dossiê consolidado). */
  skipProfessionalValidation?: boolean;
};

export type PdfRenderCtx = {
  clinic: ClinicData;
  /** Logo normalizada (PNG transparente) — strings são re-normalizadas em renderPdf. */
  logo: string | PreparedLogo | null;
};

export type PreparedLogo = {
  dataUrl: string;
  width: number;
  height: number;
  format: "PNG";
};
