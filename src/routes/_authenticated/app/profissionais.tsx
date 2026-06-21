import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/_authenticated/app/profissionais")({
  component: ProfPage,
});

type Form = {
  nome: string;
  profissao: string;
  conselho?: string;
  registro?: string;
  especialidade?: string;
  telefone?: string;
  email?: string;
  profile_id?: string | null;
  situacao: "ativo" | "inativo";
};

async function resolveActiveClinicId(): Promise<string | null> {
  const [{ data: supportCid }, { data: ownCid }] = await Promise.all([
    supabase.rpc("current_support_session_clinic"),
    supabase.rpc("current_clinic_id"),
  ]);
  return (supportCid as string | null) ?? (ownCid as string | null) ?? null;
}

const UNLINKED = "__unlinked__";

function ProfPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: activeClinicId } = useQuery({
    queryKey: ["active-clinic-id", user?.id],
    enabled: !!user?.id,
    queryFn: resolveActiveClinicId,
  });

  const list = useQuery({
    queryKey: ["professionals", activeClinicId],
    enabled: !!activeClinicId,
    queryFn: async () =>
      (
        await supabase
          .from("professionals")
          .select("*")
          .eq("clinic_id", activeClinicId!)
          .order("nome")
      ).data ?? [],
  });

  // Usuários da clínica (para vincular)
  const clinicUsers = useQuery({
    queryKey: ["clinic-users", activeClinicId],
    enabled: !!activeClinicId,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("user_id, role")
        .eq("clinic_id", activeClinicId!)
        .eq("active", true);
      const ids = (members ?? []).map((m: any) => m.user_id);
      if (ids.length === 0) return [] as Array<{ id: string; email: string; full_name: string; role: string }>;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (members ?? []).map((m: any) => {
        const p = byId.get(m.user_id) as any;
        return {
          id: m.user_id,
          email: p?.email ?? "",
          full_name: p?.full_name ?? p?.email ?? "—",
          role: m.role,
        };
      });
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["professionals"] });
    qc.invalidateQueries({ queryKey: ["my-professional"] });
  };

  const create = useMutation({
    mutationFn: async (v: Form) => {
      if (!activeClinicId) throw new Error("Clínica ativa não identificada");
      const payload: any = { ...v, clinic_id: activeClinicId };
      if (!payload.profile_id) delete payload.profile_id;
      const { error } = await supabase.from("professionals").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profissional cadastrado");
      setOpenNew(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Form }) => {
      if (!activeClinicId) throw new Error("Clínica ativa não identificada");
      // Whitelist somente colunas reais da tabela
      const payload: Record<string, any> = {
        nome: values.nome,
        profissao: values.profissao,
        conselho: values.conselho || null,
        registro: values.registro || null,
        especialidade: values.especialidade || null,
        telefone: values.telefone || null,
        email: values.email || null,
        profile_id: values.profile_id ? values.profile_id : null,
        situacao: values.situacao,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("professionals")
        .update(payload)
        .eq("id", id)
        .eq("clinic_id", activeClinicId)
        .select("id");
      if (error) {
        if (error.code === "23505") {
          throw new Error("Este usuário já está vinculado a outro profissional desta clínica.");
        }
        if (error.code === "42501" || /permission|policy|RLS/i.test(error.message)) {
          throw new Error("Você não tem permissão para editar profissionais desta clínica.");
        }
        throw new Error(error.message || "Falha ao salvar profissional.");
      }
      if (!data || data.length === 0) {
        throw new Error(
          "Nenhum registro foi atualizado. Verifique se você é owner/admin desta clínica e se não está em modo Suporte.",
        );
      }
    },
    onSuccess: () => {
      toast.success("Profissional atualizado");
      setEditing(null);
      invalidate();
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao salvar profissional");
      // Não fecha o modal — usuário pode corrigir e tentar novamente
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">Profissionais</h1>
          <p className="text-sm text-muted-foreground">Equipe da clínica</p>
        </div>
        <ProfDialog
          open={openNew}
          setOpen={setOpenNew}
          title="Novo profissional"
          users={clinicUsers.data ?? []}
          professionals={list.data ?? []}
          onSubmit={(v) => create.mutate(v)}
          isPending={create.isPending}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo profissional
            </Button>
          }
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Profissão</th>
              <th className="px-4 py-3">Conselho</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Vínculo</th>
              <th className="px-4 py-3">Situação</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.data?.map((p: any) => {
              const linked = (clinicUsers.data ?? []).find((u) => u.id === p.profile_id);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-medium">{p.nome}</td>
                  <td className="px-4 py-2">{p.profissao}</td>
                  <td className="px-4 py-2">{p.conselho ?? "—"}</td>
                  <td className="px-4 py-2">{p.registro ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {linked ? linked.email : "—"}
                  </td>
                  <td className="px-4 py-2">{p.situacao}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  </td>
                </tr>
              );
            })}
            {list.data && list.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum profissional cadastrado nesta clínica. Cadastre um profissional responsável
                  para emitir documentos clínicos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {editing && (
        <ProfDialog
          open={!!editing}
          setOpen={(o) => !o && setEditing(null)}
          title={`Editar profissional — ${editing.nome}`}
          users={clinicUsers.data ?? []}
          professionals={list.data ?? []}
          initial={editing}
          editingId={editing.id}
          onSubmit={(v) => update.mutate({ id: editing.id, values: v })}
          isPending={update.isPending}
        />
      )}
    </div>
  );
}

function ProfDialog({
  open,
  setOpen,
  title,
  users,
  professionals,
  initial,
  editingId,
  onSubmit,
  isPending,
  trigger,
}: {
  open: boolean;
  setOpen: (o: boolean) => void;
  title: string;
  users: Array<{ id: string; email: string; full_name: string; role: string }>;
  professionals: any[];
  initial?: any;
  editingId?: string;
  onSubmit: (v: Form) => void;
  isPending: boolean;
  trigger?: React.ReactNode;
}) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Form>({
    defaultValues: {
      situacao: "ativo",
      profissao: "Fisioterapeuta",
      profile_id: null,
    },
  });
  const situacao = watch("situacao");
  const profileId = watch("profile_id");

  useEffect(() => {
    if (open) {
      reset({
        nome: initial?.nome ?? "",
        profissao: initial?.profissao ?? "Fisioterapeuta",
        especialidade: initial?.especialidade ?? "",
        conselho: initial?.conselho ?? "",
        registro: initial?.registro ?? "",
        telefone: initial?.telefone ?? "",
        email: initial?.email ?? "",
        profile_id: initial?.profile_id ?? null,
        situacao: (initial?.situacao as any) ?? "ativo",
      });
    }
  }, [open, initial, reset]);

  // usuários disponíveis: ou não vinculados a outro profissional, ou já vinculados ao editando
  const takenIds = new Set(
    professionals
      .filter((p) => p.id !== editingId && p.profile_id)
      .map((p) => p.profile_id),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) => {
            const payload: Form = {
              ...v,
              profile_id: v.profile_id ? v.profile_id : null,
            };
            onSubmit(payload);
          })}
          className="space-y-3"
        >
          <div>
            <Label className="text-xs uppercase">Nome</Label>
            <Input required {...register("nome")} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Profissão</Label>
              <Input required {...register("profissao")} />
            </div>
            <div>
              <Label className="text-xs uppercase">Especialidade</Label>
              <Input {...register("especialidade")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Conselho</Label>
              <Input placeholder="CREFITO-8" {...register("conselho")} />
            </div>
            <div>
              <Label className="text-xs uppercase">Registro</Label>
              <Input {...register("registro")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs uppercase">Telefone</Label>
              <Input {...register("telefone")} />
            </div>
            <div>
              <Label className="text-xs uppercase">E-mail</Label>
              <Input type="email" {...register("email")} />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase">Vínculo com usuário da clínica</Label>
            <Select
              value={profileId ?? UNLINKED}
              onValueChange={(v) => setValue("profile_id", v === UNLINKED ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNLINKED}>— Sem vínculo —</SelectItem>
                {users.map((u) => {
                  const disabled = takenIds.has(u.id);
                  return (
                    <SelectItem key={u.id} value={u.id} disabled={disabled}>
                      {u.full_name} ({u.email}) {disabled ? "• já vinculado" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Apenas usuários ativos desta clínica. Cada usuário pode estar vinculado a apenas um
              profissional.
            </p>
          </div>
          <div>
            <Label className="text-xs uppercase">Situação</Label>
            <Select value={situacao} onValueChange={(v) => setValue("situacao", v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
