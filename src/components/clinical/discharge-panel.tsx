import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, FileDown, Lock } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { downloadPdf } from "@/lib/pdf";
import { useActiveClinic } from "@/lib/active-clinic";
import { validateProfessionalForDoc } from "@/lib/professional-resolver";
import { SignaturePad } from "@/components/clinical/signature-pad";

const MOTIVOS = [
  "Objetivos terapêuticos alcançados",
  "Alta por melhora clínica",
  "Encaminhamento para outro profissional",
  "Pedido do paciente",
  "Abandono / faltas reiteradas",
  "Óbito",
  "Outros",
];

export function DischargePanel({ patientId, patient }: { patientId: string; patient: any }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { clinicId } = useActiveClinic();
  const [signing, setSigning] = useState<{ discharge: any; documentId: string } | null>(null);
  const [form, setForm] = useState({
    data_alta: new Date().toISOString().slice(0, 10),
    motivo: MOTIVOS[0],
    objetivos_alcancados: "",
    objetivos_pendentes: "",
    recomendacoes: "",
    plano_domiciliar: "",
    observacoes: "",
  });

  const discharges = useQuery({
    queryKey: ["discharges", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_discharges")
        .select("*, professionals(nome, conselho, registro, profissao)")
        .eq("patient_id", patientId)
        .order("data_alta", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const myProf = useQuery({
    queryKey: ["my-prof", clinicId, user?.id],
    enabled: !!user?.id && !!clinicId,
    queryFn: async () =>
      (await supabase
        .from("professionals")
        .select("id, nome, conselho, registro, profissao, situacao, profile_id")
        .eq("clinic_id", clinicId!)
        .eq("profile_id", user!.id)
        .maybeSingle()).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.motivo) throw new Error("Informe o motivo da alta");
      const validation = validateProfessionalForDoc((myProf.data ?? null) as any);
      if (validation.status !== "ok") throw new Error(validation.message);
      const { error } = await supabase.from("patient_discharges").insert({
        patient_id: patientId,
        professional_id: myProf.data?.id ?? null,
        ...form,
      });
      if (error) throw error;
      await supabase.from("patients").update({ data_alta: form.data_alta }).eq("clinic_id", clinicId!).eq("id", patientId);
    },
    onSuccess: () => {
      toast.success("Alta registrada");
      qc.invalidateQueries({ queryKey: ["discharges", clinicId, patientId] });
      qc.invalidateQueries({ queryKey: ["patient", clinicId, patientId] });
      qc.invalidateQueries({ queryKey: ["timeline", clinicId, patientId] });
      setForm({ ...form, objetivos_alcancados: "", objetivos_pendentes: "", recomendacoes: "", plano_domiciliar: "", observacoes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patient_discharges").update({ locked_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Alta assinada"); qc.invalidateQueries({ queryKey: ["discharges", clinicId, patientId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  async function ensureDischargeDocument(d: any) {
    if (!clinicId) throw new Error("Clínica ativa não identificada");
    const validation = validateProfessionalForDoc((d.professionals ?? myProf.data ?? null) as any);
    if (validation.status !== "ok") throw new Error(validation.message);
    const { data: existing, error: existingErr } = await supabase
      .from("clinical_documents")
      .select("id")
      .eq("patient_id", patientId)
      .eq("doc_type", "alta")
      .contains("content", { discharge_id: d.id })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing?.id) return existing.id as string;

    const { data, error } = await supabase
      .from("clinical_documents")
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        professional_id: d.professional_id ?? myProf.data?.id ?? null,
        doc_type: "alta",
        title: "Relatório de Alta Fisioterapêutica",
        content: { discharge_id: d.id, source: "patient_discharges" },
      } as any)
      .select("id")
      .single();
    if (error) throw error;
    return (data as any).id as string;
  }

  function buildPdfOpts(d: any) {
    return {
      title: "Relatório de Alta Fisioterapêutica",
      subtitle: `Emitido em ${fmtDate(d.data_alta)}`,
      patientName: patient?.nome_completo,
      professional: d.professionals,
      validationHash: d.validation_hash,
      blocks: [
        {
          title: "1. Identificação",
          children: [{
            kind: "grid" as const,
            rows: [
              ["Paciente", patient?.nome_completo ?? "—"],
              ["Data da alta", fmtDate(d.data_alta)],
              ["Profissional", d.professionals?.nome ?? "—"],
              ["Motivo da alta", d.motivo ?? "—"],
            ],
          }],
        },
        {
          title: "2. Objetivos terapêuticos",
          children: [
            { kind: "highlight" as const, label: "Objetivos alcançados", text: d.objetivos_alcancados || "—" },
            { kind: "highlight" as const, label: "Objetivos pendentes", text: d.objetivos_pendentes || "—" },
          ],
        },
        {
          title: "3. Recomendações e plano domiciliar",
          children: [
            { kind: "paragraph" as const, label: "Recomendações", text: d.recomendacoes || "—" },
            { kind: "paragraph" as const, label: "Plano domiciliar", text: d.plano_domiciliar || "—" },
            ...(d.observacoes ? [{ kind: "paragraph" as const, label: "Observações", text: d.observacoes }] : []),
          ],
        },
      ],
    };
  }

  return (
    <div className="space-y-4">
      {patient?.data_alta && (
        <Card className="p-4 border-l-4 border-orange-500 bg-orange-50/40">
          <div className="text-sm">
            <b>Paciente em alta</b> desde {fmtDate(patient.data_alta)}.
          </div>
        </Card>
      )}

      {!patient?.data_alta && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold">Registrar nova alta</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Data da alta</Label>
              <Input type="date" value={form.data_alta} onChange={(e) => setForm({ ...form, data_alta: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Motivo</Label>
              <Select value={form.motivo} onValueChange={(v) => setForm({ ...form, motivo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldText label="Objetivos alcançados" value={form.objetivos_alcancados} onChange={(v) => setForm({ ...form, objetivos_alcancados: v })} />
            <FieldText label="Objetivos pendentes" value={form.objetivos_pendentes} onChange={(v) => setForm({ ...form, objetivos_pendentes: v })} />
            <FieldText label="Recomendações" value={form.recomendacoes} onChange={(v) => setForm({ ...form, recomendacoes: v })} />
            <FieldText label="Plano domiciliar" value={form.plano_domiciliar} onChange={(v) => setForm({ ...form, plano_domiciliar: v })} />
          </div>
          <FieldText label="Observações" value={form.observacoes} onChange={(v) => setForm({ ...form, observacoes: v })} />
          <div className="flex justify-end">
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? "Salvando…" : "Registrar alta"}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Histórico de altas</h3>
        {!discharges.data?.length && <Card className="p-4 text-sm text-muted-foreground">Nenhuma alta registrada.</Card>}
        {discharges.data?.map((d: any) => (
          <Card key={d.id} className="p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-medium">{fmtDate(d.data_alta)} — {d.motivo}</div>
                <div className="text-xs text-muted-foreground">{d.professionals?.nome}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => {
                  const missing: string[] = [];
                  if (!patient?.nome_completo) missing.push("paciente");
                  if (!d.professionals?.nome) missing.push("profissional responsável");
                  if (!d.data_alta) missing.push("data da alta");
                  if (!d.motivo) missing.push("motivo da alta");
                  if (!d.recomendacoes) missing.push("recomendações");
                  if (!d.plano_domiciliar) missing.push("plano domiciliar / orientação pós-alta");
                  if (missing.length) {
                    toast.error(`Este documento ainda não possui dados suficientes para emissão. Faltam: ${missing.join(", ")}.`);
                    return;
                  }
                  downloadPdf(buildPdfOpts(d));
                }}>
                  <FileDown className="h-4 w-4 mr-1" />Relatório
                </Button>
                {!d.locked_at && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      const documentId = await ensureDischargeDocument(d);
                      setSigning({ discharge: d, documentId });
                    } catch (e: any) {
                      toast.error(e.message);
                    }
                  }}>
                    <Lock className="h-4 w-4 mr-1" />Assinar
                  </Button>
                )}
                {d.locked_at && <span className="text-xs text-muted-foreground self-center">Assinada</span>}
              </div>
            </div>
            {d.objetivos_alcancados && <p className="text-sm mt-3"><b>Alcançado:</b> {d.objetivos_alcancados}</p>}
            {d.plano_domiciliar && <p className="text-sm mt-1"><b>Plano domiciliar:</b> {d.plano_domiciliar}</p>}
            {signing?.discharge.id === d.id && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Assinatura profissional da alta</h4>
                <SignaturePad
                  patientId={patientId}
                  documentId={signing.documentId}
                  defaultRole="profissional"
                  lockRole
                  defaultName={d.professionals?.nome ?? myProf.data?.nome ?? ""}
                  onSigned={() => {
                    lock.mutate(d.id);
                    setSigning(null);
                  }}
                />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function FieldText({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
