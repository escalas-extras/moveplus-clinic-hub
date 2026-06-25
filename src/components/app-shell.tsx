import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CalendarDays, Wallet, UserCog, Settings, LogOut, Menu, X,
  ShieldCheck, Activity, FileText, RefreshCw, BarChart3, BookOpen, Megaphone,
  Sparkles, PenLine, Bell, Search, Building2, UserCircle2, ClipboardList,
  FilePlus2, Stethoscope, Home as HomeIcon, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { GlobalSearch } from "@/components/global-search";
import { UserAvatar, AvatarUploader } from "@/components/avatar-uploader";
import { usePlatformContext } from "@/lib/platform-context";
import { usePlanFeatures } from "@/lib/plan-features";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useBranding, FISIOOS_DEFAULTS } from "@/lib/branding";
import { ClinicLogo } from "@/components/clinic-logo";

const ADMIN_SAAS_BRAND = {
  ...FISIOOS_DEFAULTS,
  appName: "FisioOS",
  name: "FisioOS",
  clinicName: "FisioOS",
  slogan: "Transformando atendimentos em resultados",
  logo: null,
  logoUrl: null,
  hasOwnLogo: false,
  footer: "FisioOS · Transformando atendimentos em resultados",
  isLoading: false,
} as const;
import { SupportBanner } from "@/components/support-banner";
import { SupportClickInterceptor } from "@/components/support-click-interceptor";
import { pcGet, pcSet } from "@/lib/persistent-cache";

type NavItemDef = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; adminOnly?: boolean; superAdminOnly?: boolean; feature?: string };
type NavGroup = { title: string; items: NavItemDef[]; platform?: boolean };

