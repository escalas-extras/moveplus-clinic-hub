import { forwardRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

export function PageActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-2.5", className)}>{children}</div>
  );
}

export const PrimaryActionButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => (
  <Button ref={ref} data-fos-btn="" className={cn(clinical.btnPrimary, className)} {...props} />
));
PrimaryActionButton.displayName = "PrimaryActionButton";

export const SecondaryActionButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", ...props }, ref) => (
  <Button ref={ref} variant={variant} data-fos-btn="" className={cn(clinical.btnSecondary, className)} {...props} />
));
SecondaryActionButton.displayName = "SecondaryActionButton";

export const OutlineActionButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", ...props }, ref) => (
  <Button ref={ref} variant={variant} data-fos-btn="" className={cn(clinical.btnOutline, className)} {...props} />
));
OutlineActionButton.displayName = "OutlineActionButton";

export const GhostActionButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "ghost", ...props }, ref) => (
  <Button ref={ref} variant={variant} data-fos-btn="" className={cn(clinical.btnGhost, className)} {...props} />
));
GhostActionButton.displayName = "GhostActionButton";

export const DangerActionButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "destructive", ...props }, ref) => (
  <Button ref={ref} variant={variant} data-fos-btn="" className={cn(clinical.btnDanger, className)} {...props} />
));
DangerActionButton.displayName = "DangerActionButton";
