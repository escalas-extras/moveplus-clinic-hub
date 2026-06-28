import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  classifyLogoAspect,
  computeLogoImageStyle,
  computeSidebarBrandFit,
  logoFitMetrics,
  type LogoAspect,
  type LogoBoxLayoutVariant,
} from "@/lib/logo-aspect";

/** Áreas fixas padronizadas — preview, upload, inline legado. */
export type LogoBoxSize = "sm" | "md" | "lg" | "xl" | "upload" | "sidebar-banner" | "mark";

export const LOGO_BOX_PX: Record<LogoBoxSize, { w: number; h: number }> = {
  sm: { w: 44, h: 44 },
  md: { w: 48, h: 48 },
  lg: { w: 64, h: 64 },
  xl: { w: 72, h: 72 },
  upload: { w: 96, h: 96 },
  /** @deprecated Use variant="sidebar-brand" */
  "sidebar-banner": { w: 248, h: 100 },
  /** @deprecated Use variant="sidebar-mark" */
  mark: { w: 48, h: 48 },
};

export type LogoBoxVariant = LogoBoxLayoutVariant;

export const LOGO_SIDEBAR_VARIANT: LogoBoxVariant = "sidebar-brand";

type LogoBoxProps = {
  src?: string | null;
  alt: string;
  variant?: LogoBoxVariant;
  size?: LogoBoxSize;
  className?: string;
  imageClassName?: string;
  rounded?: "lg" | "xl" | "2xl" | "none";
  fallback?: ReactNode;
  loading?: boolean;
  framed?: boolean;
  /** @deprecated Use variant="sidebar-brand" */
  fullWidth?: boolean;
};

function resolveLayoutVariant(
  variant: LogoBoxVariant | undefined,
  size: LogoBoxSize,
  fullWidth: boolean,
): LogoBoxLayoutVariant | null {
  if (variant) return variant;
  if (size === "sidebar-banner" || fullWidth) return "sidebar-brand";
  if (size === "mark") return "sidebar-mark";
  if (size === "upload") return "document";
  return null;
}

/**
 * Área para logo — object-contain, centralizada, dimensionamento inteligente por proporção.
 */
export function LogoBox({
  src,
  alt,
  variant: variantProp,
  size = "md",
  className,
  imageClassName,
  rounded = "xl",
  fallback = null,
  loading = false,
  framed = true,
  fullWidth = false,
}: LogoBoxProps) {
  const [broken, setBroken] = useState(false);
  const [aspect, setAspect] = useState<LogoAspect | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [imgStyle, setImgStyle] = useState<CSSProperties>({});
  const [brandContainerHeight, setBrandContainerHeight] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  const rawSrc = src?.trim() || null;
  const px = LOGO_BOX_PX[size];
  const layoutVariant = resolveLayoutVariant(variantProp, size, fullWidth);
  const isAdaptive = layoutVariant != null;
  const isSidebarBrand = layoutVariant === "sidebar-brand";

  useEffect(() => {
    setBroken(false);
    setAspect(null);
    setNaturalSize(null);
    setImgStyle({});
    setBrandContainerHeight(100);
  }, [rawSrc]);

  const updateFit = useCallback(() => {
    if (!layoutVariant || !naturalSize || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { w, h } = naturalSize;

    if (layoutVariant === "sidebar-brand") {
      const fit = computeSidebarBrandFit(w, h, rect.width);
      setBrandContainerHeight(fit.containerHeight);
      setImgStyle({
        width: `${fit.imageWidth}px`,
        height: `${fit.imageHeight}px`,
        maxWidth: "92%",
        maxHeight: "100%",
      });
      return;
    }

    const metrics = logoFitMetrics(layoutVariant, aspect ?? classifyLogoAspect(w, h));
    const style = computeLogoImageStyle(metrics, w, h, rect.width, rect.height);
    setImgStyle(style);
  }, [layoutVariant, naturalSize, aspect]);

  useEffect(() => {
    if (!isAdaptive || !naturalSize) return;
    updateFit();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateFit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [isAdaptive, naturalSize, updateFit]);

  useEffect(() => {
    if (!isAdaptive || !naturalSize) return;
    requestAnimationFrame(updateFit);
  }, [isAdaptive, naturalSize, updateFit]);

  const roundedClass =
    rounded === "none"
      ? "rounded-none"
      : rounded === "2xl"
        ? "rounded-2xl"
        : rounded === "lg"
          ? "rounded-lg"
          : "rounded-xl";

  const containerHeight = isSidebarBrand
    ? brandContainerHeight
    : layoutVariant
      ? logoFitMetrics(layoutVariant, aspect ?? "square").containerHeight
      : px.h;

  const boxStyle: CSSProperties = isAdaptive
    ? {
        width: layoutVariant === "sidebar-mark" || layoutVariant === "inline" ? containerHeight : "100%",
        height: containerHeight,
        minHeight: isSidebarBrand ? 80 : undefined,
        maxHeight: isSidebarBrand ? 132 : undefined,
      }
    : {
        width: px.w,
        height: px.h,
        minWidth: px.w,
        minHeight: px.h,
      };

  const boxClass = cn(
    "fos-logo-box shrink-0 flex items-center justify-center overflow-hidden",
    isSidebarBrand && "w-full min-w-0",
    framed && !isAdaptive && "bg-white shadow-soft ring-1 ring-black/5",
    framed && isAdaptive && "bg-white/95 shadow-soft ring-1 ring-white/20",
    isAdaptive && aspect && `fos-logo-box--${aspect}`,
    isAdaptive && layoutVariant && `fos-logo-box--${layoutVariant}`,
    roundedClass,
    className,
  );

  if (loading && !rawSrc) {
    return (
      <div className={cn(boxClass, "bg-white/10 animate-pulse")} style={boxStyle} aria-hidden="true" />
    );
  }

  const showImage = !!rawSrc && !broken;

  if (showImage) {
    return (
      <div ref={containerRef} className={boxClass} style={boxStyle} data-logo-aspect={aspect ?? undefined}>
        <div className="flex h-full w-full items-center justify-center p-0.5">
          <img
            src={rawSrc}
            alt={alt}
            className={cn(
              "block object-contain object-center",
              !isAdaptive && "max-h-full max-w-full h-auto w-auto",
              imageClassName,
            )}
            style={isAdaptive ? imgStyle : undefined}
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
            onError={() => setBroken(true)}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (!img.naturalWidth || !img.naturalHeight) {
                setBroken(true);
                return;
              }
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              setAspect(classifyLogoAspect(img.naturalWidth, img.naturalHeight));
            }}
          />
        </div>
      </div>
    );
  }

  if (fallback) {
    return (
      <div className={cn(boxClass, "overflow-hidden")} style={boxStyle}>
        {fallback}
      </div>
    );
  }

  return null;
}
