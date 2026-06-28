import type { ReactNode } from "react";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { FieldLabel } from "./FieldLabel";



type ClinicalFieldProps = {

  label: string;

  htmlFor?: string;

  children: ReactNode;

  className?: string;

  hint?: string;

  error?: string;

  success?: string;

  required?: boolean;

  optional?: boolean;

  filled?: boolean;

  loading?: boolean;

};



export function ClinicalField({

  label,

  htmlFor,

  children,

  className,

  hint,

  error,

  success,

  required,

  optional,

  filled,

  loading,

}: ClinicalFieldProps) {

  const hasError = !!error;



  return (

    <div

      className={cn(

        "fos-clinical-field group/field w-full min-w-0 space-y-2",

        hasError && "fos-clinical-field--error",

        success && !hasError && "fos-clinical-field--success",

        className,

      )}

    >

      <FieldLabel

        htmlFor={htmlFor}

        required={required}

        optional={optional}

        filled={filled}

        className="fos-clinical-field__label"

      >

        {label}

      </FieldLabel>

      <div className="fos-clinical-field__control relative w-full min-w-0">

        {children}

        {loading && (

          <Loader2

            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary/60"

            aria-hidden

          />

        )}

      </div>

      {error && (

        <p className="text-xs font-medium text-destructive" role="alert">

          {error}

        </p>

      )}

      {!error && success && (

        <p className="text-xs font-medium text-emerald-700">{success}</p>

      )}

      {!error && !success && hint && <p className="text-xs leading-relaxed text-slate-500">{hint}</p>}

    </div>

  );

}


