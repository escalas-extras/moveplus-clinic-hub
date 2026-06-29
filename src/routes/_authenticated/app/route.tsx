import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ClinicAccessGate } from "@/components/clinic-access-gate";
import { fetchSessionBootstrap } from "@/lib/session-bootstrap";

export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async ({ location, context }) => {
    const pathname = location.pathname;
    if (pathname === "/app/admin-saas" || pathname.startsWith("/app/admin-saas/")) {
      return;
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
