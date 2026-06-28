/**
 * Sidebar Premium V2 — constantes de layout reutilizáveis (UX-05).
 * Utilizadas em todo o FisioOS via CSS variables + AppSidebar.
 */

export const SIDEBAR_LAYOUT = {
  /** Largura expandida (antes ~280px). */
  widthExpanded: 228,
  /** Largura recolhida (antes ~72px). */
  widthCollapsed: 60,
  headerMinHeight: 52,
  footerMinHeight: 48,
  navItemHeight: 36,
  navIconSize: 16,
  navFontSize: 12.5,
  navGap: 2,
  groupGap: 10,
  navPaddingX: 8,
  navPaddingY: 6,
  headerPaddingX: 12,
  headerPaddingY: 8,
  footerPaddingX: 8,
  footerPaddingY: 6,
  logoMarkSize: 32,
  transitionMs: 280,
  collapseStorageKey: "fos-sidebar-collapsed",
} as const;

export const SIDEBAR_CSS_VARS = {
  "--fos-sidebar-w-expanded": `${SIDEBAR_LAYOUT.widthExpanded}px`,
  "--fos-sidebar-w-collapsed": `${SIDEBAR_LAYOUT.widthCollapsed}px`,
  "--fos-sidebar-header-h": `${SIDEBAR_LAYOUT.headerMinHeight}px`,
  "--fos-sidebar-footer-h": `${SIDEBAR_LAYOUT.footerMinHeight}px`,
  "--fos-sidebar-nav-item-h": `${SIDEBAR_LAYOUT.navItemHeight}px`,
  "--fos-sidebar-transition": `${SIDEBAR_LAYOUT.transitionMs}ms`,
} as const;

export function sidebarWidthClass(collapsed: boolean, mobileOpen: boolean): string {
  return collapsed && !mobileOpen
    ? "w-[var(--fos-sidebar-w-collapsed)]"
    : "w-[var(--fos-sidebar-w-expanded)]";
}

export function isSidebarExpanded(collapsed: boolean, mobileOpen: boolean): boolean {
  return !collapsed || mobileOpen;
}
