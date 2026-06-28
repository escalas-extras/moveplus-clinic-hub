import { useForm } from "react-hook-form";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Eye,
  Star,
  TrendingUp,
  Minus,
  TrendingDown,
  Activity,
  History,
  Stethoscope,
  Zap,
  FileText,
} from "lucide-react";
import { PdfPreviewDialog } from "@/components/pdf-preview-dialog";
import { buildEvolutionPdfOpts } from "@/lib/pdf-builders";
import { useActiveClinic } from "@/lib/active-clinic";
import { EvaScale } from "@/components/clinical/eva-scale";
import { EmptyState, InfoCard, StatusBadge, AutosaveIndicator, ClinicalSkeleton } from "@/components/layout";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormInput = {
  professional_id: string;
  data: string;
  hora: string;
  sessao_numero?: number | null;
  procedimentos?: string;
  resposta_paciente?: string;
  evolucao_observada?: string;
  conduta?: string;
  intercorrencias?: string;
  proximos_objetivos?: string;
  inspecao?: string;
  palpacao?: string;
  observacoes_gerais?: string;
  exercicios?: string;
  recursos_terapeuticos?: string;
  orientacoes?: string;
  soap_s?: string;
  soap_o?: string;
  soap_a?: string;
  soap_p?: string;
};

type PainRow = { local: string; repouso: string; movimento: string; fatores: string; impacto: string };
type EvolutionIndicator = "melhorou" | "estavel" | "piorou" | null;

type FavoriteSnippet = {
  id: string;
  label: string;
  target: keyof FormInput;
  content: string;
};

const FAVORITES_KEY = "moveplus-evo-favorites";
const DRAFT_KEY_PREFIX = "moveplus-evo-draft";

