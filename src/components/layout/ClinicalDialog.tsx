import * as React from "react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

/** Modal clínico premium — 80–90% viewport, header/footer fixos, scroll interno. */
export const ClinicalDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, children, ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn(clinical.clinicalDialog, className)}
    {...props}
  >
    {children}
  </DialogContent>
));
ClinicalDialogContent.displayName = "ClinicalDialogContent";

export function ClinicalDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader className={cn(clinical.clinicalDialogHeader, className)} {...props} />;
}

export function ClinicalDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={cn("text-xl font-bold tracking-tight", className)} {...props} />;
}

export function ClinicalDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription className={cn("text-sm text-slate-600", className)} {...props} />;
}

export function ClinicalDialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        clinical.clinicalDialogBody,
        "min-w-0 w-full [&_textarea]:w-full [&_textarea]:max-w-full [&_.fos-field]:w-full",
        className,
      )}
      {...props}
    />
  );
}

export function ClinicalDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter className={cn(clinical.clinicalDialogFooter, className)} {...props} />;
}
