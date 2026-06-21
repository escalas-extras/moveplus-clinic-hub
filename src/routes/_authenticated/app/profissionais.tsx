import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/_authenticated/app/profissionais")({
  component: ProfPage,
});

type Form = { nome: string; profissao: string; conselho?: string; registro?: string; especialidade?: string; situacao: "ativo" | "inativo" };

async function resolveActiveClinicId(): Promise<string | null> {
  const [{ data: supportCid }, { data: ownCid }] = await Promise.all([
    supabase.rpc("current_support_session_clinic"),
    supabase.rpc("current_clinic_id"),
  ]);
  return (supportCid as string | null) ?? (ownCid as string | null) ?? null;
}

function ProfPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: activeClinicId } = useQuery({
    queryKey: ["active-clinic-id", user?.id],
    enabled: !!user?.id,
    queryFn: resolveActiveClinicId,
  });

  const list = useQuery({
    queryKey: ["professionals", activeClinicId],
    enabled: !!activeClinicId,
    queryFn: async () =>
      (await supabase.from("professionals").select("*").eq("clinic_id", activeClinicId!).order("nome")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (v: Form) => {
      if (!activeClinicId) throw new Error("Clínica ativa não identificada");
      const { error } = await supabase.from("professionals").insert({ ...v, clinic_id: activeClinicId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profissional cadastrado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["professionals"] });
      qc.invalidateQueries({ queryKey: ["my-professional"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl">Profissionais</h1><p className="text-sm text-muted-foreground">Equipe da clínica</p></div>
        <NewDialog open={open} setOpen={setOpen} create={create} />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60"><tr className="text-left"><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Profissão</th><th className="px-4 py-3">Conselho</th><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Situação</th></tr></thead>
          <tbody className="divide-y">
            {list.data?.map((p: any) => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium">{p.nome}</td>
                <td className="px-4 py-2">{p.profissao}</td>
                <td className="px-4 py-2">{p.conselho ?? "—"}</td>
                <td className="px-4 py-2">{p.registro ?? "—"}</td>
                <td className="px-4 py-2">{p.situacao}</td>
              </tr>
            ))}
            {list.data && list.data.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum profissional cadastrado nesta clínica. Cadastre um profissional responsável para emitir documentos clínicos.
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function NewDialog({ open, setOpen, create }: any) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form>({ defaultValues: { situacao: "ativo", profissao: "Fisioterapeuta" } });
  const situacao = watch("situacao");

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo profissional</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo profissional</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-3">
          <div><Label className="text-xs uppercase">Nome</Label><Input required {...register("nome")} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs uppercase">Profissão</Label><Input required {...register("profissao")} /></div>
            <div><Label className="text-xs uppercase">Especialidade</Label><Input {...register("especialidade")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs uppercase">Conselho</Label><Input placeholder="CREFITO-8" {...register("conselho")} /></div>
            <div><Label className="text-xs uppercase">Registro</Label><Input required {...register("registro")} /></div>
          </div>
          <div>
            <Label className="text-xs uppercase">Situação</Label>
            <Select value={situacao} onValueChange={(v) => setValue("situacao", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex justify-end"><Button type="submit" disabled={create.isPending}>Salvar</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
