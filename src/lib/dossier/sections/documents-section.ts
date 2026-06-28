import { fmtDate } from "@/lib/format";
import type { PdfBlock } from "@/lib/pdf-engine";
import type { DossierContext } from "../types";

const DOC_TYPE_LABEL: Record<string, string> = {
  avaliacao: "Avaliações",
  reavaliacao: "Reavaliações",
  evolucao: "Evoluções",
  relatorio: "Relatórios",
  encaminhamento: "Encaminhamentos",
  termo: "Termos LGPD",
  declaracao: "Declarações",
  laudo: "Laudos",
  contrato: "Contrato de Prestação",
  alta: "Alta",
  plano: "Planos Terapêuticos",
  recibo: "Recibos",
};

function groupLabel(docType: string, sampleTitle?: string): string {
  if (docType === "contrato" && sampleTitle?.toLowerCase().includes("presta")) {
    return "Contrato de Prestação";
  }
  return DOC_TYPE_LABEL[docType] ?? docType;
}

export function buildDocumentsSection(ctx: DossierContext): PdfBlock | null {
  if (!ctx.documents.length) return null;

  const groups = new Map<string, Record<string, unknown>[]>();
  for (const d of ctx.documents) {
    const key = String(d.doc_type ?? "outros");
    const list = groups.get(key) ?? [];
    list.push(d);
    groups.set(key, list);
  }

  const items: Array<{ docType: string; quantity: number; lastIssued: string; hash: string }> = [];

  for (const [docType, docs] of groups) {
    const sorted = [...docs].sort((a, b) =>
      String(b.issued_at ?? "").localeCompare(String(a.issued_at ?? "")),
    );
    const latest = sorted[0];
    items.push({
      docType: groupLabel(docType, String(latest.title ?? "")),
      quantity: sorted.length,
      lastIssued: fmtDate(latest.issued_at as string),
      hash: latest.validation_hash
        ? String(latest.validation_hash).slice(0, 16) + "…"
        : "—",
    });
  }

  if (!items.length) return null;

  return {
    title: "Documentos emitidos",
    includeInIndex: true,
    indexLabel: "Documentos emitidos",
    layout: {
      compact: true,
      editorial: true,
      minHeight: 80,
      idealHeight: 160,
      maxHeight: 280,
    },
    children: [{ kind: "document-cards", items }],
  };
}

export function countDocumentGroups(documents: Record<string, unknown>[]): number {
  return new Set(documents.map((d) => String(d.doc_type ?? "outros"))).size;
}
