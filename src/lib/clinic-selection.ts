import { supabase } from "@/integrations/supabase/client";
import { resolveClinicLogoUrl } from "@/lib/clinic-logo";
import {
  clinicOperationalAccessAllowed,
  resolveOperationalStatus,
  OPERATIONAL_STATUS_LABEL,
  type ClinicOperationalStatus,
} from "@/lib/saas/clinic-operational-status";

export type UserClinicOption = {
  clinicId: string;
  clinicName: string;
  clinicSlug: string | null;
  role: string;
  planName: string | null;
  operationalStatus: ClinicOperationalStatus;
  statusLabel: string;
  accessAllowed: boolean;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
};

const DEFAULT_PRIMARY = "#0F4C5C";
const DEFAULT_SECONDARY = "#2BB673";

export async function fetchUserClinicOptions(userId: string): Promise<UserClinicOption[]> {
  const { data: members, error } = await supabase
    .from("clinic_members")
    .select("clinic_id, role, clinics(id, nome, slug, status, trial_ends_at)")
    .eq("user_id", userId)
    .eq("active", true)
    .order("is_default", { ascending: false });

  if (error) throw new Error(error.message);
  const rows = members ?? [];
  if (rows.length === 0) return [];

  const clinicIds = rows.map((row) => row.clinic_id);
  const [{ data: planRows }, { data: settingsRows }] = await Promise.all([
    supabase
      .from("clinic_plans")
      .select("clinic_id, status, trial_ends_at, plans(name)")
      .in("clinic_id", clinicIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("clinic_settings")
      .select("clinic_id, logo_url, primary_color, secondary_color, nome_fantasia")
      .in("clinic_id", clinicIds),
  ]);

  const planByClinic = new Map<string, NonNullable<typeof planRows>[number]>();
  for (const plan of planRows ?? []) {
    if (!planByClinic.has(plan.clinic_id)) planByClinic.set(plan.clinic_id, plan);
  }

  const settingsByClinic = new Map<string, NonNullable<typeof settingsRows>[number]>();
  for (const row of settingsRows ?? []) {
    settingsByClinic.set(row.clinic_id, row);
  }

  const options = await Promise.all(
    rows.map(async (row) => {
      const clinic = row.clinics as {
        id: string;
        nome: string;
        slug: string | null;
        status: string | null;
        trial_ends_at: string | null;
      } | null;
      const plan = planByClinic.get(row.clinic_id);
      const settings = settingsByClinic.get(row.clinic_id);
      const operationalRow = {
        clinic_status: clinic?.status ?? null,
        plan_status: (plan?.status as string | null) ?? null,
        trial_ends_at:
          (plan?.trial_ends_at as string | null) ??
          (clinic?.trial_ends_at as string | null) ??
          null,
      };
      const operationalStatus = resolveOperationalStatus(operationalRow);
      const logoPath = settings?.logo_url?.trim() || null;
      const logoUrl = logoPath ? await resolveClinicLogoUrl(logoPath) : null;

      return {
        clinicId: row.clinic_id,
        clinicName: settings?.nome_fantasia || clinic?.nome || "Clínica",
        clinicSlug: clinic?.slug ?? null,
        role: row.role,
        planName: (plan?.plans as { name?: string } | null)?.name ?? null,
        operationalStatus,
        statusLabel: OPERATIONAL_STATUS_LABEL[operationalStatus],
        accessAllowed: clinicOperationalAccessAllowed(operationalRow),
        logoUrl,
        primaryColor: settings?.primary_color || DEFAULT_PRIMARY,
        secondaryColor: settings?.secondary_color || DEFAULT_SECONDARY,
      };
    }),
  );

  return options;
}
