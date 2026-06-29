import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eraser, Pen, Trash2 } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { useAuth, useRoles } from "@/lib/auth";
import { useActiveClinic } from "@/lib/active-clinic";

type Role = "paciente" | "responsavel" | "profissional";

export function SignaturePad({ patientId, documentId, assessmentId }: { patientId: string; documentId?: string; assessmentId?: string }) {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [role, setRole] = useState<Role>("profissional");
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const { clinicId, supportMode } = useActiveClinic();

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
  }, []);

  const list = useQuery({
    queryKey: ["sigs", clinicId, patientId, documentId, assessmentId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      let q = supabase.from("clinical_signatures").select("*, patients!inner(clinic_id)").eq("patient_id", patientId).eq("patients.clinic_id", clinicId!);
      if (documentId) q = q.eq("document_id", documentId);
      else if (assessmentId) q = q.eq("assessment_id", assessmentId);
      const { data, error } = await q.order("signed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function start(e: React.PointerEvent) {
    e.preventDefault(); drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!; const p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function end() { drawing.current = false; }
  function clear() { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0,0,c.width,c.height); }

  const save = useMutation({
    mutationFn: async () => {
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      if (!name.trim()) throw new Error("Nome obrigatório");
      const c = canvasRef.current!;
      const empty = !c.getContext("2d")!.getImageData(0,0,c.width,c.height).data.some((v, i) => i % 4 === 3 && v !== 0);
      if (empty) throw new Error("Desenhe a assinatura");
      const png = c.toDataURL("image/png");
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      const { data: patient } = await supabase.from("patients").select("id").eq("clinic_id", clinicId).eq("id", patientId).maybeSingle();
      if (!patient) throw new Error("Paciente não pertence à clínica ativa.");
      const { error } = await supabase.from("clinical_signatures").insert({
        patient_id: patientId, document_id: documentId ?? null, assessment_id: assessmentId ?? null,
        signer_role: role, signer_name: name.trim(), signer_document: doc || null,
        signature_png: png, user_agent: ua,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assinatura registrada"); clear(); setName(""); setDoc(""); qc.invalidateQueries({ queryKey: ["sigs", clinicId, patientId, documentId, assessmentId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      const { error } = await supabase.from("clinical_signatures").delete().eq("id", id).eq("patient_id", patientId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sigs", clinicId, patientId, documentId, assessmentId] }),
  });

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-2">
        <div>
          <Label>Papel</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paciente">Paciente</SelectItem>
              <SelectItem value="responsavel">Responsável</SelectItem>
              <SelectItem value="profissional">Profissional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>CPF/RG</Label>
          <Input value={doc} onChange={(e) => setDoc(e.target.value)} />
        </div>
      </div>
      <div className="border rounded-md bg-white">
        <canvas
          ref={canvasRef} width={600} height={180}
          className="w-full touch-none bg-white rounded-md"
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={clear}><Eraser className="h-4 w-4 mr-1" />Limpar</Button>
        <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}><Pen className="h-4 w-4 mr-1" />{save.isPending ? "Salvando…" : "Registrar assinatura"}</Button>
      </div>
      {list.data?.length ? (
        <div className="space-y-2 mt-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Assinaturas registradas</div>
          {list.data.map((s: any) => (
            <div key={s.id} className="border rounded-md p-2 flex items-center gap-3 text-sm">
              <img src={s.signature_png} alt="" className="h-12 border rounded bg-white" />
              <div className="flex-1">
                <div className="font-medium">{s.signer_name} <span className="text-xs text-muted-foreground">({s.signer_role})</span></div>
                <div className="text-xs text-muted-foreground">{fmtDate(s.signed_at)} {s.signer_document ? `· ${s.signer_document}` : ""}</div>
              </div>
              {isAdmin && <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
