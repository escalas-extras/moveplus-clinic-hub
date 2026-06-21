
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CalendarDays, Wallet, UserCog, Settings, LogOut, Menu, X,
  ShieldCheck, Activity, FileText, RefreshCw, BarChart3, BookOpen, Home as HomeIcon,
  Megaphone, Sparkles, Stethoscope, PenLine, Bell, Search, Building2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBranding } from "@/lib/branding";
import { fmtDate } from "@/lib/format";

type NavItemDef = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; adminOnly?: boolean; superAdminOnly?: boolean };
type NavGroup = { title: string; items: NavItemDef[] };

const groups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
      { to: "/app/pacientes", label: "Pacientes", icon: Users },
      { to: "/app/reavaliacoes", label: "Reavaliações", icon: RefreshCw },
      { to: "/app/home-care", label: "Home Care", icon: HomeIcon },
    ],
  },
  {
    title: "Documentação",
    items: [
      { to: "/app/documentos", label: "Documentos", icon: FileText },
      { to: "/app/templates", label: "Modelos", icon: PenLine, adminOnly: true },
      { to: "/app/biblioteca", label: "Biblioteca", icon: BookOpen },
    ],
  },
  {
    title: "Gestão",
    items: [
      { to: "/app/dashboard-clinico", label: "Indicadores", icon: Activity },
      { to: "/app/relatorios", label: "Relatórios", icon: BarChart3 },
      { to: "/app/marketing", label: "Marketing", icon: Megaphone },
      { to: "/app/diferenciais", label: "Diferenciais", icon: Sparkles },
      { to: "/app/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
      { to: "/app/profissionais", label: "Profissionais", icon: UserCog, adminOnly: true },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/app/usuarios", label: "Usuários", icon: ShieldCheck, adminOnly: true },
      { to: "/app/admin-saas", label: "Admin SaaS", icon: Building2, superAdminOnly: true },
      { to: "/app/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin, roles } = useRoles(user?.id);
  const isSuperAdmin = (roles as any[]).includes("super_admin");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const brand = useBranding();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => (!i.adminOnly || isAdmin) && (!i.superAdminOnly || isSuperAdmin)) }))
    .filter((g) => g.items.length > 0);

  const userName = (user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "";
  const initial = (userName || "U").charAt(0).toUpperCase();
  const today = new Date();
  const todayLabel = today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="min-h-screen flex">
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
          <div className="flex items-center gap-3 px-1 mb-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{userName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>
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
            <div className="hidden xl:flex items-center gap-2 glass rounded-full px-4 py-2 w-80 text-sm text-muted-foreground">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">Buscar paciente, documento…</span>
              <kbd className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/60 border border-white/70">⌘K</kbd>
            </div>

            <Button variant="ghost" size="icon" className="rounded-full glass">
              <Bell className="h-4 w-4" />
            </Button>
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-soft"
              style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
              title={userName}
            >
              {initial}
            </div>
          </div>
        </header>

        <div className="px-6 py-8 sm:px-10 lg:px-12 lg:py-12 max-w-[1400px] mx-auto">{children}</div>
      </main>
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
  if (brand.hasOwnLogo && brand.logoUrl) {
    return <img src={brand.logoUrl} alt={brand.clinicName} className={cn(size, "rounded-xl object-contain")} />;
  }
  // Neutral institutional fallback (FisioOS / white-label) — never references legacy brand
  return (
    <div
      className={cn(size, "rounded-2xl flex items-center justify-center shadow-soft")}
      style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
    >
      <Stethoscope className={cn(compact ? "h-5 w-5" : "h-6 w-6", "text-white")} />
    </div>
  );
}
