import type jsPDF from "jspdf";

const EMPTY_RE = /^(—|null|undefined|n\/a|na|n\.d\.)$/i;

export function isEmptyText(v: string | null | undefined): boolean {
  if (v == null) return true;
  const t = String(v).trim();
  return t === "" || EMPTY_RE.test(t);
}

export function cleanText(v: string | null | undefined): string {
  return isEmptyText(v) ? "" : String(v).trim();
}

/**
 * Quebra texto garantindo que nenhuma linha ultrapasse maxWidth.
 * Trata palavras longas, URLs e campos extensos.
 */
export function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  if (maxWidth <= 0) return [cleaned];

  const primary = doc.splitTextToSize(cleaned, maxWidth) as string[];
  const lines: string[] = [];

  for (const line of primary) {
    if (doc.getTextWidth(line) <= maxWidth + 0.5) {
      lines.push(line);
      continue;
    }
    let chunk = "";
    for (const ch of line) {
      const next = chunk + ch;
      if (doc.getTextWidth(next) > maxWidth && chunk.length > 0) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = next;
      }
    }
    if (chunk) lines.push(chunk);
  }

  return lines.length ? lines : [cleaned];
}

/** Primeira linha truncada com reticências se necessário. */
export function truncateLine(doc: jsPDF, text: string, maxWidth: number): string {
  const cleaned = cleanText(text);
  if (!cleaned) return "—";
  if (doc.getTextWidth(cleaned) <= maxWidth) return cleaned;
  let out = cleaned;
  while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}
