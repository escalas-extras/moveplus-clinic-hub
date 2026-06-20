import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/marketing")({
  component: MarketingPage,
});

type Item = { id: string; scheduled_for: string; title: string; description: string | null; category: string | null; channel: string | null; status: string | null };

function MarketingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Item>>({ scheduled_for: new Date().toISOString().slice(0, 10), status: "planejado" });

  async function load() {
    const { data } = await supabase.from("marketing_calendar").select("*").order("scheduled_for");
    setItems((data ?? []) as Item[]);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.title || !form.scheduled_for) { toast.error("Preencha título e data"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("marketing_calendar").insert({
      title: form.title, description: form.description ?? null, scheduled_for: form.scheduled_for,
      category: form.category ?? null, channel: form.channel ?? null, status: form.status ?? "planejado",
      created_by: u.user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Publicação agendada");
    setOpen(false); setForm({ scheduled_for: new Date().toISOString().slice(0, 10), status: "planejado" });
    load();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6" /> Marketing da Clínica</h1>
            <p className="text-muted-foreground text-sm">Calendário editorial, banco de ideias e campanhas.</p>
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova publicação</Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((i) => (
            <Card key={i.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{i.title}</CardTitle>
                  <Badge variant="outline">{i.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(i.scheduled_for).toLocaleDateString("pt-BR")}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {i.description && <p className="line-clamp-3">{i.description}</p>}
                <div className="flex gap-1 flex-wrap">
                  {i.category && <Badge variant="secondary">{i.category}</Badge>}
                  {i.channel && <Badge>{i.channel}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma publicação agendada.</p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova publicação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input type="date" value={form.scheduled_for ?? ""} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
            <Input placeholder="Categoria (Neuro, Orto, Geri, Resp, Home Care)" value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input placeholder="Canal (Instagram, WhatsApp, Site)" value={form.channel ?? ""} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
            <Textarea placeholder="Descrição / roteiro" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button onClick={save} className="w-full">Agendar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
