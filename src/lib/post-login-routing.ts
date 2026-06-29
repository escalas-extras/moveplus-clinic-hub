import type { SessionBootstrap } from "@/lib/session-bootstrap";
import { fetchSessionBootstrap } from "@/lib/session-bootstrap";
import { isAdminAppMode } from "@/lib/app-mode";

/**
 * Future domain split (DNS not configured yet):
 *
 * | Host                    | Audience        | Entry route        |
 * |-------------------------|-----------------|--------------------|
 * | www.fisioos.com.br      | Marketing       | Public site        |
 * | app.fisioos.com.br      | Clinic users    | /auth → /app       |
 * | admin.fisioos.com.br    | Super admins    | /auth → /admin-saas|
 * | validar.fisioos.com.br  | Public validate | Document verify    |
 *
 * When splitting hosts, map `resolveEntryPath()` to hostname and keep
 * shared auth at Supabase; restrict admin routes by host + role guard.
 */

export type AppEntryPath =
  | "/app/admin-saas"
  | "/app"
  | "/app/selecionar-clinica"
  | "/app/sem-clinica";

export function resolveEntryPath(boot: SessionBootstrap): AppEntryPath {
  if (isAdminAppMode()) return "/app/admin-saas";
  if (boot.isPlatformAdmin) return "/app/admin-saas";
  if (boot.supportMode) return "/app";
  if (!boot.hasClinic) return "/app/sem-clinica";
  if (boot.needsClinicSelection) return "/app/selecionar-clinica";
  return "/app";
}

export async function resolvePostLoginRedirect(userId: string): Promise<AppEntryPath> {
  const boot = await fetchSessionBootstrap(userId);
  return resolveEntryPath(boot);
}

export const ENTRY_HELPER_PATHS = ["/app/selecionar-clinica", "/app/sem-clinica"] as const;

export function isEntryHelperPath(pathname: string) {
  return ENTRY_HELPER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
