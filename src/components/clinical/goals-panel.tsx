import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { useRoles, useAuth } from "@/lib/auth";

const TERMS = [
  { value: "curto", label: "Curto prazo" },
  { value: "medio", label: "Médio prazo" },
  { value: "longo", label: "Longo prazo" },
];
const STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "atingido", label: "Atingido" },
  { value: "nao_atingido", label: "Não atingido" },
  { value: "cancelado", label: "Cancelado" },
];

export function GoalsPanel({ patientId, assessmentId }: { patientId: string; assessmentId?: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const [open, setOpen] = useState(false);

  const rows = useQuery({
    queryKey: ["goals", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_goals").select("*").eq("patient_id", patientId).order("term").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upd = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("assessment_goals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", patientId] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assessment_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Objetivo removido"); qc.invalidateQueries({ queryKey: ["goals", patientId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Objetivos Terapêuticos</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo objetivo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo objetivo</DialogTitle></DialogHeader>
            <GoalForm patientId={patientId} assessmentId={assessmentId} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["goals", patientId] }); }} />
          </DialogContent>
        </Dialog>
      </div>
      {rows.data?.length ? (
        <div className="space-y-2">
          {TERMS.map((t) => {
            const list = rows.data.filter((g: any) => g.term === t.value);
            if (!list.length) return null;
            return (
              <div key={t.value}>
                <div className="text-xs uppercase font-semibold text-muted-foreground mb-1">{t.label}</div>
                <div className="space-y-1">
                  {list.map((g: any) => (
                    <div key={g.id} className="border rounded-md p-2 flex items-center gap-2 flex-wrap text-sm">
                      <div className="flex-1 min-w-[200px]">
                        <div>{g.description}</div>
                        {g.target_date && <div className="text-xs text-muted-foreground">Meta: {fmtDate(g.target_date)}</div>}
                      </div>
                      <Input type="number" min={0} max={100} className="w-20 h-8" value={g.progress_pct}
                        onChange={(e) => upd.mutate({ id: g.id, patch: { progress_pct: Math.max(0, Math.min(100, Number(e.target.value))) } })} />
                      <Select value={g.status} onValueChange={(v) => upd.mutate({ id: g.id, patch: { status: v, achieved_at: v === "atingido" ? new Date().toISOString() : null } })}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => del.mutate(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : <p className="text-sm text-muted-foreground">Nenhum objetivo definido.</p>}
    </Card>
  );
}

function GoalForm({ patientId, assessmentId, onDone }: { patientId: string; assessmentId?: string; onDone: () => void }) {
  const [term, setTerm] = useState("curto");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error("Descrição obrigatória");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("assessment_goals").insert({
        patient_id: patientId, assessment_id: assessmentId ?? null,
        term: term as "curto" | "medio" | "longo", description: description.trim(), target_date: targetDate || null, created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Objetivo criado"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <Label>Prazo</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TERMS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data alvo</Label>
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Ex: Ganho de 20° em flexão de joelho direito" />
      </div>
      <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Criar objetivo"}</Button>
    </div>
  );
}
