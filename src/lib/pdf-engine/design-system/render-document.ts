import { jsPDF } from "jspdf";
import type { BuildPdfOpts, ClinicData, PdfBlock, PdfSection, PreparedLogo } from "../types";
import { prepareLogoInput } from "../logo";
import { createDocumentTheme } from "./theme";
import { drawDsHeader, drawDsRunningHeader, measureDsHeaderHeight } from "./components/header";
import { drawDsFooter, drawDsValidationQr } from "./components/footer";
import { drawSectionCard, measureSectionCard } from "./components/section-card";
import { drawDsSignatureArea } from "./components/signature";

type PageLayout = {
  sectionIndices: number[];
  isFirst: boolean;
};

function blockBodyText(block: PdfBlock): string {
  return block.children
    .map((c) => {
      if (c.kind === "paragraph") return c.text;
      if (c.kind === "highlight") return `${c.label}: ${c.text}`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function resolveSections(opts: BuildPdfOpts): PdfSection[] {
  if (opts.sections?.length) return opts.sections;
  return (opts.blocks ?? []).map((b, i) => ({
    title: b.title.match(/^\d+/) ? b.title : `${i + 1}. ${b.title}`,
    body: blockBodyText(b),
  }));
}

function paginateSections(
  doc: jsPDF,
  theme: ReturnType<typeof createDocumentTheme>,
  sections: PdfSection[],
  contentW: number,
  topFirst: number,
  topRest: number,
  bottomY: number,
  sigReserve: number,
) {
  const { space: S } = theme;
  const pages: PageLayout[] = [];
  let current: PageLayout = { sectionIndices: [], isFirst: true };
  let y = topFirst;

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const measured = measureSectionCard(doc, theme, sec.title, sec.body, contentW);
    const remainingAfter = sections.length - i - 1;
    const reserve = remainingAfter === 0 ? sigReserve : 0;
    const maxY = bottomY - reserve;

    if (current.sectionIndices.length > 0 && y + measured.h > maxY) {
      pages.push(current);
      current = { sectionIndices: [], isFirst: false };
      y = topRest;
      i--;
      continue;
    }

    current.sectionIndices.push(i);
    y += measured.h + S.sectionGap;
  }

  if (current.sectionIndices.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [{ sectionIndices: [], isFirst: true }];
}

/** Motor de renderização FisioOS Document Design System. */
export async function renderFisioosDsDocument(
  opts: BuildPdfOpts,
  ctx: { clinic: ClinicData; logo: string | PreparedLogo | null },
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const theme = createDocumentTheme(ctx.clinic);
  const M = theme.space.margin;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - 2 * M;

  const preparedLogo = await prepareLogoInput(ctx.logo);
  const sections: PdfSection[] = resolveSections(opts);
  const sigReserve = opts.hideSignature
    ? opts.validationHash
      ? theme.space.qrSize + theme.space.qrMarginBottom + 8
      : 0
    : theme.space.sigContractH +
      (opts.validationHash ? theme.space.qrSize + theme.space.qrMarginBottom + 8 : 0);

  const topFirst = measureDsHeaderHeight(doc, theme, ctx.clinic, pageW) + 16;
  const topRest = 50;
  const bottomY = pageH - theme.space.footerH - 12;

  const pageLayouts = paginateSections(doc, theme, sections, contentW, topFirst, topRest, bottomY, sigReserve);

  for (let pi = 0; pi < pageLayouts.length; pi++) {
    if (pi > 0) doc.addPage();

    if (pi === 0) {
      drawDsHeader(doc, theme, ctx.clinic, opts, preparedLogo, pageW);
    } else {
      drawDsRunningHeader(doc, theme, ctx.clinic, opts, pageW);
    }

    let y = pi === 0 ? topFirst : topRest;
    for (const si of pageLayouts[pi].sectionIndices) {
      const sec = sections[si];
      const h = drawSectionCard(doc, theme, sec.title, sec.body, M, y, contentW);
      y += h + theme.space.sectionGap;
    }
  }

  const lastPage = pageLayouts.length;
  doc.setPage(lastPage);

  if (!opts.hideSignature) {
    let contentEndY = pageLayouts[lastPage - 1].isFirst ? topFirst : topRest;
    for (const si of pageLayouts[lastPage - 1].sectionIndices) {
      const sec = sections[si];
      const measured = measureSectionCard(doc, theme, sec.title, sec.body, contentW);
      contentEndY += measured.h + theme.space.sectionGap;
    }
    drawDsSignatureArea(doc, theme, opts, ctx.clinic, pageW, pageH, M, contentEndY - theme.space.sectionGap);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawDsFooter(doc, theme, ctx.clinic, pageW, pageH, {
      page: i,
      pageCount,
      validationHash: opts.validationHash ?? null,
      validationUrlBase: opts.validationUrlBase,
      documentVersion: opts.documentVersion ?? null,
    });
    if (i === pageCount && opts.validationHash) {
      await drawDsValidationQr(doc, theme, opts.validationHash, pageW, pageH, opts.validationUrlBase);
    }
  }

  return doc;
}
