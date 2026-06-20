import logoAsset from "@/assets/logo.jpg.asset.json";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, CalendarDays, Wallet, UserCog, Settings, LogOut, Menu, X, ShieldCheck, Activity, FileText, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/dashboard-clinico", label: "Indicadores Clínicos", icon: Activity },
  { to: "/app/pacientes", label: "Pacientes", icon: Users },
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/app/reavaliacoes", label: "Reavaliações", icon: RefreshCw },
  { to: "/app/templates", label: "Modelos", icon: FileText, adminOnly: true },
  { to: "/app/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
  { to: "/app/profissionais", label: "Profissionais", icon: UserCog, adminOnly: true },
  { to: "/app/usuarios", label: "Usuários", icon: ShieldCheck, adminOnly: true },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
];


export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin } = useRoles(user?.id);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const items = nav.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 border-b bg-sidebar flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold">Move 60+</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-30 h-screen w-64 bg-sidebar border-r flex flex-col transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden lg:flex items-center gap-3 px-5 h-16 border-b">
          <Logo />
          <div className="leading-tight">
            <div className="font-semibold" style={{ color: "#2f5d3a" }}>Move 60+</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Fisioterapia</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map((item) => (
            <NavItem key={item.to} to={item.to} exact={item.exact} icon={item.icon} label={item.label} onClick={() => setOpen(false)} />
          ))}
        </nav>
        <div className="border-t p-3">
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
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Logo() {
  return <img src={logoAsset.url} alt="Move 60+" className="h-12 w-auto" />;
}
