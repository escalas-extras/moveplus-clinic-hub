import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Wallet,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Activity,
  FileText,
  RefreshCw,
  BarChart3,
  BookOpen,
  Megaphone,
  Sparkles,
  PenLine,
  Bell,
  Search,
  Building2,
  ClipboardList,
  FilePlus2,
  Stethoscope,
  Home as HomeIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
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

import { SupportBanner } from "@/components/support-banner";

import { SupportClickInterceptor } from "@/components/support-click-interceptor";

import { pcGet, pcSet } from "@/lib/persistent-cache";

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

type NavItemDef = {
  to: string;

  label: string;

  icon: typeof LayoutDashboard;

  exact?: boolean;

  adminOnly?: boolean;

  superAdminOnly?: boolean;

  feature?: string;
};

type NavGroup = { title: string; items: NavItemDef[]; platform?: boolean };

/** Clinical Command Center — agrupamento por contexto operacional. */

const groups: NavGroup[] = [
  {
    title: "Visão Geral",

    items: [
      { to: "/app", label: "Painel", icon: LayoutDashboard, exact: true },

      { to: "/app/dashboard-clinico", label: "Indicadores", icon: Activity, feature: "relatorios" },
    ],
  },

  {
    title: "Atendimento",

    items: [
      { to: "/app/agenda", label: "Agenda", icon: CalendarDays, feature: "agenda" },

      { to: "/app/pacientes", label: "Pacientes", icon: Users, feature: "pacientes" },
    ],
  },

  {
    title: "Prontuário",

    items: [
      { to: "/app/avaliacoes", label: "Avaliações", icon: ClipboardList, feature: "avaliacoes" },

      { to: "/app/evolucoes", label: "Evoluções", icon: Stethoscope, feature: "avaliacoes" },

      { to: "/app/reavaliacoes", label: "Reavaliações", icon: RefreshCw, feature: "avaliacoes" },

      { to: "/app/altas", label: "Altas", icon: LogOut, feature: "avaliacoes" },
    ],
  },

  {
    title: "Gestão",

    items: [
      { to: "/app/documentos", label: "Emissão", icon: FilePlus2, feature: "documentos" },

      {
        to: "/app/templates",

        label: "Modelos",

        icon: PenLine,

        adminOnly: true,

        feature: "documentos",
      },

      { to: "/app/biblioteca", label: "Biblioteca", icon: BookOpen, feature: "biblioteca" },

      {
        to: "/app/financeiro",

        label: "Financeiro",

        icon: Wallet,

        adminOnly: true,

        feature: "financeiro",
      },

      {
        to: "/app/recibos",

        label: "Recibos",

        icon: FileText,

        adminOnly: true,

        feature: "financeiro",
      },

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

    items: [{ to: "/app/admin-saas", label: "Painel SaaS", icon: Building2, superAdminOnly: true }],
  },
];

const COLLAPSED_KEY = "fos-sidebar-collapsed";

const CLINIC_ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",

  admin: "Administrador",

  professional: "Profissional",

  receptionist: "Recepção",

  assistant: "Assistente",
};

function roleLabel(clinicRole: string | null, isAdmin: boolean, isPlatformAdmin: boolean): string {
  if (isPlatformAdmin) return "Super Admin";

  if (clinicRole && CLINIC_ROLE_LABELS[clinicRole]) return CLINIC_ROLE_LABELS[clinicRole];

  if (isAdmin) return "Administrador";

  return "Profissional";
}

