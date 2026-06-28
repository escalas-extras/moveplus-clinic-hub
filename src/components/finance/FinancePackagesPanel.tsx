import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  History,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageSection } from "@/components/layout/PageSection";
import { StatusBadge } from "@/components/layout/StatusBadge";
import { SupportGuardButton } from "@/components/support-guard";
import {
  PATIENT_PACKAGE_STATUS_LABELS,
  assertFinanceClinicId,
  computeSessionUnitValue,
  defaultPatientPackageFilters,
  duplicatePackageTemplateMessage,
  filterActiveCategories,
  filterActiveCostCenters,
  filterActivePackageTemplates,
  filterPatientPackagesClient,
  financeQueryKeys,
  invalidateFinanceModuleQueries,
  isDuplicatePackageTemplateError,
  createFinancialInstallmentPlan,
  cancelFinancialInstallmentPlan,
  findInstallmentPlanBySource,
  parseInstallmentOptions,
  parseContractPackageForm,
  parsePackageTemplateForm,
  patientPackageStatusVariant,
  type ClinicalPackageTemplateRow,
  type PatientPackageFilters,
  type PatientPackageRow,
  type PatientPackageStatus,
} from "@/lib/finance";
import { brl, fmtDate } from "@/lib/format";
import { FinancePackageContractUsageDialog } from "./FinancePackageContractUsageDialog";
import { FinanceInstallmentPlanDialog } from "./FinanceInstallmentPlanDialog";

type FinancePackagesPanelProps = {
  clinicId: string | null;
  supportMode: boolean;
};

type TemplateForm = {
  name: string;
  description: string;
  session_count: string;
  total_value: string;
  validity_days: string;
};

type ContractForm = {
  package_template_id: string;
  patient_id: string;
  professional_id: string;
  category_id: string;
  cost_center_id: string;
  contracted_at: string;
  contracted_value: string;
  sessions_total: string;
  parcelar: boolean;
  installments_count: string;
  first_due_date: string;
};

const SELECT_ALL = "all";
const todayIso = () => new Date().toISOString().slice(0, 10);

const EMPTY_TEMPLATE: TemplateForm = {
  name: "",
  description: "",
  session_count: "10",
  total_value: "",
  validity_days: "90",
};

function emptyContractForm(): ContractForm {
  return {
    package_template_id: "",
    patient_id: "",
    professional_id: "",
    category_id: "",
    cost_center_id: "",
    contracted_at: todayIso(),
    contracted_value: "",
    sessions_total: "",
    parcelar: false,
    installments_count: "2",
    first_due_date: todayIso(),
  };
}

function filtersKey(filters: PatientPackageFilters) {
  const { search: _s, ...rest } = filters;
  return JSON.stringify(rest);
}

