import { forwardRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { clinical } from "./clinical-classes";

type SearchFieldProps = React.ComponentProps<typeof Input> & {
  wrapperClassName?: string;
};

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn("relative min-w-[180px] flex-1 sm:max-w-md", wrapperClassName)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={ref}
          type="search"
          className={cn(clinical.input, "pl-9", className)}
          aria-label={props["aria-label"] ?? props.placeholder ?? "Pesquisar"}
          {...props}
        />
      </div>
    );
  },
);
SearchField.displayName = "SearchField";
