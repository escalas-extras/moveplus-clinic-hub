import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { ClinicLogo } from "@/components/clinic-logo";
import { AUTH_ENTRY_BRAND } from "./auth-entry-brand";
import { cn } from "@/lib/utils";

const STEPS = [
  "Verificando acesso",
  "Carregando clínica",
  "Aplicando identidade visual",
  "Finalizando",
] as const;

type Props = {
  completedThrough: number;
};

export function AuthBootstrapTransition({ completedThrough }: Props) {
  const [visible, setVisible] = useState(false);
  const progress = Math.min(100, Math.max(8, ((completedThrough + 1) / STEPS.length) * 100));

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-[#f8f9fb] px-4 transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0",
      )}
      role="status"
      aria-live="polite"
      aria-label="Preparando seu ambiente"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(15,76,92,0.1), transparent),
            linear-gradient(to right, rgba(15,76,92,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15,76,92,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      />

      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-300/20 transition-all duration-500",
          visible ? "translate-y-0 scale-100" : "translate-y-3 scale-[0.98]",
        )}
      >
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-[#0F4C5C] to-[#2BB673] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-8">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <ClinicLogo brand={AUTH_ENTRY_BRAND} size="lg" />
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">Preparando seu ambiente…</p>
              <p className="mt-1.5 text-sm text-slate-500">Só um instante enquanto configuramos seu acesso.</p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {STEPS.map((label, index) => {
              const done = index <= completedThrough;
              const active = index === completedThrough + 1 && completedThrough < STEPS.length - 1;
              return (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                    done && "bg-emerald-50/80 text-emerald-900",
                    active && "bg-slate-50 text-slate-800",
                    !done && !active && "text-slate-400",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                      done ? "bg-emerald-500 text-white" : active ? "bg-slate-200 text-slate-600" : "bg-slate-100",
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    )}
                  </span>
                  <span className={cn(done || active ? "font-medium" : "font-normal")}>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