// Estrutura aprovada — Fase 3 / Bloco 1
const groups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { to: "/app", label: "Painel", icon: LayoutDashboard, exact: true },
      { to: "/app/agenda", label: "Agenda", icon: CalendarDays, feature: "agenda" },
      { to: "/app/pacientes", label: "Pacientes", icon: Users, feature: "pacientes" },
    ],
  },
  {
    title: "Prontuários",
    items: [
      { to: "/app/avaliacoes", label: "Avaliações", icon: ClipboardList, feature: "avaliacoes" },
      { to: "/app/evolucoes", label: "Evoluções", icon: Stethoscope, feature: "avaliacoes" },
      { to: "/app/reavaliacoes", label: "Reavaliações", icon: RefreshCw, feature: "avaliacoes" },
    ],
  },
  {
    title: "Documentos",
    items: [
      { to: "/app/documentos", label: "Emissão", icon: FilePlus2, feature: "documentos" },
      { to: "/app/templates", label: "Modelos", icon: PenLine, adminOnly: true, feature: "documentos" },
      { to: "/app/biblioteca", label: "Biblioteca", icon: BookOpen, feature: "biblioteca" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/app/dashboard-clinico", label: "Indicadores", icon: Activity, feature: "relatorios" },
      { to: "/app/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true, feature: "financeiro" },
      { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, feature: "relatorios" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/app/home-care", label: "Home Care", icon: HomeIcon, feature: "home_care" },
      { to: "/app/marketing", label: "Marketing", icon: Megaphone, feature: "marketing" },
      { to: "/app/diferenciais", label: "Diferenciais", icon: Sparkles },
      { to: "/app/profissionais", label: "Profissionais", icon: UserCog, adminOnly: true },
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

const COLLAPSED_KEY = "fos-sidebar-collapsed";

export function AppShell({ children, initialUser = null }: { children: ReactNode; initialUser?: User | null }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const user = authUser ?? (authLoading ? initialUser : null);
  const { isAdmin } = useRoles(user?.id);
  const { isPlatformAdmin } = usePlatformContext();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminSaasArea = location.pathname.startsWith("/app/admin-saas");
  const clinicBrand = useBranding();
  const brand = isAdminSaasArea ? ADMIN_SAAS_BRAND : clinicBrand;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

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

  const { data: profile, isLoading: avatarProfileLoading } = useQuery({
    queryKey: ["user-avatar", user?.id],
    enabled: !!user?.id,
    staleTime: 50 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: user?.id
      ? (pcGet<{ avatar_url: string | null }>(`fos:profile-avatar:${user.id}`) ?? undefined)
      : undefined,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user!.id).maybeSingle();
      if (user?.id) pcSet(`fos:profile-avatar:${user.id}`, data ?? { avatar_url: null }, 24 * 60 * 60_000);
      return data;
    },
  });
  const avatarPath = (profile as any)?.avatar_url ?? null;

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

  const sidebarWidth = collapsed ? "w-[76px]" : "w-[260px]";

  return (
    <TooltipProvider delayDuration={150}>
    <SupportClickInterceptor />
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 min-h-0">

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 glass-topbar flex items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2">
          <ClinicLogo brand={brand} isLoading={brand.isLoading} compact />
          <span className="font-semibold truncate" style={{ color: brand.primaryColor }}>{brand.clinicName}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Button>
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer hover:opacity-90 transition-opacity"
            aria-label="Alterar foto de perfil"
          >
            <UserAvatar userId={user?.id} avatarPath={avatarPath} name={userName} size={34} gradient={avatarGradient} isLoading={avatarProfileLoading} />
          </button>
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} aria-label="Abrir menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-30 h-screen glass-sidebar flex flex-col transition-[width,transform] duration-300",
          sidebarWidth,
          "lg:translate-x-0",
          open ? "translate-x-0 w-[260px]" : "-translate-x-full w-[260px] lg:translate-x-0",
        )}
      >
        {/* Brand header */}
        <div className={cn(
          "hidden lg:flex items-center h-20 border-b border-white/40 transition-all",
          collapsed ? "px-3 justify-center" : "px-5 gap-3",
        )}>
          <ClinicLogo brand={brand} isLoading={brand.isLoading} compact={collapsed} />
          {!collapsed && (
            <div className="leading-tight min-w-0 flex-1">
              <div className="font-semibold text-[15px] truncate tracking-tight" style={{ color: brand.primaryColor }}>{brand.clinicName}</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate">
                {brand.hasOwnLogo ? "Plataforma clínica" : `Powered by ${brand.appName}`}
              </div>
            </div>
          )}
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-5 space-y-5", collapsed ? "px-2" : "px-3")}>
          {visibleGroups.map((g) => (
            <div key={g.title}>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  {g.title}
                </div>
              )}
              {collapsed && <div className="mx-3 mb-2 h-px bg-border/60" />}
              <div className="space-y-1">
                {g.items.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    exact={item.exact}
                    icon={item.icon}
                    label={item.label}
                    collapsed={collapsed}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: collapse + user */}
        <div className="border-t border-white/40 p-3 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn("hidden lg:flex w-full", collapsed ? "justify-center px-0" : "justify-start")}
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : (<><PanelLeftClose className="h-4 w-4 mr-2" /> Recolher</>)}
          </Button>

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setAvatarOpen(true)}
                  className="w-full flex justify-center py-1.5 rounded-lg hover:bg-white/60 transition-colors"
                  aria-label="Minha conta"
                >
                  <UserAvatar userId={user?.id} avatarPath={avatarPath} name={userName} size={32} gradient={avatarGradient} isLoading={avatarProfileLoading} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{userName || "Minha conta"}</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="w-full flex items-center gap-3 px-2 rounded-lg hover:bg-white/60 py-1.5 transition-colors text-left cursor-pointer group"
                aria-label="Alterar foto de perfil"
              >
                <UserAvatar userId={user?.id} avatarPath={avatarPath} name={userName} size={34} gradient={avatarGradient} isLoading={avatarProfileLoading} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{userName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
                </div>
                <UserCircle2 className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            </>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full" onClick={logout} aria-label="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="outline" size="sm" className="w-full justify-start glass" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="sticky top-0 z-30">
          <SupportBanner />
          {/* Desktop top bar */}
          <header className="hidden lg:flex h-20 items-center justify-between gap-6 px-10 glass-topbar">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{todayLabel}</div>
              <div className="text-lg font-semibold tracking-tight truncate" style={{ color: brand.primaryColor }}>
                {brand.clinicName}
                {brand.slogan && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground italic">· {brand.slogan}</span>
                )}
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
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer hover:opacity-90 transition-opacity"
                aria-label="Alterar foto de perfil"
              >
                <UserAvatar userId={user?.id} avatarPath={avatarPath} name={userName} size={40} gradient={avatarGradient} className="shadow-soft" isLoading={avatarProfileLoading} />
              </button>
            </div>
          </header>
        </div>

        <div className="px-6 py-8 sm:px-10 lg:px-12 lg:py-10 max-w-[1400px] mx-auto">{children}</div>
      </main>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      {user?.id && (
        <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Foto de perfil</DialogTitle>
            </DialogHeader>
            <AvatarUploader userId={user.id} initial={avatarPath} initialLoading={avatarProfileLoading} />
          </DialogContent>
        </Dialog>
      )}
    </div>
    </TooltipProvider>
  );
}

function NavItem({ to, exact, icon: Icon, label, collapsed, onClick }: { to: string; exact?: boolean; icon: typeof LayoutDashboard; label: string; collapsed: boolean; onClick: () => void }) {
  const loc = useLocation();
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to) && to !== "/app";

  const link = (
    <Link
      to={to}
      onClick={onClick}
      data-active={active}
      data-sidebar="nav-item"
      className={cn(
        "group relative flex items-center rounded-xl text-[13.5px] lift transition-colors",
        collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3.5 py-2.5",
        active
          ? "bg-white/85 text-primary font-semibold shadow-soft"
          : "text-sidebar-foreground/85 hover:bg-white/60 hover:text-primary",
      )}
      aria-label={label}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
      )}
      <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
