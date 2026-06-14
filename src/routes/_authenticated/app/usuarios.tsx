import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useRoles } from "@/lib/auth";
import { createAdminUser, listAdminUsers } from "@/lib/api/admin-users.functions";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/usuarios")({
  component: UsersPage,
});

type Form = { full_name: string; email: string; password: string };

function UsersPage() {
  const { user } = useAuth();
  const { isAdmin, loading } = useRoles(user?.id);
  const router = useRouter();
  const qc = useQueryClient();
  const listFn = useServerFn(listAdminUsers);
  const createFn = useServerFn(createAdminUser);

  const admins = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn({ data: undefined as any }),
    enabled: isAdmin,
  });

  const { register, handleSubmit, reset } = useForm<Form>();

  const create = useMutation({
    mutationFn: (v: Form) => createFn({ data: v }),
    onSuccess: () => {
      toast.success("Administradora criada com sucesso");
      reset({ full_name: "", email: "", password: "" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar usuária"),
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
        <h1 className="text-3xl">Usuários administrativos</h1>
        <p className="text-sm text-muted-foreground">Crie outras contas com acesso total ao sistema.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-medium">Nova administradora</h2>
        </div>
        <form onSubmit={handleSubmit((v) => create.mutate(v))} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome completo *">
              <Input required {...register("full_name")} />
            </Field>
            <Field label="E-mail *">
              <Input type="email" required {...register("email")} />
            </Field>
            <Field label="Senha provisória * (mín. 8 caracteres)" className="sm:col-span-2">
              <Input type="text" minLength={8} required {...register("password")} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Criando…" : "Criar administradora"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Administradoras atuais</h2>
        {admins.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (admins.data?.admins?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma administradora cadastrada.</p>
        ) : (
          <ul className="divide-y">
            {admins.data!.admins.map((a: any) => (
              <li key={a.user_id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.profiles?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{a.profiles?.email}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">admin</span>
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
