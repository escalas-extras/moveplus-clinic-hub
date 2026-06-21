import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  getActiveSupportSession,
  endSupportSession,
} from "@/lib/api/clinic-ops.functions";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogOut } from "lucide-react";
import { toast } from "sonner";

export function SupportBanner() {
  const fetchActive = useServerFn(getActiveSupportSession);
  const endFn = useServerFn(endSupportSession);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["support-session-active"],
    queryFn: () => fetchActive(),
    refetchInterval: 30_000,
  });
  const endMut = useMutation({
    mutationFn: () => endFn(),
    onSuccess: async () => {
      toast.success("Sessão de suporte encerrada");
      await qc.invalidateQueries();
      navigate({ to: "/app/admin-saas", replace: true });
    },
    onError: (e: any) => toast.error(e.message),
  });
  if (!data) return null;
  const clinicName = (data as any).clinics?.nome ?? "Clínica";
  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 shadow">
      <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span className="font-semibold truncate">
            Modo Suporte — {clinicName}
          </span>
          <span className="hidden sm:inline text-amber-900/80 truncate">
            · somente leitura · alterações estão bloqueadas
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-white/80 border-amber-700 hover:bg-white"
          onClick={() => endMut.mutate()}
          disabled={endMut.isPending}
        >
          <LogOut className="h-4 w-4 mr-1" /> Encerrar
        </Button>
      </div>
    </div>
  );
}
