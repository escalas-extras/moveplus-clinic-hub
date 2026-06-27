import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-primary ring-1 ring-emerald-100">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="max-w-sm text-lg font-semibold tracking-tight text-slate-950">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action.to ? (
            <Button asChild className="rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-soft hover:bg-primary/90">
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              className="rounded-xl bg-primary px-4 font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
