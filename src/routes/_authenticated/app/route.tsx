import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ClinicAccessGate } from "@/components/clinic-access-gate";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppRoutesLayout,
});

function AppRoutesLayout() {
  return (
    <ClinicAccessGate>
      <Outlet />
    </ClinicAccessGate>
  );
}
