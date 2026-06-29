import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClinicLogo } from "@/components/clinic-logo";
import { cn } from "@/lib/utils";
import { AUTH_ENTRY_BRAND } from "./auth-entry-brand";
import { AuthBootstrapTransition } from "./AuthBootstrapTransition";

export type AuthView = "signin" | "forgot" | "transition";

type AuthEntryPortalProps = {
  view: AuthView;
  onViewChange: (view: AuthView) => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  resetSuccess?: boolean;
  onClearError: () => void;
  onSignIn: (e: React.FormEvent) => void;
  onSendReset: (e: React.FormEvent) => void;
  transitionStep: number;
};

const inputClass =
  "h-11 border-slate-300 bg-white text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-[#0F4C5C] focus-visible:ring-2 focus-visible:ring-[#0F4C5C]/25";

export function AuthEntryPortal({
  view,
  onViewChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  loading,
  error,
  resetSuccess = false,
  onClearError,
  onSignIn,
  onSendReset,
  transitionStep,
}: AuthEntryPortalProps) {
  const [entered, setEntered] = useState(false);
  const brand = AUTH_ENTRY_BRAND;

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, [view]);

  if (view === "transition") {
    return <AuthBootstrapTransition completedThrough={transitionStep} />;
  }

  return (
    <div className="fos-auth-page relative flex min-h-screen flex-col bg-[#f8f9fb] lg:flex-row">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 55% at 20% 0%, rgba(15,76,92,0.08), transparent),
            linear-gradient(to right, rgba(15,76,92,0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15,76,92,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        }}
      />

      {/* Painel de marca — compacto, foco em acesso */}
      <aside
        className={cn(
          "relative hidden w-[44%] max-w-xl flex-col justify-between border-r border-slate-200/60 bg-white/70 p-10 backdrop-blur-sm lg:flex",
          "transition-all duration-700 ease-out",
          entered ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0",
        )}
      >
        <div className="flex items-center gap-4">
          <ClinicLogo brand={brand} size="xl" />
          <div>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">FisioOS</p>
            <p className="mt-0.5 text-sm text-slate-500">{brand.slogan}</p>
          </div>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-slate-500">
          Entrada segura ao painel clínico. Use as credenciais fornecidas pelo administrador da sua clínica.
        </p>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} FisioOS</p>
      </aside>

      {/* Formulário */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div
          className={cn(
            "w-full max-w-[400px] transition-all duration-700 ease-out",
            entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          )}
        >
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-4 lg:hidden">
              <ClinicLogo brand={brand} size="lg" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:hidden">FisioOS</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-7 shadow-lg shadow-slate-200/30 sm:p-8">
            {view === "signin" ? (
              <>
                <div className="mb-6 space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Entrar</h1>
                  <p className="text-sm text-slate-600">Acesse sua conta para continuar.</p>
                </div>
                {resetSuccess ? <AuthResetSuccessBanner /> : null}
                <form className="space-y-4" onSubmit={onSignIn} noValidate>
                  {error ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                    >
                      {error}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="auth-email" className="text-sm font-medium text-slate-800">
                      E-mail
                    </Label>
                    <Input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => onEmailChange(e.target.value)}
                      className={inputClass}
                      placeholder="voce@clinica.com.br"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="auth-password" className="text-sm font-medium text-slate-800">
                        Senha
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          onClearError();
                          onViewChange("forgot");
                        }}
                        className="text-xs font-medium text-[#0F4C5C] underline-offset-2 hover:underline"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>
                    <Input
                      id="auth-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => onPasswordChange(e.target.value)}
                      className={inputClass}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full text-base font-semibold shadow-sm transition-transform active:scale-[0.99]"
                    style={{ backgroundColor: brand.primaryColor }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Entrando…
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
                <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  Contas são criadas pelo administrador da clínica ou pela equipe FisioOS.
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClearError();
                    onViewChange("signin");
                  }}
                  className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Voltar para entrar
                </button>
                <div className="mb-6 space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Redefinir senha</h1>
                  <p className="text-sm text-slate-600">
                    Enviaremos um link para o e-mail informado, se existir uma conta cadastrada.
                  </p>
                </div>
                <form className="space-y-4" onSubmit={onSendReset}>
                  {error ? (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                    >
                      {error}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="auth-reset-email" className="text-sm font-medium text-slate-800">
                      E-mail
                    </Label>
                    <Input
                      id="auth-reset-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => onEmailChange(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full font-semibold"
                    style={{ backgroundColor: brand.primaryColor }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Enviando…
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" aria-hidden />
                        Enviar link
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthResetSuccessBanner() {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      Se o e-mail existir, enviaremos um link de redefinição em instantes.
    </div>
  );
}
