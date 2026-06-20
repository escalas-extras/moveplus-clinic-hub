import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { MRC_GROUPS, MRC_LEVELS, classifyMRC, RISK_COLORS } from "@/lib/clinical-scales";
import { fmtDate } from "@/lib/format";

type SideScore = { d?: number; e?: number };

export function MRCPanel({ patientId, assessmentId }: { patientId: string; assessmentId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const rows = useQuery({
    queryKey: ["mrc", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_mrc").select("*").eq("patient_id", patientId).order("applied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Força Muscular (MRC)</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Avaliar força</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Escala MRC — Força muscular bilateral</DialogTitle></DialogHeader>
            <MRCForm patientId={patientId} assessmentId={assessmentId} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["mrc", patientId] }); }} />
          </DialogContent>
        </Dialog>
      </div>
      {rows.data?.length ? (
        <div className="space-y-2">
          {rows.data.map((r: any) => (
            <div key={r.id} className="border rounded-md p-3 text-sm">
              <div className="flex justify-between flex-wrap gap-2">
                <strong>{fmtDate(r.applied_at)}</strong>
                <span className="text-xs">D: <strong>{r.total_right ?? "-"}</strong> · E: <strong>{r.total_left ?? "-"}</strong></span>
              </div>
              {r.classification && <span className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-1 ${RISK_COLORS[((r.classification as string).includes("preservada") ? "baixo" : (r.classification as string).includes("leve") ? "moderado" : "alto") as keyof typeof RISK_COLORS]}`}>{r.classification}</span>}
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">Nenhuma avaliação de força registrada.</p>}
    </Card>
  );
}

function MRCForm({ patientId, assessmentId, onDone }: { patientId: string; assessmentId?: string; onDone: () => void }) {
  const [meas, setMeas] = useState<Record<string, SideScore>>({});

  const totals = useMemo(() => {
    let dSum = 0, eSum = 0, dN = 0, eN = 0;
    for (const v of Object.values(meas)) {
      if (typeof v.d === "number") { dSum += v.d; dN++; }
      if (typeof v.e === "number") { eSum += v.e; eN++; }
    }
    const avg = (dN + eN) > 0 ? (dSum + eSum) / (dN + eN) : 0;
    return { dSum, eSum, avg, cls: classifyMRC(avg) };
  }, [meas]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("assessment_mrc").insert({
        patient_id: patientId, assessment_id: assessmentId ?? null,
        measurements: meas, total_right: totals.dSum, total_left: totals.eSum,
        classification: totals.cls.label, created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("MRC registrada"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-muted text-xs">
            <tr><th className="text-left p-2">Grupo muscular</th><th className="p-2">Direita</th><th className="p-2">Esquerda</th></tr>
          </thead>
          <tbody>
            {MRC_GROUPS.map((g) => (
              <tr key={g.key} className="border-t">
                <td className="p-2">{g.label}</td>
                {(["d","e"] as const).map((side) => (
                  <td key={side} className="p-1">
                    <Select value={meas[g.key]?.[side]?.toString() ?? ""} onValueChange={(v) => setMeas((p) => ({ ...p, [g.key]: { ...p[g.key], [side]: Number(v) } }))}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{MRC_LEVELS.map((l) => <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center bg-muted rounded-md p-3 text-sm">
        <span>Total D: <strong>{totals.dSum}</strong> · Total E: <strong>{totals.eSum}</strong></span>
        <span className={`text-xs px-2 py-1 rounded-full border ${RISK_COLORS[totals.cls.risk]}`}>{totals.cls.label}</span>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">{save.isPending ? "Salvando…" : "Registrar"}</Button>
    </div>
  );
}
