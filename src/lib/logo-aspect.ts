/** Classificação e dimensionamento da logo na UI (sidebar, upload, etc.). */

export type LogoAspect = "horizontal" | "square" | "vertical";

export type LogoBoxLayoutVariant = "sidebar-brand" | "sidebar-mark" | "inline" | "document";

const HORIZONTAL_MIN = 1.25;
const VERTICAL_MAX = 0.85;

export function classifyLogoAspect(naturalWidth: number, naturalHeight: number): LogoAspect {
  if (!naturalWidth || !naturalHeight) return "square";
  const ratio = naturalWidth / naturalHeight;
  if (ratio >= HORIZONTAL_MIN) return "horizontal";
  if (ratio <= VERTICAL_MAX) return "vertical";
  return "square";
}

export type SidebarBrandFit = {
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
};

/**
 * Escala a logo para ocupar o máximo do card sidebar (object-contain ampliado).
 * Prioriza largura (~92% útil) e ajusta altura do container ao resultado.
 */
export function computeSidebarBrandFit(
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
): SidebarBrandFit {
  const pad = 6;
  const fill = 0.92;
  const minH = 80;
  const maxH = 132;

  const availW = Math.max(1, containerWidth - pad);
  const availHMax = maxH - pad;

  const scale = Math.min((availW * fill) / naturalWidth, (availHMax * fill) / naturalHeight);
  let imgW = naturalWidth * scale;
  let imgH = naturalHeight * scale;

  let containerH = Math.ceil(imgH + pad);
  containerH = Math.max(minH, Math.min(maxH, containerH));

  const availH = containerH - pad;
  const finalScale = Math.min((availW * fill) / naturalWidth, (availH * fill) / naturalHeight);
  imgW = naturalWidth * finalScale;
  imgH = naturalHeight * finalScale;

  return {
    containerHeight: containerH,
    imageWidth: imgW,
    imageHeight: imgH,
  };
}

/** @deprecated Prefer computeSidebarBrandFit for sidebar-brand. */
export function sidebarBrandContainerHeight(aspect: LogoAspect): number {
  switch (aspect) {
    case "horizontal":
      return 100;
    case "square":
      return 112;
    case "vertical":
      return 120;
  }
}

export type LogoFitMetrics = {
  containerHeight: number;
  paddingX: number;
  paddingY: number;
  widthPct: number;
  heightCap: number;
  maxWidthPct: number;
  absoluteHeightCap?: number;
};

export function logoFitMetrics(variant: LogoBoxLayoutVariant, aspect: LogoAspect): LogoFitMetrics {
  switch (variant) {
    case "sidebar-brand":
      return {
        containerHeight: sidebarBrandContainerHeight(aspect),
        paddingX: 6,
        paddingY: 4,
        widthPct: 0.92,
        heightCap: 0.94,
        maxWidthPct: 1,
        absoluteHeightCap: 120,
      };
    case "sidebar-mark":
      return {
        containerHeight: 48,
        paddingX: 4,
        paddingY: 4,
        widthPct: 0.92,
        heightCap: 0.9,
        maxWidthPct: 1,
      };
    case "inline":
      return {
        containerHeight: 48,
        paddingX: 4,
        paddingY: 4,
        widthPct: 0.92,
        heightCap: 0.9,
        maxWidthPct: 1,
      };
    case "document":
      return {
        containerHeight: 96,
        paddingX: 8,
        paddingY: 8,
        widthPct: 0.9,
        heightCap: 0.92,
        maxWidthPct: 1,
        absoluteHeightCap: 88,
      };
  }
}

export type LogoImageStyle = {
  width?: string;
  minWidth?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
};

/** Fit genérico para mark / inline / document. */
export function computeLogoImageStyle(
  metrics: LogoFitMetrics,
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number,
): LogoImageStyle {
  const availW = Math.max(0, containerWidth - metrics.paddingX);
  const availH = Math.max(0, containerHeight - metrics.paddingY);
  const scale = Math.min(
    (availW * (metrics.widthPct || 0.92)) / naturalWidth,
    (availH * metrics.heightCap) / naturalHeight,
  );
  return {
    width: `${naturalWidth * scale}px`,
    height: `${naturalHeight * scale}px`,
    maxWidth: `${availW}px`,
    maxHeight: `${availH}px`,
  };
}
