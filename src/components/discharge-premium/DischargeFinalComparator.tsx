import { memo, useMemo } from "react";
import { ReassessmentComparatorPanel } from "@/components/reassessment-premium";
import {
  assessmentLabel,
  buildMetricCompares,
  type AssessmentRow,
} from "@/components/reassessment-premium";
import { pickDischargeComparison } from "./discharge-utils";

type DischargeFinalComparatorProps = {
  assessments: AssessmentRow[];
};

function DischargeFinalComparatorInner({ assessments }: DischargeFinalComparatorProps) {
  const { inicial, ultimaReav, altaClinical } = useMemo(
    () => pickDischargeComparison(assessments),
    [assessments],
  );

  const metrics = useMemo(
    () => buildMetricCompares(inicial, ultimaReav, altaClinical),
    [inicial, ultimaReav, altaClinical],
  );

  if (!inicial) {
    return null;
  }

  return (
    <ReassessmentComparatorPanel
      metrics={metrics}
      inicialLabel={assessmentLabel(inicial, "Avaliação inicial")}
      ultimaLabel={assessmentLabel(ultimaReav, "Sem reavaliação")}
      atualLabel={
        altaClinical
          ? `${altaClinical.tipo === "reavaliacao" ? "Reavaliação" : "Avaliação"} · ${assessmentLabel(altaClinical, "Alta")}`
          : "Alta (estado clínico)"
      }
    />
  );
}

export const DischargeFinalComparator = memo(DischargeFinalComparatorInner);
