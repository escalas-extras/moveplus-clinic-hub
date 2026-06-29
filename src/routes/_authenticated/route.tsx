import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { fetchSessionBootstrap } from "@/lib/session-bootstrap";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    void context.queryClient.prefetchQuery({
      queryKey: ["session-bootstrap", data.user.id],
      queryFn: () => fetchSessionBootstrap(data.user.id),
      staleTime: 30_000,
    });

    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();

  return (
    <AppShell initialUser={user}>
      <Outlet />
    </AppShell>
  );
}
