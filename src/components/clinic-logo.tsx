import { useState, useEffect } from "react";
import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Branding } from "@/lib/branding";

type Props = {
  brand: Branding;
  isLoading?: boolean;
  compact?: boolean;
};

/**
 * Single source of truth for rendering the clinic logo.
 * Behavior:
 *  - While branding is loading: render a neutral placeholder (same footprint,
 *    no monograma) so navegação não causa flash.
 *  - Após carregar: se houver logo válida, mostra a imagem; só cai para o
 *    monograma se a imagem realmente falhar ou se não houver logo.
 *  - O estado "broken" é resetado quando a URL da logo muda (nova clínica /
 *    nova logo), evitando que um erro antigo persista.
 */
export function ClinicLogo({ brand, isLoading = false, compact = false }: Props) {
  const size = compact ? "h-9 w-9" : "h-11 w-11";
  const rawLogo = brand.logoUrl?.trim() || null;
  const [broken, setBroken] = useState(false);

  // Resetar estado de "broken" sempre que a URL da logo mudar.
  useEffect(() => {
    setBroken(false);
  }, [rawLogo]);

  // Enquanto branding carrega, mostrar placeholder neutro (sem monograma).
  if (isLoading && !rawLogo) {
    return (
      <div
        className={cn(size, "rounded-xl bg-white/60 shadow-soft")}
        aria-hidden="true"
      />
    );
  }

  const showImage = brand.hasOwnLogo && !!rawLogo && !broken;

  if (showImage) {
    return (
      <div
        className={cn(
          size,
          "rounded-xl overflow-hidden bg-white shadow-soft ring-1 ring-black/5",
        )}
      >
        <img
          src={rawLogo!}
          alt={brand.clinicName}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          loading="eager"
          decoding="async"
          onError={() => setBroken(true)}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (!img.naturalWidth || !img.naturalHeight) setBroken(true);
          }}
        />
      </div>
    );
  }

  const initial = (brand.clinicName || "C").trim().charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        size,
        "rounded-2xl flex items-center justify-center shadow-soft text-white font-semibold",
      )}
      style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
      aria-label={brand.clinicName}
    >
      {brand.clinicName && brand.clinicName !== brand.appName ? (
        <span className={cn(compact ? "text-sm" : "text-base")}>{initial}</span>
      ) : (
        <Stethoscope className={cn(compact ? "h-5 w-5" : "h-6 w-6")} />
      )}
    </div>
  );
}