export function FinancePackagesPanel({ clinicId, supportMode }: FinancePackagesPanelProps) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<PatientPackageFilters>(defaultPatientPackageFilters());
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ClinicalPackageTemplateRow | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(EMPTY_TEMPLATE);
  const [contractForm, setContractForm] = useState<ContractForm>(emptyContractForm);
  const [confirmAction, setConfirmAction] = useState<{
    type: "cancel" | "close";
    row: PatientPackageRow;
  } | null>(null);
  const [usageContract, setUsageContract] = useState<PatientPackageRow | null>(null);
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);

  const templates = useQuery({
    queryKey: financeQueryKeys.packageTemplates(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("clinical_package_templates")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lookups = useQuery({
    queryKey: financeQueryKeys.packageLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [patients, professionals, categories, costCenters] = await Promise.all([
        supabase.from("patients").select("id, nome_completo").eq("clinic_id", clinicId).order("nome_completo"),
        supabase.from("professionals").select("id, nome").eq("clinic_id", clinicId).eq("situacao", "ativo").order("nome"),
        supabase.from("financial_categories").select("*").eq("clinic_id", clinicId).eq("type", "income").order("sort_order"),
        supabase.from("financial_cost_centers").select("*").eq("clinic_id", clinicId).order("sort_order"),
      ]);
      if (patients.error) throw patients.error;
      if (professionals.error) throw professionals.error;
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return {
        patients: patients.data ?? [],
        professionals: professionals.data ?? [],
        categories: categories.data ?? [],
        costCenters: costCenters.data ?? [],
      };
    },
  });

  const contracts = useQuery({
    queryKey: financeQueryKeys.patientPackages(clinicId, filtersKey(filters)),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      let q = supabase
        .from("patient_package_contracts")
        .select(`
          *,
          clinical_package_templates(name, session_count, validity_days),
          patients(nome_completo),
          professionals(nome),
          financial_entries(id, status, valor)
        `)
        .eq("clinic_id", clinicId)
        .order("contracted_at", { ascending: false });

      if (filters.patientId !== SELECT_ALL) q = q.eq("patient_id", filters.patientId);
      if (filters.status !== "all") q = q.eq("status", filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PatientPackageRow[];
    },
  });

  const filteredContracts = useMemo(
    () => filterPatientPackagesClient(contracts.data ?? [], filters.search),
    [contracts.data, filters.search],
  );

  const activeTemplates = useMemo(
    () => filterActivePackageTemplates(templates.data ?? []),
    [templates.data],
  );

  const incomeCategories = useMemo(
    () => filterActiveCategories(lookups.data?.categories ?? []).filter((c) => c.type === "income"),
    [lookups.data?.categories],
  );

  const activeCostCenters = useMemo(
    () => filterActiveCostCenters(lookups.data?.costCenters ?? []),
    [lookups.data?.costCenters],
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: financeQueryKeys.packageTemplates(clinicId) });
    qc.invalidateQueries({ queryKey: ["finance", clinicId, "patient-packages"] });
    invalidateFinanceModuleQueries(qc, clinicId);
  };

  const saveTemplate = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const parsed = parsePackageTemplateForm(templateForm);

      if (editingTemplate) {
        const { error } = await supabase
          .from("clinical_package_templates")
          .update(parsed)
          .eq("id", editingTemplate.id)
          .eq("clinic_id", clinicId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("clinical_package_templates").insert({
        clinic_id: clinicId,
        ...parsed,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingTemplate ? "Pacote atualizado" : "Pacote cadastrado");
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm(EMPTY_TEMPLATE);
      invalidateAll();
    },
    onError: (e: unknown) => {
      if (isDuplicatePackageTemplateError(e)) {
        toast.error(duplicatePackageTemplateMessage());
        return;
      }
      toast.error(e instanceof Error ? e.message : "Erro ao salvar pacote");
    },
  });

  const toggleTemplateActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("clinical_package_templates")
        .update({ is_active })
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? "Pacote ativado" : "Pacote inativado");
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar status"),
  });

  const contractPackage = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");

      const template = (templates.data ?? []).find((t) => t.id === contractForm.package_template_id);
      if (!template) throw new Error("Pacote não encontrado.");
      if (!template.is_active) throw new Error("Este pacote está inativo.");

      const parsed = parseContractPackageForm(contractForm, template);
      const { data: u } = await supabase.auth.getUser();

      const installmentOpts = parseInstallmentOptions({
        enabled: contractForm.parcelar,
        installments_count: contractForm.installments_count,
        first_due_date: contractForm.first_due_date,
        totalAmount: parsed.contracted_value,
      });

      const { data: contractRow, error: contractError } = await supabase
        .from("patient_package_contracts")
        .insert({
          clinic_id: clinicId,
          package_template_id: parsed.package_template_id,
          patient_id: parsed.patient_id,
          professional_id: parsed.professional_id,
          financial_entry_id: null,
          contracted_at: parsed.contracted_at,
          valid_until: parsed.valid_until,
          sessions_total: parsed.sessions_total,
          sessions_used: 0,
          contracted_value: parsed.contracted_value,
          status: "ativo",
        })
        .select("id")
        .single();
      if (contractError) throw contractError;

      if (installmentOpts) {
        const { entryIds } = await createFinancialInstallmentPlan(supabase, {
          clinicId,
          sourceType: "package_contract",
          sourceId: contractRow.id,
          patientId: parsed.patient_id,
          professionalId: parsed.professional_id,
          totalAmount: parsed.contracted_value,
          installmentsCount: installmentOpts.installmentsCount,
          firstDueDate: installmentOpts.firstDueDate,
          issueDate: parsed.contracted_at,
          categoryId: parsed.category_id,
          costCenterId: parsed.cost_center_id,
          documentoBase: parsed.documento,
          observacoesBase: parsed.observacoes,
          createdBy: u.user?.id ?? null,
        });

        if (entryIds[0]) {
          await supabase
            .from("patient_package_contracts")
            .update({ financial_entry_id: entryIds[0] })
            .eq("id", contractRow.id)
            .eq("clinic_id", clinicId);
        }
        return;
      }

      const { data: entry, error: entryError } = await supabase
        .from("financial_entries")
        .insert({
          clinic_id: clinicId,
          entry_type: "receivable",
          patient_id: parsed.patient_id,
          professional_id: parsed.professional_id,
          valor: parsed.contracted_value,
          data: parsed.contracted_at,
          data_vencimento: parsed.valid_until,
          category_id: parsed.category_id,
          cost_center_id: parsed.cost_center_id,
          documento: parsed.documento,
          observacoes: parsed.observacoes,
          status: "pendente",
          created_by: u.user?.id ?? null,
        })
        .select("id")
        .single();
      if (entryError) throw entryError;

      const { error: linkError } = await supabase
        .from("patient_package_contracts")
        .update({ financial_entry_id: entry.id })
        .eq("id", contractRow.id)
        .eq("clinic_id", clinicId);
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      toast.success(contractForm.parcelar ? "Pacote contratado com parcelamento" : "Pacote contratado e conta a receber gerada");
      setContractDialogOpen(false);
      setContractForm(emptyContractForm());
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao contratar pacote"),
  });

  const updateContractStatus = useMutation({
    mutationFn: async ({
      row,
      status,
      cancelReceivable,
    }: {
      row: PatientPackageRow;
      status: PatientPackageStatus;
      cancelReceivable?: boolean;
    }) => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");

      const { error } = await supabase
        .from("patient_package_contracts")
        .update({ status })
        .eq("id", row.id)
        .eq("clinic_id", clinicId);
      if (error) throw error;

      if (cancelReceivable) {
        const plan = await findInstallmentPlanBySource(
          supabase,
          clinicId,
          "package_contract",
          row.id,
        );
        if (plan) {
          await cancelFinancialInstallmentPlan(supabase, clinicId, plan.id);
        } else if (row.financial_entry_id) {
          const { error: finError } = await supabase
            .from("financial_entries")
            .update({ status: "cancelado" })
            .eq("id", row.financial_entry_id)
            .eq("clinic_id", clinicId)
            .eq("status", "pendente");
          if (finError) throw finError;
        }
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(status === "cancelado" ? "Contrato cancelado" : "Contrato encerrado");
      setConfirmAction(null);
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar contrato"),
  });

  async function openContractInstallmentPlan(row: PatientPackageRow) {
    if (!clinicId) return;
    try {
      const plan = await findInstallmentPlanBySource(supabase, clinicId, "package_contract", row.id);
      if (!plan) {
        toast.error("Este contrato não possui parcelamento.");
        return;
      }
      setViewPlanId(plan.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar parcelamento");
    }
  }

  function openCreateTemplate() {
    setEditingTemplate(null);
    setTemplateForm(EMPTY_TEMPLATE);
    setTemplateDialogOpen(true);
  }

  function openEditTemplate(template: ClinicalPackageTemplateRow) {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description ?? "",
      session_count: String(template.session_count),
      total_value: String(template.total_value),
      validity_days: String(template.validity_days),
    });
    setTemplateDialogOpen(true);
  }

  function openContractDialog() {
    setContractForm(emptyContractForm());
    setContractDialogOpen(true);
  }

  function onTemplateSelect(templateId: string) {
    const template = activeTemplates.find((t) => t.id === templateId);
    setContractForm((f) => ({
      ...f,
      package_template_id: templateId,
      contracted_value: template ? String(template.total_value) : "",
      sessions_total: template ? String(template.session_count) : "",
    }));
  }

  const previewUnitValue = useMemo(() => {
    const total = Number(templateForm.total_value);
    const count = Number(templateForm.session_count);
    if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) return null;
    return computeSessionUnitValue(total, count);
  }, [templateForm.total_value, templateForm.session_count]);

  if (templates.isLoading || lookups.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando pacotes…
      </div>
    );
  }

  if (templates.isError || lookups.isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-destructive">Não foi possível carregar os pacotes.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => { templates.refetch(); lookups.refetch(); }}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageSection
        title="Modelos de pacote"
        description="Cadastre pacotes de sessões com valor total, validade e status."
        actions={
          <SupportGuardButton supportMode={supportMode} onClick={openCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo modelo
          </SupportGuardButton>
        }
      >
        {!templates.data?.length ? (
          <EmptyState
            icon={Package}
            title="Nenhum pacote cadastrado"
            description="Crie modelos de pacotes para contratar com pacientes."
            action={{
              label: "Cadastrar pacote",
              onClick: openCreateTemplate,
            }}
          />
        ) : (
          <div className="grid gap-3">
            {(templates.data ?? []).map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      <StatusBadge variant={template.is_active ? "success" : "neutral"}>
                        {template.is_active ? "Ativo" : "Inativo"}
                      </StatusBadge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {template.session_count} sessões · {brl(template.total_value)} total ·{" "}
                      {brl(template.session_unit_value)}/sessão · validade {template.validity_days} dias
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SupportGuardButton
                      supportMode={supportMode}
                      variant="outline"
                      size="sm"
                      onClick={() => openEditTemplate(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </SupportGuardButton>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.is_active}
                        disabled={supportMode || toggleTemplateActive.isPending}
                        onCheckedChange={(checked) =>
                          toggleTemplateActive.mutate({ id: template.id, is_active: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection
        title="Pacotes contratados"
        description="Contrate pacotes para pacientes e acompanhe saldo de sessões."
        actions={
          <SupportGuardButton
            supportMode={supportMode}
            onClick={openContractDialog}
            disabled={!activeTemplates.length}
          >
            <Plus className="mr-2 h-4 w-4" />
            Contratar pacote
          </SupportGuardButton>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar paciente ou pacote…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <Select
            value={filters.patientId}
            onValueChange={(v) => setFilters((f) => ({ ...f, patientId: v }))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Paciente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL}>Todos os pacientes</SelectItem>
              {(lookups.data?.patients ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v as PatientPackageFilters["status"] }))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(PATIENT_PACKAGE_STATUS_LABELS) as PatientPackageStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{PATIENT_PACKAGE_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {contracts.isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando contratos…
          </div>
        ) : contracts.isError ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-destructive">Não foi possível carregar os contratos de pacote.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => contracts.refetch()}>
              Tentar novamente
            </Button>
          </Card>
        ) : !filteredContracts.length ? (
          <EmptyState
            icon={Package}
            title="Nenhum pacote contratado"
            description="Contrate um pacote para gerar a conta a receber automaticamente."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Pacote</th>
                    <th className="px-4 py-3">Contratação</th>
                    <th className="px-4 py-3">Validade</th>
                    <th className="px-4 py-3">Sessões</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.patients?.nome_completo ?? "—"}</p>
                        {row.professionals?.nome && (
                          <p className="text-xs text-muted-foreground">{row.professionals.nome}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{row.clinical_package_templates?.name ?? "—"}</td>
                      <td className="px-4 py-3">{fmtDate(row.contracted_at)}</td>
                      <td className="px-4 py-3">{fmtDate(row.valid_until)}</td>
                      <td className="px-4 py-3">
                        {row.sessions_used}/{row.sessions_total}
                        <span className="ml-1 text-muted-foreground">({row.sessions_remaining} rest.)</span>
                      </td>
                      <td className="px-4 py-3">{brl(row.contracted_value)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={patientPackageStatusVariant(row.status)}>
                          {PATIENT_PACKAGE_STATUS_LABELS[row.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUsageContract(row)}
                          >
                            <History className="mr-1 h-3.5 w-3.5" />
                            Consumo
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openContractInstallmentPlan(row)}
                          >
                            Parcelas
                          </Button>
                          {row.status === "ativo" && (
                            <>
                              <SupportGuardButton
                                supportMode={supportMode}
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction({ type: "close", row })}
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Encerrar
                              </SupportGuardButton>
                              <SupportGuardButton
                                supportMode={supportMode}
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => setConfirmAction({ type: "cancel", row })}
                              >
                                <Ban className="mr-1 h-3.5 w-3.5" />
                                Cancelar
                              </SupportGuardButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </PageSection>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar pacote" : "Novo modelo de pacote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={templateForm.description}
                onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sessões</Label>
                <Input
                  type="number"
                  min={1}
                  value={templateForm.session_count}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, session_count: e.target.value }))}
                />
              </div>
              <div>
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  value={templateForm.validity_days}
                  onChange={(e) => setTemplateForm((f) => ({ ...f, validity_days: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Valor total</Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                value={templateForm.total_value}
                onChange={(e) => setTemplateForm((f) => ({ ...f, total_value: e.target.value }))}
              />
            </div>
            {previewUnitValue != null && (
              <p className="text-sm text-muted-foreground">
                Valor por sessão: <span className="font-medium text-foreground">{brl(previewUnitValue)}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancelar</Button>
            <SupportGuardButton
              supportMode={supportMode}
              onClick={() => saveTemplate.mutate()}
              disabled={saveTemplate.isPending}
            >
              {saveTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </SupportGuardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contratar pacote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Pacote</Label>
              <Select value={contractForm.package_template_id || ""} onValueChange={onTemplateSelect}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} — {t.session_count} sess. · {brl(t.total_value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paciente</Label>
              <Select
                value={contractForm.patient_id || ""}
                onValueChange={(v) => setContractForm((f) => ({ ...f, patient_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(lookups.data?.patients ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profissional (opcional)</Label>
              <Select
                value={contractForm.professional_id || SELECT_ALL}
                onValueChange={(v) =>
                  setContractForm((f) => ({ ...f, professional_id: v === SELECT_ALL ? "" : v }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL}>Nenhum</SelectItem>
                  {(lookups.data?.professionals ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria de receita</Label>
              <Select
                value={contractForm.category_id || ""}
                onValueChange={(v) => setContractForm((f) => ({ ...f, category_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro de custo (opcional)</Label>
              <Select
                value={contractForm.cost_center_id || SELECT_ALL}
                onValueChange={(v) =>
                  setContractForm((f) => ({ ...f, cost_center_id: v === SELECT_ALL ? "" : v }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_ALL}>Nenhum</SelectItem>
                  {activeCostCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data de contratação</Label>
                <Input
                  type="date"
                  value={contractForm.contracted_at}
                  onChange={(e) => setContractForm((f) => ({ ...f, contracted_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sessões</Label>
                <Input
                  type="number"
                  min={1}
                  value={contractForm.sessions_total}
                  onChange={(e) => setContractForm((f) => ({ ...f, sessions_total: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Valor contratado</Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                value={contractForm.contracted_value}
                onChange={(e) => setContractForm((f) => ({ ...f, contracted_value: e.target.value }))}
              />
            </div>
            <div className="rounded-lg border p-3 space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Parcelar valor</span>
                <Switch
                  checked={contractForm.parcelar}
                  onCheckedChange={(checked) =>
                    setContractForm((f) => ({
                      ...f,
                      parcelar: checked,
                      first_due_date: f.first_due_date || f.contracted_at,
                    }))
                  }
                />
              </label>
              {contractForm.parcelar && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Nº parcelas</Label>
                    <Input
                      type="number"
                      min={2}
                      value={contractForm.installments_count}
                      onChange={(e) => setContractForm((f) => ({ ...f, installments_count: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>1º vencimento</Label>
                    <Input
                      type="date"
                      value={contractForm.first_due_date}
                      onChange={(e) => setContractForm((f) => ({ ...f, first_due_date: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {contractForm.parcelar
                ? "Serão geradas parcelas em Contas a Receber vinculadas a este contrato."
                : "Será gerada uma conta a receber pendente vinculada a este contrato."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialogOpen(false)}>Cancelar</Button>
            <SupportGuardButton
              supportMode={supportMode}
              onClick={() => contractPackage.mutate()}
              disabled={contractPackage.isPending || !incomeCategories.length}
            >
              {contractPackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Contratar
            </SupportGuardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FinancePackageContractUsageDialog
        open={!!usageContract}
        onOpenChange={(o) => !o && setUsageContract(null)}
        contract={usageContract}
        clinicId={clinicId}
        supportMode={supportMode}
        professionals={lookups.data?.professionals ?? []}
      />

      <FinanceInstallmentPlanDialog
        open={!!viewPlanId}
        onOpenChange={(o) => !o && setViewPlanId(null)}
        planId={viewPlanId}
        clinicId={clinicId}
        supportMode={supportMode}
      />

      <Dialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "cancel" ? "Cancelar contrato" : "Encerrar contrato"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.type === "cancel"
              ? "O contrato será marcado como cancelado. Parcelas pendentes ou conta a receber também serão canceladas. Os dados permanecem no histórico."
              : "O contrato será marcado como encerrado. A conta a receber não será alterada."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Voltar</Button>
            <SupportGuardButton
              supportMode={supportMode}
              variant={confirmAction?.type === "cancel" ? "destructive" : "default"}
              onClick={() => {
                if (!confirmAction) return;
                updateContractStatus.mutate({
                  row: confirmAction.row,
                  status: confirmAction.type === "cancel" ? "cancelado" : "encerrado",
                  cancelReceivable: confirmAction.type === "cancel",
                });
              }}
              disabled={updateContractStatus.isPending}
            >
              {updateContractStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </SupportGuardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
