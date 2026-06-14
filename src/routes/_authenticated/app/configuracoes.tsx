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
};

function ConfigPage() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async () => (await supabase.from("clinic_settings").select("*").limit(1).maybeSingle()).data,
  });

  const { register, handleSubmit, reset } = useForm<Form>();

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
      const payload = {
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
      };
      if (settings.data?.id) {
        const { error } = await supabase.from("clinic_settings").update(payload).eq("id", settings.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clinic_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["clinic-settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div><h1 className="text-3xl">Configurações da Clínica</h1><p className="text-sm text-muted-foreground">Dados usados em cabeçalho e rodapé dos PDFs.</p></div>
      <Card className="p-6">
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome fantasia *"><Input required {...register("nome_fantasia")} /></Field>
            <Field label="Razão social"><Input {...register("razao_social")} /></Field>
            <Field label="CNPJ"><Input {...register("cnpj")} /></Field>
            <Field label="Logo (URL)"><Input {...register("logo_url")} /></Field>
            <Field label="Telefones (separar por vírgula)"><Input {...register("telefones")} /></Field>
            <Field label="E-mails (separar por vírgula)"><Input {...register("emails")} /></Field>
            <Field label="Endereço" className="sm:col-span-2"><Input {...register("endereco")} /></Field>
            <Field label="Cidade"><Input {...register("cidade")} /></Field>
            <Field label="Estado"><Input maxLength={2} {...register("estado")} /></Field>
            <Field label="CEP"><Input {...register("cep")} /></Field>
          </div>
          <Field label="Rodapé institucional"><Textarea rows={2} {...register("rodape_institucional")} /></Field>
          <div className="flex justify-end"><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button></div>
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
