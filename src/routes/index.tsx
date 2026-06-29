import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchSessionBootstrap } from "@/lib/session-bootstrap";
import { resolveEntryPath } from "@/lib/post-login-routing";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });

    const boot = await fetchSessionBootstrap(data.session.user.id);
    throw redirect({ to: resolveEntryPath(boot) });
  },
  component: () => null,
});
