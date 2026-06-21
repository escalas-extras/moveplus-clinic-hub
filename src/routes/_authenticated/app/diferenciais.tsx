import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ClipboardCheck, Clock, FileText, RefreshCw, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/diferenciais")({
  component: DiferenciaisPage,
});

type KPI = { label: string; value: number; icon: typeof Sparkles; color: string; sub?: string };

function DiferenciaisPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, e, d, r, ev] = await Promise.all([
        supabase.from("assessments").select("id", { count: "exact", head: true }),
        supabase.from("evolutions").select("id", { count: "exact", head: true }),
        supabase.from("clinical_documents").select("id", { count: "exact", head: true }),
        supabase.from("reassessment_schedule").select("id", { count: "exact", head: true }),
        supabase.from("home_care_visits").select("id", { count: "exact", head: true }),
      ]);
      const aCount = a.count ?? 0;
      const eCount = e.count ?? 0;
      setKpis([
        { label: "Avaliações realizadas", value: aCount, icon: ClipboardCheck, color: "#2f5d3a" },
        { label: "Evoluções registradas", value: eCount, icon: Activity, color: "#0ea5e9" },
        { label: "PDFs/Documentos emitidos", value: d.count ?? 0, icon: FileText, color: "#7c3aed" },
        { label: "Reavaliações controladas", value: r.count ?? 0, icon: RefreshCw, color: "#f59e0b" },
        { label: "Visitas domiciliares", value: ev.count ?? 0, icon: Sparkles, color: "#ef4444" },
        { label: "Horas economizadas (estim.)", value: Math.round((aCount * 25 + eCount * 8) / 60), icon: Clock, color: "#10b981", sub: "vs. prontuário em papel" },
      ]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Por que usar a FisioOS</h1>
          <p className="text-muted-foreground text-sm">Indicadores reais gerados pelo uso da plataforma na sua clínica.</p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Calculando indicadores...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardHeader className="pb-2 flex flex-row items-center gap-3 space-y-0">
                  <div className="rounded-lg p-2" style={{ backgroundColor: `${k.color}20` }}>
                    <k.icon className="h-5 w-5" style={{ color: k.color }} />
                  </div>
                  <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" style={{ color: k.color }}>{k.value.toLocaleString("pt-BR")}</div>
                  {k.sub && <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Diferenciais da plataforma</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>✅ Prontuário inteligente com perfis clínicos</div>
            <div>✅ Escalas validadas (Barthel, Katz, Tinetti, Braden, MRC, etc.)</div>
            <div>✅ Biblioteca de cartilhas, protocolos e exercícios</div>
            <div>✅ Documentos com QR Code e validação pública</div>
            <div>✅ Reavaliações automáticas agendadas</div>
            <div>✅ Marketing e materiais para redes sociais</div>
            <div>✅ Home Care com plano e relatório familiar</div>
            <div>✅ Multiempresa e white-label ready</div>
          </CardContent>
        </Card>
    </div>
  );
}
