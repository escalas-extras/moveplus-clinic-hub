import { forwardRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

export function PageActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}>{children}</div>
  );
}

export const PrimaryActionButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => (
  <Button ref={ref} className={cn(clinical.btnPrimary, className)} {...props} />
));
PrimaryActionButton.displayName = "PrimaryActionButton";

export const SecondaryActionButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", ...props }, ref) => (
  <Button ref={ref} variant={variant} className={cn(clinical.btnSecondary, className)} {...props} />
));
SecondaryActionButton.displayName = "SecondaryActionButton";
