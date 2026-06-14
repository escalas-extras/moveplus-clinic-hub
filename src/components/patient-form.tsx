import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PatientInput = {
  nome_completo: string;
  cpf?: string | null;
  rg?: string | null;
  data_nascimento?: string | null;
  sexo?: string | null;
  estado_civil?: string | null;
  profissao?: string | null;
  naturalidade?: string | null;
  endereco?: string | null;
  endereco_comercial?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  contato_recado?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
  situacao?: "ativo" | "inativo";
};

export function PatientForm({
  defaultValues,
  onSubmit,
  submitting,
}: {
  defaultValues?: Partial<PatientInput>;
  onSubmit: (v: PatientInput) => void;
  submitting?: boolean;
}) {
  const { register, handleSubmit, setValue, watch } = useForm<PatientInput>({
    defaultValues: { situacao: "ativo", ...defaultValues },
  });

  const sexo = watch("sexo");
  const situacao = watch("situacao");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <section className="grid sm:grid-cols-2 gap-4">
        <Field label="Nome completo *" className="sm:col-span-2">
          <Input required {...register("nome_completo")} />
        </Field>
        <Field label="CPF"><Input {...register("cpf")} /></Field>
        <Field label="RG"><Input {...register("rg")} /></Field>
        <Field label="Data de nascimento"><Input type="date" {...register("data_nascimento")} /></Field>
        <Field label="Sexo">
          <Select value={sexo ?? ""} onValueChange={(v) => setValue("sexo", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Feminino">Feminino</SelectItem>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado civil"><Input {...register("estado_civil")} /></Field>
        <Field label="Profissão"><Input {...register("profissao")} /></Field>
        <Field label="Naturalidade"><Input {...register("naturalidade")} /></Field>
        <Field label="Situação">
          <Select value={situacao ?? "ativo"} onValueChange={(v) => setValue("situacao", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <Field label="Endereço residencial" className="sm:col-span-2"><Input {...register("endereco")} /></Field>
        <Field label="Endereço comercial" className="sm:col-span-2"><Input {...register("endereco_comercial")} /></Field>
        <Field label="Bairro"><Input {...register("bairro")} /></Field>
        <Field label="Cidade"><Input {...register("cidade")} /></Field>
        <Field label="Estado"><Input maxLength={2} {...register("estado")} /></Field>
        <Field label="CEP"><Input {...register("cep")} /></Field>
        <Field label="Telefone"><Input {...register("telefone")} /></Field>
        <Field label="WhatsApp"><Input {...register("whatsapp")} /></Field>
        <Field label="Contato para recado"><Input {...register("contato_recado")} /></Field>
        <Field label="Responsável"><Input {...register("responsavel")} /></Field>
      </section>

      <Field label="Observações"><Textarea rows={3} {...register("observacoes")} /></Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Salvar"}</Button>
      </div>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
