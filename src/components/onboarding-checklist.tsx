import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

type Step = { key: string; label: string; description: string; to: string; done: boolean };

const DISMISS_KEY = "moveplus.onboarding.dismissed";

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    }
  }, []);

  const { data: steps = [] } = useQuery<Step[]>({
    queryKey: ["onboarding-checklist"],
    queryFn: async () => {
      const [clinic, prof, pat, assess, template] = await Promise.all([
        supabase.from("clinic_settings").select("nome_fantasia, logo_url").limit(1).maybeSingle(),
        supabase.from("professionals").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("assessments").select("id", { count: "exact", head: true }),
        supabase.from("document_templates").select("id", { count: "exact", head: true }).eq("is_default", true),
      ]);
      return [
        {
          key: "clinic", label: "Configurar dados da clínica",
          description: "Nome, CNPJ, endereço e contatos para emitir documentos",
          to: "/app/configuracoes",
          done: !!clinic.data?.nome_fantasia,
        },
        {
          key: "logo", label: "Enviar logo institucional",
          description: "Aparece no cabeçalho dos PDFs",
          to: "/app/configuracoes",
          done: !!clinic.data?.logo_url,
        },
        {
          key: "prof", label: "Cadastrar profissionais",
          description: "Fisioterapeutas com CREFITO para emitir documentos",
          to: "/app/profissionais",
          done: (prof.count ?? 0) > 0,
        },
        {
          key: "pat", label: "Cadastrar primeiro paciente",
          description: "Inicie a base clínica",
          to: "/app/pacientes",
          done: (pat.count ?? 0) > 0,
        },
        {
          key: "assess", label: "Realizar primeira avaliação",
          description: "Use o wizard inteligente",
          to: "/app/pacientes",
          done: (assess.count ?? 0) > 0,
        },
        {
          key: "template", label: "Revisar modelos de documentos",
          description: "Personalize os PDFs com sua identidade",
          to: "/app/templates",
          done: (template.count ?? 0) > 0,
        },
      ];
    },
  });

  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (dismissed || pct === 100) return null;

  return (
    <Card className="p-5 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Bem-vindo à Move+</h3>
            <p className="text-xs text-muted-foreground">Complete a configuração para começar a usar tudo.</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          title="Dispensar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <Progress value={pct} className="flex-1 h-2" />
        <span className="text-sm font-medium tabular-nums">{done}/{total}</span>
      </div>
      <ul className="space-y-1">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              to={s.to}
              className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/50 transition-colors"
            >
              {s.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.description}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
