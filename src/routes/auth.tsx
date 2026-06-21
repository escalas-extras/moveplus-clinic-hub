import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useBranding } from "@/lib/branding";
import { Stethoscope } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const brand = useBranding();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo(a)!");
    const userId = data.user?.id;
    let target: "/app" | "/app/admin-saas" = "/app";
    if (userId) {
      const { resolvePostLoginRedirect } = await import("@/lib/platform-context");
      target = (await resolvePostLoginRedirect(userId)) as any;
    }
    navigate({ to: target });
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Informe seu e-mail.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Se o e-mail existir, enviaremos um link de redefinição.");
    setMode("signin");
  }

  const gradient = `linear-gradient(160deg, ${brand.primaryColor}15 0%, ${brand.secondaryColor}10 60%, ${brand.primaryColor}05 100%)`;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12" style={{ background: gradient }}>
        <div>
          <div className="flex items-center gap-3">
            <LogoMark brand={brand} />
            <div className="leading-tight">
              <div className="text-2xl font-semibold tracking-tight" style={{ color: brand.primaryColor }}>{brand.clinicName}</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: brand.secondaryColor }}>
                {brand.hasOwnLogo ? "Plataforma Clínica" : "Powered by FisioOS"}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3 max-w-md">
          <h1 className="text-3xl leading-tight" style={{ color: brand.primaryColor }}>{brand.slogan}</h1>
          <p className="text-sm text-muted-foreground">
            Pacientes, avaliações, escalas, evoluções, reavaliações, altas e documentos profissionais — uma única fonte de verdade clínica.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {brand.appName}</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <LogoMark brand={brand} />
            <div>
              <div className="text-xl font-semibold" style={{ color: brand.primaryColor }}>{brand.clinicName}</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: brand.secondaryColor }}>{brand.appName}</div>
            </div>
          </div>

          {mode === "signin" ? (
            <>
              <h2 className="text-2xl mb-1">Acesse sua conta</h2>
              <p className="text-sm text-muted-foreground mb-6">Painel profissional {brand.appName}.</p>
              <form className="space-y-4" onSubmit={signIn}>
                <div className="space-y-2">
                  <Label htmlFor="e">E-mail</Label>
                  <Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="p">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs underline text-muted-foreground hover:text-foreground"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                  <Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full" style={{ backgroundColor: brand.primaryColor }}>Entrar</Button>
              </form>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Novas contas são criadas apenas pelo administrador em Usuários.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl mb-1">Redefinir senha</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>
              <form className="space-y-4" onSubmit={sendReset}>
                <div className="space-y-2">
                  <Label htmlFor="er">E-mail</Label>
                  <Input id="er" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full" style={{ backgroundColor: brand.primaryColor }}>
                  {loading ? "Enviando…" : "Enviar link de redefinição"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("signin")}>
                  Voltar para entrar
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function LogoMark({ brand }: { brand: ReturnType<typeof useBranding> }) {
  if (brand.hasOwnLogo && brand.logoUrl) {
    return <img src={brand.logoUrl} alt={brand.clinicName} className="h-[72px] w-auto object-contain" />;
  }
  return (
    <div className="h-[72px] w-[72px] rounded-2xl flex items-center justify-center shadow-md" style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
      <Stethoscope className="h-9 w-9 text-white" />
    </div>
  );
}
