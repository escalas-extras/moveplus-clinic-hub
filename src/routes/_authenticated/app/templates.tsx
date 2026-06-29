import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Search,
  Clock3,
  Globe2,
  UserRound,
  Tags,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ShieldCheck,
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

const COLLECTIONS = [
  { value: "todos", label: "Todos", icon: Library },
  { value: "favoritos", label: "Favoritos", icon: Star },
  { value: "recentes", label: "Recentes", icon: Clock3 },
  { value: "globais", label: "Globais", icon: Globe2 },
  { value: "personalizados", label: "Personalizados", icon: UserRound },
] as const;

export const Route = createFileRoute("/_authenticated/app/templates")({
  component: TemplatesPage,
});

type Section = { order: number; title: string; content: string };
type CollectionFilter = (typeof COLLECTIONS)[number]["value"];

function getDocLabel(docType: string) {
  return DOC_TYPES.find((d) => d.value === docType)?.label ?? "Modelo";
}

function getSections(template: any): Section[] {
  return Array.isArray(template?.sections) ? template.sections : [];
}

function getTemplateText(template: any) {
  return getSections(template)
    .map((section) => [section.title, section.content].filter(Boolean).join(" "))
    .join(" ");
}

function getPreviewText(template: any) {
  const text = getTemplateText(template).replace(/\{\{([^}]+)\}\}/g, "$1");
  return text.trim() || template?.description || "Modelo pronto para estruturar documentos clínicos.";
}

function countWords(template: any) {
  const words = getTemplateText(template).trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function isRecent(template: any) {
  const date = new Date(template?.updated_at ?? template?.created_at ?? 0).getTime();
  if (!date) return false;
  return Date.now() - date <= 1000 * 60 * 60 * 24 * 30;
}

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleDateString("pt-BR");
}

