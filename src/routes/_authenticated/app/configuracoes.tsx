import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import {
  Palette,
  UserCircle2,
  Building2,
  Settings,
  Stethoscope,
  Wallet,
  SlidersHorizontal,
  Plug,
  ShieldCheck,
} from "lucide-react";
import { LogoUploader, signedLogoUrl } from "@/components/logo-uploader";
import { ClinicLogo } from "@/components/clinic-logo";
import { FISIOOS_DEFAULTS } from "@/lib/branding";
import { AvatarUploader } from "@/components/avatar-uploader";
import { useAuth } from "@/lib/auth";
import { useActiveClinic } from "@/lib/active-clinic";
import { pcSet } from "@/lib/persistent-cache";
import { cn } from "@/lib/utils";
import {
  AppShell,
  PageHeader,
  ClinicalField,
  EmptyState,
  FormFooter,
  FormGrid,
  FormSection,
  InfoCard,
  PrimaryActionButton,
  clinical,
} from "@/components/layout";

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

type SectionId =
  | "clinica"
  | "profissionais"
  | "financeiro"
  | "whitelabel"
  | "sistema"
  | "integracoes"
  | "seguranca";

const SECTIONS: { id: SectionId; label: string; icon: typeof Settings; desc: string }[] = [
  { id: "clinica", label: "Clínica", icon: Building2, desc: "Dados institucionais" },
  { id: "profissionais", label: "Profissionais", icon: Stethoscope, desc: "Equipe e acessos" },
  { id: "financeiro", label: "Financeiro", icon: Wallet, desc: "Categorias e custos" },
  { id: "whitelabel", label: "White Label", icon: Palette, desc: "Logo, cores e marca" },
  { id: "sistema", label: "Sistema", icon: SlidersHorizontal, desc: "Preferências gerais" },
  { id: "integracoes", label: "Integrações", icon: Plug, desc: "Conexões externas" },
  { id: "seguranca", label: "Segurança", icon: ShieldCheck, desc: "Conta e acesso" },
];

