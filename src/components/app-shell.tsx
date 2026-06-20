import logoAsset from "@/assets/logo.jpg.asset.json";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, CalendarDays, Wallet, UserCog, Settings, LogOut, Menu, X,
  ShieldCheck, Activity, FileText, RefreshCw, BarChart3, BookOpen, Home as HomeIcon,
  Megaphone, Sparkles, Stethoscope, PenLine,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBranding } from "@/lib/branding";

type NavItemDef = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; adminOnly?: boolean };
type NavGroup = { title: string; items: NavItemDef[] };

const groups: NavGroup[] = [
  {
    title: "Clínico",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/app/dashboard-clinico", label: "Indicadores", icon: Activity },
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
      { to: "/app/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const brand = useBranding();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen flex">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 glass-sidebar flex items-center justify-between px-4">
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
          "fixed lg:sticky top-0 left-0 z-30 h-screen w-64 glass-sidebar flex flex-col transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden lg:flex items-center gap-3 px-5 h-16 border-b border-white/40">
          <Logo brand={brand} />
          <div className="leading-tight min-w-0">
            <div className="font-semibold truncate" style={{ color: brand.primaryColor }}>{brand.clinicName}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
              {brand.hasOwnLogo ? "Fisioterapia" : `Powered by ${brand.appName}`}
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {visibleGroups.map((g) => (
            <div key={g.title}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {g.title}
              </div>
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <NavItem key={item.to} to={item.to} exact={item.exact} icon={item.icon} label={item.label} onClick={() => setOpen(false)} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/40 p-3">
          <div className="text-xs text-muted-foreground mb-2 truncate">{user?.email}</div>
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
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
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm lift",
        active
          ? "bg-white/80 text-primary font-medium shadow-soft"
          : "text-sidebar-foreground/80 hover:bg-white/55 hover:text-primary",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function Logo({ brand, compact = false }: { brand: ReturnType<typeof useBranding>; compact?: boolean }) {
  const size = compact ? "h-9 w-9" : "h-11 w-11";
  if (brand.hasOwnLogo && brand.logoUrl) {
    return <img src={brand.logoUrl} alt={brand.clinicName} className={cn(size, "rounded-xl object-contain")} />;
  }
  if (brand.clinicName === "FisioOS") {
    return (
      <div
        className={cn(size, "rounded-2xl flex items-center justify-center shadow-soft")}
        style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
      >
        <Stethoscope className={cn(compact ? "h-5 w-5" : "h-6 w-6", "text-white")} />
      </div>
    );
  }
  return <img src={logoAsset.url} alt={brand.clinicName} className={cn(size, "rounded-xl")} />;
}
