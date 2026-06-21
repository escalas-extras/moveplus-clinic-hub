import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/lib/branding";

/**
 * Empty state premium reutilizável.
 * - Ícone Lucide grande em moldura com gradiente da marca da clínica.
 * - Título, descrição e CTA opcional.
 *
 * Usar em: pacientes, agenda, profissionais, documentos, biblioteca,
 * relatórios, home care, financeiro — em vez de "Nenhum registro encontrado".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; to?: string; onClick?: () => void };
}) {
  const brand = useBranding();
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      <div
        className="h-20 w-20 rounded-3xl flex items-center justify-center shadow-soft mb-5"
        style={{
          background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
        }}
      >
        <Icon className="h-9 w-9 text-white" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight max-w-sm">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action.to ? (
            <Button asChild style={{ backgroundColor: brand.primaryColor }}>
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick} style={{ backgroundColor: brand.primaryColor }}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
