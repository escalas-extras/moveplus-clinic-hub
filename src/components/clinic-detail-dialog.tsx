import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listClinicMembers,
  inviteClinicMember,
  resendClinicMemberInvite,
  setClinicMemberActive,
  changeClinicMemberRole,
  removeClinicMember,
  getClinicBranding,
  updateClinicBranding,
  startSupportSession,
} from "@/lib/api/clinic-ops.functions";
import { toast } from "sonner";
import { Trash2, RefreshCw, ShieldAlert, UserPlus, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

const LOGO_MAX = 5 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

async function signedLogoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from("clinic-logos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  profissional: "Profissional",
  recepcao: "Recepção",
  financeiro: "Financeiro",
};
const ROLES = ["owner", "admin", "profissional", "recepcao", "financeiro"] as const;

export function ClinicDetailDialog({
  clinic,
  open,
  onOpenChange,
}: {
  clinic: { id: string; nome: string; slug: string | null } | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  if (!clinic) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{clinic.nome}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="branding">Identidade Visual</TabsTrigger>
            <TabsTrigger value="support">Suporte</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4">
            <UsersPanel clinicId={clinic.id} />
          </TabsContent>
          <TabsContent value="branding" className="mt-4">
            <BrandingPanel clinicId={clinic.id} />
          </TabsContent>
          <TabsContent value="support" className="mt-4">
            <SupportPanel clinic={clinic} onStart={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ====================== Users
function UsersPanel({ clinicId }: { clinicId: string }) {
  const list = useServerFn(listClinicMembers);
  const invite = useServerFn(inviteClinicMember);
  const resend = useServerFn(resendClinicMemberInvite);
  const setActive = useServerFn(setClinicMemberActive);
  const changeRole = useServerFn(changeClinicMemberRole);
  const remove = useServerFn(removeClinicMember);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["clinic-members", clinicId],
    queryFn: () => list({ data: { clinic_id: clinicId } }),
  });
  const inv = () => qc.invalidateQueries({ queryKey: ["clinic-members", clinicId] });

  const inviteMut = useMutation({
    mutationFn: (v: { email: string; full_name: string; role: any }) =>
      invite({
        data: {
          clinic_id: clinicId,
          email: v.email,
          full_name: v.full_name,
          role: v.role,
          redirect_to: window.location.origin + "/set-password",
        },
      }),
    onSuccess: () => {
      toast.success("Convite enviado");
      inv();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const resendMut = useMutation({
    mutationFn: (user_id: string) =>
      resend({
        data: {
          user_id,
          clinic_id: clinicId,
          redirect_to: window.location.origin + "/set-password",
        },
      }),
    onSuccess: () => toast.success("Convite reenviado"),
    onError: (e: any) => toast.error(e.message),
  });
  const activeMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => setActive({ data: v }),
    onSuccess: inv,
    onError: (e: any) => toast.error(e.message),
  });
  const roleMut = useMutation({
    mutationFn: (v: { id: string; role: any }) => changeRole({ data: v }),
    onSuccess: () => {
      toast.success("Papel atualizado");
      inv();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Vínculo removido");
      inv();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>("profissional");

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-3 grid gap-2 sm:grid-cols-[1fr_1fr_160px_auto]">
        <Input
          placeholder="Nome completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            if (!email || !fullName) {
              toast.error("Preencha nome e e-mail");
              return;
            }
            inviteMut.mutate({ email, full_name: fullName, role });
            setEmail("");
            setFullName("");
          }}
          disabled={inviteMut.isPending}
        >
          <UserPlus className="h-4 w-4 mr-1" /> Convidar
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm">
                Carregando...
              </TableCell>
            </TableRow>
          ) : (data ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Nenhum usuário vinculado.
              </TableCell>
            </TableRow>
          ) : (
            (data ?? []).map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm">
                  {m.profile.full_name ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {m.profile.email ?? "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={m.role}
                    onValueChange={(v) => roleMut.mutate({ id: m.id, role: v })}
                  >
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={m.active ? "default" : "secondary"}>
                    {m.active ? "Ativo" : "Inativo"}
                  </Badge>
                  {!m.confirmed && (
                    <Badge variant="outline" className="ml-1">
                      pendente
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="flex gap-1 justify-end">
                  {!m.confirmed && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Reenviar convite"
                      onClick={() => resendMut.mutate(m.user_id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      activeMut.mutate({ id: m.id, active: !m.active })
                    }
                  >
                    {m.active ? "Inativar" : "Ativar"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Remover"
                    onClick={() => {
                      if (confirm("Remover vínculo?")) removeMut.mutate(m.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ====================== Branding
function BrandingPanel({ clinicId }: { clinicId: string }) {
  const get = useServerFn(getClinicBranding);
  const upd = useServerFn(updateClinicBranding);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["clinic-branding", clinicId],
    queryFn: () => get({ data: { clinic_id: clinicId } }),
  });
  const [form, setForm] = useState<any>(null);
  const current = form ?? data;
  const mut = useMutation({
    mutationFn: () => upd({ data: { clinic_id: clinicId, ...current } }),
    onSuccess: () => {
      toast.success("Identidade atualizada");
      qc.invalidateQueries({ queryKey: ["clinic-branding", clinicId] });
      qc.invalidateQueries({ queryKey: ["branding"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  if (isLoading) return <p className="text-sm">Carregando...</p>;
  const set = (k: string, v: any) =>
    setForm({ ...(current ?? {}), [k]: v });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome fantasia">
        <Input
          value={current?.nome_fantasia ?? ""}
          onChange={(e) => set("nome_fantasia", e.target.value)}
        />
      </Field>
      <Field label="Slogan">
        <Input
          value={current?.slogan ?? ""}
          onChange={(e) => set("slogan", e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Label className="text-xs">Logotipo</Label>
        <LogoUploader
          clinicId={clinicId}
          value={current?.logo_url ?? null}
          onChange={(v: string | null) => set("logo_url", v)}
        />
      </div>
      <Field label="Nome da aplicação">
        <Input
          value={current?.app_name ?? ""}
          onChange={(e) => set("app_name", e.target.value)}
          placeholder="FisioOS"
        />
      </Field>
      <Field label="Cor primária">
        <div className="flex gap-2 items-center">
          <Input
            type="color"
            value={current?.primary_color ?? "#0F4C5C"}
            onChange={(e) => set("primary_color", e.target.value)}
            className="w-16 h-10 p-1"
          />
          <Input
            value={current?.primary_color ?? ""}
            onChange={(e) => set("primary_color", e.target.value)}
          />
        </div>
      </Field>
      <Field label="Cor secundária">
        <div className="flex gap-2 items-center">
          <Input
            type="color"
            value={current?.secondary_color ?? "#2BB673"}
            onChange={(e) => set("secondary_color", e.target.value)}
            className="w-16 h-10 p-1"
          />
          <Input
            value={current?.secondary_color ?? ""}
            onChange={(e) => set("secondary_color", e.target.value)}
          />
        </div>
      </Field>
      <Field label="Cidade">
        <Input
          value={current?.cidade ?? ""}
          onChange={(e) => set("cidade", e.target.value)}
        />
      </Field>
      <Field label="Estado (UF)">
        <Input
          value={current?.estado ?? ""}
          maxLength={2}
          onChange={(e) => set("estado", e.target.value.toUpperCase())}
        />
      </Field>
      <Field label="CREFITO padrão">
        <Input
          value={current?.crefito_default ?? ""}
          onChange={(e) => set("crefito_default", e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Label className="text-xs">Rodapé institucional</Label>
        <Textarea
          rows={3}
          value={current?.rodape_institucional ?? ""}
          onChange={(e) => set("rodape_institucional", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          Salvar identidade
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ====================== Support
function SupportPanel({
  clinic,
  onStart,
}: {
  clinic: { id: string; nome: string };
  onStart: () => void;
}) {
  const start = useServerFn(startSupportSession);
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      start({ data: { clinic_id: clinic.id, reason: reason || undefined } }),
    onSuccess: () => {
      toast.success("Modo Suporte iniciado");
      qc.invalidateQueries({ queryKey: ["support-session-active"] });
      qc.invalidateQueries();
      onStart();
    },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0" />
        <div className="text-sm space-y-2">
          <p>
            Ao iniciar o Modo Suporte para <strong>{clinic.nome}</strong>, sua sessão
            passa a visualizar a clínica em modo leitura. Todas as alterações de
            prontuário, documentos e financeiro ficam bloqueadas até você encerrar a
            sessão.
          </p>
          <p className="text-xs text-amber-900/80">
            Entrada, saída e duração são registradas na auditoria central.
          </p>
        </div>
      </div>
      <div>
        <Label className="text-xs">Motivo (opcional)</Label>
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: investigar erro em PDF reportado por suporte"
        />
      </div>
      <div className="flex justify-end">
        <Button
          variant="default"
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
        >
          <ShieldAlert className="h-4 w-4 mr-1" /> Iniciar Modo Suporte
        </Button>
      </div>
    </div>
  );
}
