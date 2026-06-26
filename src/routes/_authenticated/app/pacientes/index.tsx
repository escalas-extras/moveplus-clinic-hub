import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Trash2, Eye, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { PatientForm, type PatientInput } from "@/components/patient-form";
import { calcAge, fmtDate } from "@/lib/format";
import { useAuth, useRoles } from "@/lib/auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { safeDeletePatient } from "@/lib/patient-delete";

export const Route = createFileRoute("/_authenticated/app/pacientes/")({
  component: PacientesPage,
});

function PacientesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/app/pacientes" });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const { data: activeClinicId } = useQuery({
    queryKey: ["active-clinic-id", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: supportCid }, { data: ownCid }] = await Promise.all([
        supabase.rpc("current_support_session_clinic"),
        supabase.rpc("current_clinic_id"),
      ]);
      return ((supportCid as string | null) ?? (ownCid as string | null) ?? null);
    },
  });

  const list = useQuery({
    queryKey: ["patients", activeClinicId, q],
    enabled: !!activeClinicId,
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select("*")
        .eq("clinic_id", activeClinicId!)
        .eq("situacao", "ativo")
        .order("nome_completo");
      if (q) query = query.ilike("nome_completo", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (input: PatientInput) => {
      if (!activeClinicId) throw new Error("Clínica ativa não identificada");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("patients").insert({ ...input, clinic_id: activeClinicId, created_by: u.user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente cadastrado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!activeClinicId) throw new Error("Clínica ativa não identificada");
      return safeDeletePatient({ clinicId: activeClinicId, patientId: id });
    },
    onSuccess: (res) => {
      toast.success(
        res.action === "deleted"
          ? "Paciente excluído"
          : "Paciente inativado (histórico clínico preservado)",
      );
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Pacientes</h1>
          <p className="text-sm text-muted-foreground">Cadastros e prontuários</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo paciente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo paciente</DialogTitle></DialogHeader>
            <PatientForm onSubmit={(v) => create.mutate(v)} submitting={create.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {list.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : !list.data?.length ? (
          <EmptyState
            icon={Users}
            title={q ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
            description={
              q
                ? "Tente outro nome ou limpe a busca para ver toda a lista."
                : "Comece cadastrando seu primeiro paciente para abrir prontuários, gerar documentos e agendar atendimentos."
            }
            action={!q ? { label: "Cadastrar primeiro paciente", onClick: () => setOpen(true) } : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">CPF</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Idade</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Telefone</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium w-10 text-center">Abrir</th>
                {isAdmin && <th className="px-4 py-3 font-medium w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.data.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-muted/40 cursor-pointer"
                  onClick={() => navigate({ to: "/app/pacientes/$id", params: { id: p.id } })}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{p.nome_completo}</span>
                    <div className="text-xs text-muted-foreground md:hidden">{p.cpf ?? "Sem CPF"}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell tabular-nums">{p.cpf ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{calcAge(p.data_nascimento) ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{p.telefone ?? p.whatsapp ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-xs " + (p.situacao === "ativo" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground")}>
                      {p.situacao}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Abrir prontuário"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: "/app/pacientes/$id", params: { id: p.id } });
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="Excluir paciente"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir {p.nome_completo}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se o paciente possuir histórico clínico, financeiro ou de agenda, ele será <strong>inativado</strong> (dados preservados). Caso contrário, será excluído definitivamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// helper not used but exporting for typing
export { fmtDate };
