import type { ReactNode } from "react";
import { StatusBadge, type StatusBadgeVariant } from "@/components/layout/StatusBadge";
import { cn } from "@/lib/utils";

export type InfoBadgeVariant = StatusBadgeVariant;

export type InfoBadgeProps = {
  children: React.ReactNode;
  variant?: InfoBadgeVariant;
  className?: string;
  dot?: boolean;
};

/** Badge informativo — alias padronizado do StatusBadge. */
export function InfoBadge({ className, ...props }: InfoBadgeProps) {
  return <StatusBadge {...props} className={cn("fos-info-badge", className)} />;
}
