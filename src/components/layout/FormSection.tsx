import { memo, type ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import { InfoCard } from "./InfoCard";

import { cn } from "@/lib/utils";



type FormSectionProps = {

  icon?: LucideIcon;

  title: string;

  description?: string;

  action?: ReactNode;

  children?: ReactNode;

  className?: string;

  contentClassName?: string;

  variant?: "default" | "highlight";

  hoverable?: boolean;

};



/** Seção de formulário clínico — card premium para agrupar campos relacionados. */

function FormSectionInner({

  icon,

  title,

  description,

  action,

  children,

  className,

  contentClassName,

  variant = "default",

  hoverable = false,

}: FormSectionProps) {

  return (

    <InfoCard

      icon={icon}

      title={title}

      description={description}

      action={action}

      variant={variant}

      hoverable={hoverable}

      className={cn("fos-form-section", className)}

    >

      {children && <div className={cn("w-full min-w-0 space-y-4", contentClassName)}>{children}</div>}

    </InfoCard>

  );

}



export const FormSection = memo(FormSectionInner);


