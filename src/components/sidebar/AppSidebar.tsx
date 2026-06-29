import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserCircle2,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Branding } from "@/lib/branding";
import { ClinicLogo } from "@/components/clinic-logo";
import { UserAvatar } from "@/components/avatar-uploader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  isSidebarExpanded,
  SIDEBAR_LAYOUT,
  sidebarWidthClass,
} from "./sidebar-layout";

export type SidebarNavItemDef = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  status?: "beta" | "legacy";
};

export type SidebarNavGroup = {
  title: string;
  items: SidebarNavItemDef[];
};

type AppSidebarProps = {
  brand: Branding;
  logoLoading: boolean;
  visibleGroups: SidebarNavGroup[];
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  userName: string;
  userRole: string;
  userId?: string;
  avatarPath: string | null;
  avatarGradient: string;
  avatarLoading: boolean;
  isAdmin: boolean;
  onAvatarClick: () => void;
  onLogout: () => void;
  onSwitchClinic?: () => void;
};

export function AppSidebar({
  brand,
  logoLoading,
  visibleGroups,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
  userName,
  userRole,
  userId,
  avatarPath,
  avatarGradient,
  avatarLoading,
  isAdmin,
  onAvatarClick,
  onLogout,
  onSwitchClinic,
}: AppSidebarProps) {
  const expanded = isSidebarExpanded(collapsed, mobileOpen);

  return (
    <aside
      className={cn(
        "fos-sidebar glass-sidebar fixed left-0 top-0 z-30 flex h-screen h-dvh flex-col overflow-hidden transition-[width,transform] ease-out",
        sidebarWidthClass(collapsed, mobileOpen),
        "lg:sticky lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
      style={{ transitionDuration: `${SIDEBAR_LAYOUT.transitionMs}ms` }}
      aria-label="Menu principal"
    >
      <SidebarHeader brand={brand} logoLoading={logoLoading} expanded={expanded} />

      <nav
        className={cn(
          "fos-sidebar-nav min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain",
          expanded ? "px-2 py-1.5" : "px-1.5 py-1.5",
        )}
      >
        {visibleGroups.map((group, gi) => (
          <div
            key={group.title}
            className={cn(gi > 0 && (expanded ? "mt-2.5" : "mt-2"))}
          >
            {expanded && (
              <div className="sidebar-nav-group-label mb-1 px-2 text-[9px] font-semibold uppercase select-none">
                {group.title}
              </div>
            )}
            {!expanded && gi > 0 && (
              <div className="sidebar-group-divider mx-1.5 mb-1.5 h-px" aria-hidden />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.to}
                  {...item}
                  collapsed={!expanded}
                  onClick={onCloseMobile}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <SidebarFooter
        expanded={expanded}
        userName={userName}
        userRole={userRole}
        userId={userId}
        avatarPath={avatarPath}
        avatarGradient={avatarGradient}
        avatarLoading={avatarLoading}
        isAdmin={isAdmin}
        onToggleCollapsed={onToggleCollapsed}
        onAvatarClick={onAvatarClick}
        onLogout={onLogout}
        onSwitchClinic={onSwitchClinic}
      />
    </aside>
  );
}

function SidebarHeader({
  brand,
  logoLoading,
  expanded,
}: {
  brand: Branding;
  logoLoading: boolean;
  expanded: boolean;
}) {
  return (
    <div
      className={cn(
        "fos-sidebar-header shrink-0 border-b border-sidebar-border",
        expanded
          ? "flex items-center gap-2.5 px-3 py-2"
          : "flex flex-col items-center justify-center px-1.5 py-2",
      )}
    >
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-lg",
          expanded ? "h-8 w-8" : "h-8 w-8",
        )}
      >
        <ClinicLogo
          brand={brand}
          isLoading={logoLoading}
          variant="sidebar-mark"
          className="h-full w-full"
        />
      </div>

      {expanded && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight tracking-tight text-white">
            {brand.clinicName}
          </div>
          {brand.slogan && (
            <div className="truncate text-[10px] leading-snug text-sidebar-foreground/55">
              {brand.slogan}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarNavItem({
  to,
  exact,
  icon: Icon,
  label,
  status,
  collapsed,
  onClick,
}: SidebarNavItemDef & { collapsed: boolean; onClick: () => void }) {
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
        "group relative flex items-center rounded-lg text-[12.5px] font-medium transition-all duration-200",
        collapsed
          ? "mx-auto h-9 w-9 justify-center"
          : "min-h-[var(--fos-sidebar-nav-item-h)] gap-2.5 px-2.5 py-1.5",
        active
          ? "bg-sidebar-accent text-white font-semibold"
          : "text-sidebar-foreground/82 hover:bg-sidebar-accent/75 hover:text-white",
      )}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <span
          className={cn(
            "absolute rounded-full bg-sidebar-primary",
            collapsed
              ? "left-0 top-1/2 h-5 w-[2px] -translate-y-1/2"
              : "bottom-1.5 left-0 top-1.5 w-[2px] rounded-r-full",
          )}
        />
      )}
      <Icon
        className={cn(
          "shrink-0 transition-colors",
          collapsed ? "h-4 w-4" : "h-4 w-4",
          active ? "text-sidebar-primary" : "text-sidebar-foreground/55 group-hover:text-white",
        )}
        strokeWidth={active ? 2.25 : 1.75}
      />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          {status && (
            <span
              className={cn(
                "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
                status === "beta"
                  ? "bg-amber-400/16 text-amber-100 ring-1 ring-amber-300/25"
                  : "bg-slate-400/14 text-slate-200 ring-1 ring-white/10",
              )}
            >
              {status === "beta" ? "Beta" : "Legado"}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarFooter({
  expanded,
  userName,
  userRole,
  userId,
  avatarPath,
  avatarGradient,
  avatarLoading,
  isAdmin,
  onToggleCollapsed,
  onAvatarClick,
  onLogout,
  onSwitchClinic,
}: {
  expanded: boolean;
  userName: string;
  userRole: string;
  userId?: string;
  avatarPath: string | null;
  avatarGradient: string;
  avatarLoading: boolean;
  isAdmin: boolean;
  onToggleCollapsed: () => void;
  onAvatarClick: () => void;
  onLogout: () => void;
  onSwitchClinic?: () => void;
}) {
  const settingsMenu = (
    <DropdownMenuContent align={expanded ? "end" : "center"} side="right" className="w-48">
      <DropdownMenuItem onClick={onAvatarClick} className="gap-2 text-xs">
        <UserCircle2 className="h-3.5 w-3.5" />
        Foto de perfil
      </DropdownMenuItem>
      {onSwitchClinic ? (
        <DropdownMenuItem onClick={onSwitchClinic} className="gap-2 text-xs">
          <Building2 className="h-3.5 w-3.5" />
          Trocar clínica
        </DropdownMenuItem>
      ) : null}
      {isAdmin && (
        <DropdownMenuItem asChild className="gap-2 text-xs">
          <Link to="/app/configuracoes">
            <Settings className="h-3.5 w-3.5" />
            Configurações
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onLogout} className="gap-2 text-xs text-destructive focus:text-destructive">
        <LogOut className="h-3.5 w-3.5" />
        Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (!expanded) {
    return (
      <div className="fos-sidebar-footer shrink-0 space-y-1 border-t border-sidebar-border p-1.5">
        <Tooltip delayDuration={120}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-9 w-9 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white lg:flex mx-auto"
              onClick={onToggleCollapsed}
              aria-label="Expandir menu"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expandir menu</TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={120}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onAvatarClick}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent"
              aria-label={`${userName} · ${userRole}`}
            >
              <UserAvatar
                userId={userId}
                avatarPath={avatarPath}
                name={userName}
                size={28}
                gradient={avatarGradient}
                isLoading={avatarLoading}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div className="text-xs font-semibold">{userName}</div>
            <div className="text-[10px] opacity-80">{userRole}</div>
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip delayDuration={120}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mx-auto h-9 w-9 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                  aria-label="Menu da conta"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Conta</TooltipContent>
          </Tooltip>
          {settingsMenu}
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="fos-sidebar-footer shrink-0 border-t border-sidebar-border px-2 py-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAvatarClick}
          className="shrink-0 rounded-lg p-0.5 transition-colors hover:bg-sidebar-accent"
          aria-label="Minha conta"
        >
          <UserAvatar
            userId={userId}
            avatarPath={avatarPath}
            name={userName}
            size={28}
            gradient={avatarGradient}
            isLoading={avatarLoading}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-white">{userName || "Usuário"}</div>
          <div className="truncate text-[10px] font-medium text-sidebar-primary/90">{userRole}</div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
              aria-label="Configurações e conta"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {settingsMenu}
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white lg:flex"
          onClick={onToggleCollapsed}
          aria-label="Recolher menu"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export { SIDEBAR_LAYOUT, sidebarWidthClass, isSidebarExpanded } from "./sidebar-layout";
