import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Stethoscope, Palette } from "lucide-react";

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
  logo_url?: string;
  app_name?: string;
  slogan?: string;
  primary_color?: string;
  secondary_color?: string;
  crefito_default?: string;
};

function ConfigPage() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async () => {
      const { data: cid } = await supabase.rpc("current_clinic_id");
      if (!cid) return null;
      const { data } = await supabase.from("clinic_settings").select("*").eq("clinic_id", cid as string).maybeSingle();
      return data;
    },
  });

  const { register, handleSubmit, reset, watch } = useForm<Form>();
  const logoUrl = watch("logo_url");
  const primary = watch("primary_color") || "#2f5d3a";
  const secondary = watch("secondary_color") || "#c75c3a";
  const clinicName = watch("nome_fantasia") || "FisioOS";
  const slogan = watch("slogan") || "Transformando atendimentos em resultados";

  useEffect(() => {
    if (settings.data) {
      reset({
        ...settings.data,
        telefones: (settings.data.telefones ?? []).join(", "),
        emails: (settings.data.emails ?? []).join(", "),
      } as any);
    }
  }, [settings.data, reset]);

  const save = useMutation({
    mutationFn: async (v: Form) => {
      const payload: any = {
        nome_fantasia: v.nome_fantasia,
        razao_social: v.razao_social || null,
        cnpj: v.cnpj || null,
        telefones: v.telefones ? v.telefones.split(",").map((s) => s.trim()).filter(Boolean) : null,
        emails: v.emails ? v.emails.split(",").map((s) => s.trim()).filter(Boolean) : null,
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
        const { error } = await supabase.from("clinic_settings").update(payload).eq("id", settings.data.id);
        if (error) throw error;
      } else {
        const { data: cid } = await supabase.rpc("current_clinic_id");
        if (!cid) throw new Error("Nenhuma clínica ativa para o usuário atual.");
        const { error } = await supabase.from("clinic_settings").insert({ ...payload, clinic_id: cid as string });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["clinic-settings"] });
      qc.invalidateQueries({ queryKey: ["branding"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleLogoUpload(file: File) {
    const path = `branding/logo-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type, upsert: true });
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (data?.signedUrl) {
      reset({ ...(watch() as any), logo_url: data.signedUrl });
      toast.success("Logo enviada — clique em Salvar para aplicar");
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl">Configurações & White Label</h1>
        <p className="text-sm text-muted-foreground">Personalize a identidade visual da sua clínica em todos os documentos e telas.</p>
      </div>

      {/* Preview de branding */}
      <Card className="p-6 border-2" style={{ borderColor: primary }}>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Pré-visualização da identidade</div>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
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
        {!logoUrl && (
          <p className="text-xs text-muted-foreground mt-3">
            Sem logo: usamos o símbolo institucional de fisioterapia + cores escolhidas. O nome do profissional e CREFITO aparecerão nos documentos.
          </p>
        )}
      </Card>

      <Card className="p-6">
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2"><Palette className="h-4 w-4" />Identidade visual</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome fantasia *"><Input required {...register("nome_fantasia")} placeholder="Ex.: Clínica Vida" /></Field>
              <Field label="Slogan"><Input {...register("slogan")} placeholder="Transformando atendimentos em resultados" /></Field>
              <Field label="Cor primária">
                <div className="flex gap-2">
                  <Input type="color" {...register("primary_color")} className="w-16 h-10 p-1" />
                  <Input {...register("primary_color")} placeholder="#2f5d3a" />
                </div>
              </Field>
              <Field label="Cor secundária">
                <div className="flex gap-2">
                  <Input type="color" {...register("secondary_color")} className="w-16 h-10 p-1" />
                  <Input {...register("secondary_color")} placeholder="#c75c3a" />
                </div>
              </Field>
              <Field label="Logo da clínica (URL)" className="sm:col-span-2">
                <div className="flex gap-2">
                  <Input {...register("logo_url")} placeholder="https://… ou faça upload" />
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-2 rounded-md border text-sm hover:bg-muted">
                    Enviar arquivo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use o botão <strong>Enviar arquivo</strong> para fazer upload de uma imagem (PNG ou JPG). URLs que não apontam para uma imagem real (ex.: repositórios GitHub, páginas HTML) são ignoradas e o logo institucional padrão é usado nos PDFs.
                </p>
              </Field>
              <Field label="CREFITO padrão (sem logo)" className="sm:col-span-2">
                <Input {...register("crefito_default")} placeholder="CREFITO-8 12345-F (usado quando a clínica não tem logo própria)" />
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
