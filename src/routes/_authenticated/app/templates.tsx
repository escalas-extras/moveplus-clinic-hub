import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Copy, GitBranch, Trash2, Save, Star } from "lucide-react";
import { toast } from "sonner";

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
  const [docType, setDocType] = useState("avaliacao_inicial");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["templates", docType],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_templates")
        .select("*")
        .eq("doc_type", docType)
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
      const { error } = await supabase.from("document_templates").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Modelo salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (t: any) => {
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); toast.success("Duplicado"); },
  });

  const newVersion = useMutation({
    mutationFn: async (t: any) => {
      const { id, created_at, updated_at, ...rest } = t;
      const { error } = await supabase.from("document_templates").insert({
        ...rest,
        parent_id: id,
        version: (t.version || 1) + 1,
        is_default: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); toast.success("Nova versão criada"); },
  });

  const setDefault = useMutation({
    mutationFn: async (t: any) => {
      // unset others of same doc_type
      await supabase.from("document_templates").update({ is_default: false })
        .eq("doc_type", t.doc_type);
      const { error } = await supabase.from("document_templates").update({ is_default: true }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); toast.success("Modelo padrão definido"); },
  });

  const createNew = () => {
    upsert.mutate({
      doc_type: docType,
      name: "Novo modelo",
      is_active: true,
      is_default: false,
      sections: [{ order: 1, title: "Seção 1", content: "{{paciente_nome}}" }],
    });
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Modelos de Documentos</h1>
          <p className="text-sm text-muted-foreground">Crie, versione e personalize seus modelos clínicos.</p>
        </div>
        <Button onClick={createNew}><Plus className="h-4 w-4 mr-2" /> Novo modelo</Button>
      </header>

      <Tabs value={docType} onValueChange={(v) => { setDocType(v); setSelectedId(null); }}>
        <TabsList className="flex-wrap h-auto">
          {DOC_TYPES.map((d) => <TabsTrigger key={d.value} value={d.value}>{d.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={docType} className="grid md:grid-cols-[320px_1fr] gap-4 mt-4">
          <Card className="p-3 space-y-2 max-h-[70vh] overflow-auto">
            {templates.map((t: any) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-3 rounded border ${current?.id === t.id ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{t.name}</span>
                  {t.is_default && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                </div>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">v{t.version}</Badge>
                  {t.is_active ? <Badge variant="secondary" className="text-xs">Ativo</Badge> : <Badge variant="outline" className="text-xs">Inativo</Badge>}
                </div>
              </button>
            ))}
            {templates.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Nenhum modelo. Crie o primeiro.</p>}
          </Card>

          {current ? (
            <TemplateEditor
              template={current}
              mergeTags={mergeTags}
              onSave={(t: any) => upsert.mutate(t)}
              onDuplicate={() => duplicate.mutate(current)}
              onNewVersion={() => newVersion.mutate(current)}
              onSetDefault={() => setDefault.mutate(current)}
            />
          ) : <Card className="p-8 text-center text-muted-foreground">Selecione ou crie um modelo.</Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateEditor({ template, mergeTags, onSave, onDuplicate, onNewVersion, onSetDefault }: any) {
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
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-start">
        <div className="space-y-2 flex-1 min-w-[200px]">
          <div>
            <Label>Nome do modelo</Label>
            <Input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={local.description || ""} onChange={(e) => setLocal({ ...local, description: e.target.value })} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={local.is_active} onCheckedChange={(v) => setLocal({ ...local, is_active: v })} />
              <Label>Ativo</Label>
            </div>
            <Badge variant="outline">v{local.version}</Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={() => onSave(local)}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
          <Button size="sm" variant="outline" onClick={onDuplicate}><Copy className="h-4 w-4 mr-2" /> Duplicar</Button>
          <Button size="sm" variant="outline" onClick={onNewVersion}><GitBranch className="h-4 w-4 mr-2" /> Nova versão</Button>
          {!local.is_default && <Button size="sm" variant="outline" onClick={onSetDefault}><Star className="h-4 w-4 mr-2" /> Definir padrão</Button>}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_220px] gap-4">
        <div className="space-y-3">
          {sections.map((s, i) => (
            <Card key={i} className="p-3 space-y-2">
              <div className="flex gap-2">
                <Input value={s.title} onChange={(e) => updateSection(i, { title: e.target.value })} placeholder="Título" />
                <Button size="icon" variant="ghost" onClick={() => removeSection(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Textarea
                value={s.content}
                onChange={(e) => updateSection(i, { content: e.target.value })}
                rows={6}
                placeholder="Use {{tag}} para variáveis"
              />
            </Card>
          ))}
          <Button variant="outline" onClick={addSection}><Plus className="h-4 w-4 mr-2" /> Adicionar seção</Button>
        </div>

        <Card className="p-3 max-h-[60vh] overflow-auto">
          <h4 className="text-sm font-semibold mb-2">Merge tags</h4>
          {Object.entries(grouped).map(([cat, tags]: any) => (
            <div key={cat} className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{cat}</p>
              <div className="space-y-1">
                {tags.map((t: any) => (
                  <button
                    key={t.tag}
                    onClick={() => navigator.clipboard.writeText(`{{${t.tag}}}`).then(() => toast.success(`{{${t.tag}}} copiado`))}
                    className="block w-full text-left text-xs font-mono p-1 rounded hover:bg-muted"
                    title={t.description}
                  >
                    {`{{${t.tag}}}`}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </Card>
  );
}
