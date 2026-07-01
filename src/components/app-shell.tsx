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
  ArrowDownCircle,
  Receipt,
} from "lucide-react";

import { useEffect, useState, type ReactNode } from "react";

import type { User } from "@supabase/supabase-js";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth";
import { useActiveClinic } from "@/lib/active-clinic";

import { GlobalSearch } from "@/components/global-search";

import { UserAvatar, AvatarUploader } from "@/components/avatar-uploader";

import { usePlatformContext } from "@/lib/platform-context";

import { usePlanFeatures } from "@/lib/plan-features";

import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { TooltipProvider } from "@/components/ui/tooltip";

import { useBranding, FISIOOS_DEFAULTS } from "@/lib/branding";
import { preloadImageUrl } from "@/lib/image-preload";
import { preloadAvatarUrl } from "@/lib/user-avatar";

import { ClinicLogo } from "@/components/clinic-logo";

import { AppSidebar } from "@/components/sidebar/AppSidebar";

import { SIDEBAR_LAYOUT } from "@/components/sidebar/sidebar-layout";

import { SupportBanner } from "@/components/support-banner";

import { SupportClickInterceptor } from "@/components/support-click-interceptor";

import { pcGet, pcSet } from "@/lib/persistent-cache";
import { AdminSaasShell } from "@/components/admin-saas-shell";
import { isAdminAppMode } from "@/lib/app-mode";

function cleanName(value: string | null | undefined): string {
  if (!value) return "";
  let name = value.trim();
  if (name.includes("@")) {
    name = name.split("@")[0];
  }
  name = name.replace(/\d+$/, "");
  const firstWord = name.split(/[\s.\-_]/)[0];
  if (firstWord) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }
  return "";
}

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

  status?: "beta" | "legacy";
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

        label: "Painel Financeiro",

        icon: Wallet,

        adminOnly: true,

        feature: "financeiro",
      },

      {
        to: "/app/financeiro/receber",

        label: "Recebimentos",

        icon: ArrowDownCircle,

        adminOnly: true,

        feature: "financeiro",
      },

      {
        to: "/app/financeiro/recibos",

        label: "Recibos",

        icon: Receipt,

        adminOnly: true,

        feature: "financeiro",
      },

      {
        to: "/app/relatorios",

        label: "Relatórios",

        icon: BarChart3,

        adminOnly: true,

        feature: "relatorios",
      },
    ],
  },

  {
    title: "Sistema",

    items: [
      { to: "/app/home-care", label: "Home Care", icon: HomeIcon, feature: "home_care", status: "beta" },

      { to: "/app/marketing", label: "Marketing", icon: Megaphone, feature: "marketing", status: "beta" },

      { to: "/app/diferenciais", label: "Diferenciais", icon: Sparkles, status: "beta" },

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

const COLLAPSED_KEY = SIDEBAR_LAYOUT.collapseStorageKey;

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

  const { isAdmin, clinicRole, membershipCount } = useActiveClinic();

  const { isPlatformAdmin } = usePlatformContext();

  const [open, setOpen] = useState(false);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;

    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  });

  const navigate = useNavigate();

  const location = useLocation();

  const adminAppMode = isAdminAppMode();

  const isAdminSaasArea = location.pathname.startsWith("/app/admin-saas");

  const clinicBrand = useBranding({ disabled: adminAppMode || isAdminSaasArea });

  const brand = adminAppMode || isAdminSaasArea ? ADMIN_SAAS_BRAND : clinicBrand;

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

  const activeGroups = adminAppMode || isPlatformAdmin ? platformGroups : groups;

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

  const userRole = roleLabel(clinicRole, isAdmin, isPlatformAdmin);

  const today = new Date();

  const todayLabel = today.toLocaleDateString("pt-BR", {
    weekday: "long",

    day: "2-digit",

    month: "long",
  });

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
      const { data } = await supabase

        .from("profiles")

        .select("avatar_url, full_name")

        .eq("id", user!.id)

        .maybeSingle();

      if (user?.id)
        pcSet(`fos:profile-avatar:${user.id}`, data ?? { avatar_url: null }, 24 * 60 * 60_000);

      return data;
    },
  });

  const avatarPath = (profile as any)?.avatar_url ?? null;
  const avatarLoading = avatarProfileLoading && !avatarPath;
  const profileFullName = (profile as any)?.full_name;

  const userName =
    cleanName(profileFullName) ||
    cleanName((user?.user_metadata as any)?.full_name) ||
    cleanName(user?.email) ||
    "";

  useEffect(() => {
    if (brand.logoUrl) void preloadImageUrl(brand.logoUrl);
  }, [brand.logoUrl]);

  useEffect(() => {
    if (avatarPath) void preloadAvatarUrl(avatarPath);
  }, [avatarPath]);

  const logoLoading = brand.hasOwnLogo && !brand.logoUrl;

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

  const appFrame = (
    <>
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
              <ClinicLogo brand={brand} isLoading={logoLoading} variant="inline" size="md" />

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
                  isLoading={avatarLoading}
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

          <AppSidebar
            brand={brand}
            logoLoading={logoLoading}
            visibleGroups={visibleGroups}
            collapsed={collapsed}
            mobileOpen={open}
            onToggleCollapsed={() => setCollapsed((v) => !v)}
            onCloseMobile={() => setOpen(false)}
            userName={userName}
            userRole={userRole}
            userId={user?.id}
            avatarPath={avatarPath}
            avatarGradient={avatarGradient}
            avatarLoading={avatarLoading}
            isAdmin={isAdmin}
            onAvatarClick={() => setAvatarOpen(true)}
            onLogout={logout}
            onSwitchClinic={
              !adminAppMode && !isPlatformAdmin && !isAdminSaasArea && membershipCount > 1
                ? () => navigate({ to: "/app/selecionar-clinica" })
                : undefined
            }
          />

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
                      isLoading={avatarLoading}
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
    </>
  );

  if (adminAppMode || isAdminSaasArea) {
    return <AdminSaasShell>{appFrame}</AdminSaasShell>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      {appFrame}
    </TooltipProvider>
  );
}
