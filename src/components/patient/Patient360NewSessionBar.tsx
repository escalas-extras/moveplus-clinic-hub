import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onNewSession: () => void;
  className?: string;
};

/** Barra de ação principal — sempre visível (sticky no mobile). */
export function Patient360NewSessionBar({ onNewSession, className }: Props) {
  return (
    <div
      className={cn(
        "patient-360-new-session fos-animate-in sticky bottom-4 z-30 mx-auto max-w-3xl px-1 sm:static sm:max-w-none sm:px-0",
        className,
      )}
    >
      <Button
        size="lg"
        className="h-14 w-full rounded-2xl text-base font-bold shadow-[0_8px_32px_-8px_rgba(15,76,92,0.45)] transition-transform hover:-translate-y-0.5 sm:h-12 sm:text-sm"
        onClick={onNewSession}
      >
        <PlayCircle className="mr-2.5 h-5 w-5" aria-hidden />
        NOVO ATENDIMENTO
      </Button>
    </div>
  );
}
