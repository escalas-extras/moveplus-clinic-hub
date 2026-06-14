import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useRoles } from "@/lib/auth";
import { inviteUser, listAllUsers, resendInvite } from "@/lib/api/admin-users.functions";
import { ShieldCheck, MailPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/usuarios")({
  component: UsersPage,
});

type Form = { full_name: string; email: string; role: "admin" | "physiotherapist" };

const ROLE_LABEL: Record<"admin" | "physiotherapist", string> = {
  admin: "Administrador",
  physiotherapist: "Fisioterapeuta",
};

function UsersPage() {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoles(user?.id);
  const router = useRouter();
  const qc = useQueryClient();
  const listFn = useServerFn(listAllUsers);
  const inviteFn = useServerFn(inviteUser);
  const resendFn = useServerFn(resendInvite);

  const users = useQuery({
    queryKey: ["users-list"],
    queryFn: () => listFn({ data: undefined as any }),
    enabled: isAdmin,
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm<Form>({
    defaultValues: { full_name: "", email: "", role: "physiotherapist" },
  });
  const roleValue = watch("role");

  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/set-password` : "";

  const invite = useMutation({
    mutationFn: (v: Form) => inviteFn({ data: { ...v, redirect_to: redirectTo } }),
    onSuccess: () => {
      toast.success("Convite enviado por e-mail");
      reset({ full_name: "", email: "", role: "physiotherapist" });
      qc.invalidateQueries({ queryKey: ["users-list"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao enviar convite"),
  });

  const resend = useMutation({
    mutationFn: (user_id: string) => resendFn({ data: { user_id, redirect_to: redirectTo } }),
    onSuccess: () => toast.success("Convite reenviado"),
    onError: (e: any) => toast.error(e?.message ?? "Erro ao reenviar"),
  });

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p className="text-sm">Acesso restrito a administradores.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.navigate({ to: "/app" })}>Voltar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          O acesso é exclusivamente por convite. O novo usuário recebe um e-mail para confirmar a conta e definir a própria senha.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">Convidar novo usuário</h2>
        </div>
        <form onSubmit={handleSubmit((v) => invite.mutate(v))} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome completo *">
              <Input required {...register("full_name")} />
            </Field>
            <Field label="E-mail *">
              <Input type="email" required {...register("email")} />
            </Field>
            <Field label="Perfil *" className="sm:col-span-2">
              <Select value={roleValue} onValueChange={(v) => setValue("role", v as Form["role"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador — controle total</SelectItem>
                  <SelectItem value="physiotherapist">Fisioterapeuta — funcionalidades clínicas</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={invite.isPending}>
              <MailPlus className="h-4 w-4 mr-2" />
              {invite.isPending ? "Enviando…" : "Enviar convite"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Usuários cadastrados</h2>
        {users.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (users.data?.users?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
        ) : (
          <ul className="divide-y">
            {users.data!.users.map((u) => (
              <li key={u.user_id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium truncate">{u.profile?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.profile?.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      u.role === "admin" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {ROLE_LABEL[u.role]}
                  </span>
                  {u.confirmed ? (
                    <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      Confirmado
                    </span>
                  ) : (
                    <>
                      <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Convite pendente
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resend.mutate(u.user_id)}
                        disabled={resend.isPending}
                      >
                        <MailPlus className="h-4 w-4 mr-1" />
                        Reenviar
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
