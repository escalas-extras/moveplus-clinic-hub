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
      variant: "success" | "warning" | "danger" | "neutral";
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
    };

export type PdfBlock = { title: string; children: PdfContent[] };
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
  layout?: "legacy" | "clinical-premium";
  /** Rótulo do campo de referência no card do cabeçalho (ex.: "Data da sessão"). */
  referenceLabel?: string;
  /** Valor exibido no card do cabeçalho; padrão derivado do subtitle. */
  referenceValue?: string;
};

export type PdfRenderCtx = {
  clinic: ClinicData;
  logo: string | null;
};

export type PreparedLogo = {
  dataUrl: string;
  width: number;
  height: number;
  format: "PNG";
};
