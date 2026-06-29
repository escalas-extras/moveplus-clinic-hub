import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AccessRestrictedScreen } from "@/components/access/AccessRestrictedScreen";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/sem-clinica")({
  component: SemClinicaPage,
});

function SemClinicaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AccessRestrictedScreen
      status="no_clinic"
      onLogout={() => void logout()}
    />
  );
}
