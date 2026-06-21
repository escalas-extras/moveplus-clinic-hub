import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { useActiveClinic } from "@/lib/active-clinic";

export const Route = createFileRoute("/_authenticated/app/reavaliacoes")({
  component: ReassessmentsPage,
});

function ReassessmentsPage() {
  const { clinicId } = useActiveClinic();
  const { data: items = [] } = useQuery({
    queryKey: ["reassessments-pending", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("reassessment_schedule")
        .select("id, scheduled_for, completed_at, interval_days, patient_id, patients(nome_completo)")
        .eq("clinic_id", clinicId!)
        .order("scheduled_for", { ascending: true });
      return data || [];
    },
  });

  const today = new Date();
  const overdue = items.filter((i: any) => !i.completed_at && new Date(i.scheduled_for) < today);
  const upcoming = items.filter((i: any) => !i.completed_at && new Date(i.scheduled_for) >= today);
  const done = items.filter((i: any) => i.completed_at);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Reavaliações</h1>
        <p className="text-sm text-muted-foreground">Pendências agendadas automaticamente conforme periodicidade do paciente.</p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Atrasadas" value={overdue.length} />
        <Stat icon={<CalendarClock className="h-4 w-4 text-amber-600" />} label="A vencer" value={upcoming.length} />
        <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Concluídas" value={done.length} />
      </div>

      <Section title="Atrasadas" items={overdue} variant="destructive" />
      <Section title="A vencer" items={upcoming} variant="default" />
      <Section title="Concluídas" items={done.slice(0, 20)} variant="muted" />
    </div>
  );
}

function Stat({ icon, label, value }: any) {
  return (
    <Card className="p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </Card>
  );
}

function Section({ title, items, variant }: any) {
  if (!items.length) return null;
  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((i: any) => (
          <div key={i.id} className="flex items-center justify-between p-2 rounded border">
            <div>
              <p className="font-medium text-sm">{i.patients?.nome_completo || "—"}</p>
              <p className="text-xs text-muted-foreground">Agendada para {fmtDate(i.scheduled_for)} · {i.interval_days}d</p>
            </div>
            <div className="flex items-center gap-2">
              {variant === "destructive" && <Badge variant="destructive">Atrasada</Badge>}
              {variant === "default" && <Badge variant="secondary">Agendada</Badge>}
              {variant === "muted" && <Badge variant="outline">Concluída</Badge>}
              <Button asChild size="sm" variant="outline">
                <Link to="/app/pacientes/$id" params={{ id: i.patient_id }}>Abrir</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
