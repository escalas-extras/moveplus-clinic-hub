import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Copy,
  GitBranch,
  Trash2,
  Save,
  Star,
  LayoutTemplate,
  FileText,
  CheckCircle2,
  Sparkles,
  Library,
} from "lucide-react";
import { toast } from "sonner";
import {
  AppShell,
  PageHeader,
  KpiCard,
  KpiGrid,
  InfoCard,
  EmptyState,
  PageSection,
  SectionHeader,
  clinical,
} from "@/components/layout";
import { cn } from "@/lib/utils";
import { useActiveClinic } from "@/lib/active-clinic";

const DOC_TYPES = [
  { value: "avaliacao_inicial", label: "Avaliação Inicial" },
  { value: "reavaliacao", label: "Reavaliação" },
  { value: "evolucao", label: "Evolução" },
  { value: "relatorio", label: "Relatório" },
  { value: "alta", label: "Alta" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "parecer", label: "Parecer Técnico" },
];

export const Route = createFileRoute("/_authenticated/app/templates")({
  component: TemplatesPage,
});

type Section = { order: number; title: string; content: string };

function TemplatesPage() {
  const qc = useQueryClient();
  const { clinicId, supportMode } = useActiveClinic();
  const [docType, setDocType] = useState("avaliacao_inicial");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    // Bloco B: queryKey inclui clinicId para evitar reuso entre clínicas.
    queryKey: ["templates", clinicId, docType],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .eq("doc_type", docType)
        .eq("clinic_id", clinicId!)
        .order("version", { ascending: false });
      return data || [];
    },
  });

  const { data: mergeTags = [] } = useQuery({
    queryKey: ["merge-tags"],
    queryFn: async () => {
      const { data } = await supabase.from("merge_tags").select("*").order("category");
      return data || [];
    },
  });

  const current = templates.find((t: any) => t.id === selectedId) || templates[0] || null;

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      if (!clinicId) throw new Error("Clínica ativa não identificada.");
      if (payload.clinic_id && payload.clinic_id !== clinicId) {
        throw new Error("Modelo pertence a outra clínica.");
      }
      const { error } = await supabase.from("document_templates").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates", clinicId] });
      toast.success("Modelo salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (t: any) => {
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      if (!clinicId || t.clinic_id !== clinicId) throw new Error("Modelo pertence a outra clínica.");
      const { id, created_at, updated_at, ...rest } = t;
      const { error } = await supabase.from("document_templates").insert({
        ...rest,
        name: `${t.name} (cópia)`,
        is_default: false,
        parent_id: id,
        version: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates", clinicId] }); toast.success("Duplicado"); },
  });

  const newVersion = useMutation({
    mutationFn: async (t: any) => {
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      if (!clinicId || t.clinic_id !== clinicId) throw new Error("Modelo pertence a outra clínica.");
      const { id, created_at, updated_at, ...rest } = t;
      const { error } = await supabase.from("document_templates").insert({
        ...rest,
        parent_id: id,
        version: (t.version || 1) + 1,
        is_default: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates", clinicId] }); toast.success("Nova versão criada"); },
  });

  const setDefault = useMutation({
    mutationFn: async (t: any) => {
      if (supportMode) throw new Error("Modo Suporte ativo: somente leitura.");
      if (!clinicId || t.clinic_id !== clinicId) throw new Error("Modelo pertence a outra clínica.");
      // unset others of same doc_type
      await supabase.from("document_templates").update({ is_default: false })
        .eq("clinic_id", clinicId)
        .eq("doc_type", t.doc_type);
      const { error } = await supabase
        .from("document_templates")
        .update({ is_default: true })
        .eq("clinic_id", clinicId)
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates", clinicId] }); toast.success("Modelo padrão definido"); },
  });

  const createNew = () => {
    if (!clinicId) {
      toast.error("Sem clínica ativa.");
      return;
    }
    upsert.mutate({
      clinic_id: clinicId,
      doc_type: docType,
      name: "Novo modelo",
      is_active: true,
      is_default: false,
      sections: [{ order: 1, title: "Seção 1", content: "{{paciente_nome}}" }],
    });
  };

  const docLabel = DOC_TYPES.find((d) => d.value === docType)?.label ?? "Modelos";
  const totalModelos = templates.length;
  const ativos = templates.filter((t: any) => t.is_active).length;
  const padrao = templates.filter((t: any) => t.is_default).length;
  const personalizados = templates.filter((t: any) => t.parent_id).length;

  return (
    <AppShell clinical>
      <PageHeader
        icon={LayoutTemplate}
        eyebrow="Templates"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Templates" }]}
        title="Modelos profissionais"
        description="Biblioteca de documentos da clínica — crie, versione e personalize modelos clínicos com variáveis automáticas."
        actions={
          <Button onClick={createNew} disabled={supportMode}>
            <Plus className="h-4 w-4 mr-2" /> Novo modelo
          </Button>
        }
      />

      <KpiGrid columns={4}>
        <KpiCard icon={FileText} label="Total de modelos" value={totalModelos} subtitle={docLabel} accent="var(--primary)" hideDelta />
        <KpiCard icon={CheckCircle2} label="Modelos ativos" value={ativos} subtitle={docLabel} accent="#059669" hideDelta />
        <KpiCard icon={Star} label="Modelo padrão" value={padrao} subtitle={docLabel} accent="#d97706" hideDelta />
        <KpiCard icon={GitBranch} label="Personalizados" value={personalizados} subtitle="Versões derivadas" accent="#0284c7" hideDelta />
      </KpiGrid>

      <Tabs value={docType} onValueChange={(v) => { setDocType(v); setSelectedId(null); }} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {DOC_TYPES.map((d) => <TabsTrigger key={d.value} value={d.value}>{d.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={docType} className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Biblioteca de modelos */}
          <PageSection
            icon={Library}
            title="Biblioteca"
            description={`${totalModelos} modelo${totalModelos === 1 ? "" : "s"} em ${docLabel}`}
            contentClassName="p-0"
            className="self-start"
          >
            {templates.length === 0 ? (
              <EmptyState
                icon={LayoutTemplate}
                title="Nenhum modelo nesta categoria"
                description="Crie o primeiro modelo profissional para esta categoria de documento."
                action={{ label: "Novo modelo", onClick: createNew }}
                className="py-12"
              />
            ) : (
              <ul className="max-h-[68vh] divide-y divide-slate-100 overflow-auto">
                {templates.map((t: any) => {
                  const isSel = current?.id === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={cn(
                          "flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-slate-50",
                          clinical.focusRing,
                          isSel && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">{t.name}</span>
                          {t.is_default && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Padrão" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                          {t.is_active ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-[10px] text-emerald-700">Ativo</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-slate-400">Inativo</Badge>
                          )}
                          {t.parent_id && <Badge variant="outline" className="text-[10px]">Personalizado</Badge>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </PageSection>

          {/* Editor / preview */}
          {current ? (
            <TemplateEditor
              template={current}
              mergeTags={mergeTags}
              supportMode={supportMode}
              docLabel={docLabel}
              onSave={(t: any) => upsert.mutate(t)}
              onDuplicate={() => duplicate.mutate(current)}
              onNewVersion={() => newVersion.mutate(current)}
              onSetDefault={() => setDefault.mutate(current)}
            />
          ) : (
            <InfoCard className="self-start">
              <EmptyState
                icon={FileText}
                title="Selecione um modelo"
                description="Escolha um modelo na biblioteca à esquerda ou crie um novo para começar a editar."
                action={{ label: "Novo modelo", onClick: createNew }}
                className="py-16"
              />
            </InfoCard>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function TemplateEditor({ template, mergeTags, supportMode, docLabel, onSave, onDuplicate, onNewVersion, onSetDefault }: any) {
  const [local, setLocal] = useState<any>(template);

  // sync if outside selection changes
  if (local.id !== template.id) setLocal(template);

  const sections: Section[] = Array.isArray(local.sections) ? local.sections : [];

  const updateSection = (i: number, patch: Partial<Section>) => {
    const next = [...sections];
    next[i] = { ...next[i], ...patch };
    setLocal({ ...local, sections: next });
  };

  const addSection = () => {
    setLocal({ ...local, sections: [...sections, { order: sections.length + 1, title: "Nova seção", content: "" }] });
  };
  const removeSection = (i: number) => {
    setLocal({ ...local, sections: sections.filter((_, idx) => idx !== i) });
  };

  const grouped = mergeTags.reduce((acc: any, t: any) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  return (
    <div className="min-w-0 space-y-4">
      {/* Cabeçalho do modelo */}
      <InfoCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name" className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Nome do modelo
                </Label>
                <Input id="tpl-name" value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-desc" className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Descrição
                </Label>
                <Input id="tpl-desc" value={local.description || ""} onChange={(e) => setLocal({ ...local, description: e.target.value })} placeholder="Breve descrição do uso" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
                <Switch checked={local.is_active} onCheckedChange={(v) => setLocal({ ...local, is_active: v })} />
                <span className="text-sm font-medium text-slate-700">Ativo</span>
              </label>
              <Badge variant="outline" className="text-xs">Versão {local.version}</Badge>
              <Badge variant="outline" className="text-xs">{docLabel}</Badge>
              {local.is_default && (
                <Badge variant="secondary" className="bg-amber-50 text-xs text-amber-700">
                  <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" /> Padrão
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
            <Button size="sm" onClick={() => onSave(local)} disabled={supportMode}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
            <Button size="sm" variant="outline" onClick={onDuplicate} disabled={supportMode}><Copy className="h-4 w-4 mr-2" /> Duplicar</Button>
            <Button size="sm" variant="outline" onClick={onNewVersion} disabled={supportMode}><GitBranch className="h-4 w-4 mr-2" /> Nova versão</Button>
            {!local.is_default && <Button size="sm" variant="outline" onClick={onSetDefault} disabled={supportMode}><Star className="h-4 w-4 mr-2" /> Definir padrão</Button>}
          </div>
        </div>
      </InfoCard>

      {/* Seções + variáveis */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <PageSection
          icon={FileText}
          title="Seções do documento"
          description="Estruture o conteúdo do modelo. Use variáveis para preenchimento automático."
          actions={
            <Button size="sm" variant="outline" onClick={addSection}>
              <Plus className="h-4 w-4 mr-1.5" /> Seção
            </Button>
          }
          contentClassName="space-y-3"
        >
          {sections.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sem seções"
              description="Adicione a primeira seção para começar a estruturar o documento."
              action={{ label: "Adicionar seção", onClick: addSection }}
              className="py-10"
            />
          ) : (
            sections.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <Input
                    value={s.title}
                    onChange={(e) => updateSection(i, { title: e.target.value })}
                    placeholder="Título da seção"
                    className="flex-1 font-medium"
                  />
                  <Button size="icon" variant="ghost" className="text-slate-400 hover:text-destructive" onClick={() => removeSection(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={s.content}
                  onChange={(e) => updateSection(i, { content: e.target.value })}
                  rows={6}
                  placeholder="Conteúdo da seção — use {{variavel}} para preenchimento automático."
                  className="bg-white font-mono text-sm leading-relaxed"
                />
              </div>
            ))
          )}
        </PageSection>

        <InfoCard className="self-start xl:sticky xl:top-4">
          <SectionHeader
            icon={Sparkles}
            title="Variáveis de mesclagem"
            description="Clique para copiar e cole no conteúdo."
            className="mb-3"
          />
          <div className="max-h-[60vh] space-y-4 overflow-auto pr-1">
            {Object.keys(grouped).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma variável disponível.</p>
            )}
            {Object.entries(grouped).map(([cat, tags]: any) => (
              <div key={cat}>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t: any) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => navigator.clipboard.writeText(`{{${t.tag}}}`).then(() => toast.success(`{{${t.tag}}} copiado`))}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      title={t.description}
                    >
                      {`{{${t.tag}}}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>
    </div>
  );
}
