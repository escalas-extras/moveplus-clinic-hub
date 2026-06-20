import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Ruler } from "lucide-react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

const REGIONS = ["ombro","cotovelo","punho","quadril","joelho","tornozelo","cervical","toracica","lombar"];

export function GoniometryPanel({ patientId, assessmentId }: { patientId: string; assessmentId?: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const rows = useQuery({
    queryKey: ["gonio", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_goniometry").select("*").eq("patient_id", patientId).order("applied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold flex items-center gap-2"><Ruler className="h-4 w-4" /> Goniometria</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova goniometria</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Goniometria — Avaliação bilateral</DialogTitle></DialogHeader>
            <GoniometryForm patientId={patientId} assessmentId={assessmentId} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["gonio", patientId] }); }} />
          </DialogContent>
        </Dialog>
      </div>
      {rows.data?.length ? (
        <div className="space-y-2 text-sm">
          {rows.data.map((r: any) => (
            <details key={r.id} className="border rounded-md p-3">
              <summary className="cursor-pointer font-medium">{fmtDate(r.applied_at)} — {Object.keys(r.measurements ?? {}).length} medições</summary>
              <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(r.measurements ?? {}).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between border-b py-1"><span>{k}</span><span>D: {v.d ?? "-"}° · E: {v.e ?? "-"}°</span></div>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">Nenhuma goniometria registrada.</p>}
    </Card>
  );
}

function GoniometryForm({ patientId, assessmentId, onDone }: { patientId: string; assessmentId?: string; onDone: () => void }) {
  const [region, setRegion] = useState("ombro");
  const [meas, setMeas] = useState<Record<string, { d?: number; e?: number }>>({});

  const norms = useQuery({
    queryKey: ["norms", region],
    queryFn: async () => {
      const { data, error } = await supabase.from("normative_rom").select("*").eq("region", region).order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("assessment_goniometry").insert({
        patient_id: patientId, assessment_id: assessmentId ?? null,
        measurements: meas, created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Goniometria registrada"); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Região</Label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-muted text-xs">
            <tr><th className="text-left p-2">Movimento</th><th className="p-2">Normal</th><th className="p-2">D (°)</th><th className="p-2">E (°)</th></tr>
          </thead>
          <tbody>
            {(norms.data ?? []).map((n: any) => {
              const k = `${region}_${n.movement_key}`;
              return (
                <tr key={k} className="border-t">
                  <td className="p-2">{n.movement_label}</td>
                  <td className="p-2 text-xs text-muted-foreground">{n.normal_min}–{n.normal_max}°</td>
                  {(["d","e"] as const).map((side) => (
                    <td key={side} className="p-1">
                      <Input type="number" className="h-8 w-20" value={meas[k]?.[side] ?? ""}
                        onChange={(e) => setMeas((p) => ({ ...p, [k]: { ...p[k], [side]: e.target.value === "" ? undefined : Number(e.target.value) } }))} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">{save.isPending ? "Salvando…" : "Registrar"}</Button>
    </div>
  );
}
