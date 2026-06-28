/**
 * Sprint D3.2 — composição editorial com balanceamento de densidade.
 * Páginas por composição — nunca por seção.
 */

import { DENSITY_TARGET } from "./block-bounds";

export type PublishingAtom = {
  kind: string;
  h: number;
  blockId: number;
  [key: string]: unknown;
};

export type PublishingPage = {
  atoms: PublishingAtom[];
  blockSegments: Array<{ blockId: number; startIdx: number; endIdx: number; isContinuation: boolean }>;
  contentH: number;
  topY: number;
};

export type PublishingBlockGroup = {
  id: number;
  title: string;
  atoms: PublishingAtom[];
  totalH: number;
  pageBreakBefore?: boolean;
  indexLabel?: string;
};

export function pageDensity(page: PublishingPage, bottomY: number): number {
  const usable = bottomY - page.topY;
  return usable > 0 ? page.contentH / usable : 0;
}

export function computePageDensities(pages: PublishingPage[], bottomY: number): number[] {
  return pages.map((p) => Math.round(pageDensity(p, bottomY) * 100) / 100);
}

export function computeAvgDensity(pages: PublishingPage[], bottomY: number): number {
  const d = computePageDensities(pages, bottomY);
  return d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
}

function recomputePageContentH(page: PublishingPage): number {
  return page.atoms.reduce((s, a) => s + a.h, 0);
}

/**
 * Tenta equilibrar páginas com densidade < 65% puxando átomos da página seguinte.
 */
export function balancePageDensities(
  pages: PublishingPage[],
  bottomY: number,
  lineH = 14,
): { pages: PublishingPage[]; passes: number } {
  if (pages.length < 2) return { pages, passes: 0 };

  let result = pages.map((p) => ({
    ...p,
    atoms: [...p.atoms],
    blockSegments: p.blockSegments.map((s) => ({ ...s })),
  }));
  let passes = 0;
  const maxPasses = 4;

  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;
    for (let pi = 0; pi < result.length - 1; pi++) {
      const cur = result[pi];
      const next = result[pi + 1];
      cur.contentH = recomputePageContentH(cur);
      const curDensity = pageDensity(cur, bottomY);
      if (curDensity >= DENSITY_TARGET.rebalanceBelow) continue;

      let y = cur.topY + cur.contentH;

      while (next.atoms.length > 0) {
        const atom = next.atoms[0];
        if (atom.kind === "title" && !atom.continuation) break;
        if (y + atom.h > bottomY) break;

        cur.atoms.push(atom);
        y += atom.h;
        next.atoms.shift();
        moved = true;

        cur.contentH = recomputePageContentH(cur);
        if (pageDensity(cur, bottomY) >= DENSITY_TARGET.min) break;
      }

      next.contentH = recomputePageContentH(next);

      if (next.atoms.length === 0) {
        result.splice(pi + 1, 1);
      }
    }
    if (moved) passes++;
    else break;
  }

  for (const p of result) {
    p.contentH = recomputePageContentH(p);
  }

  return { pages: result, passes };
}

export function composePublishing(
  groups: PublishingBlockGroup[],
  topYFirst: number,
  topYRest: number,
  bottomY: number,
  blockGap: number,
  lineH: number,
): PublishingPage[] {
  const pages: PublishingPage[] = [];
  let cur: PublishingPage = { atoms: [], blockSegments: [], contentH: 0, topY: topYFirst };
  let y = topYFirst;

  const flush = () => {
    pages.push(cur);
    cur = { atoms: [], blockSegments: [], contentH: 0, topY: topYRest };
    y = topYRest;
  };

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const headroomLines = 3;
    const titleAtom = g.atoms[0];
    const headroom = titleAtom ? titleAtom.h + headroomLines * lineH + 2 : lineH * 3;

    if (y + headroom > bottomY && cur.atoms.length > 0) flush();

    let segStartIdx = cur.atoms.length;
    let isContinuation = false;

    for (let ai = 0; ai < g.atoms.length; ai++) {
      const a = g.atoms[ai];
      const atom: PublishingAtom = a.kind === "block-gap" ? { ...a, h: blockGap } : a;
      const fits = y + atom.h <= bottomY;

      if (atom.kind === "title") {
        cur.atoms.push(atom);
        cur.contentH += atom.h;
        y += atom.h;
        continue;
      }

      if (fits) {
        cur.atoms.push(atom);
        cur.contentH += atom.h;
        y += atom.h;
        continue;
      }

      if (atom.kind === "para-line") {
        cur.blockSegments.push({ blockId: g.id, startIdx: segStartIdx, endIdx: cur.atoms.length - 1, isContinuation });
        flush();
        const contTitle: PublishingAtom = {
          kind: "title",
          label: `${g.title} (continuação)`,
          h: 20,
          blockId: g.id,
          continuation: true,
        };
        cur.atoms.push(contTitle);
        cur.contentH += contTitle.h;
        y += contTitle.h;
        segStartIdx = 0;
        isContinuation = true;
        cur.atoms.push(atom);
        cur.contentH += atom.h;
        y += atom.h;
        continue;
      }

      cur.blockSegments.push({ blockId: g.id, startIdx: segStartIdx, endIdx: cur.atoms.length - 1, isContinuation });
      flush();
      const contTitle: PublishingAtom = {
        kind: "title",
        label: `${g.title} (continuação)`,
        h: 20,
        blockId: g.id,
        continuation: true,
      };
      cur.atoms.push(contTitle);
      cur.contentH += contTitle.h;
      y += contTitle.h;
      segStartIdx = 0;
      isContinuation = true;
      cur.atoms.push(atom);
      cur.contentH += atom.h;
      y += atom.h;
    }

    cur.blockSegments.push({ blockId: g.id, startIdx: segStartIdx, endIdx: cur.atoms.length - 1, isContinuation });
  }

  if (cur.atoms.length > 0) pages.push(cur);
  return pages;
}

export function composeAndBalance(
  groups: PublishingBlockGroup[],
  topYFirst: number,
  topYRest: number,
  bottomY: number,
  blockGap = 5,
  lineH = 13,
): { pages: PublishingPage[]; densities: number[]; avgDensity: number; rebalancePasses: number } {
  let pages = composePublishing(groups, topYFirst, topYRest, bottomY, blockGap, lineH);
  const balanced = balancePageDensities(pages, bottomY, lineH);
  pages = balanced.pages;
  const densities = computePageDensities(pages, bottomY);
  return {
    pages,
    densities,
    avgDensity: computeAvgDensity(pages, bottomY),
    rebalancePasses: balanced.passes,
  };
}
