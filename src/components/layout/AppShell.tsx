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
        "min-h-[calc(100vh-8rem)] space-y-6 rounded-[28px] border border-white/70 bg-[#f8fafc]/80 p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] sm:space-y-7 sm:p-6 lg:p-8",
        isClinical && "dashboard-premium clinical-module",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { clinical };
