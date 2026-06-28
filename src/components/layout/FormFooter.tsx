import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type FormFooterProps = {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
  align?: "end" | "between" | "start";
};

/** Barra de ações consistente para formulários clínicos. */
export function FormFooter({ children, className, sticky = false, align = "end" }: FormFooterProps) {
  const alignClass =
    align === "between"
      ? "justify-between"
      : align === "start"
        ? "justify-start"
        : "justify-end";

  return (
    <div
      className={cn(
        "fos-form-footer flex flex-wrap items-center gap-2.5 pt-2",
        sticky && clinical.stickyFooter,
        alignClass,
        className,
      )}
    >
      {children}
    </div>
  );
}
