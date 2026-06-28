import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  Pencil,
  Plus,
  Search,
  UserPlus,
  Wallet,
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
  assertFinanceClinicId,
  defaultPatientHealthInsuranceFilters,
  duplicateHealthInsuranceProviderMessage,
  emptyHealthInsuranceProviderForm,
  emptyInsuranceReceivableForm,
  emptyPatientHealthInsuranceForm,
  filterActiveCategories,
  filterActiveCostCenters,
  filterActiveHealthInsuranceProviders,
  filterPatientHealthInsurancesClient,
  financeQueryKeys,
  invalidateFinanceModuleQueries,
  isDuplicateHealthInsuranceProviderError,
  parseHealthInsuranceProviderForm,
  parseInsuranceReceivableForm,
  parsePatientHealthInsuranceForm,
  type HealthInsuranceProviderForm,
  type HealthInsuranceProviderRow,
  type InsuranceReceivableForm,
  type PatientHealthInsuranceFilters,
  type PatientHealthInsuranceForm,
  type PatientHealthInsuranceRowView,
} from "@/lib/finance";
import { fmtDate } from "@/lib/format";

type FinanceHealthInsurancePanelProps = {
  clinicId: string | null;
  supportMode: boolean;
};

const SELECT_ALL = "all";
const todayIso = () => new Date().toISOString().slice(0, 10);

function filtersKey(filters: PatientHealthInsuranceFilters) {
  const { search: _s, ...rest } = filters;
  return JSON.stringify(rest);
}

