import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { ClinicAccessGate } from "@/components/clinic-access-gate";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async ({ location }) => {
    const pathname = location.pathname;
    if (pathname === "/app/admin-saas" || pathname.startsWith("/app/admin-saas/")) {
      return;
    }

    const { data: sess } = await supabase.auth.getUser();
    if (!sess.user) return;

    const [rolesRes, supportRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", sess.user.id),
      supabase.rpc("current_support_session_clinic"),
    ]);
    const isSuperAdmin = (rolesRes.data ?? []).some((r) => r.role === "super_admin");
    const inSupport = !!supportRes.data;

    if (isSuperAdmin && !inSupport) {
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
