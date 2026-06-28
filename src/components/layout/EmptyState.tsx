import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrimaryActionButton } from "./PageActions";
import { clinical } from "./clinical-classes";

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

function EmptyStateInner({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(clinical.emptyState, "flex flex-col items-center justify-center px-8 py-16 text-center", className)}
    >
      <div className="fos-empty-state__icon mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl">
        <Icon className="h-9 w-9 text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="max-w-sm text-xl font-bold tracking-tight text-slate-950">{title}</h3>
      {description && (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-[15px]">{description}</p>
      )}
      {action && (
        <div className="mt-8">
          {action.to ? (
            <PrimaryActionButton asChild>
              <Link to={action.to}>{action.label}</Link>
            </PrimaryActionButton>
          ) : (
            <PrimaryActionButton onClick={action.onClick}>{action.label}</PrimaryActionButton>
          )}
        </div>
      )}
    </div>
  );
}

export const EmptyState = memo(EmptyStateInner);
