import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { useClinicOperationalAccess } from "@/lib/saas/use-clinic-operational-access";
import { OPERATIONAL_STATUS_LABEL } from "@/lib/saas/clinic-operational-status";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BYPASS_PATHS = ["/app/admin-saas", "/app/configuracoes"];

type Props = { children: ReactNode };

export function ClinicAccessGate({ children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const access = useClinicOperationalAccess();

  const bypass = BYPASS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (bypass || access.loading || access.allowed) {
    return <>{children}</>;
  }

  const statusLabel = access.status ? OPERATIONAL_STATUS_LABEL[access.status] : "indisponível";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md w-full border-slate-200 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <ShieldOff className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Acesso temporariamente indisponível</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Entre em contato com o suporte para regularizar o acesso da sua clínica.
            </p>
            {access.status && (
              <p className="text-xs text-muted-foreground">
                Status atual: <span className="font-medium">{statusLabel}</span>
              </p>
            )}
          </div>
          <Button variant="outline" asChild>
            <a href="mailto:suporte@fisioos.app">Contatar suporte</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
