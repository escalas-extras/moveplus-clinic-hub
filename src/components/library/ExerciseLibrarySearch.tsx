import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function ExerciseLibrarySearch({
  value,
  onChange,
  placeholder = "Buscar exercício, objetivo, região ou equipamento...",
}: Props) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-2xl border-[rgba(15,76,92,0.14)] bg-white pl-10 text-base shadow-sm"
      />
    </div>
  );
}
