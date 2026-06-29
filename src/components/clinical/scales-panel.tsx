import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Activity } from "lucide-react";
import { toast } from "sonner";
import { SCALES, computeScale, RISK_COLORS, type ScaleType } from "@/lib/clinical-scales";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { fmtDate } from "@/lib/format";
import {
  ClinicalDialogBody,
  ClinicalDialogContent,
  ClinicalDialogFooter,
  ClinicalDialogHeader,
  ClinicalDialogTitle,
  ClinicalField,
} from "@/components/layout";
import { useActiveClinic } from "@/lib/active-clinic";

export function ScalesPanel({ patientId, assessmentId }: { patientId: string; assessmentId?: string }) {
  const qc = useQueryClient();
  const { clinicId, supportMode } = useActiveClinic();
  const [open, setOpen] = useState(false);
  const [activeScale, setActiveScale] = useState<ScaleType>("barthel");

  const rows = useQuery({
    queryKey: ["scales", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_scales").select("*, patients!inner(clinic_id)").eq("patient_id", patientId).eq("patients.clinic_id", clinicId!)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4" /> Escalas Funcionais</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Aplicar escala</Button></DialogTrigger>
          <ClinicalDialogContent>
            <ClinicalDialogHeader>
              <ClinicalDialogTitle>Aplicar escala</ClinicalDialogTitle>
            </ClinicalDialogHeader>
            <ClinicalDialogBody className="space-y-5">
              <ClinicalField label="Escala">
                <Select value={activeScale} onValueChange={(v) => setActiveScale(v as ScaleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(SCALES).map((s) => <SelectItem key={s.type} value={s.type}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </ClinicalField>
              <p className="text-sm leading-relaxed text-slate-600">{SCALES[activeScale].description}</p>
              <ScaleForm
                scaleType={activeScale}
                patientId={patientId}
                assessmentId={assessmentId}
                clinicId={clinicId}
                supportMode={supportMode}
                onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["scales", clinicId, patientId] }); }}
              />
            </ClinicalDialogBody>
          </ClinicalDialogContent>
        </Dialog>
      </div>

      {rows.data?.length ? (
        <>
          <ScalesCharts items={rows.data} />
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.data.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-[rgba(15,76,92,0.12)] bg-white p-4 text-sm shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <strong>{SCALES[r.scale_type as ScaleType]?.title ?? r.scale_type}</strong>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.applied_at)}</span>
                </div>
                <div className="text-lg font-bold">{r.total_score}<span className="text-xs text-muted-foreground"> / {SCALES[r.scale_type as ScaleType]?.maxScore}</span></div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${RISK_COLORS[r.risk_level as keyof typeof RISK_COLORS] ?? ""}`}>
                    {r.classification}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma escala aplicada ainda.</p>
      )}
    </Card>
  );
}

function ScaleForm({ scaleType, patientId, assessmentId, clinicId, supportMode, onDone }: { scaleType: ScaleType; patientId: string; assessmentId?: string; clinicId: string | null; supportMode: boolean; onDone: () => void }) {
  const cfg = SCALES[scaleType];
  const [items, setItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const result = useMemo(() => computeScale(scaleType, items), [scaleType, items]);

  const save = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      const { data: u } = await supabase.auth.getUser();
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("id", patientId)
        .maybeSingle();
      if (!patient) throw new Error("Paciente não pertence à clínica ativa.");
      const { error } = await supabase.from("assessment_scales").insert({
        patient_id: patientId, assessment_id: assessmentId ?? null,
        scale_type: scaleType as any, items,
        total_score: result.total, classification: result.classification, risk_level: result.risk,
        notes: notes || null, created_by: u.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Escala registrada"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="max-h-[min(52vh,520px)] space-y-4 overflow-y-auto pr-1">
        {cfg.items.map((it) => (
          <div key={it.key} className="fos-scale-form-row">
            <Label className="fos-scale-form-label text-sm font-medium leading-snug text-slate-700">{it.label}</Label>
            {it.kind === "numeric" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={it.min}
                  max={it.max}
                  step={it.step ?? 1}
                  value={items[it.key] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItems((p) => {
                      const next = { ...p };
                      if (v === "") delete next[it.key];
                      else next[it.key] = Number(v);
                      return next;
                    });
                  }}
                />
                {it.unit ? <span className="text-xs text-slate-500">{it.unit}</span> : null}
              </div>
            ) : (
              <Select value={items[it.key]?.toString() ?? ""} onValueChange={(v) => setItems((p) => ({ ...p, [it.key]: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {(it.options ?? []).map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
      <ClinicalField label="Observações" optional>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </ClinicalField>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[rgba(15,76,92,0.12)] bg-[#f4f7f9] p-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</div>
          <div className="text-2xl font-bold tabular-nums text-slate-950">{result.total} / {result.maxScore}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Classificação</div>
          <span className={`mt-1 inline-block rounded-full border px-2.5 py-1 text-xs font-semibold ${RISK_COLORS[result.risk]}`}>{result.classification}</span>
        </div>
      </div>
      <ClinicalDialogFooter className="border-0 bg-transparent px-0 py-0">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full sm:w-auto">
          {save.isPending ? "Salvando…" : "Registrar aplicação"}
        </Button>
      </ClinicalDialogFooter>
    </div>
  );
}

function ScalesCharts({ items }: { items: any[] }) {
  const grouped = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const it of items) {
      (m[it.scale_type] ??= []).push({ date: it.applied_at.slice(0,10), score: Number(it.total_score) });
    }
    return Object.entries(m).map(([k, v]) => ({ type: k as ScaleType, data: v.slice().reverse() })).filter((g) => g.data.length > 1);
  }, [items]);

  if (!grouped.length) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      {grouped.map((g) => (
        <div key={g.type} className="border rounded-md p-3">
          <div className="text-xs font-medium mb-1">{SCALES[g.type].title} — evolução</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={g.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis domain={[0, SCALES[g.type].maxScore]} fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#2f5d3a" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
