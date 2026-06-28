import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type AppShellProps = {
  children: ReactNode;
  className?: string;
  /** Ativa tema clínico premium (dashboard-premium + clinical-module). */
  clinical?: boolean;
};

export function AppShell({ children, className, clinical: isClinical }: AppShellProps) {
  return (
    <div
      className={cn(
        "min-h-[calc(100vh-8rem)] space-y-6 rounded-[28px] border border-[rgba(15,76,92,0.12)] bg-white/75 p-4 shadow-[var(--fos-card-shadow)] backdrop-blur-sm sm:space-y-7 sm:p-6 lg:p-8",
        isClinical && "dashboard-premium clinical-module",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { clinical };
