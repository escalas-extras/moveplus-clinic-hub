import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/set-password")({
  ssr: false,
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const url = new URL(window.location.href);
        const search = url.searchParams;
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        // 1) Provider error in URL
        const urlError =
          search.get("error_description") ||
          search.get("error") ||
          hash.get("error_description") ||
          hash.get("error");
        if (urlError) {
          if (!cancelled) {
            setErrorMsg(decodeURIComponent(urlError));
            setReady(true);
          }
          return;
        }

        // 2) PKCE recovery: ?code=...
        const code = search.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!cancelled) {
              setErrorMsg(error.message);
              setReady(true);
            }
            return;
          }
          // Clean URL
          window.history.replaceState({}, "", url.pathname);
        }

        // 3) Implicit recovery: #access_token=...&type=recovery
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            if (!cancelled) {
              setErrorMsg(error.message);
              setReady(true);
            }
            return;
          }
          window.history.replaceState({}, "", window.location.pathname);
        }

        // 4) Final check
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setHasSession(!!data.session);
          setReady(true);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e?.message ?? "Falha ao validar o link.");
          setReady(true);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Senha definida com sucesso!");
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl mb-1">Defina sua senha</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Crie a senha de acesso à sua conta FisioOS.
        </p>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Validando link…</p>
        ) : !hasSession ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              {errorMsg
                ? `Link inválido ou expirado: ${errorMsg}`
                : "Link inválido ou expirado. Solicite um novo em \"Esqueci minha senha\"."}
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>
              Ir para o login
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="pw">Nova senha</Label>
              <Input
                id="pw"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpw">Confirmar senha</Label>
              <Input
                id="cpw"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Salvando…" : "Definir senha e ativar conta"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