export function AppShell({
  children,

  initialUser = null,
}: {
  children: ReactNode;

  initialUser?: User | null;
}) {
  const { user: authUser, loading: authLoading } = useAuth();

  const user = authUser ?? (authLoading ? initialUser : null);

  const { isAdmin, clinicRole } = useRoles(user?.id);

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

  useEffect(() => {
    if (!isPlatformAdmin) return;

    if (location.pathname.startsWith("/app") && !location.pathname.startsWith("/app/admin-saas")) {
      navigate({ to: "/app/admin-saas", replace: true });
    }
  }, [isPlatformAdmin, location.pathname, navigate]);

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

  const userRole = roleLabel(clinicRole, isAdmin, isPlatformAdmin);

  const today = new Date();

  const todayLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",

    day: "2-digit",

    month: "long",
  });

  const avatarGradient = `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`;

  const sidebarExpanded = !collapsed || open;

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
      const { data } = await supabase

        .from("profiles")

        .select("avatar_url")

        .eq("id", user!.id)

        .maybeSingle();

      if (user?.id)
        pcSet(`fos:profile-avatar:${user.id}`, data ?? { avatar_url: null }, 24 * 60 * 60_000);

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

  const sidebarWidthClass = collapsed && !open ? "w-[72px]" : "w-[280px]";

  return (
    <TooltipProvider delayDuration={150}>
      <SupportClickInterceptor />

      <div className="min-h-screen flex flex-col">
        <div className="flex flex-1 min-h-0">
          {/* Mobile overlay */}

          {open && (
            <button
              type="button"
              className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
            />
          )}

          {/* Mobile top bar */}

          <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 glass-topbar flex items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-3 flex-1">
              <ClinicLogo brand={brand} isLoading={brand.isLoading} variant="inline" size="md" />

              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate text-foreground">
                  {brand.clinicName}
                </div>

                <div className="text-[11px] text-muted-foreground truncate">{brand.slogan}</div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={() => setSearchOpen(true)}
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </Button>

              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer hover:opacity-90 transition-opacity min-h-11 min-w-11 flex items-center justify-center"
                aria-label="Alterar foto de perfil"
              >
                <UserAvatar
                  userId={user?.id}
                  avatarPath={avatarPath}
                  name={userName}
                  size={34}
                  gradient={avatarGradient}
                  isLoading={avatarProfileLoading}
                />
              </button>

              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={() => setOpen(!open)}
                aria-label={open ? "Fechar menu" : "Abrir menu"}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </header>

          {/* Sidebar — Clinical Command Center */}

          <aside
            className={cn(
              "fixed lg:sticky top-0 left-0 z-30 h-screen h-dvh glass-sidebar flex flex-col transition-[width,transform] duration-300 ease-out overflow-hidden",

              sidebarWidthClass,

              "lg:translate-x-0",

              open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            )}
          >
            {/* Identity block */}

            <div
              className={cn(
                "shrink-0 border-b border-sidebar-border",

                collapsed && !open
                  ? "flex flex-col items-center gap-2 px-2 py-3.5"
                  : "px-3 py-4 space-y-3",
              )}
            >
              <div
                className={cn(
                  "sidebar-identity-glow rounded-xl overflow-hidden",

                  collapsed && !open ? "flex justify-center w-full max-w-[52px]" : "w-full",
                )}
              >
                <ClinicLogo
                  brand={brand}
                  isLoading={brand.isLoading}
                  variant={collapsed && !open ? "sidebar-mark" : "sidebar-brand"}
                />
              </div>

              {sidebarExpanded && (
                <div className="space-y-0.5 min-w-0 text-center lg:text-left">
                  <div className="font-semibold text-[15px] leading-snug tracking-tight text-white truncate">
                    {brand.clinicName}
                  </div>

                  {brand.slogan && (
                    <div className="text-[12px] leading-relaxed text-sidebar-foreground/70 line-clamp-2">
                      {brand.slogan}
                    </div>
                  )}

                  <div className="text-[10px] uppercase tracking-[0.14em] text-sidebar-foreground/45 pt-0.5">
                    {brand.hasOwnLogo ? `Powered by ${brand.appName}` : brand.appName}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}

            <nav
              className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-4",

                collapsed && !open ? "px-2 space-y-3" : "px-3 space-y-6",
              )}
            >
              {visibleGroups.map((g, gi) => (
                <div key={g.title}>
                  {sidebarExpanded && (
                    <div className="sidebar-nav-group-label px-2.5 mb-2 text-[10px] font-semibold uppercase select-none">
                      {g.title}
                    </div>
                  )}

                  {gi > 0 && !sidebarExpanded && (
                    <div className="sidebar-group-divider mx-2 mb-2 h-px" aria-hidden />
                  )}

                  <div className="space-y-0.5">
                    {g.items.map((item) => (
                      <NavItem
                        key={item.to}
                        to={item.to}
                        exact={item.exact}
                        icon={item.icon}
                        label={item.label}
                        collapsed={collapsed && !open}
                        onClick={() => setOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer — usuário + ações */}

            <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "hidden lg:flex w-full text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent min-h-10",

                  collapsed ? "justify-center px-0" : "justify-start",
                )}
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <>
                    <PanelLeftClose className="h-4 w-4 mr-2 shrink-0" /> Recolher menu
                  </>
                )}
              </Button>

              {collapsed && !open ? (
                <CollapsedUserFooter
                  userName={userName}
                  userRole={userRole}
                  avatarPath={avatarPath}
                  userId={user?.id}
                  avatarGradient={avatarGradient}
                  avatarLoading={avatarProfileLoading}
                  onAvatarClick={() => setAvatarOpen(true)}
                  onLogout={logout}
                  isAdmin={isAdmin}
                />
              ) : (
                <ExpandedUserFooter
                  userName={userName}
                  userRole={userRole}
                  userEmail={user?.email}
                  avatarPath={avatarPath}
                  userId={user?.id}
                  avatarGradient={avatarGradient}
                  avatarLoading={avatarProfileLoading}
                  onAvatarClick={() => setAvatarOpen(true)}
                  onLogout={logout}
                  isAdmin={isAdmin}
                />
              )}
            </div>
          </aside>

          <main className="fos-app-canvas flex-1 min-w-0 pt-16 lg:pt-0">
            <div className="sticky top-0 z-30">
              <SupportBanner />

              <header className="hidden lg:flex h-[4.5rem] items-center justify-between gap-6 px-10 glass-topbar">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {todayLabel}
                  </div>

                  <div
                    className="text-lg font-semibold tracking-tight truncate"
                    style={{ color: brand.primaryColor }}
                  >
                    {brand.clinicName}

                    {brand.slogan && (
                      <span className="ml-2 text-sm font-normal text-slate-500 italic">
                        · {brand.slogan}
                      </span>
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

                    <kbd className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/60 border border-white/70">
                      ⌘K
                    </kbd>
                  </button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full glass xl:hidden h-11 w-11"
                    onClick={() => setSearchOpen(true)}
                    aria-label="Buscar"
                  >
                    <Search className="h-4 w-4" />
                  </Button>

                  <Button variant="ghost" size="icon" className="rounded-full glass h-11 w-11">
                    <Bell className="h-4 w-4" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => setAvatarOpen(true)}
                    className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer hover:opacity-90 transition-opacity"
                    aria-label="Alterar foto de perfil"
                  >
                    <UserAvatar
                      userId={user?.id}
                      avatarPath={avatarPath}
                      name={userName}
                      size={40}
                      gradient={avatarGradient}
                      className="shadow-soft"
                      isLoading={avatarProfileLoading}
                    />
                  </button>
                </div>
              </header>
            </div>

            <div className="px-6 py-8 sm:px-10 lg:px-12 lg:py-10 max-w-[1400px] mx-auto fos-content-inner">
              {children}
            </div>
          </main>
        </div>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {user?.id && (
          <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Foto de perfil</DialogTitle>
              </DialogHeader>

              <AvatarUploader
                userId={user.id}
                initial={avatarPath}
                initialLoading={avatarProfileLoading}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
}

function NavItem({
  to,

  exact,

  icon: Icon,

  label,

  collapsed,

  onClick,
}: {
  to: string;

  exact?: boolean;

  icon: typeof LayoutDashboard;

  label: string;

  collapsed: boolean;

  onClick: () => void;
}) {
  const loc = useLocation();

  const active = exact
    ? loc.pathname === to
    : loc.pathname === to || (to !== "/app" && loc.pathname.startsWith(to));

  const link = (
    <Link
      to={to}
      onClick={onClick}
      data-active={active}
      data-sidebar="nav-item"
      className={cn(
        "group relative flex items-center rounded-xl text-[13.5px] font-medium transition-all duration-200",

        collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 min-h-[44px] py-2.5",

        active
          ? "bg-sidebar-accent text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/80 hover:text-white",
      )}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <span
          className={cn(
            "absolute rounded-full bg-sidebar-primary",

            collapsed
              ? "left-0 top-1/2 -translate-y-1/2 h-6 w-[3px]"
              : "left-0 top-2 bottom-2 w-[3px] rounded-r-full",
          )}
        />
      )}

      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",

          active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-white",
        )}
        strokeWidth={active ? 2.25 : 1.75}
      />

      {!collapsed && <span className="truncate flex-1">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>

      <TooltipContent side="right" className="font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ExpandedUserFooter({
  userName,

  userRole,

  userEmail,

  avatarPath,

  userId,

  avatarGradient,

  avatarLoading,

  onAvatarClick,

  onLogout,

  isAdmin,
}: {
  userName: string;

  userRole: string;

  userEmail?: string;

  avatarPath: string | null;

  userId?: string;

  avatarGradient: string;

  avatarLoading: boolean;

  onAvatarClick: () => void;

  onLogout: () => void;

  isAdmin: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-sidebar-accent/60 p-2.5 space-y-2">
        <button
          type="button"
          onClick={onAvatarClick}
          className="w-full flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent transition-colors text-left cursor-pointer group min-h-[44px]"
          aria-label="Minha conta"
        >
          <UserAvatar
            userId={userId}
            avatarPath={avatarPath}
            name={userName}
            size={36}
            gradient={avatarGradient}
            isLoading={avatarLoading}
          />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{userName || "Usuário"}</div>

            <div className="text-[11px] text-sidebar-primary font-medium truncate">{userRole}</div>

            {userEmail && (
              <div className="text-[10px] text-sidebar-foreground/50 truncate">{userEmail}</div>
            )}
          </div>
        </button>

        {isAdmin && (
          <Link
            to="/app/configuracoes"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent transition-colors min-h-[40px]"
          >
            <Settings className="h-4 w-4 shrink-0" />

            <span className="flex-1">Configurações</span>

            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
          </Link>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-sidebar-foreground/75 hover:text-white hover:bg-sidebar-accent min-h-10"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4 mr-2 shrink-0" /> Sair
      </Button>
    </div>
  );
}

function CollapsedUserFooter({
  userName,

  userRole,

  avatarPath,

  userId,

  avatarGradient,

  avatarLoading,

  onAvatarClick,

  onLogout,

  isAdmin,
}: {
  userName: string;

  userRole: string;

  avatarPath: string | null;

  userId?: string;

  avatarGradient: string;

  avatarLoading: boolean;

  onAvatarClick: () => void;

  onLogout: () => void;

  isAdmin: boolean;
}) {
  return (
    <div className="space-y-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onAvatarClick}
            className="w-full flex justify-center py-1 rounded-xl hover:bg-sidebar-accent transition-colors min-h-11"
            aria-label={`${userName} · ${userRole}`}
          >
            <UserAvatar
              userId={userId}
              avatarPath={avatarPath}
              name={userName}
              size={36}
              gradient={avatarGradient}
              isLoading={avatarLoading}
            />
          </button>
        </TooltipTrigger>

        <TooltipContent side="right">
          <div className="font-semibold">{userName}</div>

          <div className="text-xs opacity-80">{userRole}</div>
        </TooltipContent>
      </Tooltip>

      {isAdmin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/app/configuracoes"
              className="flex justify-center items-center h-11 w-11 mx-auto rounded-xl hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-white transition-colors"
              aria-label="Configurações"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </TooltipTrigger>

          <TooltipContent side="right">Configurações</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-11 text-sidebar-foreground/75 hover:text-white hover:bg-sidebar-accent"
            onClick={onLogout}
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>

        <TooltipContent side="right">Sair</TooltipContent>
      </Tooltip>
    </div>
  );
}
