import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, ChevronDown, Sparkles, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/lib/branding";
import { useActiveClinic } from "@/lib/active-clinic";

type Step = { key: string; label: string; description: string; to: string; done: boolean };

const DISMISS_KEY = "fisioos.onboarding.dismissed";
const LEGACY_DISMISS_KEY = "moveplus.onboarding.dismissed";

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const brand = useBranding();
  const { clinicId } = useActiveClinic();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const legacy = localStorage.getItem(LEGACY_DISMISS_KEY);
      if (legacy === "1" && !localStorage.getItem(DISMISS_KEY)) {
        localStorage.setItem(DISMISS_KEY, "1");
        localStorage.removeItem(LEGACY_DISMISS_KEY);
      }
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    }
  }, []);

  const { data: steps = [] } = useQuery<Step[]>({
    queryKey: ["onboarding-checklist", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const [clinic, prof, pat, assess] = await Promise.all([
        supabase.from("clinic_settings").select("nome_fantasia, logo_url").eq("clinic_id", clinicId!).maybeSingle(),
        supabase.from("professionals").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId!),
        supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId!),
        supabase.from("assessments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId!),
      ]);
      return [
        {
          key: "logo", label: "Enviar logo da clínica",
          description: "Aparece no cabeçalho dos PDFs e na barra lateral",
          to: "/app/configuracoes",
          done: !!clinic.data?.logo_url,
        },
        {
          key: "prof", label: "Cadastrar profissional",
          description: "Fisioterapeuta com CREFITO para emitir documentos",
          to: "/app/profissionais",
          done: (prof.count ?? 0) > 0,
        },
        {
          key: "pat", label: "Cadastrar paciente",
          description: "Inicie a base clínica da sua clínica",
          to: "/app/pacientes",
          done: (pat.count ?? 0) > 0,
        },
        {
          key: "assess", label: "Realizar primeira avaliação",
          description: "Use o assistente clínico inteligente",
          to: "/app/pacientes",
          done: (assess.count ?? 0) > 0,
        },
      ];
    },
  });

  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (dismissed || pct === 100) return null;

  return (
    <Card className="p-4 border-primary/20">
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${brand.primaryColor}18`, color: brand.primaryColor }}
        >
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">Próximos passos</h3>
            <span className="text-xs text-muted-foreground tabular-nums">{done}/{total}</span>
          </div>
          <Progress value={pct} className="h-1.5 mt-1.5" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="h-8 px-2 text-xs"
        >
          {expanded ? "Ocultar" : "Ver"}
          <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          title="Dispensar"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {expanded && (
        <ul className="mt-3 pt-3 border-t border-border/60 space-y-1">
          {steps.map((s) => (
            <li key={s.key}>
              <Link
                to={s.to}
                className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
              >
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${s.done ? "line-through text-muted-foreground" : "font-medium"}`}>{s.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
