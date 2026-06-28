import type { PdfBlock, PdfContent } from "@/lib/pdf-engine";

const EMPTY = new Set(["", "—", "-", "n/a", "na"]);

export function isEmptyValue(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return !s || EMPTY.has(s.toLowerCase());
}

export function hasMeaningfulText(v: unknown): boolean {
  return !isEmptyValue(v);
}

function filterGridRows(rows: Array<[string, string] | readonly [string, string]>): Array<[string, string]> {
  const skipKeys = /^(paciente|nome(\s+completo)?|sexo|telefone|profissão|profissao|naturalidade|data de nascimento)$/i;
  return rows
    .map((r) => [String(r[0]), String(r[1] ?? "")] as [string, string])
    .filter(([k, v]) => !skipKeys.test(k.trim()) && hasMeaningfulText(v));
}

export function filterContentItem(ch: PdfContent): PdfContent | null {
  if (ch.kind === "paragraph" || ch.kind === "highlight") {
    if (!hasMeaningfulText(ch.text)) return null;
    return ch;
  }
  if (ch.kind === "grid") {
    const rows = filterGridRows(ch.rows as Array<[string, string]>);
    if (!rows.length) return null;
    return { ...ch, rows };
  }
  if (ch.kind === "checks") {
    const items = ch.items.filter((i) => i.checked);
    if (!items.length) return null;
    return { ...ch, items };
  }
  if (ch.kind === "eva") {
    if (ch.value == null) return null;
    return ch;
  }
  if (ch.kind === "evolutions") {
    if (!ch.items.length) return null;
    return ch;
  }
  if (ch.kind === "compare-table") {
    if (!ch.rows.length) return null;
    return ch;
  }
  if (ch.kind === "badge") {
    if (!hasMeaningfulText(ch.text)) return null;
    return ch;
  }
  if (ch.kind === "timeline") {
    if (!ch.items.length) return null;
    return ch;
  }
  return ch;
}

const SKIP_BLOCK_TITLES = /^identifica/i;

const EMPTY_SECTION_TITLES = new Set([
  "diagnóstico",
  "diagnostico",
  "objetivos e plano terapêutico",
  "objetivos",
  "observações",
  "observacoes",
]);

export function sanitizeBlock(block: PdfBlock): PdfBlock | null {
  if (SKIP_BLOCK_TITLES.test(block.title.trim())) return null;
  if (block.title === "Objetivos e plano terapêutico") return null;

  const children = block.children.map(filterContentItem).filter(Boolean) as PdfContent[];

  if (block.title === "Anamnese") {
    const filtered = children.filter((ch) => {
      if (ch.kind !== "paragraph") return true;
      const label = (ch.label ?? "").toLowerCase();
      if (/hma|hmp|hábitos|habitos|antecedentes/.test(label)) {
        return hasMeaningfulText(ch.text);
      }
      return true;
    });
    if (!filtered.length) return null;
    return { ...block, children: filtered };
  }

  if (block.title === "Condutas e recursos") {
    const filtered = children.filter((ch) => {
      if (ch.kind === "paragraph" && /recursos terapêuticos/i.test(ch.label ?? "")) {
        return hasMeaningfulText(ch.text);
      }
      if (ch.kind === "highlight" && /conduta/i.test(ch.label ?? "")) {
        return hasMeaningfulText(ch.text);
      }
      return filterContentItem(ch) != null;
    });
    if (!filtered.length) return null;
    return { ...block, children: filtered };
  }

  if (block.title === "Resposta e orientações") {
    const filtered = children.filter((ch) => {
      if (ch.kind !== "paragraph") return true;
      if (/observações|intercorrências|orientações/i.test(ch.label ?? "")) {
        return hasMeaningfulText(ch.text);
      }
      return hasMeaningfulText(ch.text);
    });
    if (!filtered.length) return null;
    return { ...block, children: filtered };
  }

  if (EMPTY_SECTION_TITLES.has(block.title.trim().toLowerCase())) {
    if (!children.length) return null;
    const allEmptyHighlights =
      children.every((c) => c.kind === "highlight" && !hasMeaningfulText(c.text)) ||
      children.every((c) => (c.kind === "highlight" || c.kind === "paragraph") && !hasMeaningfulText((c as { text: string }).text));
    if (allEmptyHighlights) return null;
  }

  if (block.title === "Diagnóstico") {
    const meaningful = children.filter(
      (c) => c.kind === "highlight" && hasMeaningfulText(c.text),
    );
    if (!meaningful.length) return null;
    return { ...block, children: meaningful };
  }

  if (!children.length) return null;
  return { ...block, children };
}

export function sanitizeBuilderBlocks(blocks: PdfBlock[]): PdfBlock[] {
  return blocks.map(sanitizeBlock).filter(Boolean) as PdfBlock[];
}

export function pushSanitizedBlocks(
  target: PdfBlock[],
  blocks: PdfBlock[],
  opts?: { pageBreakBefore?: boolean; includeInIndex?: boolean; indexLabel?: string },
) {
  const clean = sanitizeBuilderBlocks(blocks);
  if (!clean.length) return;
  if (opts?.pageBreakBefore) clean[0].pageBreakBefore = true;
  if (opts?.indexLabel) {
    clean[0].includeInIndex = opts.includeInIndex ?? true;
    clean[0].indexLabel = opts.indexLabel;
    for (let i = 1; i < clean.length; i++) {
      clean[i].includeInIndex = false;
    }
  } else {
    for (const b of clean) {
      b.includeInIndex = false;
    }
  }
  target.push(...clean);
}
