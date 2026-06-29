import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Branding } from "@/lib/branding";
import { LogoBox, type LogoBoxSize, type LogoBoxVariant } from "@/components/logo-box";

export type ClinicLogoVariant = LogoBoxVariant | "banner" | "mark";

type Props = {
  brand: Branding;
  isLoading?: boolean;
  /** @deprecated Use variant="sidebar-mark" */
  compact?: boolean;
  size?: LogoBoxSize;
  /** sidebar-brand = faixa sidebar expandida; sidebar-mark = colapsado; inline = topbar; document = preview upload */
  variant?: ClinicLogoVariant;
  className?: string;
};

function normalizeVariant(compact: boolean, variant?: ClinicLogoVariant): LogoBoxVariant {
  if (variant === "banner") return "sidebar-brand";
  if (variant === "mark") return "sidebar-mark";
  if (variant) return variant;
  return compact ? "sidebar-mark" : "sidebar-brand";
}

function resolveFixedSize(variant: LogoBoxVariant, size?: LogoBoxSize): LogoBoxSize | undefined {
  if (size && size !== "sidebar-banner" && size !== "mark") return size;
  if (variant === "sidebar-brand" || variant === "sidebar-mark" || variant === "inline" || variant === "document") {
    return undefined;
  }
  return size ?? "md";
}

export function ClinicLogo({
  brand,
  isLoading = false,
  compact = false,
  size,
  variant: variantProp,
  className,
}: Props) {
  const variant = normalizeVariant(compact, variantProp);
  const fixedSize = resolveFixedSize(variant, size);
  const rawLogo = (brand.logo ?? brand.logoUrl)?.trim() || null;
  const showImage = !!rawLogo;
  const awaitingLogo = brand.hasOwnLogo && !rawLogo;

  const initial = (brand.clinicName || "C").trim().charAt(0).toUpperCase();
  const isFisioDefault = !brand.clinicName || brand.clinicName === brand.appName;

  const monogram = (
    <div
      className={cn(
        "h-full w-full flex items-center justify-center text-white font-semibold",
        variant === "sidebar-mark" ? "text-sm" : variant === "sidebar-brand" ? "text-xl" : "text-base",
      )}
      style={{
        background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
      }}
      aria-label={brand.clinicName}
    >
      {!isFisioDefault ? (
        <span>{initial}</span>
      ) : (
        <Stethoscope
          className={cn(
            variant === "sidebar-mark" ? "h-5 w-5" : variant === "sidebar-brand" ? "h-8 w-8" : "h-6 w-6",
          )}
        />
      )}
    </div>
  );

  const isSidebar = variant === "sidebar-brand" || variant === "sidebar-mark";

  return (
    <LogoBox
      src={showImage ? rawLogo : null}
      alt={brand.clinicName}
      variant={fixedSize ? undefined : variant}
      size={fixedSize ?? "md"}
      loading={isLoading || awaitingLogo}
      rounded={isSidebar ? "xl" : showImage && !isLoading ? "xl" : "2xl"}
      framed={variant !== "inline"}
      fallback={monogram}
      className={className}
    />
  );
}
