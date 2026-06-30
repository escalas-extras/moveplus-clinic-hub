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
  Monitor,
  Tablet,
  Smartphone,
  FileText,
  Receipt,
  LayoutDashboard,
  PanelLeft,
  LogIn,
  Type,
  Image,
  Mail,
  FileBadge2,
  Sparkles,
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
  const accent = "#f59e0b";
  const neutral = "#64748b";
  const clinicName = watch("nome_fantasia") || "FisioOS";
  const slogan = watch("slogan") || "Transformando atendimentos em resultados";
  const appName = watch("app_name") || "FisioOS";
  const footerText =
    watch("rodape_institucional") || `${clinicName} · documentos clínicos com identidade própria`;
  const crefitoDefault = watch("crefito_default") || "CREFITO padrão";
  const emailPreview = watch("emails")?.split(",")[0]?.trim() || "contato@clinica.com";

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
              <WhiteLabelHero
                clinicName={clinicName}
                slogan={slogan}
                appName={appName}
                logoPreview={logoPreview ?? null}
                primary={primary}
                secondary={secondary}
                accent={accent}
                neutral={neutral}
              />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-5">
                  <FormSection
                    icon={Building2}
                    title="Identidade"
                    description="Nome, slogan e assinatura principal da clínica."
                  >
                    <FormGrid>
                      <ClinicalField label="Nome fantasia" required filled={!!watch("nome_fantasia")?.trim()}>
                        <Input required {...register("nome_fantasia")} placeholder="Ex.: Clínica Vida" />
                      </ClinicalField>
                      <ClinicalField label="Nome do app" optional>
                        <Input {...register("app_name")} placeholder="FisioOS" />
                      </ClinicalField>
                      <ClinicalField label="Slogan" optional className="sm:col-span-2">
                        <Input {...register("slogan")} placeholder="Transformando atendimentos em resultados" />
                      </ClinicalField>
                    </FormGrid>
                  </FormSection>

                  <FormSection
                    icon={Image}
                    title="Logos"
                    description="Imagem principal usada na sidebar, login, documentos e recibos."
                  >
                    <ClinicalField label="Logo da clínica" hint="JPG, PNG ou SVG — até 5 MB.">
                      {clinicId ? (
                        <LogoUploader
                          clinicId={clinicId}
                          value={logoPath ?? null}
                          onChange={(v) => setValue("logo_url", v, { shouldDirty: true })}
                        />
                      ) : (
                        <EmptyState
                          icon={Image}
                          title="Preparando upload"
                          description="Assim que a clínica ativa for identificada, o envio da logo ficará disponível."
                          className="py-8"
                        />
                      )}
                    </ClinicalField>
                  </FormSection>

                  <FormSection
                    icon={Palette}
                    title="Cores"
                    description="Paleta aplicada aos botões, cards, sidebar e estados visuais."
                  >
                    <FormGrid>
                      <ClinicalField label="Cor primária">
                        <ColorInput
                          value={primary}
                          rawValue={primaryRaw}
                          fallback="#2f5d3a"
                          label="Selecionar cor primária"
                          onChange={(value) => setValue("primary_color", value, { shouldDirty: true })}
                        />
                      </ClinicalField>
                      <ClinicalField label="Cor secundária">
                        <ColorInput
                          value={secondary}
                          rawValue={secondaryRaw}
                          fallback="#c75c3a"
                          label="Selecionar cor secundária"
                          onChange={(value) => setValue("secondary_color", value, { shouldDirty: true })}
                        />
                      </ClinicalField>
                    </FormGrid>
                    <BrandPalette primary={primary} secondary={secondary} accent={accent} neutral={neutral} />
                    <BrandComponentPreview primary={primary} secondary={secondary} />
                  </FormSection>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <FormSection
                      icon={Type}
                      title="Tipografia"
                      description="Prévia de hierarquia visual nos principais pontos do app."
                    >
                      <TypographyPreview primary={primary} clinicName={clinicName} slogan={slogan} />
                    </FormSection>

                    <FormSection
                      icon={FileBadge2}
                      title="Favicons"
                      description="Prévia compacta usada quando houver identidade visual disponível."
                    >
                      <FaviconPreview
                        clinicName={clinicName}
                        logoPreview={logoPreview ?? null}
                        primary={primary}
                        secondary={secondary}
                      />
                    </FormSection>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <FormSection
                      icon={FileText}
                      title="PDFs"
                      description="Assinatura institucional para documentos clínicos."
                    >
                      <ClinicalField label="Rodapé institucional dos documentos" optional>
                        <Textarea
                          rows={3}
                          {...register("rodape_institucional")}
                          placeholder="Ex.: Clínica Vida · Av. Brasil 100 · contato@clinicavida.com"
                        />
                      </ClinicalField>
                      <ClinicalField label="CREFITO padrão" optional>
                        <Input {...register("crefito_default")} placeholder="CREFITO-8 12345-F" />
                      </ClinicalField>
                      <DocumentPreview
                        clinicName={clinicName}
                        footerText={footerText}
                        crefitoDefault={crefitoDefault}
                        primary={primary}
                        secondary={secondary}
                      />
                    </FormSection>

                    <FormSection
                      icon={Mail}
                      title="E-mails"
                      description="Prévia da identidade aplicada a comunicações."
                    >
                      <EmailPreview
                        clinicName={clinicName}
                        slogan={slogan}
                        email={emailPreview}
                        primary={primary}
                        secondary={secondary}
                      />
                    </FormSection>
                  </div>
                </div>

                <WhiteLabelPreviewRail
                  clinicName={clinicName}
                  slogan={slogan}
                  logoPreview={logoPreview ?? null}
                  primary={primary}
                  secondary={secondary}
                  footerText={footerText}
                />
              </div>
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

