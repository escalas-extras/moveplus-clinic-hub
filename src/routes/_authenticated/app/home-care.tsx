import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Home, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/home-care")({
  component: HomeCarePage,
});

type Visit = {
  id: string; patient_id: string; visit_date: string; address: string | null;
  therapeutic_plan: string | null; family_report: string | null; observations: string | null;
  duration_minutes: number | null;
};
type Patient = { id: string; full_name: string };

function HomeCarePage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Visit> & { patient_id?: string }>({ visit_date: new Date().toISOString().slice(0, 10) });

  async function load() {
    const [v, p] = await Promise.all([
      supabase.from("home_care_visits").select("*").order("visit_date", { ascending: false }),
      supabase.from("patients").select("id,full_name").order("full_name"),
    ]);
    setVisits((v.data ?? []) as Visit[]);
    setPatients((p.data ?? []) as Patient[]);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.patient_id) { toast.error("Selecione um paciente"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("home_care_visits").insert({
      patient_id: form.patient_id,
      visit_date: form.visit_date,
      address: form.address ?? null,
      therapeutic_plan: form.therapeutic_plan ?? null,
      family_report: form.family_report ?? null,
      observations: form.observations ?? null,
      duration_minutes: form.duration_minutes ?? null,
      created_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Visita registrada");
    setOpen(false); setForm({ visit_date: new Date().toISOString().slice(0, 10) });
    load();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Home className="h-6 w-6" /> Home Care</h1>
            <p className="text-muted-foreground text-sm">Visitas domiciliares com checklist, plano terapêutico e relatório para familiares.</p>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova visita</Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visits.map((v) => {
            const p = patients.find((x) => x.id === v.patient_id);
            return (
              <Card key={v.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{p?.full_name ?? "Paciente"}</CardTitle>
                  <p className="text-xs text-muted-foreground">{new Date(v.visit_date).toLocaleDateString("pt-BR")}{v.duration_minutes ? ` • ${v.duration_minutes} min` : ""}</p>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {v.address && <p><span className="text-muted-foreground">Endereço:</span> {v.address}</p>}
                  {v.therapeutic_plan && <p className="line-clamp-2"><span className="text-muted-foreground">Plano:</span> {v.therapeutic_plan}</p>}
                  {v.family_report && <p className="line-clamp-2"><span className="text-muted-foreground">Família:</span> {v.family_report}</p>}
                </CardContent>
              </Card>
            );
          })}
          {visits.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova visita domiciliar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <select className="w-full border rounded h-9 px-2" value={form.patient_id ?? ""} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}>
              <option value="">Selecione o paciente...</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <Input type="date" value={form.visit_date ?? ""} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
            <Input type="number" placeholder="Duração (min)" value={form.duration_minutes ?? ""} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
            <Input placeholder="Endereço" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Textarea placeholder="Plano terapêutico do dia" value={form.therapeutic_plan ?? ""} onChange={(e) => setForm({ ...form, therapeutic_plan: e.target.value })} />
            <Textarea placeholder="Relatório para a família" value={form.family_report ?? ""} onChange={(e) => setForm({ ...form, family_report: e.target.value })} />
            <Textarea placeholder="Observações" value={form.observations ?? ""} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
            <Button onClick={save} className="w-full">Salvar visita</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
