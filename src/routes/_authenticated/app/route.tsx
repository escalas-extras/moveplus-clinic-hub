import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ClinicAccessGate } from "@/components/clinic-access-gate";
import { fetchSessionBootstrap } from "@/lib/session-bootstrap";
import { resolveEntryPath } from "@/lib/post-login-routing";
import { isAdminAppMode } from "@/lib/app-mode";

export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async ({ location, context }) => {
    const pathname = location.pathname;

    if (pathname === "/app/admin-saas" || pathname.startsWith("/app/admin-saas/")) {
      return;
    }

    if (isAdminAppMode()) {
      throw redirect({ to: "/app/admin-saas" });
    }

    const userId = context.user?.id;
    if (!userId) return;

    const boot = await context.queryClient.ensureQueryData({
      queryKey: ["session-bootstrap", userId],
      queryFn: () => fetchSessionBootstrap(userId),
      staleTime: 30_000,
    });

    if (boot.isPlatformAdmin) {
      throw redirect({ to: "/app/admin-saas" });
    }

    if (pathname === "/app/selecionar-clinica") {
      return;
    }

    if (pathname === "/app/sem-clinica") {
      if (boot.hasClinic) throw redirect({ to: "/app" });
      return;
    }

    const entryPath = resolveEntryPath(boot);
    if (entryPath !== "/app") {
      throw redirect({ to: entryPath });
    }
  },
  component: AppRoutesLayout,
});

function AppRoutesLayout() {
  return (
    <ClinicAccessGate>
      <Outlet />
    </ClinicAccessGate>
  );
}
