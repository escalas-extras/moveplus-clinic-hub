import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScalesPanel } from "./scales-panel";
import { MRCPanel } from "./mrc-panel";
import { GoniometryPanel } from "./goniometry-panel";
import { GoalsPanel } from "./goals-panel";
import { SignaturePad } from "./signature-pad";
import { Card } from "@/components/ui/card";

export function ClinicalTabs({ patientId, assessmentId }: { patientId: string; assessmentId?: string }) {
  return (
    <Tabs defaultValue="escalas">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="escalas">Escalas</TabsTrigger>
        <TabsTrigger value="forca">Força</TabsTrigger>
        <TabsTrigger value="gonio">Goniometria</TabsTrigger>
        <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
        <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
      </TabsList>
      <TabsContent value="escalas"><ScalesPanel patientId={patientId} assessmentId={assessmentId} /></TabsContent>
      <TabsContent value="forca"><MRCPanel patientId={patientId} assessmentId={assessmentId} /></TabsContent>
      <TabsContent value="gonio"><GoniometryPanel patientId={patientId} assessmentId={assessmentId} /></TabsContent>
      <TabsContent value="objetivos"><GoalsPanel patientId={patientId} assessmentId={assessmentId} /></TabsContent>
      <TabsContent value="assinaturas">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Assinaturas digitais</h3>
          <SignaturePad patientId={patientId} assessmentId={assessmentId} />
        </Card>
      </TabsContent>
    </Tabs>
  );
}
