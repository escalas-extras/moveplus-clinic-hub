import { useForm } from "react-hook-form";
import { User, MapPin, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClinicalField,
  FormFooter,
  FormGrid,
  FormSection,
  PrimaryActionButton,
  SecondaryActionButton,
} from "@/components/layout";

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
  onCancel,
}: {
  defaultValues?: Partial<PatientInput>;
  onSubmit: (v: PatientInput) => void;
  submitting?: boolean;
  onCancel?: () => void;
}) {
  const { register, handleSubmit, setValue, watch } = useForm<PatientInput>({
    defaultValues: { situacao: "ativo", ...defaultValues },
  });

  const sexo = watch("sexo");
  const situacao = watch("situacao");
  const nome = watch("nome_completo");

  function normalize(v: PatientInput): PatientInput {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === "string") {
        const trimmed = val.trim();
        out[k] = trimmed === "" && k !== "nome_completo" ? null : trimmed;
      } else {
        out[k] = val ?? null;
      }
    }
    return out as PatientInput;
  }

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(normalize(v)))} className="space-y-5">
      <FormSection
        icon={User}
        title="Identificação"
        description="Dados pessoais e cadastrais do paciente."
      >
        <FormGrid>
          <ClinicalField
            label="Nome completo"
            required
            filled={!!nome?.trim()}
            className="sm:col-span-2"
          >
            <Input required {...register("nome_completo")} />
          </ClinicalField>
          <ClinicalField label="CPF" optional>
            <Input {...register("cpf")} placeholder="000.000.000-00" />
          </ClinicalField>
          <ClinicalField label="RG" optional>
            <Input {...register("rg")} />
          </ClinicalField>
          <ClinicalField label="Data de nascimento" optional>
            <Input type="date" {...register("data_nascimento")} />
          </ClinicalField>
          <ClinicalField label="Sexo" optional>
            <Select value={sexo ?? ""} onValueChange={(v) => setValue("sexo", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Feminino">Feminino</SelectItem>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </ClinicalField>
          <ClinicalField label="Estado civil" optional>
            <Input {...register("estado_civil")} />
          </ClinicalField>
          <ClinicalField label="Profissão" optional>
            <Input {...register("profissao")} />
          </ClinicalField>
          <ClinicalField label="Naturalidade" optional>
            <Input {...register("naturalidade")} />
          </ClinicalField>
          <ClinicalField label="Situação">
            <Select value={situacao ?? "ativo"} onValueChange={(v) => setValue("situacao", v as PatientInput["situacao"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </ClinicalField>
        </FormGrid>
      </FormSection>

      <FormSection
        icon={MapPin}
        title="Endereço e contato"
        description="Localização e formas de comunicação."
      >
        <FormGrid>
          <ClinicalField label="Endereço residencial" optional className="sm:col-span-2">
            <Input {...register("endereco")} />
          </ClinicalField>
          <ClinicalField label="Endereço comercial" optional className="sm:col-span-2">
            <Input {...register("endereco_comercial")} />
          </ClinicalField>
          <ClinicalField label="Bairro" optional>
            <Input {...register("bairro")} />
          </ClinicalField>
          <ClinicalField label="Cidade" optional>
            <Input {...register("cidade")} />
          </ClinicalField>
          <ClinicalField label="Estado" optional hint="Sigla com 2 letras.">
            <Input maxLength={2} {...register("estado")} />
          </ClinicalField>
          <ClinicalField label="CEP" optional>
            <Input {...register("cep")} />
          </ClinicalField>
        </FormGrid>
      </FormSection>

      <FormSection icon={Phone} title="Telefones" description="Contatos para recados e responsável.">
        <FormGrid>
          <ClinicalField label="Telefone" optional>
            <Input {...register("telefone")} />
          </ClinicalField>
          <ClinicalField label="WhatsApp" optional>
            <Input {...register("whatsapp")} />
          </ClinicalField>
          <ClinicalField label="Contato para recado" optional>
            <Input {...register("contato_recado")} />
          </ClinicalField>
          <ClinicalField label="Responsável" optional>
            <Input {...register("responsavel")} />
          </ClinicalField>
        </FormGrid>
      </FormSection>

      <FormSection title="Observações" description="Informações complementares sobre o paciente.">
        <ClinicalField label="Observações gerais" optional>
          <Textarea rows={3} {...register("observacoes")} />
        </ClinicalField>
      </FormSection>

      <FormFooter>
        {onCancel && (
          <SecondaryActionButton type="button" onClick={onCancel}>
            Cancelar
          </SecondaryActionButton>
        )}
        <PrimaryActionButton type="submit" loading={submitting}>
          Salvar
        </PrimaryActionButton>
      </FormFooter>
    </form>
  );
}