function loadFavorites(clinicId: string): FavoriteSnippet[] {
  try {
    const raw = localStorage.getItem(`${FAVORITES_KEY}-${clinicId}`);
    return raw ? (JSON.parse(raw) as FavoriteSnippet[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(clinicId: string, items: FavoriteSnippet[]) {
  localStorage.setItem(`${FAVORITES_KEY}-${clinicId}`, JSON.stringify(items));
}

export function EvolutionForm({
  patientId,
  assessmentId,
  patient,
  onDone,
}: {
  patientId: string;
  assessmentId?: string;
  patient?: any;
  onDone: () => void;
}) {
  const today = new Date();
  const { clinicId } = useActiveClinic();
  const [eva, setEva] = useState<number>(0);
  const [indicator, setIndicator] = useState<EvolutionIndicator>(null);
  const [sv, setSv] = useState<Record<string, string>>({
    pa: "",
    fc: "",
    fr: "",
    pr: "",
    spo2: "",
    ausculta: "",
    tosse: "",
    secrecao: "",
    tonus: "",
    trofismo: "",
    clonus: "",
    nivel_consciencia: "",
  });
  const [dor, setDor] = useState<PainRow[]>([
    { local: "", repouso: "", movimento: "", fatores: "", impacto: "" },
  ]);
  const [pdfPreview, setPdfPreview] = useState<ReturnType<typeof buildEvolutionPdfOpts> | null>(null);
  const [favorites, setFavorites] = useState<FavoriteSnippet[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRestored = useRef(false);

  const { register, handleSubmit, setValue, watch, getValues } = useForm<FormInput>({
    defaultValues: {
      data: today.toISOString().slice(0, 10),
      hora: today.toTimeString().slice(0, 5),
    },
  });

  const formValues = watch();
  const professional_id = watch("professional_id");

  const profs = useQuery({
    queryKey: ["professionals-active", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("professionals")
        .select("id, nome, profissao, conselho, registro")
        .eq("clinic_id", clinicId!)
        .eq("situacao", "ativo")
        .order("nome");
      return data ?? [];
    },
  });

  const history = useQuery({
    queryKey: ["evolutions-history", clinicId, patientId],
    enabled: !!clinicId && !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evolutions")
        .select(
          "id, data, hora, sessao_numero, eva, procedimentos, conduta, resposta_paciente, evolucao_observada, proximos_objetivos, locked_at, sinais_vitais, professionals(nome)",
        )
        .eq("clinic_id", clinicId!)
        .eq("patient_id", patientId)
        .order("data", { ascending: false })
        .order("hora", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });

  const previousEvolution = history.data?.[0] ?? null;

  const profName = useMemo(
    () => profs.data?.find((p) => p.id === professional_id)?.nome ?? "—",
    [profs.data, professional_id],
  );

  const diagnosis = useMemo(() => {
    return patient?.cid_principal || patient?.diagnostico_clinico || "—";
  }, [patient]);

  useEffect(() => {
    if (clinicId) setFavorites(loadFavorites(clinicId));
  }, [clinicId]);

  useEffect(() => {
    if (draftRestored.current || !patientId) return;
    const key = `${DRAFT_KEY_PREFIX}-${patientId}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.form) {
        Object.entries(d.form).forEach(([k, v]) => setValue(k as keyof FormInput, v as any));
      }
      if (d.eva != null) setEva(d.eva);
      if (d.indicator) setIndicator(d.indicator);
      if (d.sv) setSv(d.sv);
      if (d.dor) setDor(d.dor);
      if (d.savedAt) setLastSavedAt(new Date(d.savedAt));
      draftRestored.current = true;
      toast.info("Rascunho de evolução recuperado");
    } catch {
      /* ignore */
    }
  }, [patientId, setValue]);

  const persistLocalDraft = useCallback(async () => {
    if (!patientId) return;
    setSavingDraft(true);
    try {
      const payload = {
        form: getValues(),
        eva,
        indicator,
        sv,
        dor,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(`${DRAFT_KEY_PREFIX}-${patientId}`, JSON.stringify(payload));
      setLastSavedAt(new Date());
    } finally {
      setSavingDraft(false);
    }
  }, [patientId, getValues, eva, indicator, sv, dor]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void persistLocalDraft(), 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [JSON.stringify(formValues), eva, indicator, sv, dor, persistLocalDraft]);

  const save = useMutation({
    mutationFn: async (v: FormInput) => {
      if (!clinicId) throw new Error("Clínica ativa não identificada");
      const { data: u } = await supabase.auth.getUser();

      const soapActive = !!(v.soap_s || v.soap_o || v.soap_a || v.soap_p);
      const resposta = soapActive ? (v.soap_s || v.resposta_paciente) : v.resposta_paciente;
      const inspecao = soapActive
        ? [v.soap_o, v.inspecao].filter(Boolean).join("\n\n")
        : v.inspecao;
      const evolucao = soapActive ? (v.soap_a || v.evolucao_observada) : v.evolucao_observada;
      const condutaMerged = [
        soapActive ? v.soap_p : null,
        v.conduta,
        v.recursos_terapeuticos && `Recursos terapêuticos:\n${v.recursos_terapeuticos}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const procedimentosMerged = [v.procedimentos, v.exercicios && `Exercícios:\n${v.exercicios}`]
        .filter(Boolean)
        .join("\n\n");
      const observacoesMerged = [v.orientacoes, v.observacoes_gerais].filter(Boolean).join("\n\n");

      const sinais_vitais = {
        ...sv,
        indicador_evolucao: indicator,
        soap: soapActive ? { s: v.soap_s, o: v.soap_o, a: v.soap_a, p: v.soap_p } : null,
      };

      const { error } = await supabase.from("evolutions").insert({
        clinic_id: clinicId,
        patient_id: patientId,
        assessment_id: assessmentId ?? null,
        professional_id: v.professional_id,
        data: v.data,
        hora: v.hora,
        sessao_numero: v.sessao_numero || null,
        pa: sv.pa || null,
        fc: sv.fc || null,
        fr: sv.fr || null,
        spo2: sv.spo2 || null,
        eva,
        sinais_vitais,
        avaliacao_algica: dor.filter(
          (r) => r.local || r.repouso || r.movimento || r.fatores || r.impacto,
        ),
        inspecao: inspecao || null,
        palpacao: v.palpacao || null,
        nivel_consciencia: sv.nivel_consciencia || null,
        observacoes_gerais: observacoesMerged || null,
        procedimentos: procedimentosMerged || null,
        resposta_paciente: resposta || null,
        evolucao_observada: evolucao || null,
        conduta: condutaMerged || null,
        intercorrencias: v.intercorrencias || null,
        proximos_objetivos: v.proximos_objetivos || null,
        created_by: u.user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      localStorage.removeItem(`${DRAFT_KEY_PREFIX}-${patientId}`);
      toast.success("Evolução registrada");
      onDone();
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const openPreview = () => {
    const v = watch();
    const prof = profs.data?.find((p) => p.id === v.professional_id);
    const preview: any = {
      ...v,
      professionals: prof,
      eva,
      sinais_vitais: { ...sv, indicador_evolucao: indicator },
      avaliacao_algica: dor.filter((r) => r.local || r.repouso || r.movimento || r.fatores || r.impacto),
      pa: sv.pa,
      fc: sv.fc,
      fr: sv.fr,
      spo2: sv.spo2,
      nivel_consciencia: sv.nivel_consciencia || null,
    };
    setPdfPreview(buildEvolutionPdfOpts(preview, patient));
  };

  const addFavorite = (target: keyof FormInput, label: string) => {
    if (!clinicId) return;
    const content = getValues(target) as string;
    if (!content?.trim()) {
      toast.error("Preencha o campo antes de favoritar");
      return;
    }
    const item: FavoriteSnippet = {
      id: crypto.randomUUID(),
      label,
      target,
      content: content.trim(),
    };
    const next = [item, ...favorites].slice(0, 20);
    setFavorites(next);
    saveFavorites(clinicId, next);
    toast.success("Adicionado aos favoritos");
  };

  const applyFavorite = (fav: FavoriteSnippet) => {
    const cur = (getValues(fav.target) as string) ?? "";
    setValue(fav.target, cur ? `${cur}\n\n${fav.content}` : fav.content, { shouldDirty: true });
    toast.success(`"${fav.label}" aplicado`);
  };

  const removeFavorite = (id: string) => {
    if (!clinicId) return;
    const next = favorites.filter((f) => f.id !== id);
    setFavorites(next);
    saveFavorites(clinicId, next);
  };

  if (profs.isLoading) {
    return <ClinicalSkeleton variant="wizard" />;
  }

  return (
    <div className="dashboard-premium clinical-module space-y-4">
      <InfoCard icon={Stethoscope} title="Evolução clínica" description="Prontuário evolutivo premium da sessão.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <HeaderField label="Paciente" value={patient?.nome_completo ?? "—"} />
          <HeaderField label="Sessão" value={formValues.sessao_numero ? `#${formValues.sessao_numero}` : "—"} />
          <HeaderField label="Diagnóstico" value={diagnosis} className="sm:col-span-2 lg:col-span-1" />
          <HeaderField label="Data" value={fmtDate(formValues.data)} />
          <HeaderField label="Profissional" value={profName} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <IndicatorPicker value={indicator} onChange={setIndicator} />
          <AutosaveIndicator saving={savingDraft} lastSavedAt={lastSavedAt} />
        </div>
      </InfoCard>

      {previousEvolution && (
        <ComparisonPanel current={{ eva, indicator, values: formValues }} previous={previousEvolution as any} />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 min-w-0">
          {assessmentId && (
            <p className="rounded-xl border border-sky-200/80 bg-sky-50/60 px-3 py-2 text-xs text-sky-800">
              Esta evolução será vinculada à avaliação selecionada.
            </p>
          )}

          <InfoCard icon={Activity} title="Identificação da sessão">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <RequiredLabel filled={!!professional_id}>Profissional</RequiredLabel>
                <Select value={professional_id ?? ""} onValueChange={(v) => setValue("professional_id", v)}>
                  <SelectTrigger className={cn("mt-1.5 rounded-xl", !professional_id && "border-destructive")}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {profs.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <RequiredLabel filled={!!formValues.data}>Data</RequiredLabel>
                <Input type="date" required className="mt-1.5 rounded-xl" {...register("data")} />
              </div>
              <div>
                <RequiredLabel filled={!!formValues.hora}>Hora</RequiredLabel>
                <Input type="time" required className="mt-1.5 rounded-xl" {...register("hora")} />
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sessão nº
              </Label>
              <Input type="number" className="mt-1.5 max-w-[140px] rounded-xl" {...register("sessao_numero", { valueAsNumber: true })} />
            </div>
          </InfoCard>

          <Tabs defaultValue="rapida" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 rounded-xl">
              <TabsTrigger value="rapida" className="gap-1.5 rounded-lg">
                <Zap className="h-4 w-4" />
                SOAP
              </TabsTrigger>
              <TabsTrigger value="completa" className="gap-1.5 rounded-lg">
                <FileText className="h-4 w-4" />
                Completa
              </TabsTrigger>
              <TabsTrigger value="vitals" className="gap-1.5 rounded-lg">
                <Activity className="h-4 w-4" />
                Sinais vitais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rapida" className="space-y-4">
              <InfoCard icon={Zap} title="Evolução rápida (SOAP)" description="Registro objetivo para uso diário.">
                <div className="space-y-3">
                  <FavoriteField
                    label="S — Subjetivo (relato do paciente)"
                    field="soap_s"
                    register={register}
                    onFavorite={() => addFavorite("soap_s", "SOAP Subjetivo")}
                  />
                  <FavoriteField
                    label="O — Objetivo (achados clínicos)"
                    field="soap_o"
                    register={register}
                    onFavorite={() => addFavorite("soap_o", "SOAP Objetivo")}
                  />
                  <FavoriteField
                    label="A — Avaliação (interpretação)"
                    field="soap_a"
                    register={register}
                    onFavorite={() => addFavorite("soap_a", "SOAP Avaliação")}
                  />
                  <FavoriteField
                    label="P — Plano (conduta da sessão)"
                    field="soap_p"
                    register={register}
                    onFavorite={() => addFavorite("soap_p", "SOAP Plano")}
                  />
                </div>
              </InfoCard>
            </TabsContent>

            <TabsContent value="completa" className="space-y-4">
              <InfoCard icon={FileText} title="Objetivos" description="Metas terapêuticas da sessão.">
                <FavoriteField
                  label="Próximos objetivos"
                  field="proximos_objetivos"
                  register={register}
                  rows={3}
                  onFavorite={() => addFavorite("proximos_objetivos", "Objetivos")}
                />
              </InfoCard>
              <InfoCard icon={FileText} title="Condutas e procedimentos">
                <div className="space-y-3">
                  <FavoriteField label="Conduta aplicada" field="procedimentos" register={register} rows={2} onFavorite={() => addFavorite("procedimentos", "Conduta")} />
                  <FavoriteField label="Conduta / próximos passos" field="conduta" register={register} rows={2} onFavorite={() => addFavorite("conduta", "Próximos passos")} />
                </div>
              </InfoCard>
              <InfoCard icon={FileText} title="Exercícios e recursos">
                <div className="space-y-3">
                  <FavoriteField label="Exercícios prescritos" field="exercicios" register={register} rows={3} onFavorite={() => addFavorite("exercicios", "Exercícios")} />
                  <FavoriteField label="Recursos terapêuticos" field="recursos_terapeuticos" register={register} rows={2} onFavorite={() => addFavorite("recursos_terapeuticos", "Recursos")} />
                </div>
              </InfoCard>
              <InfoCard icon={FileText} title="Orientações e resposta">
                <div className="space-y-3">
                  <FavoriteField label="Orientações ao paciente" field="orientacoes" register={register} rows={2} onFavorite={() => addFavorite("orientacoes", "Orientações")} />
                  <FavoriteField label="Resposta do paciente" field="resposta_paciente" register={register} rows={2} onFavorite={() => addFavorite("resposta_paciente", "Resposta")} />
                  <FavoriteField label="Resultados obtidos" field="evolucao_observada" register={register} rows={2} onFavorite={() => addFavorite("evolucao_observada", "Resultados")} />
                  <FavoriteField label="Intercorrências" field="intercorrencias" register={register} rows={2} onFavorite={() => addFavorite("intercorrencias", "Intercorrências")} />
                  <FavoriteField label="Observações gerais" field="observacoes_gerais" register={register} rows={2} onFavorite={() => addFavorite("observacoes_gerais", "Observações")} />
                </div>
              </InfoCard>
              <InfoCard icon={Activity} title="Exame físico resumido">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FavoriteField label="Inspeção" field="inspecao" register={register} rows={2} onFavorite={() => addFavorite("inspecao", "Inspeção")} />
                  <FavoriteField label="Palpação" field="palpacao" register={register} rows={2} onFavorite={() => addFavorite("palpacao", "Palpação")} />
                </div>
              </InfoCard>
            </TabsContent>

            <TabsContent value="vitals" className="space-y-4">
              <InfoCard icon={Activity} title="Sinais vitais e avaliação álgica">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      { id: "pa", label: "PA" },
                      { id: "fc", label: "FC (bpm)" },
                      { id: "fr", label: "FR (irpm)" },
                      { id: "pr", label: "PR" },
                      { id: "spo2", label: "SpO₂ (%)" },
                    ].map((f) => (
                      <div key={f.id}>
                        <Label className="text-[10px] font-semibold uppercase">{f.label}</Label>
                        <Input
                          className="mt-1 rounded-xl"
                          value={sv[f.id] ?? ""}
                          onChange={(e) => setSv((s) => ({ ...s, [f.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { id: "ausculta", label: "Ausculta pulmonar" },
                      { id: "tosse", label: "Tosse" },
                      { id: "secrecao", label: "Secreção" },
                      { id: "tonus", label: "Tônus" },
                      { id: "trofismo", label: "Trofismo" },
                      { id: "clonus", label: "Clônus" },
                    ].map((f) => (
                      <div key={f.id}>
                        <Label className="text-[10px] font-semibold uppercase">{f.label}</Label>
                        <Input
                          className="mt-1 rounded-xl"
                          value={sv[f.id] ?? ""}
                          onChange={(e) => setSv((s) => ({ ...s, [f.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold uppercase">Nível de consciência</Label>
                    <Select value={sv.nivel_consciencia} onValueChange={(v) => setSv((s) => ({ ...s, nivel_consciencia: v }))}>
                      <SelectTrigger className="mt-1 rounded-xl">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lucido_orientado">Lúcido e orientado</SelectItem>
                        <SelectItem value="lucido_confusao">Lúcido com períodos de confusão</SelectItem>
                        <SelectItem value="desorientado">Desorientado</SelectItem>
                        <SelectItem value="inconsciente">Inconsciente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <EvaScale label="EVA (dor geral)" value={eva} onChange={setEva} />
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Local</th>
                          <th className="p-2 text-left">Repouso</th>
                          <th className="p-2 text-left">Movim.</th>
                          <th className="p-2 text-left">Fatores</th>
                          <th className="p-2 text-left">Impacto AVDs</th>
                          <th className="p-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {dor.map((row, i) => (
                          <tr key={i} className="border-t align-top">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            <td className="p-2">
                              <Input value={row.local} onChange={(e) => setDor((arr) => arr.map((x, idx) => (idx === i ? { ...x, local: e.target.value } : x)))} />
                            </td>
                            <td className="p-2">
                              <Input type="number" min={0} max={10} value={row.repouso} onChange={(e) => setDor((arr) => arr.map((x, idx) => (idx === i ? { ...x, repouso: e.target.value } : x)))} />
                            </td>
                            <td className="p-2">
                              <Input type="number" min={0} max={10} value={row.movimento} onChange={(e) => setDor((arr) => arr.map((x, idx) => (idx === i ? { ...x, movimento: e.target.value } : x)))} />
                            </td>
                            <td className="p-2">
                              <Input value={row.fatores} onChange={(e) => setDor((arr) => arr.map((x, idx) => (idx === i ? { ...x, fatores: e.target.value } : x)))} />
                            </td>
                            <td className="p-2">
                              <Input value={row.impacto} onChange={(e) => setDor((arr) => arr.map((x, idx) => (idx === i ? { ...x, impacto: e.target.value } : x)))} />
                            </td>
                            <td className="p-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => setDor((arr) => arr.filter((_, idx) => idx !== i))}>
                                ×
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setDor((arr) => [...arr, { local: "", repouso: "", movimento: "", fatores: "", impacto: "" }])}
                  >
                    + Adicionar local de dor
                  </Button>
                </div>
              </InfoCard>
            </TabsContent>
          </Tabs>

          <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)] backdrop-blur">
            <Button type="button" variant="outline" className="rounded-xl" onClick={openPreview}>
              <Eye className="mr-1 h-4 w-4" />
              Pré-visualizar
            </Button>
            <Button type="submit" className="rounded-xl" disabled={save.isPending || !professional_id}>
              {save.isPending ? "Salvando…" : "Registrar evolução"}
            </Button>
          </div>

          <PdfPreviewDialog
            open={!!pdfPreview}
            onOpenChange={(o) => !o && setPdfPreview(null)}
            pdfOpts={pdfPreview}
            title="Pré-visualização do PDF"
          />
        </form>

        <aside className="space-y-4">
          <InfoCard icon={History} title="Histórico lateral" description="Evoluções anteriores do paciente.">
            {history.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : !history.data?.length ? (
              <EmptyState icon={History} title="Primeira evolução" description="Nenhuma sessão anterior registrada." className="py-6" />
            ) : (
              <ul className="max-h-[320px] space-y-2 overflow-y-auto divide-y divide-slate-100">
                {(history.data as any[]).map((e) => {
                  const ind = e.sinais_vitais?.indicador_evolucao;
                  return (
                    <li key={e.id} className="py-2 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold tabular-nums text-primary">
                            {fmtDate(e.data)} · {String(e.hora).slice(0, 5)}
                            {e.sessao_numero ? ` · #${e.sessao_numero}` : ""}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {e.evolucao_observada || e.procedimentos || e.resposta_paciente || "—"}
                          </p>
                        </div>
                        {ind === "melhorou" && <StatusBadge variant="success">↑</StatusBadge>}
                        {ind === "estavel" && <StatusBadge variant="info">=</StatusBadge>}
                        {ind === "piorou" && <StatusBadge variant="danger">↓</StatusBadge>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </InfoCard>

          <InfoCard icon={Star} title="Favoritos" description="Snippets reutilizáveis da clínica.">
            {favorites.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Sem favoritos"
                description="Use o ícone ★ nos campos para salvar textos frequentes."
                className="py-6"
              />
            ) : (
              <ul className="max-h-[240px] space-y-2 overflow-y-auto">
                {favorites.map((f) => (
                  <li key={f.id} className="rounded-xl border border-slate-200/80 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => applyFavorite(f)}>
                        <div className="text-xs font-semibold text-slate-950">{f.label}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{f.content}</div>
                      </button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={() => removeFavorite(f.id)}>
                        ×
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>
        </aside>
      </div>
    </div>
  );
}

function HeaderField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function RequiredLabel({ children, filled }: { children: ReactNode; filled?: boolean }) {
  return (
    <Label className={cn("text-xs font-semibold uppercase tracking-wider", !filled && "text-destructive")}>
      {children}
      <span className="ml-0.5 text-destructive">*</span>
    </Label>
  );
}

function IndicatorPicker({
  value,
  onChange,
}: {
  value: EvolutionIndicator;
  onChange: (v: EvolutionIndicator) => void;
}) {
  const options: { id: EvolutionIndicator; label: string; icon: typeof TrendingUp; variant: "success" | "info" | "danger" }[] = [
    { id: "melhorou", label: "Melhorou", icon: TrendingUp, variant: "success" },
    { id: "estavel", label: "Estável", icon: Minus, variant: "info" },
    { id: "piorou", label: "Piorou", icon: TrendingDown, variant: "danger" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Indicador:</span>
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.id;
        return (
          <Button
            key={o.id}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            className={cn("rounded-xl gap-1.5", active && o.variant === "success" && "bg-emerald-600 hover:bg-emerald-700")}
            onClick={() => onChange(active ? null : o.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}

function ComparisonPanel({
  current,
  previous,
}: {
  current: { eva: number; indicator: EvolutionIndicator; values: FormInput };
  previous: any;
}) {
  const prevInd = previous.sinais_vitais?.indicador_evolucao as EvolutionIndicator;
  const prevEva = previous.eva ?? 0;
  const evaDelta = current.eva - prevEva;

  return (
    <InfoCard icon={Activity} title="Comparação com evolução anterior" description={`Referência: ${fmtDate(previous.data)} · Sessão ${previous.sessao_numero ? `#${previous.sessao_numero}` : "—"}`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <CompareCell label="EVA (dor)" current={`${current.eva}`} previous={`${prevEva}`} delta={evaDelta !== 0 ? `${evaDelta > 0 ? "+" : ""}${evaDelta}` : "="} />
        <CompareCell
          label="Indicador"
          current={current.indicator ?? "—"}
          previous={prevInd ?? "—"}
        />
        <CompareCell
          label="Conduta anterior"
          current={current.values.conduta?.slice(0, 40) || "—"}
          previous={previous.conduta?.slice(0, 40) || "—"}
          multiline
        />
      </div>
    </InfoCard>
  );
}

function CompareCell({
  label,
  current,
  previous,
  delta,
  multiline,
}: {
  label: string;
  current: string;
  previous: string;
  delta?: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-[10px] text-muted-foreground">Atual</div>
          <div className={cn("font-medium", multiline && "line-clamp-2")}>{current}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Anterior</div>
          <div className={cn("text-muted-foreground", multiline && "line-clamp-2")}>{previous}</div>
        </div>
      </div>
      {delta && <div className="mt-1.5 text-xs font-semibold text-primary">Δ {delta}</div>}
    </div>
  );
}

function FavoriteField({
  label,
  field,
  register,
  rows = 2,
  onFavorite,
}: {
  label: string;
  field: keyof FormInput;
  register: ReturnType<typeof useForm<FormInput>>["register"];
  rows?: number;
  onFavorite: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg px-2" onClick={onFavorite} title="Favoritar">
          <Star className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Textarea rows={rows} className="rounded-xl" {...register(field)} />
    </div>
  );
}
