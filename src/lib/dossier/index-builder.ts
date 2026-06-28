import type { PdfBlock } from "@/lib/pdf-engine";
import type { IndexEntry } from "../types";

/** Índice dinâmico — apenas seções efetivamente renderizadas. */
export function buildIndexEntries(blocks: PdfBlock[]): IndexEntry[] {
  const seen = new Set<string>();
  const entries: IndexEntry[] = [];

  blocks.forEach((block, blockId) => {
    if (block.includeInIndex === false) return;
    const label = block.indexLabel ?? block.title;
    const key = label.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ label, blockId });
  });

  return entries;
}

export function indexLabelForClosingPage(): string {
  return "Conclusão do tratamento";
}
