import { memo, type HTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type InfoCardProps = HTMLAttributes<HTMLDivElement> & {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: ReactNode;
  padded?: boolean;
  /** Destaque institucional (onboarding, alertas positivos). */
  variant?: "default" | "highlight";
  hoverable?: boolean;
};

function InfoCardInner({
  icon: Icon,
  title,
  description,
  action,
  padded = true,
  variant = "default",
  hoverable = false,
  className,
  children,
  ...props
}: InfoCardProps) {
  const hasHeader = Icon || title || description || action;
  const hasBody = !!children;

  return (
    <div
      className={cn(
        clinical.infoCard,
        variant === "highlight" && clinical.infoCardHighlight,
        hoverable && clinical.cardHover,
        "text-card-foreground",
        className,
      )}
      {...props}
    >
      <div className="fos-info-card__accent" aria-hidden />
      {hasHeader && (
        <div
          className={cn(
            "fos-info-card__header flex flex-wrap items-start justify-between gap-4",
            padded && "px-6 pt-6 sm:px-7 sm:pt-7",
            hasBody && "pb-5",
          )}
        >
          <div className="flex min-w-0 items-start gap-4">
            {Icon && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft ring-1 ring-black/[0.04]">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0 pt-0.5">
              {title && (
                <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{title}</h2>
              )}
              {description && (
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {hasBody && (
        <>
          {hasHeader && <div className="fos-info-card__divider mx-6 sm:mx-7" aria-hidden />}
          <div
            className={cn(
              "fos-info-card__body w-full min-w-0 [&_textarea]:w-full [&_textarea]:max-w-full [&_input:not([type=checkbox]):not([type=radio])]:w-full [&_input]:max-w-full [&_.fos-field]:w-full",
              padded && "px-6 pb-6 pt-5 sm:px-7 sm:pb-7",
              !hasHeader && padded && "pt-6 sm:pt-7",
            )}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export const InfoCard = memo(InfoCardInner);