function TemplatesPage() {
  const qc = useQueryClient();
  const { clinicId, supportMode } = useActiveClinic();
  const [docType, setDocType] = useState("avaliacao_inicial");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState<CollectionFilter>("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [versionFilter, setVersionFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

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

  const docLabel = getDocLabel(docType);
  const versions = useMemo(
    () =>
      Array.from(new Set((templates as any[]).map((t) => Number(t.version ?? 1))))
        .filter(Boolean)
        .sort((a, b) => b - a),
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (templates as any[]).filter((template) => {
      const text = [
        template.name,
        template.description,
        getDocLabel(template.doc_type),
        getTemplateText(template),
        template.is_default ? "padrao padrão" : "",
        template.parent_id ? "personalizado" : "global base",
      ]
        .join(" ")
        .toLowerCase();

      if (q && !text.includes(q)) return false;
      if (collection === "favoritos" && !favoriteIds.has(template.id)) return false;
      if (collection === "recentes" && !isRecent(template)) return false;
      if (collection === "globais" && template.parent_id) return false;
      if (collection === "personalizados" && !template.parent_id) return false;
      if (typeFilter === "padrao" && !template.is_default) return false;
      if (typeFilter === "base" && template.parent_id) return false;
      if (typeFilter === "personalizado" && !template.parent_id) return false;
      if (versionFilter !== "todas" && String(template.version ?? 1) !== versionFilter) return false;
      if (statusFilter === "ativo" && !template.is_active) return false;
      if (statusFilter === "inativo" && template.is_active) return false;
      if (statusFilter === "padrao" && !template.is_default) return false;
      return true;
    });
  }, [templates, search, collection, favoriteIds, typeFilter, versionFilter, statusFilter]);

  const current =
    (templates as any[]).find((t: any) => t.id === selectedId) ||
    filteredTemplates[0] ||
    (templates as any[])[0] ||
    null;

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

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalModelos = templates.length;
  const ativos = (templates as any[]).filter((t: any) => t.is_active).length;
  const padrao = (templates as any[]).filter((t: any) => t.is_default).length;
  const personalizados = (templates as any[]).filter((t: any) => t.parent_id).length;

  return (
    <AppShell clinical>
      <PageHeader
        icon={LayoutTemplate}
        eyebrow="Templates"
        breadcrumbs={[{ label: "Clínica", to: "/app" }, { label: "Templates" }]}
        title="Marketplace de modelos"
        description="Biblioteca premium para organizar, comparar e personalizar documentos clínicos com aparência comercial."
        actions={
          <Button onClick={createNew} disabled={supportMode}>
            <Plus className="h-4 w-4 mr-2" /> Novo modelo
          </Button>
        }
      />

      <KpiGrid columns={4}>
        <KpiCard icon={FileText} label="Total de modelos" value={totalModelos} subtitle={docLabel} accent="var(--primary)" hideDelta />
        <KpiCard icon={CheckCircle2} label="Modelos ativos" value={ativos} subtitle="Prontos para emissão" accent="#059669" hideDelta />
        <KpiCard icon={Star} label="Favoritos" value={favoriteIds.size} subtitle="Seleção visual" accent="#d97706" hideDelta />
        <KpiCard icon={GitBranch} label="Personalizados" value={personalizados} subtitle="Versões derivadas" accent="#0284c7" hideDelta />
      </KpiGrid>

      <Tabs
        value={docType}
        onValueChange={(v) => {
          setDocType(v);
          setSelectedId(null);
        }}
        className="space-y-4"
      >
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {DOC_TYPES.map((d) => <TabsTrigger key={d.value} value={d.value}>{d.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={docType} className="space-y-4">
          <InfoCard className="overflow-hidden">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_160px_150px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, conteúdo, categoria ou tag..."
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="base">Globais</SelectItem>
                  <SelectItem value="personalizado">Personalizados</SelectItem>
                  <SelectItem value="padrao">Padrão</SelectItem>
                </SelectContent>
              </Select>
              <Select value={versionFilter} onValueChange={setVersionFilter}>
                <SelectTrigger><SelectValue placeholder="Versão" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas versões</SelectItem>
                  {versions.map((version) => (
                    <SelectItem key={version} value={String(version)}>v{version}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                  <SelectItem value="padrao">Padrão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {COLLECTIONS.map((item) => {
                const Icon = item.icon;
                const active = collection === item.value;
                return (
                  <Button
                    key={item.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className={cn("h-8 gap-1.5 rounded-full px-3 text-xs", !active && "bg-white")}
                    onClick={() => setCollection(item.value)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </InfoCard>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
            <PageSection
              icon={Library}
              title="Biblioteca marketplace"
              description={`${filteredTemplates.length} de ${totalModelos} modelo${totalModelos === 1 ? "" : "s"} em ${docLabel}`}
              contentClassName="p-0"
              className="self-start overflow-hidden"
            >
              {templates.length === 0 ? (
                <EmptyState
                  icon={LayoutTemplate}
                  title="Comece com um modelo"
                  description="Crie o primeiro modelo para esta categoria de documento."
                  action={{ label: "Novo modelo", onClick: createNew }}
                  className="py-12"
                />
              ) : filteredTemplates.length === 0 ? (
                <EmptyState
                  icon={SlidersHorizontal}
                  title="Nada encontrado"
                  description="Ajuste a busca, categoria ou filtros para ver mais modelos."
                  className="py-12"
                />
              ) : (
                <div className="grid max-h-[74vh] gap-3 overflow-auto p-3 md:grid-cols-2">
                  {filteredTemplates.map((template: any) => (
                    <TemplateMarketplaceCard
                      key={template.id}
                      template={template}
                      selected={current?.id === template.id}
                      favorite={favoriteIds.has(template.id)}
                      onSelect={() => setSelectedId(template.id)}
                      onToggleFavorite={() => toggleFavorite(template.id)}
                    />
                  ))}
                </div>
              )}
            </PageSection>

            {current ? (
              <TemplateEditor
                template={current}
                mergeTags={mergeTags}
                supportMode={supportMode}
                docLabel={docLabel}
                saving={upsert.isPending}
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
                  description="Escolha um modelo na biblioteca ou crie um novo para começar a editar."
                  action={{ label: "Novo modelo", onClick: createNew }}
                  className="py-16"
                />
              </InfoCard>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function TemplateMarketplaceCard({
  template,
  selected,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  template: any;
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const sections = getSections(template);
  const preview = getPreviewText(template);
  const author = template.parent_id ? "Equipe da clínica" : "Modelo global";
  const tags = [
    getDocLabel(template.doc_type),
    template.is_default ? "Padrão" : null,
    template.parent_id ? "Personalizado" : "Global",
    `${sections.length} seção${sections.length === 1 ? "" : "ões"}`,
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex min-h-[260px] flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm",
        clinical.cardHover,
        selected ? "border-primary/50 ring-2 ring-primary/18" : "border-slate-200",
        clinical.focusRing,
      )}
    >
      <div className="relative border-b bg-[linear-gradient(135deg,#f8fafc,#eef8f5)] p-4">
        <div className="absolute right-3 top-3 flex gap-1">
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
            v{template.version ?? 1}
          </span>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ring-1",
            template.is_active
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : "bg-slate-50 text-slate-500 ring-slate-200",
          )}>
            {template.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
        <div className="flex h-24 flex-col justify-between rounded-lg border border-white/80 bg-white/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            <LayoutTemplate className="h-3.5 w-3.5" />
            {getDocLabel(template.doc_type)}
          </div>
          <p className="line-clamp-3 text-xs leading-relaxed text-slate-500">{preview}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-950 group-hover:text-primary">
              {template.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
              {template.description || "Template clínico pronto para personalização."}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Star className={cn("h-4 w-4", favorite && "fill-amber-400 text-amber-400")} />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
          <TemplateMeta icon={UserRound} label="Autor" value={author} />
          <TemplateMeta icon={Clock3} label="Atualizado" value={formatDate(template.updated_at)} />
          <TemplateMeta icon={FileText} label="Conteúdo" value={`${countWords(template)} palavras`} />
          <TemplateMeta icon={ShieldCheck} label="Status" value={template.is_default ? "Padrão" : "Disponível"} />
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="bg-white text-[10px]">
              <Tags className="mr-1 h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </button>
  );
}

function TemplateMeta({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="truncate">
        <span className="font-medium text-slate-600">{label}:</span> {value}
      </span>
    </div>
  );
}

function TemplateEditor({
  template,
  mergeTags,
  supportMode,
  docLabel,
  saving,
  onSave,
  onDuplicate,
  onNewVersion,
  onSetDefault,
}: any) {
  const [local, setLocal] = useState<any>(template);
  const [variablesOpen, setVariablesOpen] = useState(true);

  useEffect(() => {
    setLocal(template);
  }, [template]);

  const sections: Section[] = Array.isArray(local.sections) ? local.sections : [];
  const isDirty = JSON.stringify(local) !== JSON.stringify(template);

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
      <InfoCard className="sticky top-3 z-10 border-primary/10 bg-white/95 shadow-[0_18px_45px_-32px_rgba(15,76,92,0.45)] backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-white text-xs">{docLabel}</Badge>
              <Badge variant="outline" className="bg-white text-xs">Versão {local.version ?? 1}</Badge>
              <Badge variant={local.is_active ? "secondary" : "outline"} className={cn("text-xs", local.is_active && "bg-emerald-50 text-emerald-700")}>
                {local.is_active ? "Ativo" : "Inativo"}
              </Badge>
              {local.is_default && (
                <Badge variant="secondary" className="bg-amber-50 text-xs text-amber-700">
                  <Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" /> Padrão
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {saving ? "Salvando alterações..." : isDirty ? "Alterações não salvas" : "Tudo salvo"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onSave(local)} disabled={supportMode || saving || !isDirty}>
              <Save className="h-4 w-4 mr-2" /> Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={onDuplicate} disabled={supportMode}>
              <Copy className="h-4 w-4 mr-2" /> Duplicar
            </Button>
            <Button size="sm" variant="outline" onClick={onNewVersion} disabled={supportMode}>
              <GitBranch className="h-4 w-4 mr-2" /> Nova versão
            </Button>
            {!local.is_default && (
              <Button size="sm" variant="outline" onClick={onSetDefault} disabled={supportMode}>
                <Star className="h-4 w-4 mr-2" /> Definir padrão
              </Button>
            )}
          </div>
        </div>
      </InfoCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.86fr)]">
        <PageSection
          icon={FileText}
          title="Editor"
          description="Estruture o conteúdo do modelo. Use variáveis para preenchimento automático."
          actions={
            <Button size="sm" variant="outline" onClick={addSection}>
              <Plus className="h-4 w-4 mr-1.5" /> Seção
            </Button>
          }
          contentClassName="space-y-4"
        >
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
          </div>

          {sections.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sem seções"
              description="Adicione a primeira seção para começar a estruturar o documento."
              action={{ label: "Adicionar seção", onClick: addSection }}
              className="py-10"
            />
          ) : (
            sections.map((section, index) => (
              <div key={index} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(index, { title: e.target.value })}
                    placeholder="Título da seção"
                    className="flex-1 bg-white font-medium"
                  />
                  <Button size="icon" variant="ghost" className="text-slate-400 hover:text-destructive" onClick={() => removeSection(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={section.content}
                  onChange={(e) => updateSection(index, { content: e.target.value })}
                  rows={7}
                  placeholder="Conteúdo da seção - use {{variavel}} para preenchimento automático."
                  className="bg-white font-mono text-sm leading-relaxed"
                />
              </div>
            ))
          )}
        </PageSection>

        <div className="space-y-4">
          <InfoCard className="self-start">
            <SectionHeader
              icon={Eye}
              title="Preview"
              description="Leitura aproximada do documento final."
              className="mb-3"
            />
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-inner">
              <div className="mb-5 border-b pb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{docLabel}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">{local.name}</h2>
                {local.description && <p className="mt-1 text-sm text-slate-500">{local.description}</p>}
              </div>
              <div className="space-y-5">
                {sections.length === 0 ? (
                  <p className="text-sm text-slate-400">Sem conteúdo para pré-visualizar.</p>
                ) : (
                  sections.map((section, index) => (
                    <section key={index}>
                      <h3 className="text-sm font-semibold text-slate-900">{section.title || `Seção ${index + 1}`}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                        {(section.content || "Conteúdo vazio.").replace(/\{\{([^}]+)\}\}/g, "[$1]")}
                      </p>
                    </section>
                  ))
                )}
              </div>
            </div>
          </InfoCard>

          <Collapsible open={variablesOpen} onOpenChange={setVariablesOpen}>
            <InfoCard className="self-start">
              <CollapsibleTrigger asChild>
                <button className="mb-3 flex w-full items-center justify-between gap-3 text-left">
                  <SectionHeader
                    icon={Sparkles}
                    title="Variáveis de mesclagem"
                    description="Clique para copiar e cole no conteúdo."
                    className="m-0"
                  />
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", variablesOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-[42vh] space-y-4 overflow-auto pr-1">
                  {Object.keys(grouped).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma variável disponível.</p>
                  )}
                  {Object.entries(grouped).map(([cat, tags]: any) => (
                    <div key={cat}>
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{cat}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag: any) => (
                          <button
                            key={tag.tag}
                            type="button"
                            onClick={() => navigator.clipboard.writeText(`{{${tag.tag}}}`).then(() => toast.success(`{{${tag.tag}}} copiado`))}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            title={tag.description}
                          >
                            {`{{${tag.tag}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </InfoCard>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
