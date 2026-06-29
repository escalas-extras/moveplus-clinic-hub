import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchUserClinicOptions, type UserClinicOption } from "@/lib/clinic-selection";
import { setStoredActiveClinicId } from "@/lib/active-clinic-storage";
import {
  AccessRestrictedScreen,
  ClinicSelectionEmptyHint,
  ClinicSelectionSkeleton,
} from "@/components/access/AccessRestrictedScreen";
import { AccessFlowShell } from "@/components/access/AccessFlowShell";
import { ClinicSelectionCard } from "@/components/access/ClinicSelectionCard";
import { Button } from "@/components/ui/button";
import type { Branding } from "@/lib/branding";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/selecionar-clinica")({
  component: SelecionarClinicaPage,
});

function optionBrand(option: UserClinicOption): Branding {
  return {
    appName: "FisioOS",
    name: option.clinicName,
    clinicName: option.clinicName,
    slogan: "",
    logo: option.logoUrl,
    logoUrl: option.logoUrl,
    logoPath: option.logoUrl ? "set" : null,
    primaryColor: option.primaryColor,
    secondaryColor: option.secondaryColor,
    footer: option.clinicName,
    crefitoDefault: null,
    hasOwnLogo: !!option.logoUrl,
  };
}

function SelecionarClinicaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mountedRef = useRef(true);
  const [options, setOptions] = useState<UserClinicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    fetchUserClinicOptions(user.id)
      .then((rows) => {
        if (cancelled || !mountedRef.current) return;
        setOptions(rows);
        if (rows.length === 1 && rows[0].accessAllowed) {
          setStoredActiveClinicId(user.id, rows[0].clinicId);
          void qc.invalidateQueries({ queryKey: ["session-bootstrap"] });
          navigate({ to: "/app", replace: true });
        }
      })
      .catch(() => {
        if (cancelled || !mountedRef.current) return;
        setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, navigate, qc]);

  async function selectClinic(option: UserClinicOption) {
    if (!user?.id || !option.accessAllowed || selectingId) return;
    setSelectingId(option.clinicId);
    setStoredActiveClinicId(user.id, option.clinicId);
    await qc.invalidateQueries({ queryKey: ["session-bootstrap"] });
    if (mountedRef.current) {
      navigate({ to: "/app", replace: true });
    }
  }

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading) {
    return <ClinicSelectionSkeleton />;
  }

  if (loadFailed) {
    return (
      <AccessRestrictedScreen
        status="denied"
        onLogout={() => void logout()}
        actions={
          <Button variant="default" className="h-10" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (options.length === 0) {
    return <AccessRestrictedScreen status="no_clinic" onLogout={() => void logout()} />;
  }

  return (
    <AccessFlowShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Escolha a clínica</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Sua conta tem acesso a {options.length} clínica{options.length > 1 ? "s" : ""}. Selecione qual deseja
            abrir agora.
          </p>
        </div>

        <ul className="grid gap-3">
          {options.map((option) => (
            <li key={option.clinicId}>
              <ClinicSelectionCard
                option={option}
                brand={optionBrand(option)}
                selecting={selectingId === option.clinicId}
                onEnter={() => void selectClinic(option)}
              />
            </li>
          ))}
        </ul>

        <ClinicSelectionEmptyHint />
      </div>
    </AccessFlowShell>
  );
}
