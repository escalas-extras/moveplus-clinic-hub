import type { Professional } from "@/lib/pdf-engine";

/** Layout congelado Sprint R1 — não alterar sem nova versão. */
export const RECEIPT_LAYOUT_VERSION = "R1" as const;

export type ReceiptPrintMode = "a4" | "economico";

export type ReceiptPdfData = {
  numero: number;
  patientName?: string | null;
  patientCpf?: string | null;
  responsavelFinanceiro?: string | null;
  description: string;
  serviceLabel?: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  issued_at: string;
  professional?: Professional | null;
  cancelled?: boolean;
  cancellation_reason?: string | null;
  clinicId?: string | null;
  /** Modo de impressão — padrão A4 (1 recibo por folha). */
  printMode?: ReceiptPrintMode;
};

export const RECEIPT_PRINT_MODE_KEY = "fisioos-receipt-print-mode";

export function getStoredReceiptPrintMode(): ReceiptPrintMode {
  if (typeof window === "undefined") return "a4";
  const v = localStorage.getItem(RECEIPT_PRINT_MODE_KEY);
  return v === "economico" ? "economico" : "a4";
}

export function storeReceiptPrintMode(mode: ReceiptPrintMode) {
  if (typeof window !== "undefined") localStorage.setItem(RECEIPT_PRINT_MODE_KEY, mode);
}
