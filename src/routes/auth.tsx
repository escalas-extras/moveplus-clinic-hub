import logoAsset from "@/assets/logo.jpg.asset.json";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo(a)!");
    navigate({ to: "/app" });
  }




  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12" style={{ background: "linear-gradient(160deg, #F4F7F4 0%, #F6F2EB 60%, #FAF5F3 100%)" }}>
        <div>
          <div className="flex items-center gap-3">
            <LogoMark />
            <div className="leading-tight">
              <div className="text-2xl font-semibold tracking-tight" style={{ color: "#2f5d3a" }}>Move 60+</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: "#c75c3a" }}>Fisioterapia Domiciliar</div>
            </div>
          </div>
        </div>
        <div className="space-y-3 max-w-md">
          <h1 className="text-3xl leading-tight">Gestão clínica, prontuário e evolução em um só lugar.</h1>
          <p className="text-sm text-muted-foreground">Cadastro de pacientes, avaliações modulares, evoluções, agenda e financeiro — com PDFs profissionais e histórico completo.</p>
        </div>
        <p className="text-xs text-muted-foreground">© Move 60+ · Londrina – PR</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="text-xl font-semibold" style={{ color: "#2f5d3a" }}>Move 60+</div>
              <div className="text-[10px] uppercase tracking-widest" style={{ color: "#c75c3a" }}>Fisioterapia Domiciliar</div>
            </div>
          </div>
          <h2 className="text-2xl mb-1">Acesse sua conta</h2>
          <p className="text-sm text-muted-foreground mb-6">Painel profissional Move+.</p>

          <form className="space-y-4" onSubmit={signIn}>
            <div className="space-y-2">
              <Label htmlFor="e">E-mail</Label>
              <Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">Senha</Label>
              <Input id="p" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">Entrar</Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Novas contas são criadas apenas pelo administrador em Usuários.
          </p>

        </Card>
      </div>
    </div>
  );
}

function LogoMark() {
  return <img src={logoAsset.url} alt="Move 60+" className="h-12 w-auto" />;
}
