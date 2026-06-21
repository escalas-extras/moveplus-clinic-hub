import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveClinic } from "@/lib/active-clinic";
import { usePlatformContext } from "@/lib/platform-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  Users,
  FileText,
  BookOpen,
  CalendarDays,
  UserCog,
  PenLine,
  Building2,
} from "lucide-react";

type Hit = {
  type: "paciente" | "documento" | "modelo" | "biblioteca" | "agenda" | "profissional" | "clinica";
  id: string;
  title: string;
  subtitle?: string;
  to: string;
};

const TYPE_META: Record<Hit["type"], { label: string; icon: any }> = {
  paciente: { label: "Pacientes", icon: Users },
  documento: { label: "Documentos", icon: FileText },
  modelo: { label: "Modelos", icon: PenLine },
  biblioteca: { label: "Biblioteca", icon: BookOpen },
  agenda: { label: "Agenda", icon: CalendarDays },
  profissional: { label: "Profissionais", icon: UserCog },
  clinica: { label: "Clínicas", icon: Building2 },
};

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { clinicId, loading: clinicLoading } = useActiveClinic();
  const { isPlatformAdmin, isSuperAdmin } = usePlatformContext();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setDebounced("");
    }
  }, [open]);

  const term = debounced;
  // Prioridade:
  //  - Na rota do Painel SaaS, super_admin busca clínicas mesmo se houver suporte ativo.
  //  - Existe clínica ativa fora do Painel SaaS → busca dentro da clínica.
  //  - Super admin sem clínica ativa → busca clínicas no Painel SaaS.
  //  - Sem clínica e sem super_admin → sem contexto.
  const isSaasRoute = location.pathname.startsWith("/app/admin-saas");
  const mode: "platform" | "clinic" | "none" = isSaasRoute && isSuperAdmin
    ? "platform"
    : clinicId
      ? "clinic"
      : isPlatformAdmin
        ? "platform"
        : "none";
  const canSearch = mode !== "none" && term.length >= 2;

  const { data: hits = [], isFetching } = useQuery<Hit[]>({
    queryKey: ["global-search", mode, clinicId ?? "platform", term],
    enabled: canSearch,
    staleTime: 10_000,
    queryFn: async () => {
      const like = `%${term.replace(/[%_]/g, " ")}%`;
      const results: Hit[] = [];

      if (mode === "platform") {
        const { data: clinics } = await supabase
          .from("clinics")
          .select("id, nome, slug, status, plan")
          .neq("status", "deleted")
          .or(`nome.ilike.${like},slug.ilike.${like}`)
          .order("nome", { ascending: true })
          .limit(20);
        for (const c of clinics ?? []) {
          results.push({
            type: "clinica",
            id: c.id,
            title: c.nome ?? c.slug ?? "—",
            subtitle: [c.slug, c.plan, c.status].filter(Boolean).join(" · "),
            to: `/app/admin-saas?clinic=${c.id}`,
          });
        }
        return results;
      }

      const cid = clinicId!;
      const [pats, docs, tpls, lib, profs, appts] = await Promise.all([
        supabase
          .from("patients")
          .select("id, nome_completo, cpf, telefone")
          .eq("clinic_id", cid)
          .or(`nome_completo.ilike.${like},cpf.ilike.${like},telefone.ilike.${like}`)
          .limit(6),
        supabase
          .from("clinical_documents")
          .select("id, title, doc_type, patient_id, created_at")
          .eq("clinic_id", cid)
          .ilike("title", like)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("document_templates")
          .select("id, name, doc_type")
          .eq("clinic_id", cid)
          .ilike("name", like)
          .limit(6),
        supabase
          .from("library_contents")
          .select("id, title, slug, category_id")
          .eq("status", "active")
          .or(`clinic_id.eq.${cid},clinic_id.is.null`)
          .or(`title.ilike.${like},slug.ilike.${like}`)
          .limit(6),
        supabase
          .from("professionals")
          .select("id, nome, conselho, registro, especialidade")
          .eq("clinic_id", cid)
          .or(`nome.ilike.${like},registro.ilike.${like},especialidade.ilike.${like}`)
          .limit(6),
        supabase
          .from("appointments")
          .select("id, data, horario, status, patient_id, patients!inner(nome_completo)")
          .eq("clinic_id", cid)
          .ilike("patients.nome_completo", like)
          .order("data", { ascending: false })
          .order("horario", { ascending: false })
          .limit(6),
      ]);

      for (const p of pats.data ?? []) {
        results.push({
          type: "paciente",
          id: p.id,
          title: p.nome_completo ?? "—",
          subtitle: [p.cpf, p.telefone].filter(Boolean).join(" · "),
          to: `/app/pacientes/${p.id}`,
        });
      }
      for (const d of docs.data ?? []) {
        results.push({
          type: "documento",
          id: d.id,
          title: d.title ?? d.doc_type ?? "Documento",
          subtitle: new Date(d.created_at).toLocaleDateString("pt-BR"),
          to: d.patient_id ? `/app/pacientes/${d.patient_id}` : `/app/documentos`,
        });
      }
      for (const t of tpls.data ?? []) {
        results.push({
          type: "modelo",
          id: t.id,
          title: t.name,
          subtitle: t.doc_type,
          to: `/app/templates`,
        });
      }
      for (const l of lib.data ?? []) {
        results.push({
          type: "biblioteca",
          id: l.id,
          title: l.title,
          subtitle: l.slug ?? undefined,
          to: `/app/biblioteca`,
        });
      }
      for (const pr of profs.data ?? []) {
        results.push({
          type: "profissional",
          id: pr.id,
          title: pr.nome,
          subtitle: [pr.conselho, pr.registro, pr.especialidade].filter(Boolean).join(" · "),
          to: `/app/profissionais`,
        });
      }
      for (const a of (appts.data ?? []) as any[]) {
        results.push({
          type: "agenda",
          id: a.id,
          title: a.patients?.nome_completo ?? "Agendamento",
          subtitle: [a.data ? new Date(`${a.data}T00:00:00`).toLocaleDateString("pt-BR") : null, a.horario ? String(a.horario).slice(0, 5) : null, a.status].filter(Boolean).join(" · "),
          to: `/app/agenda`,
        });
      }
      return results;
    },
  });

  const grouped = useMemo(() => {
    const g: Record<string, Hit[]> = {};
    for (const h of hits) {
      g[h.type] = g[h.type] || [];
      g[h.type].push(h);
    }
    return g;
  }, [hits]);

  const noContext = mode === "none" && !clinicLoading;

  const placeholder =
    mode === "platform"
      ? "Buscar clínicas por nome ou slug…"
      : "Buscar pacientes, documentos, modelos, biblioteca, agenda…";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-0 focus-visible:ring-0 shadow-none h-9 px-0"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted border">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {noContext ? (
            <EmptyMsg text="A busca global está disponível dentro de uma clínica ou no Painel SaaS." />
          ) : !canSearch ? (
            <EmptyMsg text="Digite ao menos 2 caracteres para pesquisar." />
          ) : isFetching ? (
            <EmptyMsg text="Buscando…" />
          ) : hits.length === 0 ? (
            <EmptyMsg
              text={
                mode === "platform"
                  ? "Nenhuma clínica encontrada."
                  : "Nenhum resultado encontrado nesta clínica."
              }
            />
          ) : (
            <div className="py-2">
              {(Object.keys(grouped) as Hit["type"][]).map((type) => {
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <div key={type} className="px-2 py-1">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                      {meta.label}
                    </div>
                    {grouped[type].map((h) => (
                      <button
                        key={`${type}-${h.id}`}
                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                        onClick={() => {
                          onOpenChange(false);
                          navigate({ to: h.to });
                        }}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{h.title}</div>
                          {h.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">{h.subtitle}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <div className="px-6 py-10 text-center text-sm text-muted-foreground">{text}</div>;
}
