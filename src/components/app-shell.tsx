
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CalendarDays, Wallet, UserCog, Settings, LogOut, Menu, X,
  ShieldCheck, Activity, FileText, RefreshCw, BarChart3, BookOpen, Home as HomeIcon,
  Megaphone, Sparkles, Stethoscope, PenLine, Bell, Search, Building2, UserCircle2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { GlobalSearch } from "@/components/global-search";
import { UserAvatar, AvatarUploader } from "@/components/avatar-uploader";
import { usePlatformContext } from "@/lib/platform-context";
import { usePlanFeatures } from "@/lib/plan-features";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useBranding } from "@/lib/branding";
import { fmtDate } from "@/lib/format";
import { SupportBanner } from "@/components/support-banner";

type NavItemDef = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; adminOnly?: boolean; superAdminOnly?: boolean; feature?: string };
type NavGroup = { title: string; items: NavItemDef[]; platform?: boolean };

const groups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { to: "/app", label: "Painel", icon: LayoutDashboard, exact: true },
      { to: "/app/agenda", label: "Agenda", icon: CalendarDays, feature: "agenda" },
      { to: "/app/pacientes", label: "Pacientes", icon: Users, feature: "pacientes" },
      { to: "/app/reavaliacoes", label: "Reavaliações", icon: RefreshCw, feature: "avaliacoes" },
      { to: "/app/home-care", label: "Home Care", icon: HomeIcon, feature: "home_care" },
    ],
  },
  {
    title: "Documentação",
    items: [
      { to: "/app/documentos", label: "Documentos", icon: FileText, feature: "documentos" },
      { to: "/app/templates", label: "Modelos", icon: PenLine, adminOnly: true, feature: "documentos" },
      { to: "/app/biblioteca", label: "Biblioteca", icon: BookOpen, feature: "biblioteca" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/app/dashboard-clinico", label: "Indicadores", icon: Activity, feature: "relatorios" },
      { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, feature: "relatorios" },
      { to: "/app/marketing", label: "Marketing", icon: Megaphone, feature: "marketing" },
      { to: "/app/diferenciais", label: "Diferenciais", icon: Sparkles },
      { to: "/app/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true, feature: "financeiro" },
      { to: "/app/profissionais", label: "Profissionais", icon: UserCog, adminOnly: true },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/app/usuarios", label: "Usuários", icon: ShieldCheck, adminOnly: true },
      { to: "/app/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
    ],
  },

];

const platformGroups: NavGroup[] = [
  {
    title: "Plataforma",
    platform: true,
    items: [
      { to: "/app/admin-saas", label: "Painel SaaS", icon: Building2, superAdminOnly: true },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const { isPlatformAdmin } = usePlatformContext();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const brand = useBranding();

  const qc = useQueryClient();
  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const { has: hasFeature } = usePlanFeatures();
  const activeGroups = isPlatformAdmin ? platformGroups : groups;
  const visibleGroups = activeGroups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          (!i.adminOnly || isAdmin) &&
          (!i.superAdminOnly || isPlatformAdmin) &&
          (!i.feature || hasFeature(i.feature)),
      ),

    }))
    .filter((g) => g.items.length > 0);

  const userName = (user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "";
  const today = new Date();
  const todayLabel = today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const avatarGradient = `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`;

  // Current user's avatar path (profiles.avatar_url)
  const { data: profile } = useQuery({
    queryKey: ["user-avatar", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  const avatarPath = (profile as any)?.avatar_url ?? null;

  // Cmd/Ctrl+K → open global search
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SupportBanner />
      <div className="flex flex-1 min-h-0">

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 glass-topbar flex items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Logo brand={brand} compact />
          <span className="font-semibold truncate" style={{ color: brand.primaryColor }}>{brand.clinicName}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-30 h-screen w-[280px] glass-sidebar flex flex-col transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand header */}
        <div className="hidden lg:flex items-center gap-3 px-6 h-20 border-b border-white/40">
          <Logo brand={brand} />
          <div className="leading-tight min-w-0">
            <div className="font-semibold text-[15px] truncate tracking-tight" style={{ color: brand.primaryColor }}>{brand.clinicName}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate">
              {brand.hasOwnLogo ? "Plataforma clínica" : `Powered by ${brand.appName}`}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-7">
          {visibleGroups.map((g) => (
            <div key={g.title}>
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                {g.title}
              </div>
              <div className="space-y-1">
                {g.items.map((item) => (
                  <NavItem key={item.to} to={item.to} exact={item.exact} icon={item.icon} label={item.label} onClick={() => setOpen(false)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User chip */}
        <div className="border-t border-white/40 p-4">
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            className="w-full flex items-center gap-3 px-1 mb-3 rounded-lg hover:bg-white/60 py-1 transition-colors text-left"
            aria-label="Editar foto de perfil"
          >
            <UserAvatar userId={user?.id} avatarPath={avatarPath} name={userName} size={36} gradient={avatarGradient} />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{userName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          </button>
          <Button variant="outline" size="sm" className="w-full justify-start glass" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        {/* Desktop premium top bar */}
        <header className="hidden lg:flex sticky top-0 z-20 h-20 items-center justify-between gap-6 px-10 glass-topbar">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{todayLabel}</div>
            <div className="text-lg font-semibold tracking-tight truncate" style={{ color: brand.primaryColor }}>
              {brand.clinicName}
              <span className="ml-2 text-sm font-normal text-muted-foreground italic">· {brand.slogan}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden xl:flex items-center gap-2 glass rounded-full px-4 py-2 w-80 text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
              aria-label="Abrir busca global"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">Buscar paciente, documento…</span>
              <kbd className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/60 border border-white/70">⌘K</kbd>
            </button>

            <Button variant="ghost" size="icon" className="rounded-full glass xl:hidden" onClick={() => setSearchOpen(true)} aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" className="rounded-full glass">
              <Bell className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Editar foto de perfil"
              title="Editar foto de perfil"
            >
              <UserAvatar userId={user?.id} avatarPath={avatarPath} name={userName} size={40} gradient={avatarGradient} className="shadow-soft" />
            </button>
          </div>
        </header>

        <div className="px-6 py-8 sm:px-10 lg:px-12 lg:py-12 max-w-[1400px] mx-auto">{children}</div>
      </main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      {user?.id && (
        <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Foto de perfil</DialogTitle>
            </DialogHeader>
            <AvatarUploader userId={user.id} initial={avatarPath} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


function NavItem({ to, exact, icon: Icon, label, onClick }: { to: string; exact?: boolean; icon: typeof LayoutDashboard; label: string; onClick: () => void }) {
  const loc = useLocation();
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to) && to !== "/app";
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] lift",
        active
          ? "bg-white/85 text-primary font-semibold shadow-soft"
          : "text-sidebar-foreground/85 hover:bg-white/60 hover:text-primary",
      )}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
      )}
      <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function Logo({ brand, compact = false }: { brand: ReturnType<typeof useBranding>; compact?: boolean }) {
  const size = compact ? "h-9 w-9" : "h-11 w-11";
  const [broken, setBroken] = useState(false);
  const initial = (brand.clinicName || "C").trim().charAt(0).toUpperCase();
  const rawLogo = brand.logoUrl?.trim();
  const showImage = brand.hasOwnLogo && !!rawLogo && !broken;
  if (showImage) {
    return (
      <div
        className={cn(size, "rounded-xl flex items-center justify-center overflow-hidden bg-white/80 shadow-soft p-1")}
      >
        <img
          src={rawLogo!}
          alt={brand.clinicName}
          className="max-h-full max-w-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          onLoad={(e) => {
            // Imagem com 0x0 (resposta inválida) também conta como quebrada.
            const img = e.currentTarget;
            if (!img.naturalWidth || !img.naturalHeight) setBroken(true);
          }}
        />
      </div>
    );
  }
  // Monograma elegante com inicial da clínica (fallback institucional).
  return (
    <div
      className={cn(size, "rounded-2xl flex items-center justify-center shadow-soft text-white font-semibold")}
      style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
      aria-label={brand.clinicName}
    >
      {brand.clinicName && brand.clinicName !== brand.appName ? (
        <span className={cn(compact ? "text-sm" : "text-base")}>{initial}</span>
      ) : (
        <Stethoscope className={cn(compact ? "h-5 w-5" : "h-6 w-6")} />
      )}
    </div>
  );
}
