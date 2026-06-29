import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });

    const { fetchSessionBootstrap } = await import("@/lib/session-bootstrap");
    const boot = await fetchSessionBootstrap(data.session.user.id);
    throw redirect({ to: boot.isSuperAdmin ? "/app/admin-saas" : "/app" });
  },
  component: () => null,
});
