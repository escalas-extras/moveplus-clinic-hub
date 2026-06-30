import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIFFICULTY_OPTIONS } from "@/features/library/constants";
import type { ExerciseLevel } from "@/features/library/types";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: {
    name?: string;
    description?: string;
    indication?: string;
    therapeutic_goal?: string;
    frequency?: string;
    level?: ExerciseLevel;
  };
  title?: string;
  onSubmit: (values: {
    name: string;
    description?: string;
    indication?: string;
    therapeutic_goal?: string;
    frequency?: string;
    level?: ExerciseLevel;
  }) => void;
  loading?: boolean;
};

export function ProtocolFormDialog({
  open,
  onOpenChange,
  initial,
  title = "Novo protocolo",
  onSubmit,
  loading,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [indication, setIndication] = useState(initial?.indication ?? "");
  const [therapeuticGoal, setTherapeuticGoal] = useState(initial?.therapeutic_goal ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency ?? "");
  const [level, setLevel] = useState<ExerciseLevel>(initial?.level ?? "iniciante");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description || undefined,
      indication: indication || undefined,
      therapeutic_goal: therapeuticGoal || undefined,
      frequency: frequency || undefined,
      level,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="protocol-name">Nome</Label>
            <Input id="protocol-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protocol-desc">Descrição</Label>
            <Textarea id="protocol-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protocol-indication">Indicação</Label>
            <Input id="protocol-indication" value={indication} onChange={(e) => setIndication(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protocol-goal">Objetivo terapêutico</Label>
            <Input id="protocol-goal" value={therapeuticGoal} onChange={(e) => setTherapeuticGoal(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="3x/semana" />
            </div>
            <div className="space-y-2">
              <Label>Nível</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as ExerciseLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
