import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, StarOff, BookOpen, Dumbbell, ClipboardList, FileText, Megaphone, GraduationCap, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";

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

const TYPE_META: Record<string, { label: string; icon: typeof BookOpen }> = {
  cartilha: { label: "Cartilhas", icon: BookOpen },
  exercicio: { label: "Exercícios", icon: Dumbbell },
  protocolo: { label: "Protocolos", icon: ClipboardList },
  documento: { label: "Documentos", icon: FileText },
  marketing: { label: "Marketing", icon: Megaphone },
  post_social: { label: "Posts Sociais", icon: Megaphone },
  treinamento: { label: "Treinamentos", icon: GraduationCap },
  pop: { label: "POPs", icon: ShieldCheck },
};

function BibliotecaPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("cartilha");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return contents.filter((c) => {
      if (tab !== "favoritos" && c.type !== tab) return false;
      if (tab === "favoritos" && !favs.has(c.id)) return false;
      if (catFilter && c.category_id !== catFilter) return false;
      if (s && !(`${c.title} ${c.summary ?? ""} ${(c.tags ?? []).join(" ")}`.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [contents, tab, search, catFilter, favs]);

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

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Biblioteca Move+</h1>
          <p className="text-muted-foreground text-sm">Cartilhas, protocolos, exercícios, documentos, materiais de marketing e treinamentos.</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-2 items-center">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar por título, resumo ou tag..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={!catFilter ? "default" : "outline"} onClick={() => setCatFilter(null)}>Todas categorias</Button>
              {cats.map((c) => (
                <Button key={c.id} size="sm" variant={catFilter === c.id ? "default" : "outline"} onClick={() => setCatFilter(c.id)} style={catFilter === c.id && c.color ? { backgroundColor: c.color } : {}}>
                  {c.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <TabsTrigger key={k} value={k}>
                <v.icon className="h-4 w-4 mr-1" /> {v.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="favoritos"><Star className="h-4 w-4 mr-1" /> Favoritos</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum conteúdo encontrado.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((c) => (
                  <Card key={c.id} className="cursor-pointer hover:shadow-md transition" onClick={() => setOpen(c)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{c.title}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleFav(c.id); }}>
                          {favs.has(c.id) ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {c.summary && <p className="text-xs text-muted-foreground line-clamp-2">{c.summary}</p>}
                      <div className="flex flex-wrap gap-1">
                        {(c.tags ?? []).slice(0, 4).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{open?.title}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3">
              {open.summary && <p className="text-sm text-muted-foreground">{open.summary}</p>}
              {open.body && <pre className="whitespace-pre-wrap text-sm font-sans">{open.body}</pre>}
              <div className="flex flex-wrap gap-1 pt-2 border-t">
                {(open.tags ?? []).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
              </div>
              {open.author && <p className="text-xs text-muted-foreground">Autor: {open.author}</p>}
              <Button onClick={() => window.print()}>Imprimir / Salvar PDF</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
