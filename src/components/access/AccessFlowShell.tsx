import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ClinicLogo } from "@/components/clinic-logo";
import { AUTH_ENTRY_BRAND } from "@/components/auth/auth-entry-brand";

type AccessFlowShellProps = {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
};

/** Layout compartilhado para seleção de clínica e telas de acesso restrito. */
export function AccessFlowShell({ children, className, narrow = false }: AccessFlowShellProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#f8f9fb]">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 45% at 50% 0%, rgba(15,76,92,0.07), transparent),
            linear-gradient(to right, rgba(15,76,92,0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15,76,92,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      />
      <div
        className={cn(
          "relative mx-auto px-4 py-8 sm:px-6 sm:py-10",
          narrow ? "max-w-lg" : "max-w-2xl",
          className,
        )}
      >
        <header className="mb-8 flex items-center gap-3">
          <ClinicLogo brand={AUTH_ENTRY_BRAND} size="md" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-900">FisioOS</p>
            <p className="text-xs text-slate-500">{AUTH_ENTRY_BRAND.slogan}</p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