type PreviewProps = {
  clinicName: string;
  slogan: string;
  logoPreview: string | null;
  primary: string;
  secondary: string;
};

function PreviewLogo({
  clinicName,
  logoPreview,
  primary,
  secondary,
  size = "lg",
}: Pick<PreviewProps, "clinicName" | "logoPreview" | "primary" | "secondary"> & {
  size?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <ClinicLogo
      brand={{
        ...FISIOOS_DEFAULTS,
        clinicName,
        name: clinicName,
        primaryColor: primary,
        secondaryColor: secondary,
        logoUrl: logoPreview,
        logo: logoPreview,
        hasOwnLogo: !!logoPreview,
      }}
      size={size}
    />
  );
}

function WhiteLabelHero({
  clinicName,
  slogan,
  appName,
  logoPreview,
  primary,
  secondary,
  accent,
  neutral,
}: PreviewProps & {
  appName: string;
  accent: string;
  neutral: string;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[rgba(15,76,92,0.12)] bg-white p-5 shadow-[var(--fos-card-shadow)] sm:p-6 lg:p-7"
      style={{
        background:
          `radial-gradient(circle at 18% 18%, ${primary}20, transparent 30%), ` +
          `radial-gradient(circle at 82% 12%, ${secondary}1c, transparent 32%), #ffffff`,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary}, ${accent})` }} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <PreviewLogo
              clinicName={clinicName}
              logoPreview={logoPreview}
              primary={primary}
              secondary={secondary}
              size="xl"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                White Label Premium
              </p>
              <h2 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: primary }}>
                {clinicName}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">{slogan}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <BrandColorMini label="Primária" value={primary} />
            <BrandColorMini label="Secundária" value={secondary} />
            <BrandColorMini label="Accent" value={accent} />
            <BrandColorMini label="Neutra" value={neutral} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/80 p-3 shadow-soft backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900">Preview ao vivo</p>
              <p className="text-[11px] text-slate-500">Dashboard, sidebar e login</p>
            </div>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white" style={{ background: primary }}>
              {appName}
            </span>
          </div>
          <DashboardPreview
            clinicName={clinicName}
            slogan={slogan}
            logoPreview={logoPreview}
            primary={primary}
            secondary={secondary}
          />
        </div>
      </div>
    </section>
  );
}

function ColorInput({
  value,
  rawValue,
  fallback,
  label,
  onChange,
}: {
  value: string;
  rawValue?: string;
  fallback: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-16 cursor-pointer rounded-xl border border-[rgba(15,76,92,0.16)] bg-transparent p-1"
        aria-label={label}
      />
      <Input value={rawValue ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={fallback} />
    </div>
  );
}

function BrandPalette({
  primary,
  secondary,
  accent,
  neutral,
}: {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
}) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <PaletteSwatch label="Primária" value={primary} description="Botões e destaques" />
      <PaletteSwatch label="Secundária" value={secondary} description="Suporte visual" />
      <PaletteSwatch label="Accent" value={accent} description="Alertas positivos" />
      <PaletteSwatch label="Neutra" value={neutral} description="Textos e bordas" />
    </div>
  );
}

function PaletteSwatch({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white">
      <div className="h-16" style={{ background: value }} />
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{value}</code>
        </div>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function BrandColorMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/75 px-3 py-2 shadow-sm">
      <span className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: value }} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="truncate text-xs font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function BrandComponentPreview({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-3">
      <div className="rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white p-4">
        <p className="text-xs font-semibold text-slate-500">Botões</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-soft" style={{ background: primary }}>
            Primário
          </span>
          <span className="rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: `${secondary}55`, color: secondary }}>
            Secundário
          </span>
        </div>
      </div>
      <div className="rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white p-4">
        <p className="text-xs font-semibold text-slate-500">Cards</p>
        <div className="mt-3 rounded-xl border bg-slate-50 p-3">
          <div className="h-1.5 w-16 rounded-full" style={{ background: primary }} />
          <p className="mt-2 text-sm font-semibold text-slate-900">Resumo clínico</p>
          <p className="text-xs text-slate-500">Indicador com marca aplicada.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-[rgba(15,76,92,0.1)] p-4 text-white" style={{ background: primary }}>
        <p className="text-xs font-semibold text-white/70">Sidebar</p>
        <div className="mt-3 space-y-2">
          <div className="rounded-lg bg-white/16 px-3 py-2 text-xs font-semibold">Dashboard</div>
          <div className="rounded-lg bg-black/10 px-3 py-2 text-xs text-white/75">Pacientes</div>
        </div>
      </div>
    </div>
  );
}

function TypographyPreview({ primary, clinicName, slogan }: { primary: string; clinicName: string; slogan: string }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Título principal</p>
        <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: primary }}>{clinicName}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Texto de apoio</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{slogan}</p>
      </div>
      <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        Tipografia do sistema preservada para manter legibilidade em desktop, tablet, mobile e PDFs.
      </div>
    </div>
  );
}

function FaviconPreview({
  clinicName,
  logoPreview,
  primary,
  secondary,
}: Pick<PreviewProps, "clinicName" | "logoPreview" | "primary" | "secondary">) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {[32, 40, 48].map((size) => (
          <div
            key={size}
            className="flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-black/5"
            style={{ width: size, height: size }}
          >
            <PreviewLogo
              clinicName={clinicName}
              logoPreview={logoPreview}
              primary={primary}
              secondary={secondary}
              size="sm"
            />
          </div>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-slate-600">
        A marca compacta usa a logo principal. Se ela não existir, o sistema mostra a inicial da clínica com a paleta configurada.
      </p>
    </div>
  );
}

function DocumentPreview({
  clinicName,
  footerText,
  crefitoDefault,
  primary,
  secondary,
}: {
  clinicName: string;
  footerText: string;
  crefitoDefault: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[rgba(15,76,92,0.12)] bg-white">
      <div className="h-2" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{clinicName}</p>
            <p className="text-xs text-slate-500">Documento clínico</p>
          </div>
          <FileText className="h-5 w-5" style={{ color: primary }} />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-slate-100" />
          <div className="h-2 w-10/12 rounded-full bg-slate-100" />
          <div className="h-2 w-8/12 rounded-full bg-slate-100" />
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          {footerText} · {crefitoDefault}
        </div>
      </div>
    </div>
  );
}

function EmailPreview({
  clinicName,
  slogan,
  email,
  primary,
  secondary,
}: {
  clinicName: string;
  slogan: string;
  email: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(15,76,92,0.12)] bg-white">
      <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
        <p className="text-sm font-bold">{clinicName}</p>
        <p className="text-xs text-white/75">{slogan}</p>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm font-semibold text-slate-900">Olá, seu documento está pronto.</p>
        <p className="text-xs leading-relaxed text-slate-500">
          Prévia visual de comunicação com identidade da clínica. Remetente: {email}
        </p>
        <span className="inline-flex rounded-xl px-3 py-2 text-xs font-semibold text-white" style={{ background: primary }}>
          Abrir documento
        </span>
      </div>
    </div>
  );
}

function WhiteLabelPreviewRail({
  clinicName,
  slogan,
  logoPreview,
  primary,
  secondary,
  footerText,
}: PreviewProps & { footerText: string }) {
  const previews = [
    { label: "Desktop", icon: Monitor, node: <DevicePreview kind="desktop" primary={primary} secondary={secondary} /> },
    { label: "Tablet", icon: Tablet, node: <DevicePreview kind="tablet" primary={primary} secondary={secondary} /> },
    { label: "Mobile", icon: Smartphone, node: <DevicePreview kind="mobile" primary={primary} secondary={secondary} /> },
    { label: "Documento", icon: FileText, node: <MiniDocumentPreview clinicName={clinicName} primary={primary} footerText={footerText} /> },
    { label: "Recibo", icon: Receipt, node: <ReceiptPreview clinicName={clinicName} primary={primary} secondary={secondary} /> },
    { label: "Dashboard", icon: LayoutDashboard, node: <DashboardPreview clinicName={clinicName} slogan={slogan} logoPreview={logoPreview} primary={primary} secondary={secondary} compact /> },
    { label: "Sidebar", icon: PanelLeft, node: <SidebarPreview clinicName={clinicName} logoPreview={logoPreview} primary={primary} secondary={secondary} /> },
    { label: "Login", icon: LogIn, node: <LoginPreview clinicName={clinicName} slogan={slogan} logoPreview={logoPreview} primary={primary} secondary={secondary} /> },
  ];

  return (
    <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
      <InfoCard
        icon={Sparkles}
        title="Preview em tempo real"
        description="Acompanhe como a marca aparece nos principais pontos da experiência."
        padded={false}
      >
        <div className="space-y-3 p-4">
          {previews.map((preview) => {
            const Icon = preview.icon;
            return (
              <div key={preview.label} className="rounded-2xl border border-[rgba(15,76,92,0.1)] bg-white p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Icon className="h-3.5 w-3.5" style={{ color: primary }} />
                  {preview.label}
                </div>
                {preview.node}
              </div>
            );
          })}
        </div>
      </InfoCard>
    </aside>
  );
}

function DevicePreview({ kind, primary, secondary }: { kind: "desktop" | "tablet" | "mobile"; primary: string; secondary: string }) {
  const widthClass = kind === "mobile" ? "w-24" : kind === "tablet" ? "w-36" : "w-full";
  return (
    <div className={cn("mx-auto overflow-hidden rounded-xl border border-slate-200 bg-slate-50", widthClass)}>
      <div className="flex h-4 items-center gap-1 bg-slate-100 px-2">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
      </div>
      <div className="grid min-h-20 grid-cols-[28px_minmax(0,1fr)]">
        <div style={{ background: primary }} />
        <div className="space-y-2 p-2">
          <div className="h-2 w-1/2 rounded-full" style={{ background: secondary }} />
          <div className="grid grid-cols-2 gap-1">
            <div className="h-10 rounded-lg bg-white shadow-sm" />
            <div className="h-10 rounded-lg bg-white shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniDocumentPreview({ clinicName, primary, footerText }: { clinicName: string; primary: string; footerText: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="truncate text-xs font-bold text-slate-900">{clinicName}</p>
        <span className="h-2 w-10 rounded-full" style={{ background: primary }} />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 rounded-full bg-slate-200" />
        <div className="h-1.5 w-10/12 rounded-full bg-slate-200" />
        <div className="h-1.5 w-8/12 rounded-full bg-slate-200" />
      </div>
      <p className="mt-3 truncate text-[10px] text-slate-400">{footerText}</p>
    </div>
  );
}

function ReceiptPreview({ clinicName, primary, secondary }: { clinicName: string; primary: string; secondary: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-900">Recibo</p>
        <span className="text-xs font-bold" style={{ color: primary }}>R$ 250,00</span>
      </div>
      <p className="mt-1 truncate text-[10px] text-slate-500">{clinicName}</p>
      <div className="mt-3 h-1.5 rounded-full" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
    </div>
  );
}

function DashboardPreview({
  clinicName,
  slogan,
  logoPreview,
  primary,
  secondary,
  compact = false,
}: PreviewProps & { compact?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[rgba(15,76,92,0.1)] bg-slate-50", compact ? "p-2" : "p-3")}>
      <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
        <PreviewLogo clinicName={clinicName} logoPreview={logoPreview} primary={primary} secondary={secondary} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-900">{clinicName}</p>
          <p className="truncate text-[10px] text-slate-500">{slogan}</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {[primary, secondary, "#e2e8f0"].map((color, index) => (
          <div key={`${color}-${index}`} className="rounded-lg bg-white p-2 shadow-sm">
            <div className="h-1.5 w-8 rounded-full" style={{ background: color }} />
            <div className="mt-2 h-5 rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarPreview({
  clinicName,
  logoPreview,
  primary,
  secondary,
}: Pick<PreviewProps, "clinicName" | "logoPreview" | "primary" | "secondary">) {
  return (
    <div className="overflow-hidden rounded-xl text-white" style={{ background: primary }}>
      <div className="flex items-center gap-2 border-b border-white/10 p-2">
        <PreviewLogo clinicName={clinicName} logoPreview={logoPreview} primary={primary} secondary={secondary} size="sm" />
        <span className="truncate text-xs font-bold">{clinicName}</span>
      </div>
      <div className="space-y-1 p-2">
        <div className="rounded-lg bg-white/18 px-2 py-1.5 text-[10px] font-semibold">Home</div>
        <div className="rounded-lg bg-black/10 px-2 py-1.5 text-[10px] text-white/75">Agenda</div>
      </div>
    </div>
  );
}

function LoginPreview({
  clinicName,
  slogan,
  logoPreview,
  primary,
  secondary,
}: PreviewProps) {
  return (
    <div className="rounded-xl p-3" style={{ background: `linear-gradient(135deg, ${primary}18, ${secondary}16)` }}>
      <div className="mx-auto flex max-w-[180px] flex-col items-center rounded-xl bg-white p-3 text-center shadow-sm">
        <PreviewLogo clinicName={clinicName} logoPreview={logoPreview} primary={primary} secondary={secondary} size="sm" />
        <p className="mt-2 max-w-full truncate text-xs font-bold text-slate-900">{clinicName}</p>
        <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{slogan}</p>
        <div className="mt-3 h-7 w-full rounded-lg" style={{ background: primary }} />
      </div>
    </div>
  );
}

function MyAccountCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

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

  const saveName = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: newName })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nome atualizado!");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["home-user-profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["user-avatar", user?.id] });
    },
    onError: (e: any) => toast.error("Falha ao salvar: " + e.message),
  });

  useEffect(() => {
    if (profileQ.data?.full_name) {
      setName(profileQ.data.full_name);
    }
  }, [profileQ.data]);

  if (!user?.id) return null;

  return (
    <InfoCard icon={UserCircle2} title="Minha conta" description="Foto de perfil e identificação do usuário.">
      <div className="space-y-4">
        <AvatarUploader userId={user.id} initial={(profileQ.data as any)?.avatar_url ?? null} initialLoading={profileQ.isLoading} />
        
        <div className="border-t pt-4">
          <Label className="text-xs uppercase font-bold text-slate-400">Nome do profissional</Label>
          {editing ? (
            <div className="mt-2 flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="h-9 rounded-lg"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => saveName.mutate(name)}
                disabled={saveName.isPending}
              >
                {saveName.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setName(profileQ.data?.full_name ?? "");
                }}
                disabled={saveName.isPending}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">
                {profileQ.data?.full_name ?? user.email}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setName(profileQ.data?.full_name ?? "");
                  setEditing(true);
                }}
                className="h-8 rounded-lg text-xs"
              >
                Alterar nome
              </Button>
            </div>
          )}
        </div>
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
