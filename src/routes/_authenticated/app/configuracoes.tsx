import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Stethoscope, Palette, UserCircle2 } from "lucide-react";
import { LogoUploader, signedLogoUrl } from "@/components/logo-uploader";
import { AvatarUploader } from "@/components/avatar-uploader";
import { useAuth } from "@/lib/auth";
import { pcSet } from "@/lib/persistent-cache";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  component: ConfigPage,
});

type Form = {
  id?: string;
  nome_fantasia: string;
  razao_social?: string;
  cnpj?: string;
  telefones?: string;
  emails?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  rodape_institucional?: string;
  logo_url?: string | null;
  app_name?: string;
  slogan?: string;
  primary_color?: string;
  secondary_color?: string;
  crefito_default?: string;
};

function ConfigPage() {
  const qc = useQueryClient();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);

  async function resolveActiveClinicId(): Promise<string | null> {
    const { data: support } = await supabase.rpc("current_support_session_clinic");
    if (support) return support as string;
    const { data: cid } = await supabase.rpc("current_clinic_id");
    return (cid as string) ?? null;
  }

  const settings = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async () => {
      const cid = await resolveActiveClinicId();
      if (!cid) return null;
      setClinicId(cid);
      const { data } = await supabase
        .from("clinic_settings")
        .select("*")
        .eq("clinic_id", cid)
        .maybeSingle();
      return data;
    },
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm<Form>();
  const logoPath = watch("logo_url");
  const primaryRaw = watch("primary_color");
  const secondaryRaw = watch("secondary_color");
  const primary = normalizeHex(primaryRaw, "#2f5d3a");
  const secondary = normalizeHex(secondaryRaw, "#c75c3a");
  const clinicName = watch("nome_fantasia") || "FisioOS";
  const slogan = watch("slogan") || "Transformando atendimentos em resultados";

  // Preview ao vivo da logo (signed URL)
  const { data: logoPreview } = useQuery({
    queryKey: ["logo-preview-config", logoPath],
    queryFn: () => signedLogoUrl(logoPath ?? null),
    enabled: !!logoPath,
  });

  useEffect(() => setLogoBroken(false), [logoPath]);

  useEffect(() => {
    if (settings.data) {
      reset({
        ...settings.data,
        telefones: (settings.data.telefones ?? []).join(", "),
        emails: (settings.data.emails ?? []).join(", "),
      } as Form);
    }
  }, [settings.data, reset]);

  const save = useMutation({
    mutationFn: async (v: Form) => {
      const payload = {
        nome_fantasia: v.nome_fantasia,
        razao_social: v.razao_social || null,
        cnpj: v.cnpj || null,
        telefones: v.telefones
          ? v.telefones
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        emails: v.emails
          ? v.emails
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        endereco: v.endereco || null,
        cidade: v.cidade || null,
        estado: v.estado || null,
        cep: v.cep || null,
        rodape_institucional: v.rodape_institucional || null,
        logo_url: v.logo_url || null,
        app_name: v.app_name || "FisioOS",
        slogan: v.slogan || "Transformando atendimentos em resultados",
        primary_color: v.primary_color || "#2f5d3a",
        secondary_color: v.secondary_color || "#c75c3a",
        crefito_default: v.crefito_default || null,
      };
      if (settings.data?.id) {
        const { error } = await supabase
          .from("clinic_settings")
          .update(payload)
          .eq("id", settings.data.id);
        if (error) throw error;
      } else {
        const cid = await resolveActiveClinicId();
        if (!cid) throw new Error("Nenhuma clínica ativa para o usuário atual.");
        const { error } = await supabase
          .from("clinic_settings")
          .insert({ ...payload, clinic_id: cid });
        if (error) throw error;
      }
      return { resolvedLogo: await signedLogoUrl(payload.logo_url) };
    },
    onSuccess: (data, v) => {
      toast.success("Configurações salvas");
      if (clinicId) {
        pcSet(
          `fos:branding:${clinicId}`,
          {
            appName: v.app_name || "FisioOS",
            clinicName: v.nome_fantasia || "FisioOS",
            slogan: v.slogan || "Transformando atendimentos em resultados",
            logoUrl: data.resolvedLogo,
            primaryColor: v.primary_color || "#2f5d3a",
            secondaryColor: v.secondary_color || "#c75c3a",
            crefitoDefault: v.crefito_default || null,
            hasOwnLogo: !!data.resolvedLogo,
          },
          24 * 60 * 60_000,
        );
      }
      qc.invalidateQueries({ queryKey: ["clinic-settings"] });
      qc.invalidateQueries({ queryKey: ["branding"] });
      qc.invalidateQueries({ queryKey: ["logo-preview"] });
      qc.invalidateQueries({ queryKey: ["logo-preview-config"] });
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl">Configurações & Identidade visual</h1>
        <p className="text-sm text-muted-foreground">Personalize a marca da sua clínica em todos os documentos e telas.</p>
      </div>

      <MyAccountCard />



      {/* Preview ao vivo da identidade */}
      <Card className="p-6 border-2" style={{ borderColor: primary }}>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Pré-visualização da identidade</div>
        <div className="flex items-center gap-4">
          {logoPreview && !logoBroken ? (
            <img src={logoPreview} alt="Logo" className="h-16 w-auto object-contain" onError={() => setLogoBroken(true)} />
          ) : (
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
          )}
          <div>
            <div className="text-2xl font-semibold" style={{ color: primary }}>{clinicName}</div>
            <div className="text-sm" style={{ color: secondary }}>{slogan}</div>
          </div>
        </div>
        {!logoPreview && (
          <p className="text-xs text-muted-foreground mt-3">
            Sem logo: usamos um monograma com a inicial e suas cores da marca em todo o sistema (sidebar, PDFs, login).
          </p>
        )}
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><Palette className="h-4 w-4" />Identidade visual</h2>

            {/* Upload de logo */}
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">Logo da clínica</Label>
              {clinicId ? (
                <LogoUploader
                  clinicId={clinicId}
                  value={logoPath ?? null}
                  onChange={(v) => setValue("logo_url", v, { shouldDirty: true })}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Carregando…</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome fantasia *"><Input required {...register("nome_fantasia")} placeholder="Ex.: Clínica Vida" /></Field>
              <Field label="Slogan"><Input {...register("slogan")} placeholder="Transformando atendimentos em resultados" /></Field>
              <Field label="Cor primária">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primary}
                    onChange={(e) => setValue("primary_color", e.target.value, { shouldDirty: true })}
                    className="h-10 w-16 rounded-md border border-input bg-transparent p-1 cursor-pointer"
                    aria-label="Selecionar cor primária"
                  />
                  <Input
                    value={primaryRaw ?? ""}
                    onChange={(e) => setValue("primary_color", e.target.value, { shouldDirty: true })}
                    placeholder="#2f5d3a"
                  />
                </div>
              </Field>
              <Field label="Cor secundária">
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={secondary}
                    onChange={(e) => setValue("secondary_color", e.target.value, { shouldDirty: true })}
                    className="h-10 w-16 rounded-md border border-input bg-transparent p-1 cursor-pointer"
                    aria-label="Selecionar cor secundária"
                  />
                  <Input
                    value={secondaryRaw ?? ""}
                    onChange={(e) => setValue("secondary_color", e.target.value, { shouldDirty: true })}
                    placeholder="#c75c3a"
                  />
                </div>
              </Field>
              <Field label="CREFITO padrão" className="sm:col-span-2">
                <Input {...register("crefito_default")} placeholder="CREFITO-8 12345-F" />
              </Field>
            </div>
          </section>

          <section className="space-y-3 border-t pt-6">
            <h2 className="font-semibold">Dados institucionais</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Razão social"><Input {...register("razao_social")} /></Field>
              <Field label="CNPJ"><Input {...register("cnpj")} /></Field>
              <Field label="Telefones (separar por vírgula)"><Input {...register("telefones")} /></Field>
              <Field label="E-mails (separar por vírgula)"><Input {...register("emails")} /></Field>
              <Field label="Endereço" className="sm:col-span-2"><Input {...register("endereco")} /></Field>
              <Field label="Cidade"><Input {...register("cidade")} /></Field>
              <Field label="Estado"><Input maxLength={2} {...register("estado")} /></Field>
              <Field label="CEP"><Input {...register("cep")} /></Field>
            </div>
            <Field label="Rodapé institucional dos documentos">
              <Textarea rows={2} {...register("rodape_institucional")} placeholder="Ex.: Clínica Vida · Av. Brasil 100 · contato@clinicavida.com" />
            </Field>
          </section>

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={save.isPending} style={{ backgroundColor: primary }}>
              {save.isPending ? "Salvando…" : "Salvar configurações"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function MyAccountCard() {
  const { user } = useAuth();
  const profileQ = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name, email")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });
  if (!user?.id) return null;
  return (
    <Card className="p-6">
      <h2 className="font-semibold flex items-center gap-2 mb-4">
        <UserCircle2 className="h-4 w-4" /> Minha conta
      </h2>
      <AvatarUploader userId={user.id} initial={(profileQ.data as any)?.avatar_url ?? null} initialLoading={profileQ.isLoading} />
      <div className="mt-4 text-xs text-muted-foreground">
        {(profileQ.data as any)?.full_name ?? user.email}
      </div>
    </Card>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function normalizeHex(value: string | undefined | null, fallback: string): string {
  if (!value) return fallback;
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1], g = v[2], b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Erro inesperado.";
}
