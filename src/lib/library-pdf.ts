// Builder of PDF options for Library contents (cartilhas, protocolos, POPs, etc.)
// Reuses the FisioOS premium PDF engine via pdf.ts wrapper.

import type { BuildPdfOpts, PdfBlock, PdfContent } from "./pdf-engine";

function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

/**
 * Parses a markdown body into PdfBlocks.
 * `## Title` opens a new block. `### Subtitle` becomes a paragraph label.
 * `> quote` becomes a highlight. Lists become bulleted paragraphs.
 */
export function markdownToBlocks(body: string): PdfBlock[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: PdfBlock[] = [];
  let current: PdfBlock | null = null;
  let buffer: string[] = [];
  let bufferLabel: string | undefined;
  let listBuffer: string[] = [];

  const ensure = () => {
    if (!current) {
      current = { title: "Conteúdo", children: [] };
      blocks.push(current);
    }
    return current;
  };

  const flushPara = () => {
    if (listBuffer.length) {
      ensure().children.push({
        kind: "paragraph",
        label: bufferLabel,
        text: listBuffer.map((l) => `• ${l}`).join("\n"),
      } as PdfContent);
      listBuffer = [];
      bufferLabel = undefined;
    }
    if (buffer.length) {
      const text = buffer.join(" ").trim();
      if (text) {
        ensure().children.push({
          kind: "paragraph",
          label: bufferLabel,
          text,
        } as PdfContent);
      }
      buffer = [];
      bufferLabel = undefined;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      flushPara();
      continue;
    }
    if (/^#\s+/.test(line)) {
      // top-level title — treat as a new block
      flushPara();
      current = { title: stripMd(line.replace(/^#\s+/, "")), children: [] };
      blocks.push(current);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushPara();
      current = { title: stripMd(line.replace(/^##\s+/, "")), children: [] };
      blocks.push(current);
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushPara();
      bufferLabel = stripMd(line.replace(/^###\s+/, ""));
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara();
      ensure().children.push({
        kind: "highlight",
        label: "Atenção",
        text: stripMd(line.replace(/^>\s?/, "")),
      } as PdfContent);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      listBuffer.push(stripMd(line.replace(/^[-*]\s+/, "")));
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      listBuffer.push(stripMd(line.replace(/^\d+\.\s+/, "")));
      continue;
    }
    buffer.push(stripMd(line));
  }
  flushPara();

  return blocks.length ? blocks : [{ title: "Conteúdo", children: [{ kind: "paragraph", text: "—" }] }];
}

export function buildLibraryContentPdfOpts(args: {
  title: string;
  type: string;
  summary?: string | null;
  body: string;
  author?: string | null;
  tags?: string[] | null;
}): BuildPdfOpts {
  const blocks: PdfBlock[] = [];
  if (args.summary && args.summary.trim()) {
    blocks.push({
      title: "Resumo",
      children: [{ kind: "highlight", label: "Sobre este material", text: args.summary.trim() }],
    });
  }
  blocks.push(...markdownToBlocks(args.body || "—"));
  if (args.tags && args.tags.length) {
    blocks.push({
      title: "Palavras-chave",
      children: [{ kind: "paragraph", text: args.tags.join(" · ") }],
    });
  }
  const typeLabel: Record<string, string> = {
    cartilha: "Cartilha",
    exercicio: "Exercício",
    protocolo: "Protocolo",
    documento: "Documento",
    marketing: "Material de Marketing",
    post_social: "Conteúdo para Redes Sociais",
    treinamento: "Treinamento",
    pop: "Procedimento Operacional Padrão",
  };
  return {
    title: args.title,
    subtitle: `${typeLabel[args.type] || "Material da Biblioteca"} · Biblioteca clínica`,
    blocks,
    // Materiais da biblioteca são institucionais — não exigem responsável
    // técnico nem hash de validação clínica. O rodapé institucional da
    // clínica já é renderizado pelo engine.
    hideSignature: true,
  };
}
