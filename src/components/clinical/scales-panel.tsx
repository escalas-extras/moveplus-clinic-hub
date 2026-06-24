import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Activity } from "lucide-react";
import { toast } from "sonner";
import { SCALES, computeScale, getScaleCompletion, RISK_COLORS, type ScaleType } from "@/lib/clinical-scales";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { fmtDate } from "@/lib/format";

export function ScalesPanel({ patientId, assessmentId, requireAssessment = false }: { patientId: string; assessmentId?: string; requireAssessment?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeScale, setActiveScale] = useState<ScaleType>("barthel");

  const rows = useQuery({
    queryKey: ["scales", patientId, assessmentId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("assessment_scales")
        .select("*")
        .eq("patient_id", patientId);
      if (assessmentId) q = q.eq("assessment_id", assessmentId);
      const { data, error } = await q.order("applied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4" /> Escalas Funcionais</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" disabled={requireAssessment && !assessmentId}><Plus className="h-4 w-4 mr-1" />Aplicar escala</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Aplicar Escala</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Escala</Label>
                <Select value={activeScale} onValueChange={(v) => setActiveScale(v as ScaleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(SCALES).map((s) => <SelectItem key={s.type} value={s.type}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{SCALES[activeScale].description}</p>
              </div>
              <ScaleForm
                scaleType={activeScale}
                patientId={patientId}
                assessmentId={assessmentId}
                requireAssessment={requireAssessment}
                onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["scales", patientId] }); }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rows.data?.length ? (
        <>
          <ScalesCharts items={rows.data} />
          <div className="grid sm:grid-cols-2 gap-2">
            {rows.data.map((r: any) => (
              <div key={r.id} className="border rounded-md p-3 text-sm">
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
        <p className="text-sm text-muted-foreground">
          {requireAssessment && !assessmentId ? "Salve a avaliação antes de aplicar escalas." : "Nenhuma escala aplicada ainda."}
        </p>
      )}
    </Card>
  );
}

function ScaleForm({ scaleType, patientId, assessmentId, requireAssessment, onDone }: { scaleType: ScaleType; patientId: string; assessmentId?: string; requireAssessment?: boolean; onDone: () => void }) {
  const cfg = SCALES[scaleType];
  const [items, setItems] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const completion = useMemo(() => getScaleCompletion(scaleType, items), [scaleType, items]);
  const result = useMemo(() => computeScale(scaleType, items), [scaleType, items]);

  const save = useMutation({
    mutationFn: async () => {
      if (requireAssessment && !assessmentId) throw new Error("Salve a avaliação antes de aplicar escalas.");
      if (!completion.complete) throw new Error("Preencha todos os itens da escala antes de registrar.");
      const { data: u } = await supabase.auth.getUser();
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
    <div className="space-y-3">
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
        {cfg.items.map((it) => (
          <div key={it.key} className="grid sm:grid-cols-2 gap-2 items-center">
            <Label className="text-sm">{it.label}</Label>
            {it.kind === "numeric" ? (
              <div className="flex items-center gap-2">
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
                {it.unit ? <span className="text-xs text-muted-foreground">{it.unit}</span> : null}
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
      <div>
        <Label>Observações</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
      <div className="text-xs text-muted-foreground">
        {completion.answered} de {completion.total} itens respondidos
      </div>
      <div className="flex items-center justify-between bg-muted p-3 rounded-md">
        <div>
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{completion.complete ? `${result.total} / ${result.maxScore}` : "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Classificação</div>
          {completion.complete ? (
            <span className={`inline-block text-xs px-2 py-1 rounded-full border ${RISK_COLORS[result.risk]}`}>{result.classification}</span>
          ) : (
            <span className="inline-block text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground">Preenchimento incompleto</span>
          )}
        </div>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending || !completion.complete} className="w-full">
        {save.isPending ? "Salvando…" : "Registrar aplicação"}
      </Button>
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