export function FinanceHealthInsurancePanel({ clinicId, supportMode }: FinanceHealthInsurancePanelProps) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<PatientHealthInsuranceFilters>(defaultPatientHealthInsuranceFilters());
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [receivableDialogOpen, setReceivableDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<HealthInsuranceProviderRow | null>(null);
  const [providerForm, setProviderForm] = useState<HealthInsuranceProviderForm>(emptyHealthInsuranceProviderForm());
  const [linkForm, setLinkForm] = useState<PatientHealthInsuranceForm>(emptyPatientHealthInsuranceForm());
  const [receivableForm, setReceivableForm] = useState<InsuranceReceivableForm>(emptyInsuranceReceivableForm(todayIso()));

  const providers = useQuery({
    queryKey: financeQueryKeys.healthInsuranceProviders(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const { data, error } = await supabase
        .from("health_insurance_providers")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lookups = useQuery({
    queryKey: financeQueryKeys.healthInsuranceLookups(clinicId),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      const [patients, categories, costCenters] = await Promise.all([
        supabase.from("patients").select("id, nome_completo").eq("clinic_id", clinicId).order("nome_completo"),
        supabase.from("financial_categories").select("*").eq("clinic_id", clinicId).eq("type", "income").order("sort_order"),
        supabase.from("financial_cost_centers").select("*").eq("clinic_id", clinicId).order("sort_order"),
      ]);
      if (patients.error) throw patients.error;
      if (categories.error) throw categories.error;
      if (costCenters.error) throw costCenters.error;
      return {
        patients: patients.data ?? [],
        categories: categories.data ?? [],
        costCenters: costCenters.data ?? [],
      };
    },
  });

  const links = useQuery({
    queryKey: financeQueryKeys.patientHealthInsurances(clinicId, filtersKey(filters)),
    enabled: !!clinicId,
    queryFn: async () => {
      assertFinanceClinicId(clinicId);
      let q = supabase
        .from("patient_health_insurances")
        .select(`
          *,
          patients(nome_completo),
          health_insurance_providers(name, is_active)
        `)
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (filters.patientId !== SELECT_ALL) q = q.eq("patient_id", filters.patientId);
      if (filters.providerId !== SELECT_ALL) q = q.eq("provider_id", filters.providerId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PatientHealthInsuranceRowView[];
    },
  });

  const filteredLinks = useMemo(
    () => filterPatientHealthInsurancesClient(links.data ?? [], filters.search),
    [links.data, filters.search],
  );

  const activeProviders = useMemo(
    () => filterActiveHealthInsuranceProviders(providers.data ?? []),
    [providers.data],
  );

  const incomeCategories = useMemo(
    () => filterActiveCategories(lookups.data?.categories ?? []),
    [lookups.data?.categories],
  );

  const activeCostCenters = useMemo(
    () => filterActiveCostCenters(lookups.data?.costCenters ?? []),
    [lookups.data?.costCenters],
  );

  const activeLinks = useMemo(
    () => filteredLinks.filter((l) => l.is_active && l.health_insurance_providers?.is_active !== false),
    [filteredLinks],
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: financeQueryKeys.healthInsuranceProviders(clinicId) });
    qc.invalidateQueries({ queryKey: ["finance", clinicId, "patient-health-insurances"] });
    invalidateFinanceModuleQueries(qc, clinicId);
  };

  const saveProvider = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const parsed = parseHealthInsuranceProviderForm(providerForm);

      if (editingProvider) {
        const { error } = await supabase
          .from("health_insurance_providers")
          .update(parsed)
          .eq("id", editingProvider.id)
          .eq("clinic_id", clinicId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("health_insurance_providers").insert({
        clinic_id: clinicId,
        ...parsed,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingProvider ? "Convênio atualizado" : "Convênio cadastrado");
      setProviderDialogOpen(false);
      setEditingProvider(null);
      setProviderForm(emptyHealthInsuranceProviderForm());
      invalidateAll();
    },
    onError: (e: unknown) => {
      if (isDuplicateHealthInsuranceProviderError(e)) {
        toast.error(duplicateHealthInsuranceProviderMessage());
        return;
      }
      toast.error(e instanceof Error ? e.message : "Erro ao salvar convênio");
    },
  });

  const toggleProviderActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("health_insurance_providers")
        .update({ is_active })
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? "Convênio ativado" : "Convênio inativado");
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar status"),
  });

  const saveLink = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const parsed = parsePatientHealthInsuranceForm(linkForm);
      const { error } = await supabase.from("patient_health_insurances").insert({
        clinic_id: clinicId,
        ...parsed,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente vinculado ao convênio");
      setLinkDialogOpen(false);
      setLinkForm(emptyPatientHealthInsuranceForm());
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao vincular paciente"),
  });

  const toggleLinkActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");
      const { error } = await supabase
        .from("patient_health_insurances")
        .update({ is_active })
        .eq("id", id)
        .eq("clinic_id", clinicId);
      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? "Vínculo ativado" : "Vínculo inativado");
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar vínculo"),
  });

  const createReceivable = useMutation({
    mutationFn: async () => {
      assertFinanceClinicId(clinicId);
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura. Encerre a sessão para fazer alterações.");

      const link = activeLinks.find((l) => l.id === receivableForm.patient_health_insurance_id);
      if (!link) throw new Error("Vínculo paciente x convênio não encontrado ou inativo.");

      const parsed = parseInsuranceReceivableForm(receivableForm, {
        patient_id: link.patient_id,
        provider_id: link.provider_id,
        authorization_number: link.authorization_number,
        provider_name: link.health_insurance_providers?.name,
      });

      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("financial_entries").insert({
        clinic_id: clinicId,
        entry_type: "receivable",
        patient_id: parsed.patient_id,
        professional_id: null,
        health_insurance_provider_id: parsed.health_insurance_provider_id,
        patient_health_insurance_id: parsed.patient_health_insurance_id,
        valor: parsed.valor,
        data: parsed.data,
        data_vencimento: parsed.data_vencimento,
        category_id: parsed.category_id,
        cost_center_id: parsed.cost_center_id,
        documento: parsed.documento,
        observacoes: parsed.observacoes,
        status: "pendente",
        created_by: u.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta a receber (convênio) criada");
      setReceivableDialogOpen(false);
      setReceivableForm(emptyInsuranceReceivableForm(todayIso()));
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao criar recebível"),
  });

  function openCreateProvider() {
    setEditingProvider(null);
    setProviderForm(emptyHealthInsuranceProviderForm());
    setProviderDialogOpen(true);
  }

  function openEditProvider(row: HealthInsuranceProviderRow) {
    setEditingProvider(row);
    setProviderForm({
      name: row.name,
      document: row.document ?? "",
      contact_name: row.contact_name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      notes: row.notes ?? "",
    });
    setProviderDialogOpen(true);
  }

  if (providers.isLoading || lookups.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando convênios…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageSection
        title="Operadoras / Convênios"
        description="Cadastre convênios e mantenha contatos para faturamento futuro."
        actions={
          <SupportGuardButton supportMode={supportMode} onClick={openCreateProvider}>
            <Plus className="mr-2 h-4 w-4" />
            Novo convênio
          </SupportGuardButton>
        }
      >
        {!providers.data?.length ? (
          <EmptyState
            icon={Building2}
            title="Nenhum convênio cadastrado"
            description="Cadastre operadoras de saúde para vincular pacientes."
            action={{ label: "Cadastrar convênio", onClick: openCreateProvider }}
          />
        ) : (
          <div className="grid gap-3">
            {(providers.data ?? []).map((provider) => (
              <Card key={provider.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{provider.name}</p>
                      <StatusBadge variant={provider.is_active ? "success" : "neutral"}>
                        {provider.is_active ? "Ativo" : "Inativo"}
                      </StatusBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[provider.document, provider.contact_name, provider.phone, provider.email]
                        .filter(Boolean)
                        .join(" · ") || "Sem contato cadastrado"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SupportGuardButton
                      supportMode={supportMode}
                      variant="outline"
                      size="sm"
                      onClick={() => openEditProvider(provider)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </SupportGuardButton>
                    <Switch
                      checked={provider.is_active}
                      disabled={supportMode || toggleProviderActive.isPending}
                      onCheckedChange={(checked) =>
                        toggleProviderActive.mutate({ id: provider.id, is_active: checked })
                      }
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection
        title="Pacientes vinculados"
        description="Vínculos paciente x convênio com plano, carteirinha e autorização."
        actions={
          <div className="flex flex-wrap gap-2">
            <SupportGuardButton
              supportMode={supportMode}
              variant="outline"
              onClick={() => {
                setLinkForm(emptyPatientHealthInsuranceForm());
                setLinkDialogOpen(true);
              }}
              disabled={!activeProviders.length}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Vincular paciente
            </SupportGuardButton>
            <SupportGuardButton
              supportMode={supportMode}
              onClick={() => {
                setReceivableForm(emptyInsuranceReceivableForm(todayIso()));
                setReceivableDialogOpen(true);
              }}
              disabled={!activeLinks.length || !incomeCategories.length}
            >
              <Wallet className="mr-2 h-4 w-4" />
              Recebível convênio
            </SupportGuardButton>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar paciente, convênio, plano…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <Select value={filters.patientId} onValueChange={(v) => setFilters((f) => ({ ...f, patientId: v }))}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Paciente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL}>Todos os pacientes</SelectItem>
              {(lookups.data?.patients ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.providerId} onValueChange={(v) => setFilters((f) => ({ ...f, providerId: v }))}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Convênio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_ALL}>Todos os convênios</SelectItem>
              {(providers.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {links.isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando vínculos…
          </div>
        ) : !filteredLinks.length ? (
          <EmptyState
            icon={UserPlus}
            title="Nenhum vínculo cadastrado"
            description="Vincule pacientes aos convênios para gerar recebíveis."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Convênio</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3">Carteirinha</th>
                    <th className="px-4 py-3">Validade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{row.patients?.nome_completo ?? "—"}</td>
                      <td className="px-4 py-3">{row.health_insurance_providers?.name ?? "—"}</td>
                      <td className="px-4 py-3">{row.plan_name ?? "—"}</td>
                      <td className="px-4 py-3">{row.card_number ?? "—"}</td>
                      <td className="px-4 py-3">{row.valid_until ? fmtDate(row.valid_until) : "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={row.is_active ? "success" : "neutral"}>
                          {row.is_active ? "Ativo" : "Inativo"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Switch
                          checked={row.is_active}
                          disabled={supportMode || toggleLinkActive.isPending}
                          onCheckedChange={(checked) =>
                            toggleLinkActive.mutate({ id: row.id, is_active: checked })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </PageSection>

      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProvider ? "Editar convênio" : "Novo convênio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={providerForm.name} onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>CNPJ / documento</Label>
              <Input value={providerForm.document} onChange={(e) => setProviderForm((f) => ({ ...f, document: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Contato</Label>
                <Input value={providerForm.contact_name} onChange={(e) => setProviderForm((f) => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={providerForm.phone} onChange={(e) => setProviderForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={providerForm.email} onChange={(e) => setProviderForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={providerForm.notes} onChange={(e) => setProviderForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>Cancelar</Button>
            <SupportGuardButton supportMode={supportMode} onClick={() => saveProvider.mutate()} disabled={saveProvider.isPending}>
              {saveProvider.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </SupportGuardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular paciente ao convênio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Paciente</Label>
              <Select value={linkForm.patient_id || ""} onValueChange={(v) => setLinkForm((f) => ({ ...f, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(lookups.data?.patients ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Convênio</Label>
              <Select value={linkForm.provider_id || ""} onValueChange={(v) => setLinkForm((f) => ({ ...f, provider_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plano</Label>
              <Input value={linkForm.plan_name} onChange={(e) => setLinkForm((f) => ({ ...f, plan_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Carteirinha</Label>
                <Input value={linkForm.card_number} onChange={(e) => setLinkForm((f) => ({ ...f, card_number: e.target.value }))} />
              </div>
              <div>
                <Label>Autorização</Label>
                <Input value={linkForm.authorization_number} onChange={(e) => setLinkForm((f) => ({ ...f, authorization_number: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Validade</Label>
              <Input type="date" value={linkForm.valid_until} onChange={(e) => setLinkForm((f) => ({ ...f, valid_until: e.target.value }))} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={linkForm.notes} onChange={(e) => setLinkForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <SupportGuardButton supportMode={supportMode} onClick={() => saveLink.mutate()} disabled={saveLink.isPending}>
              {saveLink.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vincular
            </SupportGuardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receivableDialogOpen} onOpenChange={setReceivableDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conta a receber — convênio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Vínculo paciente x convênio</Label>
              <Select
                value={receivableForm.patient_health_insurance_id || ""}
                onValueChange={(v) => setReceivableForm((f) => ({ ...f, patient_health_insurance_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeLinks.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.patients?.nome_completo} — {l.health_insurance_providers?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Valor</Label>
                <Input type="number" step="0.01" min={0.01} value={receivableForm.valor} onChange={(e) => setReceivableForm((f) => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <Label>Categoria receita</Label>
                <Select value={receivableForm.category_id || ""} onValueChange={(v) => setReceivableForm((f) => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Emissão</Label>
                <Input type="date" value={receivableForm.data} onChange={(e) => setReceivableForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={receivableForm.data_vencimento} onChange={(e) => setReceivableForm((f) => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Centro de custo (opcional)</Label>
              <Select
                value={receivableForm.cost_center_id || SELECT_ALL}
                onValueChange={(v) => setReceivableForm((f) => ({ ...f, cost_center_id: v === SELECT_ALL ? "" : v }))}
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
            <div>
              <Label>Documento / autorização</Label>
              <Input value={receivableForm.documento} onChange={(e) => setReceivableForm((f) => ({ ...f, documento: e.target.value }))} placeholder="Opcional — usa autorização do vínculo" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={receivableForm.observacoes} onChange={(e) => setReceivableForm((f) => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceivableDialogOpen(false)}>Cancelar</Button>
            <SupportGuardButton supportMode={supportMode} onClick={() => createReceivable.mutate()} disabled={createReceivable.isPending}>
              {createReceivable.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar recebível
            </SupportGuardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