function ConfigPage() {
  const qc = useQueryClient();
  const { supportMode } = useActiveClinic();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>("clinica");

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

  const { register, handleSubmit, reset, watch, setValue } = useForm<Form>({ shouldUnregister: false });
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
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
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
      const cid = settings.data?.clinic_id ?? (await resolveActiveClinicId());
      if (!cid) throw new Error("Nenhuma clínica ativa para o usuário atual.");
      const { error } = await supabase
        .from("clinic_settings")
        .upsert({ ...payload, clinic_id: cid }, { onConflict: "clinic_id" });
      if (error) throw error;
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

  const showFooter = section === "clinica" || section === "whitelabel";

  return (
    <AppShell clinical>
      <PageHeader
        icon={Settings}
        eyebrow="Configurações"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Configurações" }]}
        title="Configurações da clínica"
        description="Painel administrativo — identidade visual, dados institucionais, equipe, integrações e segurança."
      />

      <div className="grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Navegação lateral interna */}
        <nav aria-label="Categorias de configuração" className="lg:sticky lg:top-4 lg:self-start">
          <div className="fos-surface-card flex gap-1 overflow-x-auto rounded-2xl p-2 lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors lg:w-full",
                    clinical.focusRing,
                    active
                      ? "bg-primary/[0.08] text-primary ring-1 ring-inset ring-primary/15"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{s.label}</span>
                    <span className="hidden text-[11px] text-slate-400 lg:block">{s.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Conteúdo */}
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="min-w-0 space-y-5">
          {section === "clinica" && (
            <FormSection
              icon={Building2}
              title="Dados institucionais"
              description="Informações legais e de contato da clínica."
            >
              <FormGrid>
                <ClinicalField label="Razão social" optional>
                  <Input {...register("razao_social")} />
                </ClinicalField>
                <ClinicalField label="CNPJ" optional>
                  <Input {...register("cnpj")} />
                </ClinicalField>
                <ClinicalField label="Telefones" optional hint="Separar por vírgula.">
                  <Input {...register("telefones")} />
                </ClinicalField>
                <ClinicalField label="E-mails" optional hint="Separar por vírgula.">
                  <Input {...register("emails")} />
                </ClinicalField>
                <ClinicalField label="Endereço" optional className="sm:col-span-2">
                  <Input {...register("endereco")} />
                </ClinicalField>
                <ClinicalField label="Cidade" optional>
                  <Input {...register("cidade")} />
                </ClinicalField>
                <ClinicalField label="Estado" optional>
                  <Input maxLength={2} {...register("estado")} />
                </ClinicalField>
                <ClinicalField label="CEP" optional>
                  <Input {...register("cep")} />
                </ClinicalField>
              </FormGrid>
              <ClinicalField label="Rodapé institucional dos documentos" optional>
                <Textarea
                  rows={2}
                  {...register("rodape_institucional")}
                  placeholder="Ex.: Clínica Vida · Av. Brasil 100 · contato@clinicavida.com"
                />
              </ClinicalField>
            </FormSection>
          )}

          {section === "whitelabel" && (
            <>
              <InfoCard
                icon={Palette}
                title="Pré-visualização da identidade"
                description="Como sua marca aparece no sistema e nos documentos."
                className="border-2"
                style={{ borderColor: primary }}
              >
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <ClinicLogo
                    brand={{
                      ...FISIOOS_DEFAULTS,
                      clinicName,
                      name: clinicName,
                      primaryColor: primary,
                      secondaryColor: secondary,
                      logoUrl: logoPreview ?? null,
                      logo: logoPreview ?? null,
                      hasOwnLogo: !!logoPreview,
                    }}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-2xl font-semibold" style={{ color: primary }}>
                      {clinicName}
                    </div>
                    <div className="truncate text-sm" style={{ color: secondary }}>
                      {slogan}
                    </div>
                  </div>
                </div>
                {!logoPreview && (
                  <p className="mt-4 text-xs text-slate-500">
                    Sem logo: usamos um monograma com a inicial e suas cores da marca em todo o sistema.
                  </p>
                )}
              </InfoCard>

              <FormSection
                icon={Palette}
                title="Identidade visual"
                description="Logo, cores e nome da clínica."
              >
                <ClinicalField label="Logo da clínica" hint="JPG, PNG ou SVG — até 5 MB.">
                  {clinicId ? (
                    <LogoUploader
                      clinicId={clinicId}
                      value={logoPath ?? null}
                      onChange={(v) => setValue("logo_url", v, { shouldDirty: true })}
                    />
                  ) : (
                    <p className="text-xs text-slate-500">Carregando…</p>
                  )}
                </ClinicalField>
                <FormGrid>
                  <ClinicalField label="Nome fantasia" required filled={!!watch("nome_fantasia")?.trim()}>
                    <Input required {...register("nome_fantasia")} placeholder="Ex.: Clínica Vida" />
                  </ClinicalField>
                  <ClinicalField label="Slogan" optional>
                    <Input {...register("slogan")} placeholder="Transformando atendimentos em resultados" />
                  </ClinicalField>
                  <ClinicalField label="Cor primária">
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={primary}
                        onChange={(e) => setValue("primary_color", e.target.value, { shouldDirty: true })}
                        className="h-11 w-16 cursor-pointer rounded-xl border border-[rgba(15,76,92,0.16)] bg-transparent p-1"
                        aria-label="Selecionar cor primária"
                      />
                      <Input
                        value={primaryRaw ?? ""}
                        onChange={(e) => setValue("primary_color", e.target.value, { shouldDirty: true })}
                        placeholder="#2f5d3a"
                      />
                    </div>
                  </ClinicalField>
                  <ClinicalField label="Cor secundária">
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={secondary}
                        onChange={(e) => setValue("secondary_color", e.target.value, { shouldDirty: true })}
                        className="h-11 w-16 cursor-pointer rounded-xl border border-[rgba(15,76,92,0.16)] bg-transparent p-1"
                        aria-label="Selecionar cor secundária"
                      />
                      <Input
                        value={secondaryRaw ?? ""}
                        onChange={(e) => setValue("secondary_color", e.target.value, { shouldDirty: true })}
                        placeholder="#c75c3a"
                      />
                    </div>
                  </ClinicalField>
                  <ClinicalField label="CREFITO padrão" optional className="sm:col-span-2">
                    <Input {...register("crefito_default")} placeholder="CREFITO-8 12345-F" />
                  </ClinicalField>
                </FormGrid>
              </FormSection>
            </>
          )}

          {section === "profissionais" && (
            <EmptyState
              icon={Stethoscope}
              title="Equipe e profissionais"
              description="Cadastro, especialidades, CREFITO e acessos dos profissionais são gerenciados no módulo Profissionais."
              action={{ label: "Abrir Profissionais", to: "/app/profissionais" }}
            />
          )}

          {section === "financeiro" && (
            <EmptyState
              icon={Wallet}
              title="Configurações financeiras"
              description="Categorias, centros de custo e formas de pagamento são gerenciados na administração financeira."
              action={{ label: "Abrir Financeiro", to: "/app/financeiro" }}
            />
          )}

          {section === "sistema" && (
            <EmptyState
              icon={SlidersHorizontal}
              title="Preferências do sistema"
              description="Ajustes gerais de comportamento do sistema estarão disponíveis nesta área em breve."
            />
          )}

          {section === "integracoes" && (
            <EmptyState
              icon={Plug}
              title="Integrações"
              description="Conexões com gateways de pagamento e serviços externos estarão disponíveis em breve."
            />
          )}

          {section === "seguranca" && (
            <div className="space-y-5">
              <MyAccountCard />
              <EmptyState
                icon={ShieldCheck}
                title="Acesso e segurança"
                description="A alteração de senha e o gerenciamento de sessões são feitos com segurança pelo provedor de autenticação."
              />
            </div>
          )}

          {showFooter && (
            <FormFooter>
              <PrimaryActionButton type="submit" loading={save.isPending} disabled={supportMode}>
                Salvar configurações
              </PrimaryActionButton>
            </FormFooter>
          )}
        </form>
      </div>
    </AppShell>
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
    <InfoCard icon={UserCircle2} title="Minha conta" description="Foto de perfil e identificação do usuário.">
      <AvatarUploader userId={user.id} initial={(profileQ.data as any)?.avatar_url ?? null} initialLoading={profileQ.isLoading} />
      <div className="mt-4 text-sm text-muted-foreground">
        {(profileQ.data as any)?.full_name ?? user.email}
      </div>
    </InfoCard>
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
