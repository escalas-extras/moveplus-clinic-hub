import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  BadgePlus,
  BookOpen,
  Brain,
  ClipboardList,
  Copy,
  Dumbbell,
  Eye,
  FileDown,
  FileText,
  GraduationCap,
  GripVertical,
  HeartPulse,
  Import,
  Layers,
  Megaphone,
  PackagePlus,
  PlayCircle,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  StarOff,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { LibraryContentView } from "@/components/library/library-content-view";
import { buildLibraryContentPdfOpts } from "@/lib/library-pdf";
import { buildPdf } from "@/lib/pdf";
import { useBranding } from "@/lib/branding";
import { useActiveClinic } from "@/lib/active-clinic";
import {
  ClinicalSkeleton,
  EmptyState,
  InfoCard,
  KpiCard,
  KpiGrid,
  PageSection,
  StatusBadge,
} from "@/components/layout";
import { ActionButton, ModuleStack, PageHero } from "@/components/ui-system";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/biblioteca")({
  component: BibliotecaPage,
});

type Content = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  body: string | null;
  tags: string[] | null;
  related_diagnoses: string[] | null;
  author: string | null;
  category_id: string | null;
};

type Category = { id: string; name: string; slug: string; color: string | null };
type LibraryScope = "exercicio" | "protocolo" | "favoritos";
type ExerciseFilterKey =
  | "all"
  | "coluna"
  | "superior"
  | "inferior"
  | "cervical"
  | "lombar"
  | "ombro"
  | "joelho"
  | "quadril"
  | "tornozelo"
  | "neurologia"
  | "pediatria"
  | "respiratoria"
  | "pilates"
  | "esportiva";

const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  cartilha: { label: "Cartilhas", icon: BookOpen },
  exercicio: { label: "Exercícios", icon: Dumbbell },
  protocolo: { label: "Protocolos", icon: ClipboardList },
  documento: { label: "Documentos", icon: FileText },
  marketing: { label: "Marketing", icon: Megaphone },
  post_social: { label: "Posts Sociais", icon: Megaphone },
  treinamento: { label: "Treinamentos", icon: GraduationCap },
  pop: { label: "POPs", icon: ShieldCheck },
};

const EXERCISE_CATEGORIES: Array<{ key: ExerciseFilterKey; label: string; description: string; icon: LucideIcon }> = [
  { key: "coluna", label: "Coluna", description: "Mobilidade, estabilidade e dor", icon: HeartPulse },
  { key: "superior", label: "Superior", description: "Membros superiores", icon: Dumbbell },
  { key: "inferior", label: "Inferior", description: "Membros inferiores", icon: Dumbbell },
  { key: "cervical", label: "Coluna Cervical", description: "Pescoço e cintura escapular", icon: HeartPulse },
  { key: "lombar", label: "Coluna Lombar", description: "Core, lombalgia e controle", icon: HeartPulse },
  { key: "ombro", label: "Ombro", description: "Manguito, mobilidade e força", icon: Dumbbell },
  { key: "joelho", label: "Joelho", description: "Reabilitação e prevenção", icon: Dumbbell },
  { key: "quadril", label: "Quadril", description: "Estabilidade e marcha", icon: Dumbbell },
  { key: "tornozelo", label: "Tornozelo", description: "Equilíbrio e retorno ao esporte", icon: Dumbbell },
  { key: "neurologia", label: "Neurologia", description: "Controle motor e função", icon: Brain },
  { key: "pediatria", label: "Pediatria", description: "Desenvolvimento e ludicidade", icon: Sparkles },
  { key: "respiratoria", label: "Respiratória", description: "Expansão e condicionamento", icon: HeartPulse },
  { key: "pilates", label: "Pilates", description: "Controle, respiração e força", icon: Layers },
  { key: "esportiva", label: "Esportiva", description: "Performance e retorno seguro", icon: PlayCircle },
];

const QUICK_FILTERS = [
  { label: "Especialidade", value: "fisioterapia" },
  { label: "Região", value: "coluna" },
  { label: "Articulação", value: "joelho" },
  { label: "Músculo", value: "core" },
  { label: "Objetivo", value: "fortalecimento" },
  { label: "Nível", value: "iniciante" },
  { label: "Equipamento", value: "elástico" },
];

const SOON_ITEMS = [
  "IA sugerindo exercícios",
  "Biblioteca compartilhada",
  "Vídeos",
  "3D",
  "Anatomia",
];

function BibliotecaPage() {
  const brand = useBranding();
  const { clinicId } = useActiveClinic();
  const [contents, setContents] = useState<Content[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<LibraryScope>("exercicio");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [smartFilter, setSmartFilter] = useState<ExerciseFilterKey>("all");
  const [open, setOpen] = useState<Content | null>(null);
  const [selected, setSelected] = useState<Content | null>(null);
  const [protocolItems, setProtocolItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  // Bloco B: reexecuta o load ao trocar de clínica (mudança de support session
  // ou login). RLS já restringe os dados; isso garante que o estado local
  // siga o contexto ativo.
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, k, f] = await Promise.all([
        supabase.from("library_contents").select("*").eq("status", "active").order("title"),
        supabase.from("library_categories").select("id,name,slug,color").eq("active", true).order("sort_order"),
        supabase.from("library_favorites").select("content_id"),
      ]);
      if (c.error) toast.error(c.error.message);
      setContents((c.data ?? []) as Content[]);
      setCats((k.data ?? []) as Category[]);
      setFavs(new Set((f.data ?? []).map((x: { content_id: string }) => x.content_id)));
      setLoading(false);
    })();
  }, [clinicId]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return contents.filter((c) => {
      if (scope !== "favoritos" && c.type !== scope) return false;
      if (scope === "favoritos" && !favs.has(c.id)) return false;
      if (catFilter && c.category_id !== catFilter) return false;
      if (smartFilter !== "all") {
        const hay = `${c.title} ${c.summary ?? ""} ${(c.tags ?? []).join(" ")} ${(c.related_diagnoses ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(smartFilter)) return false;
      }
      if (s && !(`${c.title} ${c.summary ?? ""} ${(c.tags ?? []).join(" ")}`.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [contents, scope, search, catFilter, smartFilter, favs]);

  const exercises = useMemo(() => contents.filter((c) => c.type === "exercicio"), [contents]);
  const protocols = useMemo(() => contents.filter((c) => c.type === "protocolo"), [contents]);
  const mostUsed = exercises.filter((c) => (c.tags ?? []).length >= 3).length;

  async function toggleFav(id: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (favs.has(id)) {
      await supabase.from("library_favorites").delete().eq("content_id", id).eq("user_id", u.user.id);
      setFavs((p) => { const n = new Set(p); n.delete(id); return n; });
    } else {
      await supabase.from("library_favorites").insert({ content_id: id, user_id: u.user.id });
      setFavs((p) => new Set(p).add(id));
    }
  }

  function addToProtocol(item: Content) {
    setProtocolItems((prev) => (prev.some((x) => x.id === item.id) ? prev : [...prev, item]));
    toast.success("Exercício adicionado ao protocolo atual");
  }

  function duplicateProtocolItem(id: string) {
    const item = protocolItems.find((x) => x.id === id);
    if (!item) return;
    setProtocolItems((prev) => [...prev, { ...item, id: `${item.id}:copy:${Date.now()}` }]);
  }

  function moveProtocolItem(index: number, direction: -1 | 1) {
    setProtocolItems((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  function saveProtocolDraft() {
    toast.info("Protocolo atual preparado. Salvamento persistente fica para sprint futura.");
  }

  function contentCategory(content: Content) {
    return cats.find((c) => c.id === content.category_id)?.name ?? TYPE_META[content.type]?.label ?? "Exercício";
  }

  const selectedContent = selected ?? filtered[0] ?? null;

  return (
    <>
      <ModuleStack className="exercise-library space-y-4 sm:space-y-5">
        <PageHero
          title="Biblioteca Inteligente"
          clinicName={brand.clinicName}
          dateLabel="Monte protocolos completos em poucos minutos."
          primaryColor={brand.primaryColor}
          secondaryColor={brand.secondaryColor}
          daySummary={[
            { label: "exercícios", value: exercises.length },
            { label: "protocolos", value: protocols.length },
            { label: "favoritos", value: favs.size },
          ]}
          actions={
            <>
              <ActionButton className="h-10 gap-2 px-4 text-sm" style={{ background: brand.primaryColor }} onClick={() => setScope("protocolo")}>
                <PackagePlus className="h-4 w-4" />
                Novo protocolo
              </ActionButton>
              <ActionButton variant="secondary" className="h-10 gap-2 bg-white/90 px-4 text-sm" onClick={() => setScope("favoritos")}>
                <Star className="h-4 w-4" />
                Favoritos
              </ActionButton>
              <ActionButton variant="secondary" className="h-10 gap-2 bg-white/90 px-4 text-sm" onClick={() => toast.info("Importação preparada para sprint futura.")}>
                <Import className="h-4 w-4" />
                Importar
              </ActionButton>
              <ActionButton variant="secondary" className="hidden h-10 gap-2 bg-white/90 px-4 text-sm sm:inline-flex" onClick={() => document.getElementById("exercise-categories")?.scrollIntoView({ behavior: "smooth" })}>
                <Layers className="h-4 w-4" />
                Categorias
              </ActionButton>
            </>
          }
        />

        <KpiGrid columns={4} className="gap-2.5 lg:gap-3">
          <KpiCard icon={Dumbbell} label="Total de exercícios" value={exercises.length} subtitle="Biblioteca ativa" hideDelta variant="premium" accent={brand.primaryColor} />
          <KpiCard icon={ClipboardList} label="Protocolos" value={protocols.length} subtitle="Modelos disponíveis" hideDelta variant="premium" accent={brand.secondaryColor} />
          <KpiCard icon={Star} label="Favoritos" value={favs.size} subtitle="Seleção do profissional" hideDelta variant="premium" accent="#d97706" />
          <KpiCard icon={Sparkles} label="Mais utilizados" value={mostUsed} subtitle="Estimado por riqueza de tags" hideDelta variant="premium" accent="#6366f1" />
        </KpiGrid>

        <section className="rounded-2xl border border-[rgba(15,76,92,0.12)] bg-white/90 p-4 shadow-[var(--fos-card-shadow)] sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar exercício, objetivo, músculo, região ou equipamento..."
                className="h-12 rounded-2xl border-[rgba(15,76,92,0.14)] bg-white pl-10 text-base shadow-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Exercícios", value: "exercicio" as LibraryScope, icon: Dumbbell },
                { label: "Protocolos", value: "protocolo" as LibraryScope, icon: ClipboardList },
                { label: "Favoritos", value: "favoritos" as LibraryScope, icon: Star },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setScope(item.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-[background-color,border-color,color,transform] hover:-translate-y-px",
                      scope === item.value
                        ? "border-transparent bg-[var(--fos-primary)] text-white shadow-soft"
                        : "border-[rgba(15,76,92,0.12)] bg-white text-slate-600 hover:border-[rgba(15,76,92,0.24)]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSmartFilter("all")}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", smartFilter === "all" ? "bg-primary text-primary-foreground" : "bg-white text-slate-600")}
            >
              Todos
            </button>
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => {
                  setSmartFilter("all");
                  setSearch(filter.value);
                }}
                className="rounded-full border border-[rgba(15,76,92,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary/30 hover:text-primary"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant={!catFilter ? "default" : "outline"} onClick={() => setCatFilter(null)}>Todas categorias</Button>
            {cats.map((c) => (
              <Button key={c.id} size="sm" variant={catFilter === c.id ? "default" : "outline"} onClick={() => setCatFilter(c.id)} style={catFilter === c.id && c.color ? { backgroundColor: c.color } : {}}>
                {c.name}
              </Button>
            ))}
          </div>
        </section>

        <PageSection
          icon={Layers}
          title="Categorias"
          description="Atalhos comerciais para montar protocolos por região, especialidade e objetivo."
          contentClassName="pt-0"
          className="scroll-mt-4"
        >
          <div id="exercise-categories" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {EXERCISE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSmartFilter(cat.key)}
                  className={cn(
                    "group rounded-2xl border bg-white p-3 text-left shadow-sm transition-[box-shadow,transform,border-color] hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-lift)]",
                    smartFilter === cat.key && "border-primary/35 bg-primary/[0.04] ring-1 ring-primary/15",
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="mt-3 text-sm font-bold text-slate-900">{cat.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{cat.description}</p>
                </button>
              );
            })}
          </div>
        </PageSection>

        {loading ? (
          <ClinicalSkeleton variant="split" kpiCount={4} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Dumbbell}
                  title={search || catFilter || smartFilter !== "all" ? "Nenhum exercício encontrado" : "Biblioteca ainda vazia"}
                  description={
                    search || catFilter || smartFilter !== "all"
                      ? "Ajuste a busca, filtros ou categorias para encontrar mais opções."
                      : "Conteúdos ativos da biblioteca aparecerão aqui quando cadastrados."
                  }
                  action={
                    search || catFilter || smartFilter !== "all"
                      ? { label: "Limpar filtros", onClick: () => { setSearch(""); setCatFilter(null); setSmartFilter("all"); } }
                      : undefined
                  }
                  className="rounded-2xl border border-[rgba(15,76,92,0.08)] bg-white/80 py-14"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((c) => (
                    <ExercisePremiumCard
                      key={c.id}
                      item={c}
                      category={contentCategory(c)}
                      favorite={favs.has(c.id)}
                      onFavorite={() => toggleFav(c.id)}
                      onSelect={() => setSelected(c)}
                      onOpen={() => setOpen(c)}
                      onAdd={() => addToProtocol(c)}
                    />
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
              <ExercisePreviewPanel
                item={selectedContent}
                category={selectedContent ? contentCategory(selectedContent) : null}
                favorite={selectedContent ? favs.has(selectedContent.id) : false}
                onFavorite={() => selectedContent && toggleFav(selectedContent.id)}
                onOpen={() => selectedContent && setOpen(selectedContent)}
                onAdd={() => selectedContent && addToProtocol(selectedContent)}
              />
              <ProtocolBuilderPanel
                items={protocolItems}
                onMove={moveProtocolItem}
                onRemove={(id) => setProtocolItems((prev) => prev.filter((item) => item.id !== id))}
                onDuplicate={duplicateProtocolItem}
                onSave={saveProtocolDraft}
              />
              <SoonPanel />
            </aside>
          </div>
        )}
      </ModuleStack>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl">{open?.title}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-4">
              {open.summary && (
                <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">{open.summary}</p>
              )}
              {open.body && <LibraryContentView body={open.body} />}
              <div className="flex flex-wrap gap-1 pt-3 border-t">
                {(open.tags ?? []).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
              {open.author && <p className="text-xs text-muted-foreground">Autor: {open.author}</p>}
              <div className="flex justify-end pt-2 border-t">
                <Button
                  onClick={async () => {
                    if (!open) return;
                    try {
                      const doc = await buildPdf({
                        ...buildLibraryContentPdfOpts({
                          title: open.title,
                          type: open.type,
                          summary: open.summary,
                          body: open.body || "",
                          author: open.author,
                          tags: open.tags,
                        }),
                        // Bloco D: PDF da biblioteca usa branding da clínica ativa
                        // explicitamente, garantindo header/logo corretos mesmo
                        // em modo suporte ou navegação cross-tab.
                        clinicId: clinicId,
                      });
                      const filename = `${open.title.replace(/\s+/g, "_")}.pdf`;
                      const blob = doc.output("blob");
                      const url = URL.createObjectURL(blob);
                      // Apenas download direto via <a download>. Não usamos
                      // window.open() porque ele é frequentemente bloqueado
                      // por bloqueadores de popup (causa raiz reportada em
                      // produção: PDF "não gerava" — era o popup bloqueado).
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = filename;
                      a.rel = "noopener";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      setTimeout(() => URL.revokeObjectURL(url), 60_000);
                      toast.success("PDF gerado com sucesso");
                    } catch (e) {
                      console.error("[biblioteca] Falha ao gerar PDF", e);
                      toast.error("Falha ao gerar PDF: " + ((e as Error)?.message || "erro desconhecido"));
                    }
                  }}
                >
                  <FileDown className="h-4 w-4 mr-2" /> Baixar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExerciseImagePlaceholder({ title }: { title: string }) {
  return (
    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,rgba(15,76,92,0.08),rgba(43,182,115,0.1))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.8),transparent_36%),radial-gradient(circle_at_70%_75%,rgba(15,76,92,0.12),transparent_42%)]" />
      <div className="relative flex flex-col items-center gap-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/85 text-primary shadow-soft ring-1 ring-white/80">
          <PlayCircle className="h-7 w-7" aria-hidden />
        </span>
        <span className="rounded-full bg-white/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          GIF placeholder
        </span>
      </div>
      <span className="sr-only">Imagem do exercício {title}</span>
    </div>
  );
}

function deriveExerciseMeta(item: Content, category: string) {
  const text = `${item.title} ${item.summary ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
  const difficulty = text.includes("avanç") || text.includes("esport") ? "Avançado" : text.includes("inter") ? "Intermediário" : "Iniciante";
  const time = text.includes("respirat") ? "3-5 min" : text.includes("mobil") ? "5 min" : "8-12 min";
  const equipment = text.includes("elástico") ? "Elástico" : text.includes("bola") ? "Bola" : text.includes("pilates") ? "Pilates" : "Livre";
  const objective = text.includes("mobil") ? "Mobilidade" : text.includes("along") ? "Alongamento" : text.includes("respirat") ? "Respiração" : "Fortalecimento";
  const muscle = item.tags?.[0] ?? category;
  return { difficulty, time, equipment, objective, muscle };
}

function ExercisePremiumCard({
  item,
  category,
  favorite,
  onFavorite,
  onSelect,
  onOpen,
  onAdd,
}: {
  item: Content;
  category: string;
  favorite: boolean;
  onFavorite: () => void;
  onSelect: () => void;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const meta = deriveExerciseMeta(item, category);
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="group overflow-hidden rounded-3xl border border-[rgba(15,76,92,0.1)] bg-white p-3 shadow-[var(--fos-card-shadow)] transition-[box-shadow,transform,border-color] hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative">
        <ExerciseImagePlaceholder title={item.title} />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-soft transition hover:text-amber-500"
          aria-label={favorite ? "Remover dos favoritos" : "Favoritar"}
        >
          {favorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-3 p-2 pt-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <StatusBadge variant="info">{category}</StatusBadge>
            <StatusBadge variant={meta.difficulty === "Avançado" ? "warning" : "neutral"}>{meta.difficulty}</StatusBadge>
          </div>
          <h3 className="line-clamp-2 text-base font-bold tracking-tight text-slate-950">{item.title}</h3>
          {item.summary && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">{item.summary}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <ExerciseMeta label="Grupo" value={meta.muscle} />
          <ExerciseMeta label="Objetivo" value={meta.objective} />
          <ExerciseMeta label="Tempo" value={meta.time} />
          <ExerciseMeta label="Equipamento" value={meta.equipment} />
        </div>

        <div className="flex flex-wrap gap-1">
          {(item.tags ?? []).slice(0, 5).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
          ))}
        </div>

        <div className="flex gap-2 border-t border-[rgba(15,76,92,0.08)] pt-3">
          <Button type="button" size="sm" className="flex-1 rounded-xl" onClick={(event) => { event.stopPropagation(); onAdd(); }}>
            <BadgePlus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar
          </Button>
          <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={(event) => { event.stopPropagation(); onOpen(); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function ExerciseMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function ExercisePreviewPanel({
  item,
  category,
  favorite,
  onFavorite,
  onOpen,
  onAdd,
}: {
  item: Content | null;
  category: string | null;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
  onAdd: () => void;
}) {
  if (!item) {
    return (
      <PageSection icon={Dumbbell} title="Preview do exercício" description="Selecione um exercício para ver detalhes.">
        <EmptyState icon={Search} title="Nenhum exercício selecionado" description="Clique em um card para abrir descrição, execução e cuidados." className="py-8" />
      </PageSection>
    );
  }

  const meta = deriveExerciseMeta(item, category ?? "Exercício");
  return (
    <PageSection icon={Dumbbell} title="Preview lateral" description="Detalhes rápidos do exercício." contentClassName="space-y-4">
      <ExerciseImagePlaceholder title={item.title} />
      <div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge variant="info">{category ?? "Exercício"}</StatusBadge>
          <StatusBadge variant="neutral">{meta.difficulty}</StatusBadge>
        </div>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-950">{item.title}</h2>
        {item.summary && <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.summary}</p>}
      </div>
      <PreviewSection title="Descrição" text={item.summary || "Descrição disponível no conteúdo completo."} />
      <PreviewSection title="Execução" text={item.body ? "Confira a execução detalhada em Visualizar." : "Oriente postura, controle e amplitude sem dor."} />
      <PreviewSection title="Cuidados" text="Ajustar carga, amplitude e ritmo conforme tolerância do paciente." />
      <PreviewSection title="Contraindicações" text="Evitar em dor aguda intensa, sinais neurológicos progressivos ou contraindicação médica." />
      <PreviewSection title="Observações" text={`Objetivo: ${meta.objective}. Equipamento: ${meta.equipment}. Tempo sugerido: ${meta.time}.`} />
      <div className="grid gap-2">
        <Button className="rounded-xl" onClick={onAdd}>
          <BadgePlus className="mr-2 h-4 w-4" />
          Adicionar ao protocolo
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="rounded-xl" onClick={onFavorite}>
            {favorite ? <Star className="mr-2 h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="mr-2 h-4 w-4" />}
            Favoritar
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={onOpen}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </Button>
        </div>
      </div>
    </PageSection>
  );
}

function PreviewSection({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(15,76,92,0.08)] bg-slate-50/70 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}

function ProtocolBuilderPanel({
  items,
  onMove,
  onRemove,
  onDuplicate,
  onSave,
}: {
  items: Content[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSave: () => void;
}) {
  return (
    <PageSection icon={ClipboardList} title="Protocolo Atual" description="Monte, ordene e revise antes de salvar." contentClassName="space-y-3">
      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Arraste exercícios para cá"
          description="Use o botão Adicionar nos cards para montar um protocolo."
          className="py-7"
        />
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => (
            <li key={`${item.id}-${index}`} draggable className="rounded-2xl border bg-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <GripVertical className="mt-1 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{index + 1}. {item.title}</p>
                  <p className="truncate text-xs text-slate-500">{item.summary ?? "Exercício do protocolo"}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="h-7 rounded-lg px-2" onClick={() => onMove(index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 rounded-lg px-2" onClick={() => onMove(index, 1)} disabled={index === items.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 rounded-lg px-2" onClick={() => onDuplicate(item.id)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 rounded-lg px-2 text-rose-600 hover:text-rose-700" onClick={() => onRemove(item.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Button className="w-full rounded-xl" onClick={onSave} disabled={items.length === 0}>
        <Save className="mr-2 h-4 w-4" />
        Salvar protocolo
      </Button>
    </PageSection>
  );
}

function SoonPanel() {
  return (
    <InfoCard icon={WandSparkles} title="Em breve" description="Diferenciais comerciais planejados para evoluir a biblioteca." padded={false}>
      <div className="flex flex-wrap gap-2 p-4">
        {SOON_ITEMS.map((item) => (
          <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            {item}
            <StatusBadge variant="neutral" className="text-[10px]">Soon</StatusBadge>
          </span>
        ))}
      </div>
    </InfoCard>
  );
}
